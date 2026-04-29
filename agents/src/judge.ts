/**
 * ⚖️ Judge Agent (Agent C)
 *
 * Role: Evaluates all evidence from both sides, issues a verdict.
 *        Uses 0G Compute for verifiable (TEE-signed) inference.
 *        Stores full reasoning trail on 0G Storage Log.
 *        Executes payout via KeeperHub (or on-chain via smart contract).
 *
 * LLM: 0G Compute (qwen/qwen-2.5-7b-instruct) — TEE-verified
 * Comm: AXL P2P
 * Storage: 0G KV + Log
 * Execution: KeeperHub
 */
import { BaseAgent, type AgentConfig } from "./agent-base";
import type { AgentMessage } from "./types";
import * as dotenv from "dotenv";
dotenv.config({ path: "../.env" });

const config: AgentConfig = {
  role: "judge",
  axlPort: parseInt(process.env.AXL_JUDGE_PORT || "9003"),
  address: process.env.JUDGE_ADDRESS || process.env.PRIVATE_KEY!,
  privateKey: process.env.JUDGE_KEY || process.env.PRIVATE_KEY!,
  // 0G Compute — OpenAI-compatible API
  llmBaseUrl: process.env.ZG_SERVICE_URL
    ? `${process.env.ZG_SERVICE_URL}/v1/proxy`
    : process.env.CUSTOM_LLM_URL!,
  llmKey: process.env.ZG_API_SECRET || process.env.CUSTOM_LLM_KEY!,
  llmModel: process.env.ZG_SERVICE_URL
    ? "qwen/qwen-2.5-7b-instruct"
    : process.env.CUSTOM_LLM_MODEL || "glm-5",
  zgIndexerUrl: process.env.ZG_STORAGE_INDEXER!,
  zgKvNodeUrl: process.env.ZG_KV_NODE!,
  zgRpcUrl: process.env.ZG_RPC_URL!,
  keeperhubKey: process.env.KEEPERHUB_API_KEY!,
};

class JudgeAgent extends BaseAgent {
  private evidence: {
    plaintiff: { round: number; content: string; ref: string }[];
    defendant: { round: number; content: string; ref: string }[];
    dispute: string;
  } | null = null;

  constructor() {
    super(config);
  }

  async start(): Promise<void> {
    console.log("👨‍⚖️  Judge Agent starting...");
    await this.connect();

    // Wait for a case to be ready for judgment
    await this.waitForCase();

    // Collect all evidence
    await this.collectEvidence();

    // Evaluate and issue verdict
    const verdict = await this.evaluateAndVerdict();

    // Store verdict on 0G Storage (immutable log)
    const verdictKey = `case:${1}:verdict:${Date.now()}`;
    const verdictRef = await this.storage.storeVerdict(1, JSON.stringify(verdict));

    console.log(`📜 Verdict stored at: ${verdictRef}`);

    // Broadcast verdict via AXL
    await this.broadcastVerdict(verdict, verdictRef);

    // Execute payout via KeeperHub (or on-chain)
    await this.executePayout(verdict);

    console.log("✅ Judge: Case resolved!");
  }

