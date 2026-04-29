/**
 * ⚖️ Plaintiff Agent (Agent A)
 *
 * Role: Initiates a dispute, presents arguments and evidence,
 *       responds to counter-arguments, makes final statement.
 *
 * LLM: Custom provider (GLM-5 / qwen3.6-plus)
 * Comm: AXL P2P
 * Storage: 0G KV for arguments
 */
import { BaseAgent, type AgentConfig } from "./agent-base";
import type { AgentMessage } from "./types";
import * as dotenv from "dotenv";
dotenv.config({ path: "../.env" });

const config: AgentConfig = {
  role: "plaintiff",
  axlPort: parseInt(process.env.AXL_PLAINTIFF_PORT || "9001"),
  address: process.env.PLAINTIFF_ADDRESS || process.env.PRIVATE_KEY!,
  privateKey: process.env.PLAINTIFF_KEY || process.env.PRIVATE_KEY!,
  llmBaseUrl: process.env.CUSTOM_LLM_URL!,
  llmKey: process.env.CUSTOM_LLM_KEY!,
  llmModel: process.env.CUSTOM_LLM_MODEL || "glm-5",
  zgIndexerUrl: process.env.ZG_STORAGE_INDEXER!,
  zgKvNodeUrl: process.env.ZG_KV_NODE!,
  zgRpcUrl: process.env.ZG_RPC_URL!,
  keeperhubKey: process.env.KEEPERHUB_API_KEY!,
};

class PlaintiffAgent extends BaseAgent {
  private disputeQuestion: string | null = null;

  constructor() {
    super(config);
  }

  async start(): Promise<void> {
    console.log("⚖️  Plaintiff Agent starting...");
    await this.connect();

    // Listen for new dispute creation (from web UI)
    const dispute = await this.waitForDispute();
    this.disputeQuestion = dispute;

    console.log(`📋 Dispute: "${this.disputeQuestion}"`);

    // Round 1: Present opening argument
    await this.presentArgument(1);

    // Round 2: Counter the defendant's argument
    await this.counterArgument(2);

    // Round 3: Final rebuttal
    await this.finalRebuttal(3);

    console.log("✅ Plaintiff: All arguments submitted. Waiting for verdict...");
  }

  /** Wait for a dispute to be created via web UI */
  private async waitForDispute(): Promise<string> {
    console.log("[Plaintiff] Waiting for dispute...");

    while (!this.disputeQuestion) {
      const msgs = await this.axl.receiveMessages();
      for (const { from, message } of msgs) {
        if (message.type === "CASE_CREATED") {
          this.disputeQuestion = message.content;
          return message.content;
        }
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
    return this.disputeQuestion!;
  }

  /** Present an argument round */
  private async presentArgument(round: number): Promise<void> {
    console.log(`[Plaintiff] Round ${round}: Generating argument...`);

    const systemPrompt = `You are Agent A (Plaintiff) in an AI agent arbitration court.
Your role is to ARGUE IN FAVOR of a proposition. Be persuasive, cite
logical reasoning, and provide clear evidence.

Current dispute: "${this.disputeQuestion}"

You are in Round ${round}. Respond with a concise, compelling argument.`;

    const userPrompt =
      round === 1
        ? `Present your opening argument for: "${this.disputeQuestion}"`
        : `Present your rebuttal (Round ${round}) for: "${this.disputeQuestion}"`;

    const argument = await this.askLLM(systemPrompt, userPrompt);

    // Store to 0G Storage
    const evidenceRef = await this.storage.storeEvidence(
      1,
      "plaintiff",
      round,
      argument
    );

    // Send to defendant via AXL
    await this.sendMessage("defendant-peer-id", {
      type: round === 1 ? "ARGUMENT_SUBMITTED" : "REBUTTAL",
      caseId: 1,
      from: "plaintiff",
      to: "defendant",
      content: argument,
      evidenceRefs: [evidenceRef],
      timestamp: Date.now(),
    });

    console.log(`[Plaintiff] Round ${round} argument stored: ${evidenceRef}`);
  }

  private async counterArgument(round: number): Promise<void> {
    // Wait for defendant's argument first
    console.log("[Plaintiff] Waiting for defendant's counter-argument...");
    await this.waitForMessage("COUNTER_ARGUMENT");

    await this.presentArgument(round);
  }

  private async finalRebuttal(round: number): Promise<void> {
    await this.waitForMessage("COUNTER_ARGUMENT");
    await this.presentArgument(round);
  }

  /** Wait for a specific message type */
  private async waitForMessage(type: string): Promise<AgentMessage> {
    while (true) {
      const msgs = await this.axl.receiveMessages();
      for (const { message } of msgs) {
        if (message.type === type && message.to === "plaintiff") {
          console.log(`[Plaintiff] Received: ${type}`);
          return message;
        }
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

const agent = new PlaintiffAgent();
agent.start().catch(console.error);
