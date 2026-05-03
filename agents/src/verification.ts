/**
 * ✅ Verification Agent — Cross-references findings, publishes immutable post-mortem.
 *
 * LLM: 0G Compute Broker (qwen-2.5-7B, TEE-verified) | Comm: AXL/DIRECT | Storage: 0G KV+Log | Exec: KeeperHub
 */
import { BaseAgent, type AgentConfig } from "./agent-base";
import { ethers } from "ethers";
import * as dotenv from "dotenv";
dotenv.config({ path: "../.env" });

function getConfig(): AgentConfig {
  return {
    role: "verification",
    port: 9093,
    address: process.env.VERIFICATION_ADDRESS || process.env.AGENT_ADDRESS || "0xVerifier...",
    privateKey: process.env.VERIFICATION_KEY || process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000003",
    llmBaseUrl: process.env.CUSTOM_LLM_URL || "https://api.openai.com/v1",
    llmKey: process.env.CUSTOM_LLM_KEY || process.env.OPENAI_API_KEY || "",
    llmModel: process.env.CUSTOM_LLM_MODEL || "asi1",
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

  // 0G Compute broker state (lazy-loaded via dynamic import)
  private zgBroker: any = null;
  private zgBrokerReady = false;
  private zgProviderAddress: string | null = null;

  constructor() { super(getConfig()); }

  async start(): Promise<void> {
    this.log("✅ Verification Agent starting...");

    // Initialize 0G Compute broker if credentials are available
    await this.initZGBroker();

    this.log(`   LLM: ${this.zgBrokerReady ? "0G Compute TEE (qwen-2.5-7b)" : this.config.llmModel + " (fallback)"}`);
    await this.connect();
    while (true) {
      const peers = await this.transport.getPeers();
      if (peers.length >= 1) break;
      this.log("Waiting for peers... (" + peers.length + "/1 minimum)");
      await new Promise(r => setTimeout(r, 2000));
    }
    this.log("Peers ready: " + (await this.transport.getPeers()).join(", "));
    this.log("⏳ Waiting for Forensic + Analysis reports...");

    const [forensicClose, analysisClose] = await Promise.all([
      this.waitForMessage("CLOSING_STATEMENT", "forensic", 600000),
      this.waitForMessage("CLOSING_STATEMENT", "analysis", 600000),
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

    // Report verdict to orchestrator so the case becomes "resolved"
    await this.reportVerdict(
      { result: verdict.result as "FORENSIC" | "ANALYSIS" | "TIED", reasoning: verdict.reasoning, reasoningRef: verdict.reasoningRef, computeProvider: this.zgBrokerReady ? "0G Compute TEE" : (this.lastLLMMode === "provider" ? "Custom Provider" : "Simulated"), simulated: this.lastLLMMode === "simulated", onChain: { status: verdict.onChainTx ? "confirmed" : "skipped", txHash: verdict.onChainTx } },
      "resolved",
      `Verdict: ${verdict.result} — ${verdict.attackVector}`
    );

    // Broadcast verdict to agents first (fast), then store on-chain (slow)
    await this.broadcastResult(verdict);

    // Store immutably
    await this.storeOnChain(verdict);

    // Execute
    await this.executeAction(verdict);

    this.log("✅ Investigation complete. Post-mortem published.");
  }

  /**
   * Initialize 0G Compute broker.
   * Requires: VERIFICATION_KEY funded with 3+ 0G for ledger creation.
   * The provider address is extracted from ZG_API_SECRET or discovered via broker.
   */
  private async initZGBroker(): Promise<void> {
    const hasApiKey = !!process.env.ZG_API_SECRET;

    if (!hasApiKey) {
      this.log("⚠️ ZG_API_SECRET not set — 0G Compute TEE unavailable. Using fallback LLM.");
      return;
    }

    try {
      // Use createRequire to load CJS version (ESM bundle is broken with pnpm)
      const { createRequire } = await import("module");
      const require = createRequire(import.meta.url);
      const mod = require("@0gfoundation/0g-compute-ts-sdk");
      const { createZGComputeNetworkBroker } = mod;

      const provider = new ethers.JsonRpcProvider(this.config.zgRpcUrl);
      const wallet = new ethers.Wallet(this.config.privateKey, provider);
      this.zgBroker = await createZGComputeNetworkBroker(wallet);

      // Try to extract provider address from API secret
      // Format: app-sk-{base64(JSON|signature)}
      if (process.env.ZG_API_SECRET?.startsWith("app-sk-")) {
        try {
          const b64 = process.env.ZG_API_SECRET.replace("app-sk-", "");
          const raw = Buffer.from(b64, "base64").toString();
          // Split JSON from signature: {"address":...,"tokenId":0}|0x...
          const jsonEnd = raw.indexOf("}");
          if (jsonEnd > 0) {
            const json = JSON.parse(raw.slice(0, jsonEnd + 1));
            this.zgProviderAddress = json.provider;
            this.log(`   Provider: ${this.zgProviderAddress}`);
          }
        } catch {
          this.log("⚠️ Could not parse provider from API key");
        }
      }

      // Validate broker can access inference
      if (this.zgProviderAddress) {
        try {
          const meta = await this.zgBroker.inference.getServiceMetadata(this.zgProviderAddress);
          this.log(`   0G Compute endpoint: ${meta.endpoint}`);
          this.zgBrokerReady = true;
        } catch (err: any) {
          this.log(`⚠️ 0G Compute broker not ready: ${err.message}. Fund wallet with 3+ 0G on testnet.`);
        }
      }
    } catch (err: any) {
      this.log(`⚠️ 0G Compute broker init failed: ${err.message}. Using fallback.`);
    }
  }

  /**
   * Override askLLM to use 0G Compute broker when available.
   */
  async askLLM(system: string, user: string, maxTokens = 1024): Promise<string> {
    // Try 0G Compute broker first
    if (this.zgBrokerReady && this.zgBroker && this.zgProviderAddress) {
      try {
        const { endpoint } = await this.zgBroker.inference.getServiceMetadata(this.zgProviderAddress);
        const headers = await this.zgBroker.inference.getRequestHeaders(this.zgProviderAddress);

        const res = await fetch(`${endpoint}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...headers,
          },
          body: JSON.stringify({
            model: "qwen/qwen-2.5-7b-instruct",
            messages: [
              { role: "system", content: system },
              { role: "user", content: user },
            ],
            temperature: 0.7,
            max_tokens: maxTokens,
          }),
          signal: AbortSignal.timeout(60000),
        });

        if (res.ok) {
          const data = await res.json();
          this.lastLLMMode = "provider";
          return data.choices?.[0]?.message?.content || "[No response]";
        }

        this.log(`0G Compute returned ${res.status}, falling back...`);
      } catch (err: any) {
        this.log(`0G Compute error: ${err.message}, falling back...`);
      }
    }

    // Fall back to parent class (OpenAI-compatible + simulation)
    return super.askLLM(system, user, maxTokens);
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
    try { const r = await this.storage.storeVerdict(this.caseId, JSON.stringify({ result, av, sev, rc, prev, reason })); ref = r.ref; }
    catch { this.log("⚠️ Storage skipped"); }

    return { result, attackVector: av, severity: sev, rootCause: rc, prevention: prev, reasoning: reason, reasoningRef: ref };
  }

  private async storeOnChain(v: VerdictResult) {
    if (!this.config.contractAddress) return;
    try {
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