  private async waitForCase(): Promise<void> {
    console.log("[Judge] Waiting for case...");
    while (true) {
      const msgs = await this.axl.receiveMessages();
      for (const { message } of msgs) {
        if (message.type === "CLOSING_STATEMENT" && message.to === "judge") {
          console.log("[Judge] Closing statements received. Ready to evaluate.");
          return;
        }
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  private async collectEvidence(): Promise<void> {
    console.log("[Judge] Collecting all evidence from 0G Storage...");

    this.evidence = {
      plaintiff: [],
      defendant: [],
      dispute: "",
    };

    // Read from 0G Storage KV (rounds 1-3 for each side)
    for (let round = 1; round <= 3; round++) {
      const pKey = `case:1:plaintiff:round:${round}`;
      const dKey = `case:1:defendant:round:${round}`;

      const pEvidence = await this.storage.readValue(pKey);
      const dEvidence = await this.storage.readValue(dKey);

      if (pEvidence) {
        this.evidence.plaintiff.push({ round, content: pEvidence, ref: pKey });
      }
      if (dEvidence) {
        this.evidence.defendant.push({ round, content: dEvidence, ref: dKey });
      }
    }

    // Read the dispute question
    const disputeData = await this.storage.readValue("case:1:dispute");
    if (disputeData) {
      this.evidence.dispute = disputeData;
    }

    console.log(
      `[Judge] Collected: ${this.evidence.plaintiff.length} plaintiff arguments, ` +
        `${this.evidence.defendant.length} defendant arguments`
    );
  }

  private async evaluateAndVerdict(): Promise<{
    result: "PLAINTIFF" | "DEFENDANT" | "TIED";
    reasoning: string;
  }> {
    console.log("[Judge] Evaluating evidence... (0G Compute TEE-verified)");

    const plaintiffArgs = this.evidence!.plaintiff
      .map((e) => `[Round ${e.round}]: ${e.content}`)
      .join("\n\n");

    const defendantArgs = this.evidence!.defendant
      .map((e) => `[Round ${e.round}]: ${e.content}`)
      .join("\n\n");

    const systemPrompt = `You are Agent C (Judge) in a decentralized AI arbitration court.
Your role is to IMPARTIALLY evaluate arguments from both sides and issue a FAIR verdict.

You are running on 0G Compute with TEE (Trusted Execution Environment) verification,
ensuring your reasoning is transparent, tamper-proof, and verifiable.

Evaluate based on:
1. Logical soundness of arguments
2. Quality of evidence presented
3. Persuasiveness of rebuttals

FORMAT YOUR RESPONSE EXACTLY AS:
VERDICT: <PLAINTIFF or DEFENDANT or TIED>
REASONING: <Your detailed reasoning>`;

    const userPrompt = `DISPUTE: "${this.evidence!.dispute}"

PLAINTIFF ARGUMENTS:
${plaintiffArgs}

DEFENDANT ARGUMENTS:
${defendantArgs}

Evaluate and issue your verdict.`;

    const response = await this.askLLM(systemPrompt, userPrompt);

    // Parse verdict from LLM response
    const verdictMatch = response.match(/VERDICT:\s*(PLAINTIFF|DEFENDANT|TIED)/i);
    const reasoningMatch = response.match(/REASONING:\s*([\s\S]*)/i);

    const result = verdictMatch
      ? (verdictMatch[1].toUpperCase() as "PLAINTIFF" | "DEFENDANT" | "TIED")
      : "TIED";
    const reasoning = reasoningMatch ? reasoningMatch[1].trim() : response;

    console.log(`⚖️  VERDICT: ${result}`);
    console.log(`📝 Reasoning: ${reasoning.slice(0, 200)}...`);

    return { result, reasoning };
  }

  private async broadcastVerdict(
    verdict: { result: string; reasoning: string },
    verdictRef: string
  ): Promise<void> {
    const message: AgentMessage = {
      type: "VERDICT_ISSUED",
      caseId: 1,
      from: "judge",
      to: "plaintiff", // broadcast to all
      content: JSON.stringify(verdict),
      evidenceRefs: [verdictRef],
      timestamp: Date.now(),
    };

    await this.sendMessage("plaintiff-peer-id", message);
    await this.sendMessage("defendant-peer-id", { ...message, to: "defendant" });

    console.log("[Judge] Verdict broadcast via AXL.");
  }

  private async executePayout(verdict: {
    result: string;
    reasoning: string;
  }): Promise<void> {
    if (verdict.result === "TIED") {
      console.log("[Judge] Verdict is TIED — no payout needed.");
      return;
    }

    console.log(`[Judge] Executing payout via KeeperHub for ${verdict.result}...`);

    try {
      // In production, this would transfer actual tokens to the winner
      // For hackathon demo, we log and optionally call KeeperHub
      const winner = verdict.result === "PLAINTIFF" ? "plaintiff" : "defendant";
      console.log(`💰 KeeperHub: Would transfer stake to ${winner}`);

      // Uncomment to actually execute via KeeperHub:
      // await this.keeperhub.executeTransfer({
      //   to: winner === "plaintiff" ? plaintiffAddress : defendantAddress,
      //   amount: stakeAmount,
      //   token: "0G",
      // });

      console.log("[Judge] Payout flow complete. (On-chain resolution via CourtCase.sol)");
    } catch (err) {
      console.error("[Judge] Payout error:", err);
      console.log("[Judge] Payout can be resolved on-chain via AgentCourt.sol");
    }
  }
}

const agent = new JudgeAgent();
agent.start().catch(console.error);
