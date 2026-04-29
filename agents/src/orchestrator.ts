#!/usr/bin/env node
/**
 * ⚖️ Agent Court Orchestrator
 *
 * Coordinates the full arbitration flow:
 *   1. Seeds CASE_CREATED to all agents
 *   2. Monitors agent progress
 *   3. Collects final verdict
 *
 * Also exposes a REST API for the web UI.
 *
 * Usage: npx tsx src/orchestrator.ts
 */
import { createTransport, type ITransport } from "./transport";
import { ZgStorage } from "./storage";
import type { AgentMessage, AgentRole } from "./types";
import http from "http";
import * as dotenv from "dotenv";
dotenv.config({ path: "../.env" });

const PORT = parseInt(process.env.API_PORT || "4000");
const AGENT_PORTS: Record<AgentRole, number> = {
  plaintiff: parseInt(process.env.AXL_PLAINTIFF_PORT || "9001"),
  defendant: parseInt(process.env.AXL_DEFENDANT_PORT || "9002"),
  judge: parseInt(process.env.AXL_JUDGE_PORT || "9003"),
};

class Orchestrator {
  private transport: ITransport;
  private caseCounter = 0;
  private activeCases: Map<number, {
    dispute: string;
    status: string;
    verdict?: { result: string; reasoning: string };
    messages: { role: string; content: string; timestamp: number }[];
  }> = new Map();

  constructor() {
    this.transport = createTransport(process.env.AGENT_TRANSPORT || "direct");
  }

  async start(): Promise<void> {
    console.log("⚖️  Agent Court Orchestrator starting...");

    // Listen on our own port (for web UI API)
    await this.startAPIServer();

    // Connect to transport to listen for agent messages
    await this.transport.start("plaintiff", 9100); // orchestrator uses port 9100

    this.transport.onMessage((msg, from) => {
      this.handleAgentMessage(msg, from);
    });

    console.log("Orchestrator ready on port", PORT);
    console.log("Web UI → http://localhost:3000");
    console.log("API    → http://localhost:" + PORT);
  }

  private handleAgentMessage(msg: AgentMessage, from: AgentRole): void {
    const c = this.activeCases.get(msg.caseId);
    if (!c) return;

    c.messages.push({
      role: from,
      content: msg.content.slice(0, 500),
      timestamp: msg.timestamp,
    });

    if (msg.type === "VERDICT_ISSUED") {
      try {
        c.verdict = JSON.parse(msg.content);
        c.status = "RESOLVED";
      } catch {}
      console.log(`\n⚖️  CASE #${msg.caseId} RESOLVED: ${c.verdict?.result}`);
      console.log(`   ${c.verdict?.reasoning?.slice(0, 200)}...\n`);
    }
  }

  /** Seed a new case to all agents */
  async createCase(dispute: string): Promise<{ caseId: number }> {
    this.caseCounter++;
    const caseId = this.caseCounter;

    this.activeCases.set(caseId, {
      dispute,
      status: "ARBITRATION",
      messages: [],
    });

    console.log(`\n📋 CASE #${caseId} CREATED: "${dispute}"\n`);

    // Send CASE_CREATED to each agent
    const roles: AgentRole[] = ["plaintiff", "defendant", "judge"];
    for (const role of roles) {
      const msg: AgentMessage = {
        type: "CASE_CREATED",
        caseId,
        from: "plaintiff", // orchestrator sends as plaintiff
        to: role,
        content: dispute,
        evidenceRefs: [],
        timestamp: Date.now(),
      };

      // Send to each agent's port via direct HTTP (orchestrator talks directly)
      const port = AGENT_PORTS[role];
      try {
        await fetch(`http://127.0.0.1:${port}/message`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ from: "orchestrator", message: msg }),
          signal: AbortSignal.timeout(3000),
        });
        console.log(`  → ${role} notified`);
      } catch {
        console.log(`  ⚠️  ${role} not reachable on port ${port}`);
      }
    }

    return { caseId };
  }

  /** Get case status */
  getCase(caseId: number) {
    return this.activeCases.get(caseId) || null;
  }

  /** Get all cases */
  getCases() {
    return Array.from(this.activeCases.entries()).map(([id, c]) => ({
      id,
      ...c,
    }));
  }

  // ── REST API Server ──
  private async startAPIServer(): Promise<void> {
    const server = http.createServer(async (req, res) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");

      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }

      const url = new URL(req.url || "/", `http://localhost:${PORT}`);

      // POST /api/case — create new case
      if (req.method === "POST" && url.pathname === "/api/case") {
        let body = "";
        req.on("data", (chunk) => (body += chunk));
        req.on("end", async () => {
          try {
            const { dispute } = JSON.parse(body);
            if (!dispute) {
              res.writeHead(400, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "dispute required" }));
              return;
            }
            const result = await this.createCase(dispute);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: true, ...result }));
          } catch (err) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: (err as Error).message }));
          }
        });
        return;
      }

      // GET /api/case/:id — get case status
      const caseMatch = url.pathname.match(/^\/api\/case\/(\d+)$/);
      if (req.method === "GET" && caseMatch) {
        const caseId = parseInt(caseMatch[1]);
        const c = this.getCase(caseId);
        if (!c) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Case not found" }));
          return;
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(c));
        return;
      }

      // GET /api/cases — list all cases
      if (req.method === "GET" && url.pathname === "/api/cases") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(this.getCases()));
        return;
      }

      // GET /api/health — health check
      if (req.method === "GET" && url.pathname === "/api/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          status: "ok",
          transport: this.transport.mode,
          activeCases: this.caseCounter,
          storage: "0G Galileo Testnet (Turbo)",
          storage: {
            connected: this.storage?.isConnected() || false,
            network: "0G Galileo Testnet (Turbo)",
          },
        }));
        return;
      }

      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not found" }));
    });

    await new Promise<void>((resolve) => server.listen(PORT, () => resolve()));
  }
}

// ── Main ──
const orchestrator = new Orchestrator();
orchestrator.start().catch(console.error);
