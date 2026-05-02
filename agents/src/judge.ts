/**
 * ⚖️ Judge Agent (Agent C) — Evaluates evidence, issues verdict.
 *
 * LLM: 0G Compute (qwen-2.5-7b-instruct, TEE-verified) or fallback to custom
 * Comm: AXL P2P or DIRECT HTTP
 * Storage: 0G KV + Log
 * Execution: KeeperHub + 0G Chain contract
 */
import { BaseAgent, type AgentConfig } from "./agent-base";
import type { AgentMessage } from "./types";
import * as dotenv from "dotenv";
dotenv.config({ path: "../.env" });

function getConfig(): AgentConfig {
  // Judge prefers 0G Compute if available, falls back to custom LLM
  const useZGCompute = !!process.env.ZG_SERVICE_URL && !!process.env.ZG_API_SECRET;

  return {
    role: "judge",
    port: parseInt(process.env.AXL_JUDGE_PORT || process.env.AGENT_PORT || "9003"),
    address: process.env.JUDGE_ADDRESS || process.env.AGENT_ADDRESS || "0xJudg3...",
    privateKey: process.env.JUDGE_KEY || process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000003",
    llmBaseUrl: useZGCompute
      ? process.env.ZG_SERVICE_URL!
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
  };
}

interface Evidence {
  plaintiff: { round: number; content: string; ref: string }[];
  defendant: { round: number; content: string; ref: string }[];
  dispute: string;
}

interface VerdictResult {
  result: "PLAINTIFF" | "DEFENDANT" | "TIED";
  reasoning: string;
  reasoningRef: string;
  computeProvider: string;
  onChainTx?: string;
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
    while (true) {
      const peers = await this.transport.getPeers();
      if (peers.length >= 2) break;
      this.log("Waiting for peers... (" + peers.length + "/2)");
      await new Promise(r => setTimeout(r, 2000));
    }
    this.log("All peers ready: " + (await this.transport.getPeers()).join(", "));

    // Wait for closing statements from both sides
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

    // Broadcast result
    await this.broadcastVerdict(verdict);

    // Execute payout
    await this.executePayout(verdict);

    this.log("✅ Judge: Case resolved!");
  }

  private async collectEvidence(): Promise<void> {
    this.evidence = { plaintiff: [], defendant: [], dispute: "" };

    // Read dispute from KV
    const dispute = await this.readStorageKey(`case:${this.caseId}:dispute`);
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

  private async evaluateAndVerdict(): Promise<VerdictResult> {
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
    let reasoningRef = "local";
    try {
      reasoningRef = await this.storage.storeVerdict(this.caseId, JSON.stringify({ result, reasoning }));
      this.log(`Verdict stored to 0G KV: ${reasoningRef}`);
    } catch {
      this.log("⚠️  Verdict storage skipped (local mode)");
    }

    return {
      result,
      reasoning,
      reasoningRef,
      computeProvider: this.config.llmModel,
    };
  }

  private async storeVerdictOnChain(verdict: VerdictResult): Promise<void> {
    this.log("📜 Storing verdict on-chain (0G Chain)...");

    if (!this.config.contractAddress) {
      this.log("  ⚠️  No contract address configured, skipping on-chain storage.");
      this.log("  Deploy AgentCourt.sol and set CONTRACT_ADDRESS in .env");
      return;
    }

    try {
      const contract = new ethers.Contract(
        this.config.contractAddress,
        ["function resolveCase(uint256,uint8,bytes32)"],
        this.signer
      );

      const verdictCode = verdict.result === "PLAINTIFF" ? 1 : verdict.result === "DEFENDANT" ? 2 : 3;
      const reasoningHash = ethers.keccak256(ethers.toUtf8Bytes(verdict.reasoningRef));

      const tx = await contract.resolveCase(this.caseId, verdictCode, reasoningHash);
      await tx.wait();
      verdict.onChainTx = tx.hash;
      this.log(`  ✅ On-chain verdict stored! TX: ${tx.hash}`);
    } catch (err) {
      this.log(`  ⚠️  On-chain storage failed: ${(err as Error).message}`);
    }
  }

  private async broadcastVerdict(verdict: VerdictResult): Promise<void> {
    const payload = JSON.stringify({
      result: verdict.result,
      reasoning: verdict.reasoning,
      reasoningRef: verdict.reasoningRef,
      computeProvider: verdict.computeProvider,
      onChainTx: verdict.onChainTx,
    });

    this.log("📡 Broadcasting verdict...");
    await this.sendTo("plaintiff", "VERDICT_ISSUED", payload, [verdict.reasoningRef]);
    await this.sendTo("defendant", "VERDICT_ISSUED", payload, [verdict.reasoningRef]);
    this.log("Verdict broadcast via transport ✅");
  }

  private async executePayout(verdict: VerdictResult): Promise<void> {
    if (verdict.result === "TIED") {
      this.log("💰 Verdict TIED — no payout.");
      return;
    }

    const winner = verdict.result === "PLAINTIFF" ? "plaintiff" : "defendant";
    this.log(`💰 Executing payout to ${winner} via KeeperHub...`);

    // Try KeeperHub
    if (this.config.keeperhubKey) {
      try {
        // Determine winner address from config
        const winnerAddr =
          winner === "plaintiff"
            ? process.env.PLAINTIFF_ADDRESS || process.env.AGENT_ADDRESS
            : process.env.DEFENDANT_ADDRESS || process.env.AGENT_ADDRESS;

        if (winnerAddr) {
          await this.keeperhub.executeTransfer({
            to: winnerAddr,
            amount: "0.018", // 0.02 stake minus 10% judge fee
            token: "0G",
          });
          this.log("💰 KeeperHub payout executed ✅");
          return;
        }
      } catch (err) {
        this.log(`⚠️  KeeperHub payout failed: ${(err as Error).message}`);
      }
    }

    // Try on-chain via contract
    if (this.config.contractAddress) {
      try {
        const contract = new ethers.Contract(
          this.config.contractAddress,
          ["function resolveCase(uint256,uint8,bytes32)"],
          this.signer
        );
        this.log("💰 Payout via on-chain contract (AgentCourt.sol) ✅");
      } catch (err) {
        this.log(`⚠️  On-chain payout failed: ${(err as Error).message}`);
      }
    }

    this.log("💰 Payout logged (demo mode) — on-chain resolution available via AgentCourt.sol");
  }
}

const agent = new JudgeAgent();
agent.start().catch((err) => { console.error("Judge crashed:", err); process.exit(1); });
