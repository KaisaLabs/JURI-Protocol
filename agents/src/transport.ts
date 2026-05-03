import type { AgentMessage, AgentRole } from "./types";
import http from "http";

export interface ITransport {
  readonly mode: "axl" | "direct";
  start(role: AgentRole, port: number): Promise<void>;
  sendMessage(targetRole: AgentRole, message: AgentMessage): Promise<boolean>;
  onMessage(handler: (msg: AgentMessage, from: AgentRole) => void): void;
  getPeers(): Promise<AgentRole[]>;
  getPeerId(): string;
  stop(): Promise<void>;
}

const PEER_REGISTRY: Record<AgentRole, { role: AgentRole; port: number; axlPeerId?: string }> = {
  forensic:     { role: "forensic",     port: 9091, axlPeerId: undefined },
  analysis:     { role: "analysis",     port: 9092, axlPeerId: undefined },
  verification: { role: "verification", port: 9093, axlPeerId: undefined },
};

export class AxlTransport implements ITransport {
  public readonly mode = "axl" as const;
  private baseUrl = "";
  private role: AgentRole = "forensic";
  private peerId = "";
  private messageHandlers: ((msg: AgentMessage, from: AgentRole) => void)[] = [];
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private peerKeyMap: Map<string, AgentRole> = new Map();

  async start(role: AgentRole, port: number): Promise<void> {
    this.role = role;
    this.baseUrl = `http://127.0.0.1:${port}`;
    const ready = await this.waitForReady(30, 1000);
    if (!ready) throw new Error(`AXL node on port ${port} not ready after 30s`);
    await this.refreshTopology();
    this.pollInterval = setInterval(() => this.pollMessages(), 500);
    console.log(`[AXL:${role}] Connected. Own key: ${this.peerId.slice(0,12)}...`);
  }

  async sendMessage(targetRole: AgentRole, message: AgentMessage): Promise<boolean> {
    if (!this.peerId) await this.refreshTopology();
    const targetKey = PEER_REGISTRY[targetRole].axlPeerId;
    if (!targetKey) { await this.refreshTopology(); }
    const key = PEER_REGISTRY[targetRole].axlPeerId;
    if (!key) return false;
    try {
      const res = await fetch(`${this.baseUrl}/send`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: key, data: JSON.stringify(message) }),
        signal: AbortSignal.timeout(5000),
      });
      return (await res.json()).ok === true || res.ok;
    } catch { return false; }
  }

  onMessage(handler: (msg: AgentMessage, from: AgentRole) => void): void { this.messageHandlers.push(handler); }

  async getPeers(): Promise<AgentRole[]> {
    await this.refreshTopology();
    return Object.entries(PEER_REGISTRY)
      .filter(([r, i]) => r !== this.role && i.axlPeerId)
      .map(([r]) => r as AgentRole);
  }

  getPeerId(): string { return this.peerId; }
  async stop(): Promise<void> { if (this.pollInterval) clearInterval(this.pollInterval); }

  private async waitForReady(maxRetries: number, intervalMs: number): Promise<boolean> {
    for (let i = 0; i < maxRetries; i++) {
      try { if ((await fetch(`${this.baseUrl}/topology`)).ok) return true; } catch {}
      await new Promise(r => setTimeout(r, intervalMs));
    }
    return false;
  }

  private async refreshTopology(): Promise<void> {
    try {
      const data = await (await fetch(`${this.baseUrl}/topology`)).json();
      // Use our_public_key as our identity
      if (data.our_public_key) this.peerId = data.our_public_key;

      for (const peer of (data.peers || [])) {
        const publicKey: string = peer.public_key || "";
        const uri: string = peer.uri || "";
        if (!publicKey || !uri) continue;
        // Extract port from URI: "tls://127.0.0.1:9002" → 9002
        const portMatch = uri.match(/:(\d+)$/);
        if (portMatch) {
          const port = parseInt(portMatch[1]);
          for (const [role, info] of Object.entries(PEER_REGISTRY)) {
            if (info.port === port && role !== this.role) {
              info.axlPeerId = publicKey;
              this.peerKeyMap.set(publicKey, role as AgentRole);
            }
          }
        }
      }
    } catch (err: any) {
      // Topology query failed silently
    }
  }

  private async pollMessages(): Promise<void> {
    try {
      const data = await (await fetch(`${this.baseUrl}/recv`)).json();
      for (const m of (data.messages || [])) {
        let parsed: AgentMessage;
        try { parsed = JSON.parse(typeof m.data === "string" ? m.data : JSON.stringify(m.data)); } catch { continue; }
        const fromRole = this.peerKeyMap.get(m.from) || null;
        if (fromRole && parsed.type) {
          for (const handler of this.messageHandlers) handler(parsed, fromRole);
        }
      }
    } catch {}
  }
}

export class DirectTransport implements ITransport {
  public readonly mode = "direct" as const;
  private role: AgentRole = "forensic";
  private port = 0;
  private server: http.Server | null = null;
  private messageHandlers: ((msg: AgentMessage, from: AgentRole) => void)[] = [];

  async start(role: AgentRole, port: number): Promise<void> {
    this.role = role; this.port = port;
    return new Promise(resolve => {
      this.server = http.createServer((req, res) => {
        if (req.method === "POST" && req.url === "/message") {
          let body = "";
          req.on("data", c => body += c);
          req.on("end", () => {
            try {
              const data = JSON.parse(body);
              for (const handler of this.messageHandlers) handler(data.message as AgentMessage, data.from as AgentRole);
              res.writeHead(200); res.end(JSON.stringify({ ok: true }));
            } catch { res.writeHead(400); res.end(JSON.stringify({ ok: false })); }
          });
        } else if (req.method === "GET" && req.url === "/health") {
          res.writeHead(200); res.end(JSON.stringify({ role: this.role, port: this.port, mode: "direct" }));
        } else { res.writeHead(404); res.end("Not found"); }
      });
      this.server.listen({ port: this.port, reuseAddr: true }, () => { console.log(`[DIRECT:${role}] Listening on port ${this.port}`); resolve(); });
    });
  }

  async sendMessage(targetRole: AgentRole, message: AgentMessage): Promise<boolean> {
    try {
      const res = await fetch(`http://127.0.0.1:${PEER_REGISTRY[targetRole].port}/message`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: this.role, message }),
        signal: AbortSignal.timeout(5000),
      });
      return (await res.json()).ok === true;
    } catch { return false; }
  }

  onMessage(handler: (msg: AgentMessage, from: AgentRole) => void): void { this.messageHandlers.push(handler); }
  async getPeers(): Promise<AgentRole[]> {
    const peers: AgentRole[] = [];
    for (const role of ["forensic", "analysis", "verification"] as AgentRole[]) {
      if (role === this.role) continue;
      try { const res = await fetch(`http://127.0.0.1:${PEER_REGISTRY[role].port}/health`, { signal: AbortSignal.timeout(1000) }); if (res.ok) peers.push(role); } catch {}
    }
    return peers;
  }
  getPeerId(): string { return `direct-${this.role}-${this.port}`; }
  async stop(): Promise<void> { if (this.server) await new Promise<void>(r => this.server!.close(() => r())); }
}

export function createTransport(mode?: string): ITransport {
  return (mode || process.env.AGENT_TRANSPORT || "axl") === "direct" ? new DirectTransport() : new AxlTransport();
}
