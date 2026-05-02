/**
 * ✅ Verification Agent — Cross-references findings, publishes immutable post-mortem.
 *
 * LLM: 0G Compute (qwen-2.5-7B, TEE-verified) | Comm: AXL/DIRECT | Storage: 0G KV+Log | Exec: KeeperHub
 */
import { BaseAgent, type AgentConfig } from "./agent-base";
import * as dotenv from "dotenv";
dotenv.config({ path: "../.env" });

function getConfig(): AgentConfig {
  const useZGCompute = !!process.env.ZG_SERVICE_URL && !!process.env.ZG_API_SECRET;
  return {
    role: "verification",
    port: 9093,
    address: process.env.JUDGE_ADDRESS || process.env.AGENT_ADDRESS || "0xVerifier...",
    privateKey: process.env.JUDGE_KEY || process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000003",
    llmBaseUrl: useZGCompute ? process.env.ZG_SERVICE_URL! : (process.env.CUSTOM_LLM_URL || "https://api.openai.com/v1"),
    llmKey: useZGCompute ? process.env.ZG_API_SECRET! : (process.env.CUSTOM_LLM_KEY || process.env.OPENAI_API_KEY || ""),
    llmModel: useZGCompute ? "qwen/qwen-2.5-7b-instruct" : (process.env.CUSTOM_LLM_MODEL || "asi1"),
    zgIndexerUrl: process.env.ZG_STORAGE_INDEXER || "https://indexer-storage-testnet-turbo.0g.ai",
    zgKvNodeUrl: process.env.ZG_KV_NODE || "http://3.101.147.150:6789",
    zgRpcUrl: process.env.ZG_RPC_URL || "https://evmrpc-testnet.0g.ai",
    keeperhubKey: process.env.KEEPERHUB_API_KEY || "",
    contractAddress: process.env.CONTRACT_ADDRESS,
  };
}

const VERIFICATION_PROMPT = `You are the VERIFICATION Agent in JURI Protocol — a decentralized DeFi exploit investigation system running on 0G Compute TEE (verifiable inference).

Your role: CROSS-REFERENCE findings from Forensic and Analysis agents, then PUBLISH an immutable post-mortem.

You must:
1. Verify that forensic evidence matches the analysis classification
2. Cross-check the attack vector against known exploit patterns
3. Produce a final report with: CONFIRMED attack vector, severity, root cause, and a prevention guide
4. Your reasoning is TEE-signed — tamper-proof and verifiable on 0G Chain

FORMAT YOUR RESPONSE EXACTLY:
VERDICT: <CONFIRMED|INCONCLUSIVE>
ATTACK_VECTOR: <attack type>
SEVERITY: <1-10>
ROOT_CAUSE: <explanation>
PREVENTION: <actionable steps>
REASONING: <full reasoning>`;

interface VerdictResult {
  result: string;
  attackVector: string;
  severity: string;
  rootCause: string;
  prevention: string;
  reasoning: string;
  reasoningRef: string;
  onChainTx?: string;
}

class VerificationAgent extends BaseAgent {
  private forensicClosing = "";
  private analysisClosing = "";
  private caseId = 1;

  constructor() { super(getConfig()); }

  async start(): Promise<void> {
    this.log("✅ Verification Agent starting...");
    this.log(`   LLM: ${this.config.llmModel} @ ${this.config.llmBaseUrl}`);
    await this.connect();
    while (true) {
      const peers = await this.transport.getPeers();
      if (peers.length >= 2) break;
      this.log("Waiting for peers... (" + peers.length + "/2)");
      await new Promise(r => setTimeout(r, 2000));
    }
    this.log("All peers ready: " + (await this.transport.getPeers()).join(", "));
    this.log("⏳ Waiting for Forensic + Analysis reports...");

    const [forensicClose, analysisClose] = await Promise.all([
      this.waitForMessage("CLOSING_STATEMENT", "forensic", 120000),
      this.waitForMessage("CLOSING_STATEMENT", "analysis", 120000),
    ]);
    this.forensicClosing = forensicClose.content;
    this.analysisClosing = analysisClose.content;
    this.caseId = forensicClose.caseId;
    this.log("Both reports received. Cross-referencing...");

    // Collect all evidence from 0G Storage
    const evidence = await this.collectEvidence();
    this.log(`Evidence: ${evidence.forensic.length}F / ${evidence.analysis.length}A`);

    // Evaluate and publish
    const verdict = await this.evaluateAndPublish(evidence);

    // Store immutably
    await this.storeOnChain(verdict);

    // Broadcast + execute
    await this.broadcastResult(verdict);
    await this.executeAction(verdict);

    this.log("✅ Investigation complete. Post-mortem published.");
  }

