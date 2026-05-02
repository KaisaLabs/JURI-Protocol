/**
 * Base Agent — shared logic with transport abstraction.
 * Supports AXL (production) and DIRECT (dev/test) modes.
 */
import { ZgStorage } from "./storage";
import { KeeperHubClient } from "./keeperhub";
import { createTransport, type ITransport } from "./transport";
import OpenAI from "openai";
import type { AgentControlCaseRequest, AgentIdentity, AgentMessage, AgentRole } from "./types";
import { ethers } from "ethers";
import http from "http";
import { getRuntimeConfig } from "./runtime-config";
import { applyRuntimeUpdate, type AgentRuntimeUpdate, type RuntimeCase, type RuntimeCaseStatus, type RuntimeEvidenceRef, type RuntimePayoutStatus, type RuntimeTimelineEvent, type RuntimeVerdict, type StorageWriteResult } from "./case-runtime";

export type Verdict = "PLAINTIFF" | "DEFENDANT" | "TIED";

export interface AgentConfig {
  role: "forensic" | "analysis" | "verification";
  port: number;
  address: string;
  privateKey: string;
  llmBaseUrl: string;
  llmKey: string;
  llmModel: string;
  zgIndexerUrl: string;
  zgKvNodeUrl: string;
  zgRpcUrl: string;
  keeperhubKey: string;
  contractAddress?: string;
  controlPort?: number;
}

export abstract class BaseAgent {
  public readonly config: AgentConfig;
  protected transport: ITransport;
  protected readonly runtimeConfig = getRuntimeConfig();
  protected storage: ZgStorage;
  protected keeperhub: KeeperHubClient;
  protected llm: OpenAI;
  protected signer: ethers.Wallet;
  protected currentCase: RuntimeCase | null = null;
  protected peers: Record<AgentRole, string> = {} as Record<AgentRole, string>;
  protected messageQueue: { msg: AgentMessage; from: AgentRole }[] = [];
  protected isRunning = true;
  private controlServer: http.Server | null = null;
  private seededCase: RuntimeCase | null = null;
  protected lastLLMMode: "provider" | "simulated" = "provider";

  constructor(config: AgentConfig) {
    this.config = config;
    const transportMode = this.runtimeConfig.transportMode;
    this.transport = createTransport(transportMode);
    this.storage = new ZgStorage({
      privateKey: config.privateKey, rpcUrl: config.zgRpcUrl,
      indexerUrl: config.zgIndexerUrl, kvNodeUrl: config.zgKvNodeUrl,
      network: "testnet",
    });
    this.keeperhub = new KeeperHubClient(config.keeperhubKey);
    this.signer = new ethers.Wallet(config.privateKey);
    this.llm = new OpenAI({ baseURL: config.llmBaseUrl, apiKey: config.llmKey });
    this.log(`Initialized (transport: ${transportMode})`);
    this.log(`  ${config.role} | Port: ${config.port} | Model: ${config.llmModel}`);
  }

  async connect(): Promise<void> {
    await this.startControlServer();
    await this.storage.connect();
    // Register message handler BEFORE starting transport so we never miss messages
    this.transport.onMessage((msg, from) => {
      this.messageQueue.push({ msg, from });
      this.onMessageReceived(msg, from);
    });
    await this.transport.start(this.config.role, this.config.port);
    this.log(`Discovering peers...`);
    const discovered = await this.waitForPeers(30000);
    this.log(`Peers: ${discovered.join(", ") || "none"}. Ready.`);
  }

