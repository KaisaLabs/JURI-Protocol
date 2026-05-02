/**
 * Base Agent — shared logic with transport abstraction.
 * Supports AXL (production) and DIRECT (dev/test) modes.
 */
import { ZgStorage } from "./storage";
import { KeeperHubClient } from "./keeperhub";
import { createTransport, type ITransport } from "./transport";
import OpenAI from "openai";
import type { AgentIdentity, AgentMessage, CaseState, AgentRole } from "./types";
import { ethers } from "ethers";

export type Verdict = "PLAINTIFF" | "DEFENDANT" | "TIED";

export interface AgentConfig {
  role: "plaintiff" | "defendant" | "judge";
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
}

export abstract class BaseAgent {
  public readonly config: AgentConfig;
  protected transport: ITransport;
  protected storage: ZgStorage;
  protected keeperhub: KeeperHubClient;
  protected llm: OpenAI;
  protected signer: ethers.Wallet;
  protected currentCase: CaseState | null = null;
  protected peers: Record<AgentRole, string> = {} as Record<AgentRole, string>;
  protected messageQueue: { msg: AgentMessage; from: AgentRole }[] = [];
  protected isRunning = true;

  constructor(config: AgentConfig) {
    this.config = config;
    const transportMode = process.env.AGENT_TRANSPORT || "axl";
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
    await this.storage.connect();
    await this.transport.start(this.config.role, this.config.port);
    this.transport.onMessage((msg, from) => {
      this.messageQueue.push({ msg, from });
      this.onMessageReceived(msg, from);
    });
    this.log(`Discovering peers...`);
    const discovered = await this.waitForPeers(30000);
    this.log(`Peers: ${discovered.join(", ") || "none"}. Ready.`);
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

  async sendTo(target: AgentRole, type: string, content: string, evidenceRefs: string[] = [], retries = 5): Promise<boolean> {
    const msg: AgentMessage = {
      type: type as AgentMessage["type"], caseId: this.currentCase?.id || 1,
      from: this.config.role, to: target, content, evidenceRefs, timestamp: Date.now(),
    };
    const hash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify({ ...msg, signature: undefined })));
    msg.signature = await this.signer.signMessage(ethers.getBytes(hash));

    for (let i = 0; i < retries; i++) {
      const ok = await this.transport.sendMessage(target, msg);
      if (ok) return true;
      this.log("Retry " + (i+1) + "/" + retries + " sending to " + target);
      await this.sleep(1000 * (i + 1));
    }
    this.log("⚠️  Failed to send " + type + " to " + target + " after " + retries + " retries");
    return false;
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
      const res = await this.llm.chat.completions.create({
        model: this.config.llmModel,
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
        temperature: 0.7, max_tokens: maxTokens,
      });
      return res.choices[0]?.message?.content || "[No response]";
    } catch (err) {
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
    return this.storage.storeEvidence(caseId, this.config.role, round, content);
  }

  async readStorageKey(key: string): Promise<string | null> { return this.storage.readValue(key); }
  protected onMessageReceived(_msg: AgentMessage, _from: AgentRole): void {}

  getIdentity(): AgentIdentity {
    return { role: this.config.role, address: this.config.address, axlPeerId: this.transport.getPeerId(), axlPort: this.config.port };
  }

  protected sleep(ms: number): Promise<void> { return new Promise(r => setTimeout(r, ms)); }
  protected log(...args: unknown[]): void { console.log(`[${this.config.role.toUpperCase()}]`, ...args); }
  async shutdown(): Promise<void> { this.isRunning = false; await this.transport.stop(); }
  abstract start(): Promise<void>;
}
