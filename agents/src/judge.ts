/**
 * ⚖️ Judge Agent (Agent C) — Evaluates evidence, issues verdict.
 *
 * LLM: 0G Compute (qwen-2.5-7b-instruct, TEE-verified) or fallback to custom
 * Comm: AXL P2P or DIRECT HTTP
 * Storage: 0G KV + Log
 * Execution: KeeperHub + 0G Chain contract
 */
import { BaseAgent, type AgentConfig } from "./agent-base";
import * as dotenv from "dotenv";
import { ethers } from "ethers";
import { getControlPort, getRoleAddress, getRolePrivateKey, validateDistinctRoleSigners } from "./runtime-config";
import type { RuntimePayoutStatus, RuntimeVerdict } from "./case-runtime";
dotenv.config({ path: "../.env" });

function getConfig(): AgentConfig {
  // Judge prefers 0G Compute if available, falls back to custom LLM
  const useZGCompute = !!process.env.ZG_SERVICE_URL && !!process.env.ZG_API_SECRET;
  validateDistinctRoleSigners();

  return {
    role: "judge",
    port: parseInt(process.env.AXL_JUDGE_PORT || process.env.AGENT_PORT || "9003"),
    address: getRoleAddress("judge"),
    privateKey: getRolePrivateKey("judge"),
    llmBaseUrl: useZGCompute
      ? `${process.env.ZG_SERVICE_URL}/v1/proxy`
      : process.env.CUSTOM_LLM_URL || "https://api.openai.com/v1",
    llmKey: useZGCompute
      ? process.env.ZG_API_SECRET!
      : process.env.CUSTOM_LLM_KEY || process.env.OPENAI_API_KEY || "",
    llmModel: useZGCompute
      ? "qwen/qwen-2.5-7b-instruct"
      : process.env.CUSTOM_LLM_MODEL || "asi1",
    zgIndexerUrl: process.env.ZG_STORAGE_INDEXER || "https://indexer-storage-testnet-turbo.0g.ai",
    zgKvNodeUrl: process.env.ZG_KV_NODE || "http://3.101.147.150:6789",
    zgRpcUrl: process.env.ZG_RPC_URL || "https://evmrpc-testnet.0g.ai",
    keeperhubKey: process.env.KEEPERHUB_API_KEY || "",
    contractAddress: process.env.CONTRACT_ADDRESS,
    controlPort: getControlPort("judge"),
  };
}

interface Evidence {
  plaintiff: { round: number; content: string; ref: string }[];
  defendant: { round: number; content: string; ref: string }[];
  dispute: string;
}

class JudgeAgent extends BaseAgent {
  private evidence: Evidence = { plaintiff: [], defendant: [], dispute: "" };
  private caseId = 1;
  private plaintiffClosing = "";
  private defendantClosing = "";

  constructor() {
    super(getConfig());
  }

  async start(): Promise<void> {
    this.log("👨‍⚖️  Judge Agent starting...");
    this.log(`   LLM: ${this.config.llmModel} @ ${this.config.llmBaseUrl}`);
    await this.connect();

    const runtimeCase = await this.waitForCaseSeed(120000);
    this.caseId = runtimeCase.id;
    this.evidence.dispute = runtimeCase.dispute;
    await this.reportStatus("ready", `Judge seeded for case #${this.caseId}`);

    // Wait for closing statements from both sides
    await this.reportStatus("awaiting_verdict", "Judge waiting for both closing statements");
    this.log("⏳ Waiting for closing statements...");
    const [plaintiffClose, defendantClose] = await Promise.all([
      this.waitForMessage("CLOSING_STATEMENT", "plaintiff", 120000),
      this.waitForMessage("CLOSING_STATEMENT", "defendant", 120000),
    ]);
    this.plaintiffClosing = plaintiffClose.content;
    this.defendantClosing = defendantClose.content;
    this.caseId = plaintiffClose.caseId;

    this.log("Both closing statements received. Collecting evidence...");

    // Collect all evidence from 0G Storage KV
    await this.collectEvidence();

    // Evaluate and issue verdict
    const verdict = await this.evaluateAndVerdict();

    // Store verdict immutably
    await this.storeVerdictOnChain(verdict);
    await this.reportVerdict(verdict, "resolved", `Judge stored verdict on-chain with status ${verdict.onChain.status}`);

    // Broadcast result
    await this.broadcastVerdict(verdict);

    // Execute payout
    const payout = await this.executePayout(verdict);
    await this.reportPayout(payout, `Payout flow finished with status ${payout.status}`);

    this.log("✅ Judge: Case resolved!");
  }