  protected async waitForCaseSeed(timeoutMs = 120000): Promise<RuntimeCase> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (this.seededCase) {
        return this.seededCase;
      }
      await this.sleep(250);
    }
    throw new Error(`[${this.config.role}] Timeout waiting for orchestrator case seed`);
  }

  private async waitForPeers(timeoutMs: number): Promise<AgentRole[]> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const peers = await this.transport.getPeers();
      if (peers.length >= 2) { for (const p of peers) this.peers[p] = p; return peers; }
      await this.sleep(1000);
    }
    return this.transport.getPeers();
  }

  async sendTo(target: AgentRole, type: string, content: string, evidenceRefs: string[] = [], retries = 5, retryForever = false): Promise<boolean> {
    const msg: AgentMessage = {
      type: type as AgentMessage["type"], caseId: this.currentCase?.id || 1,
      from: this.config.role, to: target, content, evidenceRefs, timestamp: Date.now(),
    };
    const hash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify({ ...msg, signature: undefined })));
    msg.signature = await this.signer.signMessage(ethers.getBytes(hash));

    let attempt = 0;
    const maxAttempts = retryForever ? 60 : retries; // cap retryForever at 60 attempts (~10min)
    while (true) {
      const ok = await this.transport.sendMessage(target, msg);
      if (ok) return true;
      attempt++;
      if (attempt >= maxAttempts) {
        this.log("⚠️  Failed to send " + type + " to " + target + " after " + attempt + " attempts");
        return false;
      }
      const backoff = Math.min(retryForever ? 5000 * Math.pow(1.5, Math.min(attempt - 5, 10)) : 1000 * attempt, 30000);
      this.log("🔄 Attempt " + attempt + "/" + (retryForever ? "∞" : retries) + " failed. Retrying in " + (backoff/1000).toFixed(1) + "s...");
      await this.sleep(backoff);
    }
  }

  async waitForMessage(type: string, fromRole?: AgentRole, timeoutMs = 120000): Promise<AgentMessage> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const idx = this.messageQueue.findIndex(m =>
        m.msg.type === type && (!fromRole || m.from === fromRole) &&
        (m.msg.to === this.config.role || m.msg.to === "all"));
      if (idx >= 0) { const found = this.messageQueue[idx]; this.messageQueue.splice(idx, 1); return found.msg; }
      await this.sleep(500);
    }
    throw new Error(`[${this.config.role}] Timeout waiting for "${type}"`);
  }

  async askLLM(system: string, user: string, maxTokens = 1024): Promise<string> {
    try {
      this.lastLLMMode = "provider";
      const res = await this.llm.chat.completions.create({
        model: this.config.llmModel,
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
        temperature: 0.7, max_tokens: maxTokens,
      });
      return res.choices[0]?.message?.content || "[No response]";
    } catch (err) {
      this.lastLLMMode = "simulated";
      this.log(`LLM error: ${(err as Error).message} — using simulation`);
      return this.simulateResponse();
    }
  }

  /** Simulated response when LLM is unavailable (testing only) */
  private simulateResponse(): string {
    const responses: Record<string, string[]> = {
      plaintiff: [
        "The data clearly supports the plaintiff's claim. On-chain metrics show a 73% probability of the stated outcome based on historical patterns analyzed via 0G Storage.",
        "The defendant's counter-argument ignores critical market indicators. Volume analysis confirms the defendant's data sample is biased.",
        "In summary, we have presented verifiable on-chain evidence stored on 0G Storage. We request a verdict in the plaintiff's favor.",
      ],
      defendant: [
        "The plaintiff's claim relies on cherry-picked data. Our 0G Storage audit reveals omitted counter-indicators that support the opposite conclusion.",
        "The plaintiff assumes correlation equals causation. Our 0G Compute-verified analysis shows the opposite trend using a larger dataset.",
        "We have systematically dismantled each of the plaintiff's claims. Our evidence shows the plaintiff's position is fundamentally flawed. Verdict for defendant.",
      ],
      judge: [
        "VERDICT: DEFENDANT. After evaluating all evidence, the defendant's arguments were more logically sound and supported by verifiable on-chain data from 0G Storage.",
        "VERDICT: PLAINTIFF. The plaintiff presented stronger evidence supported by 0G Compute's verifiable inference. The defendant did not challenge the core premise.",
        "VERDICT: TIED. Both sides presented compelling arguments of equal merit. Neither party demonstrated clear superiority. Stakes returned.",
      ],
    };
    const arr = responses[this.config.role] || ["No simulation available."];
    return arr[Math.floor(Math.random() * arr.length)];
  }

  async storeEvidence(caseId: number, round: number, content: string): Promise<string> {
    const result = await this.storage.storeEvidence(caseId, this.config.role, round, content);
    return result.ref;
  }

  async readStorageKey(key: string): Promise<string | null> { return this.storage.readValue(key); }
  protected onMessageReceived(_msg: AgentMessage, _from: AgentRole): void {}

  protected async reportStatus(status: RuntimeCaseStatus, message: string, data?: Record<string, unknown>): Promise<void> {
    await this.reportRuntimeUpdate({
      status,
      timeline: this.makeTimelineEvent(status, message, data),
    });
  }

  protected async reportEvidence(kind: RuntimeEvidenceRef["kind"], round: number, storage: StorageWriteResult, message: string): Promise<void> {
    await this.reportRuntimeUpdate({
      timeline: this.makeTimelineEvent("evidence", message, { round, kind, storage }),
      evidence: [{ role: this.config.role, round, kind, storage }],
    });
  }

  protected async reportVerdict(verdict: RuntimeVerdict, status: RuntimeCaseStatus, message: string): Promise<void> {
    await this.reportRuntimeUpdate({ verdict, status, timeline: this.makeTimelineEvent("verdict", message, { result: verdict.result }) });
  }

  protected async reportPayout(payout: RuntimePayoutStatus, message: string): Promise<void> {
    await this.reportRuntimeUpdate({ payout, timeline: this.makeTimelineEvent("payout", message, payout as unknown as Record<string, unknown>) });
  }

  protected getCurrentCase(): RuntimeCase {
    if (!this.currentCase) {
      throw new Error("Case not initialized");
    }
    return this.currentCase;
  }

  protected async reportRuntimeUpdate(update: Omit<AgentRuntimeUpdate, "caseId">): Promise<void> {
    const runtimeCase = this.getCurrentCase();
    const payload: AgentRuntimeUpdate = { caseId: runtimeCase.id, ...update };
    applyRuntimeUpdate(runtimeCase, payload);
    try {
      await fetch(`${this.runtimeConfig.orchestratorUrl}/api/case/${runtimeCase.id}/runtime`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-agent-token": this.runtimeConfig.controlToken,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5000),
      });
    } catch (error) {
      this.log(`Runtime callback failed: ${(error as Error).message}`);
    }
  }

  getIdentity(): AgentIdentity {
    return { role: this.config.role, address: this.config.address, axlPeerId: this.transport.getPeerId(), axlPort: this.config.port };
  }

  protected sleep(ms: number): Promise<void> { return new Promise(r => setTimeout(r, ms)); }
  protected log(...args: unknown[]): void { console.log(`[${this.config.role.toUpperCase()}]`, ...args); }
  async shutdown(): Promise<void> {
    this.isRunning = false;
    if (this.controlServer) {
      await new Promise<void>((resolve) => this.controlServer!.close(() => resolve()));
    }
    await this.transport.stop();
  }

  private makeTimelineEvent(type: string, message: string, data?: Record<string, unknown>): RuntimeTimelineEvent {
    return {
      at: Date.now(),
      actor: this.config.role,
      type,
      message,
      data,
    };
  }

  private async startControlServer(): Promise<void> {
    const controlPort = this.config.controlPort || this.runtimeConfig.controlPorts[this.config.role];
    await new Promise<void>((resolve) => {
      this.controlServer = http.createServer((req, res) => {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-agent-token");

        if (req.method === "OPTIONS") {
          res.writeHead(204);
          res.end();
          return;
        }

        if (req.method === "GET" && req.url === "/health") {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({
            role: this.config.role,
            controlPort,
            transport: this.runtimeConfig.transportMode,
            caseId: this.currentCase?.id || null,
          }));
          return;
        }

        if (req.method === "POST" && req.url === "/case") {
          if (!this.hasValidControlToken(req)) {
            res.writeHead(401, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: false, error: "Unauthorized" }));
            return;
          }
          let body = "";
          req.on("data", (chunk) => (body += chunk));
          req.on("end", () => {
            try {
              const data = JSON.parse(body) as AgentControlCaseRequest;
              if (this.currentCase && this.currentCase.id !== data.runtimeCase.id && this.currentCase.status !== "resolved" && this.currentCase.status !== "failed") {
                res.writeHead(409, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ ok: false, error: `Agent already running case ${this.currentCase.id}` }));
                return;
              }
              this.currentCase = data.runtimeCase;
              this.seededCase = data.runtimeCase;
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ ok: true, role: this.config.role, caseId: data.runtimeCase.id }));
            } catch (error) {
              res.writeHead(400, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ ok: false, error: (error as Error).message }));
            }
          });
          return;
        }

        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "Not found" }));
      });
      this.controlServer.listen(controlPort, this.runtimeConfig.bindHost, () => resolve());
    });
    this.log(`Control server listening on ${controlPort}`);
  }

  private hasValidControlToken(req: http.IncomingMessage): boolean {
    return req.headers["x-agent-token"] === this.runtimeConfig.controlToken;
  }
  abstract start(): Promise<void>;
}
