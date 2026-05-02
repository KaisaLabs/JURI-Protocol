/**
 * Transport Layer — abstracts agent communication.
 * Supports two modes:
 *   1. AXL — real Gensyn AXL P2P nodes (production)
 *   2. DIRECT — direct HTTP between agents (dev/test, no AXL needed)
 *
 * Auto-detects mode based on AGENT_TRANSPORT env var.
 */
import type { AgentMessage, AgentRole, AxlNodeInfo } from "./types";
import http from "http";

// ===================== Transport Interface =====================

export interface ITransport {
  readonly mode: "axl" | "direct";
  start(role: AgentRole, port: number): Promise<void>;
  sendMessage(targetRole: AgentRole, message: AgentMessage): Promise<boolean>;
  onMessage(handler: (msg: AgentMessage, from: AgentRole) => void): void;
  getPeers(): Promise<AgentRole[]>;
  getPeerId(): string;
  stop(): Promise<void>;
}

// ===================== Peer Registry (shared by all modes) =====================

interface PeerInfo {
  role: AgentRole;
  port: number;
  axlPeerId?: string;
}

const PEER_REGISTRY: Record<AgentRole, PeerInfo> = {
  plaintiff: { role: "plaintiff", port: 9001, axlPeerId: undefined },
  defendant: { role: "defendant", port: 9002, axlPeerId: undefined },
  judge:     { role: "judge",     port: 9003, axlPeerId: undefined },
};

// ===================== AXL Transport =====================

export class AxlTransport implements ITransport {
  public readonly mode = "axl" as const;
  private baseUrl = "";
  private role: AgentRole = "plaintiff";
  private peerId = "";
  private messageHandlers: ((msg: AgentMessage, from: AgentRole) => void)[] = [];
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private peerIdMap: Map<string, AgentRole> = new Map();

  async start(role: AgentRole, port: number): Promise<void> {
    this.role = role;
    this.baseUrl = `http://127.0.0.1:${port}`;

    // Wait for AXL node to be ready
    const ready = await this.waitForReady(30, 1000);
    if (!ready) {
      throw new Error(`AXL node on port ${port} not ready after 30s`);
    }

    // Get our identity
    await this.refreshTopology();

    // Start polling for messages
    this.pollInterval = setInterval(() => this.pollMessages(), 500);
    console.log(`[AXL:${role}] Connected. PeerID: ${this.peerId.slice(0, 12)}...`);
  }

