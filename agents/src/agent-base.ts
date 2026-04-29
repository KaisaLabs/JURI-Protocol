/**
 * Base Agent — shared logic for Plaintiff, Defendant, and Judge agents.
 * Each agent connects to its own AXL node, 0G Storage, and LLM provider.
 */
import { AxlClient } from "./axl-client";
import { ZgStorage } from "./storage";
import { KeeperHubClient } from "./keeperhub";
import OpenAI from "openai";
import type { AgentIdentity, AgentMessage, CaseState } from "./types";
import { ethers } from "ethers";

export type Verdict = "PLAINTIFF" | "DEFENDANT" | "TIED";

export interface AgentConfig {
  role: "plaintiff" | "defendant" | "judge";
  axlPort: number;
  address: string;
  privateKey: string;
  llmBaseUrl: string;
  llmKey: string;
  llmModel: string;
  zgIndexerUrl: string;
  zgKvNodeUrl: string;
  zgRpcUrl: string;
  keeperhubKey: string;
}

export abstract class BaseAgent {
  public readonly config: AgentConfig;
  protected axl: AxlClient;
  protected storage: ZgStorage;
  protected keeperhub: KeeperHubClient;
  protected llm: OpenAI;
  protected signer: ethers.Wallet;
  protected currentCase: CaseState | null = null;

  constructor(config: AgentConfig) {
    this.config = config;

    this.axl = new AxlClient(config.axlPort);
    this.storage = new ZgStorage(
      config.privateKey,
      config.zgRpcUrl,
      config.zgIndexerUrl,
      config.zgKvNodeUrl
    );
    this.keeperhub = new KeeperHubClient(config.keeperhubKey);
    this.signer = new ethers.Wallet(config.privateKey);

    this.llm = new OpenAI({
      baseURL: config.llmBaseUrl,
      apiKey: config.llmKey,
    });

    // Log our identity
    console.log(`[${config.role.toUpperCase()}] Agent initialized`);
    console.log(`  Address: ${config.address}`);
    console.log(`  AXL Port: ${config.axlPort}`);
  }

  /** Connect to AXL network */
  async connect(): Promise<void> {
    await this.axl.waitForReady();
    const topology = await this.axl.getTopology();
    console.log(
      `[${this.config.role.toUpperCase()}] AXL connected. Peers:`,
      topology.peers?.length || 0
    );
  }

  /** Get our identity */
  getIdentity(): AgentIdentity {
    return {
      role: this.config.role,
      address: this.config.address,
      axlPeerId: this.axl.peerId || "unknown",
      axlPort: this.config.axlPort,
    };
  }

  /** Send a message to another agent via AXL */
  async sendMessage(toPeerId: string, message: AgentMessage): Promise<void> {
    message.from = this.config.role;
    message.timestamp = Date.now();

    const signed = await this.signMessage(message);
    await this.axl.sendMessage(toPeerId, signed);
  }

  /** Sign a message with our wallet */
  private async signMessage(message: AgentMessage): Promise<AgentMessage> {
    const hash = ethers.keccak256(
      ethers.toUtf8Bytes(JSON.stringify({ ...message, signature: undefined }))
    );
    message.signature = await this.signer.signMessage(ethers.getBytes(hash));
    return message;
  }

  /** Verify a message signature */
  async verifyMessage(message: AgentMessage, expectedAddress: string): Promise<boolean> {
    if (!message.signature) return false;
    try {
      const hash = ethers.keccak256(
        ethers.toUtf8Bytes(JSON.stringify({ ...message, signature: undefined }))
      );
      const recovered = ethers.recoverAddress(
        ethers.getBytes(hash),
        message.signature
      );
      return recovered.toLowerCase() === expectedAddress.toLowerCase();
    } catch {
      return false;
    }
  }

  /** LLM completion */
  async askLLM(system: string, user: string): Promise<string> {
    const res = await this.llm.chat.completions.create({
      model: this.config.llmModel,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.7,
      max_tokens: 1024,
    });
    return res.choices[0].message.content || "";
  }

  /** Store data to 0G KV */
  async storeEvidence(key: string, value: string): Promise<string> {
    return this.storage.storeEvidence(
      this.currentCase?.id || 0,
      this.config.role,
      Date.now(),
      value
    );
  }

  /** Read data from 0G KV */
  async readEvidence(key: string): Promise<string | null> {
    return this.storage.readValue(key);
  }

  /** Main agent loop — implemented by each agent type */
  abstract start(): Promise<void>;
}