  private async collectEvidence(): Promise<void> {
    this.evidence = { plaintiff: [], defendant: [], dispute: this.evidence.dispute };

    // Read dispute from KV
    const dispute = await this.readStorageKey(this.getCurrentCase().disputeStorage.key);
    if (dispute) {
      this.evidence.dispute = dispute;
    }

    // Read all rounds from both sides
    for (let round = 1; round <= 3; round++) {
      for (const role of ["plaintiff", "defendant"] as const) {
        const key = `case:${this.caseId}:${role}:round:${round}`;
        const content = await this.readStorageKey(key);
        if (content) {
          this.evidence[role].push({ round, content, ref: key });
        }
      }
    }

    // If KV storage is empty (local mode), use closing statements
    if (this.evidence.plaintiff.length === 0) {
      this.evidence.plaintiff.push({ round: 1, content: this.plaintiffClosing, ref: "local" });
    }
    if (this.evidence.defendant.length === 0) {
      this.evidence.defendant.push({ round: 1, content: this.defendantClosing, ref: "local" });
    }

    this.log(`Evidence: ${this.evidence.plaintiff.length}P / ${this.evidence.defendant.length}D arguments`);
  }

  private async evaluateAndVerdict(): Promise<RuntimeVerdict> {
    this.log("🧠 Evaluating evidence via LLM...");

    const pArgs = this.evidence.plaintiff
      .map((e) => `[R${e.round}] ${e.content}`).join("\n\n");
    const dArgs = this.evidence.defendant
      .map((e) => `[R${e.round}] ${e.content}`).join("\n\n");

    const systemPrompt = `You are Agent C (JUDGE) in a decentralized AI arbitration court running on 0G Compute with TEE verification.
Your reasoning is transparent and verifiable.

Evaluate based on: 1) Logic soundness 2) Evidence quality 3) Persuasiveness.

FORMAT YOUR RESPONSE EXACTLY:
VERDICT: <PLAINTIFF|DEFENDANT|TIED>
REASONING: <Detailed reasoning, 2-4 sentences>`;

    const userPrompt = `DISPUTE: "${this.evidence.dispute}"

PLAINTIFF ARGUMENTS:
${pArgs}

DEFENDANT ARGUMENTS:
${dArgs}

PLAINTIFF CLOSING:
${this.plaintiffClosing}

DEFENDANT CLOSING:
${this.defendantClosing}

Evaluate and issue verdict.`;

    const response = await this.askLLM(systemPrompt, userPrompt, 512);

    const verdictMatch = response.match(/VERDICT:\s*(PLAINTIFF|DEFENDANT|TIED)/i);
    const reasoningMatch = response.match(/REASONING:\s*([\s\S]*)/i);

    const result = verdictMatch
      ? (verdictMatch[1].toUpperCase() as "PLAINTIFF" | "DEFENDANT" | "TIED")
      : "TIED";
    const reasoning = reasoningMatch ? reasoningMatch[1].trim() : response;

    this.log(`⚖️  VERDICT: ${result}`);
    this.log(`📝 ${reasoning.slice(0, 300)}...`);

    // Store reasoning to 0G KV
    const reasoningStorage = await this.storage.storeVerdict(this.caseId, JSON.stringify({ result, reasoning }));
    await this.reportEvidence("verdict", 0, reasoningStorage, `Judge stored verdict reasoning with status ${reasoningStorage.status}`);

    const verdict: RuntimeVerdict = {
      result,
      reasoning,
      reasoningRef: reasoningStorage.ref,
      computeProvider: this.config.llmModel,
      simulated: this.lastLLMMode === "simulated",
      onChain: { status: "pending" },
    };
    await this.reportVerdict(verdict, "resolved", `Judge evaluated case and produced ${result}`);
    return verdict;
  }

