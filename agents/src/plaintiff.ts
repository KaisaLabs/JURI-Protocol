/**
 * ⚖️ Plaintiff Agent (Agent A) — Argues IN FAVOR of the proposition.
 *
 * Transport: AXL (production) / DIRECT (dev/test)
 * LLM: Custom provider (GLM-5 / qwen3.6-plus)
 * Storage: 0G KV
 */
import { BaseAgent, type AgentConfig } from "./agent-base";
import * as dotenv from "dotenv";
import { getControlPort, getRoleAddress, getRolePrivateKey, validateDistinctRoleSigners } from "./runtime-config";
dotenv.config({ path: "../.env" });

function getConfig(): AgentConfig {
  validateDistinctRoleSigners();
  return {
    role: "plaintiff",
    port: parseInt(process.env.AXL_PLAINTIFF_PORT || process.env.AGENT_PORT || "9001"),
    address: getRoleAddress("plaintiff"),
    privateKey: getRolePrivateKey("plaintiff"),
    llmBaseUrl: process.env.CUSTOM_LLM_URL || "https://api.openai.com/v1",
    llmKey: process.env.CUSTOM_LLM_KEY || process.env.OPENAI_API_KEY || "",
    llmModel: process.env.CUSTOM_LLM_MODEL || "glm-5",
    zgIndexerUrl: process.env.ZG_STORAGE_INDEXER || "https://indexer-storage-testnet-turbo.0g.ai",
    zgKvNodeUrl: process.env.ZG_KV_NODE || "http://3.101.147.150:6789",
    zgRpcUrl: process.env.ZG_RPC_URL || "https://evmrpc-testnet.0g.ai",
    keeperhubKey: process.env.KEEPERHUB_API_KEY || "",
    contractAddress: process.env.CONTRACT_ADDRESS,
    controlPort: getControlPort("plaintiff"),
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
    // Wait for both peers to be available
    while (true) {
      const peers = await this.transport.getPeers();
      if (peers.length >= 2) break;
      this.log("Waiting for peers... (" + peers.length + "/2)");
      await new Promise(r => setTimeout(r, 2000));
    }
    this.log("All peers ready: " + (await this.transport.getPeers()).join(", "));

    const runtimeCase = await this.waitForCaseSeed(120000);
    this.disputeQuestion = runtimeCase.dispute;
    this.caseId = runtimeCase.id;
    await this.reportStatus("ready", `Plaintiff seeded for case #${this.caseId}`);

    this.log(`📋 Case #${this.caseId}: "${this.disputeQuestion}"`);

    // === Round 1: Opening Argument ===
    await this.reportStatus("debating", "Plaintiff generating opening argument");
    this.log("📢 Round 1: Opening Argument");
    const arg1 = await this.generateArgument(1, "", "");
    const ref1 = await this.tryStore(1, arg1);
    await this.reportEvidence("argument", 1, ref1, "Plaintiff opening argument stored");
    await this.sendTo("defendant", "ARGUMENT_SUBMITTED", arg1, [ref1.ref]);
    this.log("Opening argument sent to defendant");

    // === Round 2: Rebuttal ===
    this.log("🔁 Round 2: Waiting for defendant's counter...");
    const counter1 = await this.waitForMessage("COUNTER_ARGUMENT", "defendant", 60000);
    const arg2 = await this.generateArgument(2, counter1.content, this.disputeQuestion);
    const ref2 = await this.tryStore(2, arg2);
    await this.reportEvidence("argument", 2, ref2, "Plaintiff rebuttal stored");
    await this.sendTo("defendant", "REBUTTAL", arg2, [ref2.ref]);
    this.log("Rebuttal sent");

    // === Round 3: Final Rebuttal ===
    this.log("🔁 Round 3: Waiting for defendant's second counter...");
    const counter2 = await this.waitForMessage("COUNTER_ARGUMENT", "defendant", 60000);
    const arg3 = await this.generateArgument(3, counter2.content, this.disputeQuestion);
    const ref3 = await this.tryStore(3, arg3);
    await this.reportEvidence("argument", 3, ref3, "Plaintiff final rebuttal stored");
    await this.sendTo("defendant", "REBUTTAL", arg3, [ref3.ref]);

    // Also send closing to judge
    const closingPrompt = `You are the Plaintiff. Present your CLOSING STATEMENT summarizing why you should win the case: "${this.disputeQuestion}". Be concise and compelling.`;
    const closing = await this.askLLM(closingPrompt, "");
    await this.reportStatus("awaiting_verdict", "Plaintiff sending closing statement to judge");
    await this.reportEvidence("closing", 3, ref3, "Plaintiff closing statement references submitted evidence");
    await this.sendTo("judge", "CLOSING_STATEMENT", closing, [ref1.ref, ref2.ref, ref3.ref]);
    this.log("Closing statement sent to judge ✅");

    // Wait for verdict
    this.log("⏳ Waiting for verdict...");
    const verdictMsg = await this.waitForMessage("VERDICT_ISSUED", "judge", 120000);
    const verdict = JSON.parse(verdictMsg.content);
    await this.reportStatus("resolved", `Plaintiff received verdict ${verdict.result}`, {
      result: verdict.result,
      reasoningRef: verdict.reasoningRef,
    });
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

  private async tryStore(round: number, content: string) {
    return this.storage.storeEvidence(this.caseId, this.config.role, round, content);
  }
}

const agent = new PlaintiffAgent();
agent.start().catch((err) => { console.error("Plaintiff crashed:", err); process.exit(1); });