  async sendMessage(targetRole: AgentRole, message: AgentMessage): Promise<boolean> {
    const targetPeerId = PEER_REGISTRY[targetRole].axlPeerId;
    if (!targetPeerId) {
      // Refresh topology to find peer
      await this.refreshTopology();
      const updated = PEER_REGISTRY[targetRole].axlPeerId;
      if (!updated) {
        console.error(`[AXL:${this.role}] Peer ${targetRole} not found in topology`);
        return false;
      }
    }

    const peerId = PEER_REGISTRY[targetRole].axlPeerId!;
    const payload = JSON.stringify(message);

    try {
      const res = await fetch(`${this.baseUrl}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: peerId, data: payload }),
        signal: AbortSignal.timeout(5000),
      });
      const result = await res.json();
      return result.ok === true || res.ok;
    } catch (err) {
      console.error(`[AXL:${this.role}] Send error to ${targetRole}:`, (err as Error).message);
      return false;
    }
  }

  onMessage(handler: (msg: AgentMessage, from: AgentRole) => void): void {
    this.messageHandlers.push(handler);
  }

  async getPeers(): Promise<AgentRole[]> {
    await this.refreshTopology();
    return Object.values(PEER_REGISTRY)
      .filter((p) => p.axlPeerId && p.role !== this.role)
      .map((p) => p.role);
  }

  getPeerId(): string {
    return this.peerId;
  }

  async stop(): Promise<void> {
    if (this.pollInterval) clearInterval(this.pollInterval);
  }

  // ── Private helpers ──

  private async waitForReady(maxRetries: number, intervalMs: number): Promise<boolean> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const res = await fetch(`${this.baseUrl}/topology`);
        if (res.ok) return true;
      } catch {}
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    return false;
  }

  private async refreshTopology(): Promise<void> {
    try {
      const res = await fetch(`${this.baseUrl}/topology`);
      const data = await res.json();

      // Update our own peer ID
      if (data.self?.peerId) {
        this.peerId = data.self.peerId;
      }

      // Map peer IDs to roles by port (from their addresses)
      if (Array.isArray(data.peers)) {
        for (const peer of data.peers) {
          const peerId = peer.peerId || peer.key;
          const addresses: string[] = peer.addresses || [];

          for (const addr of addresses) {
            // Extract port from address like "tls://127.0.0.1:9002"
            const portMatch = addr.match(/:(\d+)/);
            if (portMatch) {
              const port = parseInt(portMatch[1]);
              for (const [role, info] of Object.entries(PEER_REGISTRY)) {
                if (info.port === port && role !== this.role) {
                  PEER_REGISTRY[role as AgentRole].axlPeerId = peerId;
                }
              }
            }
          }
        }
      }
    } catch (err) {
      // Topology query failed — peers might not be connected yet
    }
  }

  private async pollMessages(): Promise<void> {
    try {
      const res = await fetch(`${this.baseUrl}/recv`);
      const data = await res.json();
      if (!data.messages) return;

      for (const m of data.messages) {
        let parsed: AgentMessage;
        try {
          parsed = JSON.parse(typeof m.data === "string" ? m.data : JSON.stringify(m.data));
        } catch {
          continue;
        }

        // Determine which role sent this
        let fromRole: AgentRole | null = null;
        for (const [role, info] of Object.entries(PEER_REGISTRY)) {
          if (info.axlPeerId === m.from) {
            fromRole = role as AgentRole;
            break;
          }
        }

        if (fromRole && parsed.type && parsed.caseId) {
          for (const handler of this.messageHandlers) {
            handler(parsed, fromRole);
          }
        }
      }
    } catch {
      // Poll error — not critical
    }
  }
}

// ===================== Direct Transport (No AXL required) =====================

export class DirectTransport implements ITransport {
  public readonly mode = "direct" as const;
  private role: AgentRole = "plaintiff";
  private port = 0;
  private server: http.Server | null = null;
  private messageHandlers: ((msg: AgentMessage, from: AgentRole) => void)[] = [];

  async start(role: AgentRole, port: number): Promise<void> {
    this.role = role;
    this.port = port;

    return new Promise((resolve) => {
      this.server = http.createServer((req, res) => {
        if (req.method === "POST" && req.url === "/message") {
          let body = "";
          req.on("data", (chunk) => (body += chunk));
          req.on("end", () => {
            try {
              const data = JSON.parse(body);
              const msg = data.message as AgentMessage;
              const from = data.from as AgentRole;
              for (const handler of this.messageHandlers) {
                handler(msg, from);
              }
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ ok: true }));
            } catch {
              res.writeHead(400);
              res.end(JSON.stringify({ ok: false, error: "Bad message" }));
            }
          });
        } else if (req.method === "GET" && req.url === "/health") {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ role: this.role, port: this.port, mode: "direct" }));
        } else {
          res.writeHead(404);
          res.end("Not found");
        }
      });

      this.server.listen(this.port, () => {
        console.log(`[DIRECT:${role}] Listening on port ${this.port}`);
        resolve();
      });
    });
  }

  async sendMessage(targetRole: AgentRole, message: AgentMessage): Promise<boolean> {
    const targetPort = PEER_REGISTRY[targetRole].port;

    try {
      const res = await fetch(`http://127.0.0.1:${targetPort}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: this.role, message }),
        signal: AbortSignal.timeout(5000),
      });
      const result = await res.json();
      return result.ok === true;
    } catch (err) {
      console.error(`[DIRECT:${this.role}] Send error to ${targetRole}:`, (err as Error).message);
      return false;
    }
  }

  onMessage(handler: (msg: AgentMessage, from: AgentRole) => void): void {
    this.messageHandlers.push(handler);
  }

  async getPeers(): Promise<AgentRole[]> {
    const peers: AgentRole[] = [];
    for (const role of ["plaintiff", "defendant", "judge"] as AgentRole[]) {
      if (role === this.role) continue;
      try {
        const res = await fetch(`http://127.0.0.1:${PEER_REGISTRY[role].port}/health`, {
          signal: AbortSignal.timeout(2000),
        });
        if (res.ok) peers.push(role);
      } catch {}
    }
    return peers;
  }

  getPeerId(): string {
    return `direct-${this.role}-${this.port}`;
  }

  async stop(): Promise<void> {
    if (this.server) {
      await new Promise<void>((resolve) => this.server!.close(() => resolve()));
    }
  }
}

// ===================== Factory =====================

export function createTransport(mode?: string): ITransport {
  const transportMode = (mode || process.env.AGENT_TRANSPORT || "direct").toLowerCase();
  if (transportMode === "direct") {
    return new DirectTransport();
  }
  if (transportMode !== "axl") {
    throw new Error(`Unsupported transport mode \"${transportMode}\". Use \"direct\" or \"axl\".`);
  }
  return new AxlTransport();
}