  private async storeVerdictOnChain(verdict: RuntimeVerdict): Promise<void> {
    this.log("📜 Storing verdict on-chain (0G Chain)...");

    if (!this.config.contractAddress) {
      this.log("  ⚠️  No contract address configured, skipping on-chain storage.");
      this.log("  Deploy AgentCourt.sol and set CONTRACT_ADDRESS in .env");
      verdict.onChain = { status: "skipped", error: "CONTRACT_ADDRESS not configured" };
      return;
    }

    try {
      const contract = new ethers.Contract(
        this.config.contractAddress,
        ["function resolveCase(uint256,uint8,bytes32)"],
        this.signer
      );

      const verdictCode = verdict.result === "PLAINTIFF" ? 1 : verdict.result === "DEFENDANT" ? 2 : 3;
      const tx = await contract.resolveCase(this.caseId, verdictCode, verdict.reasoningRef);
      await tx.wait();
      verdict.onChain = { status: "confirmed", txHash: tx.hash };
      this.log(`  ✅ On-chain verdict stored! TX: ${tx.hash}`);
    } catch (err) {
      verdict.onChain = { status: "failed", error: (err as Error).message };
      this.log(`  ⚠️  On-chain storage failed: ${(err as Error).message}`);
    }
  }

  private async broadcastVerdict(verdict: RuntimeVerdict): Promise<void> {
    const payload = JSON.stringify({
      result: verdict.result,
      reasoning: verdict.reasoning,
      reasoningRef: verdict.reasoningRef,
      computeProvider: verdict.computeProvider,
      onChain: verdict.onChain,
    });

    this.log("📡 Broadcasting verdict...");
    await this.sendTo("plaintiff", "VERDICT_ISSUED", payload, [verdict.reasoningRef]);
    await this.sendTo("defendant", "VERDICT_ISSUED", payload, [verdict.reasoningRef]);
    this.log("Verdict broadcast via transport ✅");
  }

  private async executePayout(verdict: RuntimeVerdict): Promise<RuntimePayoutStatus> {
    if (!this.config.contractAddress) {
      this.log("💰 Payout skipped: no contract configured.");
      return { status: "skipped", path: "none", actor: "judge", note: "CONTRACT_ADDRESS not configured" };
    }

    const provider = new ethers.JsonRpcProvider(this.config.zgRpcUrl);
    const contractAbi = ["function withdrawWinnings(uint256)"];

    try {
      if (verdict.result === "TIED") {
        const plaintiffKey = getRolePrivateKey("plaintiff");
        const defendantKey = getRolePrivateKey("defendant");

        const plaintiffTx = await new ethers.Contract(this.config.contractAddress, contractAbi, new ethers.Wallet(plaintiffKey, provider)).withdrawWinnings(this.caseId);
        await plaintiffTx.wait();
        const defendantTx = await new ethers.Contract(this.config.contractAddress, contractAbi, new ethers.Wallet(defendantKey, provider)).withdrawWinnings(this.caseId);
        await defendantTx.wait();
        return {
          status: "succeeded",
          path: "tie_refund",
          actor: "judge",
          txHash: `${plaintiffTx.hash},${defendantTx.hash}`,
          note: "Plaintiff and defendant refunds submitted on-chain",
        };
      }

      const winner = verdict.result === "PLAINTIFF" ? "plaintiff" : "defendant";
      const winnerKey = getRolePrivateKey(winner);

      const contract = new ethers.Contract(this.config.contractAddress, contractAbi, new ethers.Wallet(winnerKey, provider));
      const tx = await contract.withdrawWinnings(this.caseId);
      await tx.wait();
      return {
        status: "succeeded",
        path: "winner_withdrawal",
        actor: winner,
        txHash: tx.hash,
        note: `Winner withdrawal submitted on-chain by ${winner}`,
      };
    } catch (err) {
      return {
        status: "failed",
        path: verdict.result === "TIED" ? "tie_refund" : "winner_withdrawal",
        actor: verdict.result === "PLAINTIFF" ? "plaintiff" : verdict.result === "DEFENDANT" ? "defendant" : "judge",
        error: (err as Error).message,
      };
    }
  }
}

const agent = new JudgeAgent();
agent.start().catch((err) => { console.error("Judge crashed:", err); process.exit(1); });
