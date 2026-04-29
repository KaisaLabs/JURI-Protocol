/**
 * Base Agent — shared logic with transport abstraction.
 * Supports both AXL (production) and DIRECT (dev/test) transport modes.
 */
import { ZgStorage } from "./storage";
import { KeeperHubClient } from "./keeperhub";
import { createTransport, type ITransport } from "./transport";
import OpenAI from "openai";
import type { AgentIdentity, AgentMessage, CaseState, AgentRole, EvidenceEntry } from "./types";
import { ethers } from "ethers";

export type Verdict = "PLAINTIFF" | "DEFENDANT" | "TIED";

export interface AgentConfig {
  role: "plaintiff" | "defendant" | "judge";
  port: number; // local port for transport
  address: string;
  privateKey: string;
  llmBaseUrl: string;
  llmKey: string;
  llmModel: string;
  zgIndexerUrl: string;
  zgKvNodeUrl: string;
  zgRpcUrl: string;
  keeperhubKey: string;
  contractAddress?: string; // deployed AgentCourt.sol
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
    this.storage = new ZgStorage(
      config.privateKey, config.zgRpcUrl,
      config.zgIndexerUrl, config.zgKvNodeUrl
    );
    this.keeperhub = new KeeperHubClient(config.keeperhubKey);
    this.signer = new ethers.Wallet(config.privateKey);

    this.llm = new OpenAI({
      baseURL: config.llmBaseUrl,
      apiKey: config.llmKey,
    });

    console.log(`[${config.role.toUpperCase()}] Initialized (transport: ${transportMode})`);
    console.log(`  Role: ${config.role} | Port: ${config.port} | Model: ${config.llmModel}`);
  }

  // ===================== Lifecycle =====================

  async connect(): Promise<void> {
    await this.transport.start(this.config.role, this.config.port);

    // Register message handler
    this.transport.onMessage((msg, from) => {
      this.messageQueue.push({ msg, from });
      this.onMessageReceived(msg, from);
    });

    // Wait for peers
    console.log(`[${this.config.role.toUpperCase()}] Discovering peers...`);
    const discovered = await this.waitForPeers(30000);
    console.log(`[${this.config.role.toUpperCase()}] Peers: ${discovered.join(", ") || "none"}`);

    console.log(`[${this.config.role.toUpperCase()}] Ready.`);
  }

  private async waitForPeers(timeoutMs: number): Promise<AgentRole[]> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const peers = await this.transport.getPeers();
      if (peers.length >= 2) {
        // All peers connected
        for (const p of peers) this.peers[p] = p;
        return peers;
      }
      await this.sleep(1000);
    }
    const remaining = await this.transport.getPeers();
    return remaining;
  }

  // ===================== Messaging =====================

  async sendTo(target: AgentRole, type: string, content: string, evidenceRefs: string[] = []): Promise<boolean> {
    const msg: AgentMessage = {
      type: type as AgentMessage["type"],
      caseId: this.currentCase?.id || 1,
      from: this.config.role,
      to: target,
      content,
      evidenceRefs,
      timestamp: Date.now(),
    };

    // Sign message
    const hash = ethers.keccak256(
      ethers.toUtf8Bytes(JSON.stringify({ ...msg, signature: undefined }))
    );
    msg.signature = await this.signer.signMessage(ethers.getBytes(hash));

    return this.transport.sendMessage(target, msg);
  }

  async sendBroadcast(type: string, content: string, evidenceRefs: string[] = []): Promise<void> {
    const roles: AgentRole[] = ["plaintiff", "defendant", "judge"];
    for (const role of roles) {
      if (role !== this.config.role) {
        await this.sendTo(role, type, content, evidenceRefs);
      }
    }
  }

  /** Poll for a specific message type */
  async waitForMessage(
    type: string,
    fromRole?: AgentRole,
    timeoutMs = 120000
  ): Promise<AgentMessage> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      // Check existing queue
      const idx = this.messageQueue.findIndex(
        (m) =>
          m.msg.type === type &&
          (!fromRole || m.from === fromRole) &&
          (m.msg.to === this.config.role || m.msg.to === "all")
      );
      if (idx >= 0) {
        const found = this.messageQueue[idx];
        this.messageQueue.splice(idx, 1);
        return found.msg;
      }
      await this.sleep(500);
    }
    throw new Error(`[${this.config.role}] Timeout waiting for "${type}" from ${fromRole || "any"}`);
  }

  // ===================== LLM =====================

  async askLLM(system: string, user: string, maxTokens = 1024): Promise<string> {
    try {
      const res = await this.llm.chat.completions.create({
        model: this.config.llmModel,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.7,
        max_tokens: maxTokens,
      });
      return res.choices[0]?.message?.content || "[No response from LLM]";
    } catch (err) {
      console.error(`[${this.config.role}] LLM error:`, (err as Error).message);
      return `[Error: LLM unavailable — ${(err as Error).message}]`;
    }
  }

  // ===================== Storage =====================

  async storeEvidence(caseId: number, round: number, content: string): Promise<string> {
    return this.storage.storeEvidence(caseId, this.config.role, round, content);
  }

  async readStorageKey(key: string): Promise<string | null> {
    return this.storage.readValue(key);
  }

  // ===================== Message handler (override in subclass) =====================

  protected onMessageReceived(_msg: AgentMessage, _from: AgentRole): void {
    // Override in subclass for real-time message handling
  }

  // ===================== Identity =====================

  getIdentity(): AgentIdentity {
    return {
      role: this.config.role,
      address: this.config.address,
      axlPeerId: this.transport.getPeerId(),
      axlPort: this.config.port,
    };
  }

  // ===================== Utils =====================

  protected sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }

  protected log(...args: unknown[]): void {
    console.log(`[${this.config.role.toUpperCase()}]`, ...args);
  }

  async shutdown(): Promise<void> {
    this.isRunning = false;
    await this.transport.stop();
  }

  // ===================== Abstract =====================

  abstract start(): Promise<void>;
}