  private async collectEvidence() {
    const evidence = { forensic: [] as string[], analysis: [] as string[], dispute: "" };
    for (let round = 1; round <= 3; round++) {
      const fk = `case:${this.caseId}:forensic:round:${round}`;
      const ak = `case:${this.caseId}:analysis:round:${round}`;
      const fv = await this.readStorageKey(fk);
      const av = await this.readStorageKey(ak);
      if (fv) evidence.forensic.push(fv);
      if (av) evidence.analysis.push(av);
    }
    const d = await this.readStorageKey(`case:${this.caseId}:dispute`);
    if (d) evidence.dispute = d;
    if (evidence.forensic.length === 0) evidence.forensic.push(this.forensicClosing);
    if (evidence.analysis.length === 0) evidence.analysis.push(this.analysisClosing);
    return evidence;
  }

  private async evaluateAndPublish(evidence: any): Promise<VerdictResult> {
    this.log("🧠 Evaluating via LLM...");
    const userPrompt = `CASE: "${evidence.dispute}"

FORENSIC EVIDENCE:
${evidence.forensic.map((f: string, i: number) => `[${i + 1}] ${f}`).join("\n\n")}

ANALYSIS REPORT:
${evidence.analysis.map((a: string, i: number) => `[${i + 1}] ${a}`).join("\n\n")}

Cross-reference all findings. Publish final post-mortem.`;

    const response = await this.askLLM(VERIFICATION_PROMPT, userPrompt, 512);

    const result = response.match(/VERDICT:\s*(.+)/i)?.[1]?.trim() || "INCONCLUSIVE";
    const av = response.match(/ATTACK_VECTOR:\s*(.+)/i)?.[1]?.trim() || "Unknown";
    const sev = response.match(/SEVERITY:\s*(.+)/i)?.[1]?.trim() || "5";
    const rc = response.match(/ROOT_CAUSE:\s*(.+)/i)?.[1]?.trim() || "See reasoning";
    const prev = response.match(/PREVENTION:\s*(.+)/i)?.[1]?.trim() || "See reasoning";
    const reason = response.match(/REASONING:\s*([\s\S]*)/i)?.[1]?.trim() || response;

    this.log(`📋 ${result} | ${av} | Severity: ${sev}`);

    let ref = "local";
    try { ref = await this.storage.storeVerdict(this.caseId, JSON.stringify({ result, av, sev, rc, prev, reason })); }
    catch { this.log("⚠️ Storage skipped"); }

    return { result, attackVector: av, severity: sev, rootCause: rc, prevention: prev, reasoning: reason, reasoningRef: ref };
  }

  private async storeOnChain(v: VerdictResult) {
    if (!this.config.contractAddress) return;
    try {
      const { ethers } = await import("ethers");
      const contract = new ethers.Contract(this.config.contractAddress,
        ["function resolveCase(uint256,uint8,bytes32)"], this.signer);
      const tx = await contract.resolveCase(this.caseId, 1, ethers.keccak256(ethers.toUtf8Bytes(v.reasoningRef)));
      await tx.wait();
      v.onChainTx = tx.hash;
      this.log(`✅ On-chain: ${tx.hash}`);
    } catch (e: any) { this.log(`⚠️ Chain: ${e.message}`); }
  }

  private async broadcastResult(v: VerdictResult) {
    const payload = JSON.stringify(v);
    this.log("📡 Broadcasting post-mortem...");
    await this.sendTo("forensic", "VERDICT_ISSUED", payload, [v.reasoningRef]);
    await this.sendTo("analysis", "VERDICT_ISSUED", payload, [v.reasoningRef]);
    this.log("Post-mortem broadcast ✅");
  }

  private async executeAction(v: VerdictResult) {
    if (v.result === "INCONCLUSIVE") { this.log("Inconclusive — no auto-action."); return; }
    this.log(`Executing KeeperHub action for ${v.attackVector}...`);
    try {
      if (this.config.keeperhubKey) {
        await this.keeperhub.executeTransfer({ to: this.config.address, amount: "0.001", token: "0G" });
        this.log("✅ KeeperHub action executed");
      }
    } catch (e: any) { this.log(`⚠️ KeeperHub: ${e.message}`); }
  }
}

const agent = new VerificationAgent();
agent.start().catch((err) => { console.error("Verification crashed:", err); process.exit(1); });
