/**
 * ⚖️ Defendant Agent (Agent B) — Argues AGAINST the proposition.
 *
 * Transport: AXL (production) / DIRECT (dev/test)
 * LLM: Custom provider (GLM-5 / qwen3.6-plus)
 * Storage: 0G KV
 */
import { BaseAgent, type AgentConfig } from "./agent-base";
import * as dotenv from "dotenv";
dotenv.config({ path: "../.env" });

function getConfig(): AgentConfig {
  return {
    role: "defendant",
    port: parseInt(process.env.AXL_DEFENDANT_PORT || process.env.AGENT_PORT || "9002"),
    address: process.env.DEFENDANT_ADDRESS || process.env.AGENT_ADDRESS || "0xD3f3ndant...",
    privateKey: process.env.DEFENDANT_KEY || process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000002",
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

class DefendantAgent extends BaseAgent {
  private disputeQuestion = "";
  private caseId = 1;
  private allPlaintiffArgs: string[] = [];

  constructor() {
    super(getConfig());
  }

  async start(): Promise<void> {
    this.log("🛡️  Defendant Agent starting...");
    await this.connect();
    while (true) {
      const peers = await this.transport.getPeers();
      if (peers.length >= 2) break;
      this.log("Waiting for peers... (" + peers.length + "/2)");
      await new Promise(r => setTimeout(r, 2000));
    }
    this.log("All peers ready: " + (await this.transport.getPeers()).join(", "));

    // Wait for CASE_CREATED
    const caseMsg = await this.waitForMessage("CASE_CREATED", undefined, 120000);
    this.disputeQuestion = caseMsg.content;
    this.caseId = caseMsg.caseId;
    this.log(`📋 Case #${this.caseId}: "${this.disputeQuestion}"`);

    // === Round 1: Counter to opening ===
    this.log("⏳ Waiting for plaintiff's opening argument...");
    const arg1 = await this.waitForMessage("ARGUMENT_SUBMITTED", "plaintiff", 60000);
    this.allPlaintiffArgs.push(arg1.content);
    const counter1 = await this.generateCounter(1, arg1.content);
    const ref1 = await this.tryStore(1, counter1);
    await this.sendTo("plaintiff", "COUNTER_ARGUMENT", counter1, ref1 ? [ref1] : []);
    this.log("Round 1 counter sent");

    // === Round 2: Counter to rebuttal ===
    this.log("⏳ Waiting for plaintiff's rebuttal...");
    const arg2 = await this.waitForMessage("REBUTTAL", "plaintiff", 60000);
    this.allPlaintiffArgs.push(arg2.content);
    const counter2 = await this.generateCounter(2, arg2.content);
    const ref2 = await this.tryStore(2, counter2);
    await this.sendTo("plaintiff", "COUNTER_ARGUMENT", counter2, ref2 ? [ref2] : []);
    this.log("Round 2 counter sent");

    // === Round 3: Final counter + closing ===
    this.log("⏳ Waiting for plaintiff's final rebuttal...");
    const arg3 = await this.waitForMessage("REBUTTAL", "plaintiff", 60000);
    this.allPlaintiffArgs.push(arg3.content);
    const counter3 = await this.generateCounter(3, arg3.content);
    const ref3 = await this.tryStore(3, counter3);

    // Send closing to judge
    const closingPrompt = `You are the Defendant. Present your CLOSING STATEMENT.
Dispute: "${this.disputeQuestion}"
Plaintiff's arguments: ${this.allPlaintiffArgs.map((a, i) => `[R${i + 1}] ${a.slice(0, 200)}`).join(" | ")}
Summarize why the plaintiff's case fails and why you should win.`;
    const closing = await this.askLLM(closingPrompt, "");
    await this.sendTo("judge", "CLOSING_STATEMENT", closing, [ref1, ref2, ref3].filter(Boolean) as string[]);
    this.log("Closing statement sent to judge ✅");

    // Wait for verdict
    this.log("⏳ Waiting for verdict...");
    const verdictMsg = await this.waitForMessage("VERDICT_ISSUED", "judge", 120000);
    const verdict = JSON.parse(verdictMsg.content);
    this.log(`⚖️  VERDICT: ${verdict.result}`);
    this.log(`📝 ${verdict.reasoning?.slice(0, 200)}...`);

    this.log("✅ Defendant: Done.");
  }

  private async generateCounter(round: number, plaintiffArg: string): Promise<string> {
    const systemPrompt = `You are Agent B (DEFENDANT) in an AI agent arbitration court on the 0G blockchain.
Your role: ARGUE AGAINST the proposition. Challenge reasoning, point out flaws, present counter-evidence.
Round ${round} of 3.
Plaintiff's argument: "${plaintiffArg}"`;

    const userPrompt = `Counter the plaintiff's claim for dispute: "${this.disputeQuestion}". Be logical and evidence-based.`;
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

const agent = new DefendantAgent();
agent.start().catch((err) => { console.error("Defendant crashed:", err); process.exit(1); });
