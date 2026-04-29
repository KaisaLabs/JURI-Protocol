/**
 * ⚖️ Plaintiff Agent (Agent A) — Argues IN FAVOR of the proposition.
 *
 * Transport: AXL (production) / DIRECT (dev/test)
 * LLM: Custom provider (GLM-5 / qwen3.6-plus)
 * Storage: 0G KV
 */
import { BaseAgent, type AgentConfig } from "./agent-base";
import type { AgentMessage, AgentRole } from "./types";
import * as dotenv from "dotenv";
dotenv.config({ path: "../.env" });

function getConfig(): AgentConfig {
  return {
    role: "plaintiff",
    port: parseInt(process.env.AXL_PLAINTIFF_PORT || process.env.AGENT_PORT || "9001"),
    address: process.env.PLAINTIFF_ADDRESS || process.env.AGENT_ADDRESS || "0xP1aint1ff...",
    privateKey: process.env.PLAINTIFF_KEY || process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000001",
    llmBaseUrl: process.env.CUSTOM_LLM_URL || "https://api.openai.com/v1",
    llmKey: process.env.CUSTOM_LLM_KEY || process.env.OPENAI_API_KEY || "",
    llmModel: process.env.CUSTOM_LLM_MODEL || "glm-5",
    zgIndexerUrl: process.env.ZG_STORAGE_INDEXER || "https://indexer-storage-testnet-turbo.0g.ai",
    zgKvNodeUrl: process.env.ZG_KV_NODE || "http://3.101.147.150:6789",
    zgRpcUrl: process.env.ZG_RPC_URL || "https://evmrpc-testnet.0g.ai",
    keeperhubKey: process.env.KEEPERHUB_API_KEY || "",
    contractAddress: process.env.CONTRACT_ADDRESS,
  };
}

class PlaintiffAgent extends BaseAgent {
  private disputeQuestion = "";
  private caseId = 1;

  constructor() {
    super(getConfig());
  }

  async start(): Promise<void> {
    this.log("⚖️  Plaintiff Agent starting...");
    await this.connect();

    // Wait for CASE_CREATED from orchestrator
    const caseMsg = await this.waitForMessage("CASE_CREATED", undefined, 120000);
    this.disputeQuestion = caseMsg.content;
    this.caseId = caseMsg.caseId;

    this.log(`📋 Case #${this.caseId}: "${this.disputeQuestion}"`);

    // Store dispute to 0G KV
    try {
      await this.storage.storeDispute(this.caseId, this.disputeQuestion);
      this.log("Dispute stored to 0G KV");
    } catch (err) {
      this.log("⚠️  0G Storage unavailable — continuing without persistence");
    }

    // === Round 1: Opening Argument ===
    this.log("📢 Round 1: Opening Argument");
    const arg1 = await this.generateArgument(1, "", "");
    const ref1 = await this.tryStore(1, arg1);
    await this.sendTo("defendant", "ARGUMENT_SUBMITTED", arg1, ref1 ? [ref1] : []);
    this.log("Opening argument sent to defendant");

    // === Round 2: Rebuttal ===
    this.log("🔁 Round 2: Waiting for defendant's counter...");
    const counter1 = await this.waitForMessage("COUNTER_ARGUMENT", "defendant", 60000);
    const arg2 = await this.generateArgument(2, counter1.content, this.disputeQuestion);
    const ref2 = await this.tryStore(2, arg2);
    await this.sendTo("defendant", "REBUTTAL", arg2, ref2 ? [ref2] : []);
    this.log("Rebuttal sent");

    // === Round 3: Final Rebuttal ===
    this.log("🔁 Round 3: Waiting for defendant's second counter...");
    const counter2 = await this.waitForMessage("COUNTER_ARGUMENT", "defendant", 60000);
    const arg3 = await this.generateArgument(3, counter2.content, this.disputeQuestion);
    const ref3 = await this.tryStore(3, arg3);
    await this.sendTo("defendant", "REBUTTAL", arg3, ref3 ? [ref3] : []);

    // Also send closing to judge
    const closingPrompt = `You are the Plaintiff. Present your CLOSING STATEMENT summarizing why you should win the case: "${this.disputeQuestion}". Be concise and compelling.`;
    const closing = await this.askLLM(closingPrompt, "");
    await this.sendTo("judge", "CLOSING_STATEMENT", closing, [ref1, ref2, ref3].filter(Boolean) as string[]);
    this.log("Closing statement sent to judge ✅");

    // Wait for verdict
    this.log("⏳ Waiting for verdict...");
    const verdictMsg = await this.waitForMessage("VERDICT_ISSUED", "judge", 120000);
    const verdict = JSON.parse(verdictMsg.content);
    this.log(`⚖️  VERDICT: ${verdict.result}`);
    this.log(`📝 ${verdict.reasoning?.slice(0, 200)}...`);

    this.log("✅ Plaintiff: Done.");
  }

  private async generateArgument(round: number, opponentArg: string, dispute: string): Promise<string> {
    const systemPrompt = `You are Agent A (PLAINTIFF) in an AI agent arbitration court on the 0G blockchain.
Your role: ARGUE IN FAVOR of the proposition. Be logical, cite evidence, be persuasive.
You are in Round ${round} of 3.
${opponentArg ? `Opponent's last argument: "${opponentArg}"` : ""}`;

    const userPrompt = round === 1
      ? `Opening argument: "${dispute || this.disputeQuestion}". Make your strongest case.`
      : `Rebuttal (Round ${round}). Address the opponent's points and reinforce your position.`;

    return this.askLLM(systemPrompt, userPrompt);
  }

  private async tryStore(round: number, content: string): Promise<string | null> {
    try {
      return await this.storage.storeEvidence(this.caseId, this.config.role, round, content);
    } catch {
      return null;
    }
  }
}

const agent = new PlaintiffAgent();
agent.start().catch((err) => { console.error("Plaintiff crashed:", err); process.exit(1); });
