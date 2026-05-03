/**
 * 🔍 Forensic Agent — Traces DeFi exploit fund flows, collects on-chain evidence.
 *
 * Transport: AXL (prod) / DIRECT (dev) | LLM: Custom (asi1) | Storage: 0G KV
 */
import { BaseAgent, type AgentConfig } from "./agent-base";
import type { AgentMessage } from "./types";
import * as dotenv from "dotenv";
dotenv.config({ path: "../.env" });

function getConfig(): AgentConfig {
  return {
    role: "forensic",
    port: 9091,
    address: process.env.FORENSIC_ADDRESS || process.env.AGENT_ADDRESS || "0xForensic...",
    privateKey: process.env.FORENSIC_KEY || process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000001",
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

const FORENSIC_PROMPT = `You are the FORENSIC Agent in JURI Protocol — a decentralized DeFi exploit investigation system.
Your role: TRACE FUND FLOWS and COLLECT ON-CHAIN EVIDENCE.

Given an exploit case, you must:
1. Trace how funds moved (attacker wallet → intermediate → destination)
2. Identify all affected contracts and chains
3. List key transaction hashes as evidence
4. Store ALL findings immutably on 0G Storage

FORMAT: concise bullet points with specific addresses, tx hashes, and chain names.`;

class ForensicAgent extends BaseAgent {
  private caseDescription = "";
  private caseId = 1;

  constructor() { super(getConfig()); }

  async start(): Promise<void> {
    this.log("🔍 Forensic Agent starting...");
    await this.connect();
    while (true) {
      const peers = await this.transport.getPeers();
      if (peers.length >= 2) break;
      this.log("Waiting for peers... (" + peers.length + "/2)");
      await new Promise(r => setTimeout(r, 2000));
    }
    this.log("All peers ready: " + (await this.transport.getPeers()).join(", "));

    const runtimeCase = await this.waitForCaseSeed(600000);
    this.caseDescription = runtimeCase.dispute;
    this.caseId = runtimeCase.id;
    this.log(`📋 Case #${this.caseId}: "${this.caseDescription}"`);

    try { await this.storage.storeDispute(this.caseId, this.caseDescription); this.log("Stored to 0G KV"); }
    catch { this.log("⚠️ 0G Storage unavailable"); }

    // Round 1: Initial fund flow trace
    this.log("🔍 Tracing fund flows...");
    const trace1 = await this.generateReport(1, "", this.caseDescription);
    const ref1 = await this.tryStore(1, trace1);
    await this.sendTo("analysis", "ARGUMENT_SUBMITTED", trace1, ref1 ? [ref1] : []);
    this.log("Trace sent to Analysis Agent");

    // Round 2: Respond to analysis questions
    this.log("⏳ Waiting for Analysis Agent follow-up...");
    const q1 = await this.waitForMessage("COUNTER_ARGUMENT", "analysis", 600000);
    const trace2 = await this.generateReport(2, q1.content, this.caseDescription);
    const ref2 = await this.tryStore(2, trace2);
    await this.sendTo("analysis", "REBUTTAL", trace2, ref2 ? [ref2] : []);

    // Round 3: Final evidence dump
    const q2 = await this.waitForMessage("COUNTER_ARGUMENT", "analysis", 600000);
    const trace3 = await this.generateReport(3, q2.content, this.caseDescription);
    const ref3 = await this.tryStore(3, trace3);
    await this.sendTo("analysis", "REBUTTAL", trace3, ref3 ? [ref3] : []);

    // Closing statement → Verification Agent
    const closing = await this.askLLM(FORENSIC_PROMPT,
      `FINAL FORENSIC SUMMARY for: "${this.caseDescription}". List all traced fund flows, key addresses, and transaction hashes.`);
    await this.sendTo("verification", "CLOSING_STATEMENT", closing, [ref1, ref2, ref3].filter(Boolean) as string[]);
    this.log("Final forensic report sent to Verification Agent ✅");

    this.log("⏳ Waiting for investigation verdict...");
    const verdictMsg = await this.waitForMessage("VERDICT_ISSUED", "verification", 1200000);
    const verdict = JSON.parse(verdictMsg.content);
    this.log(`📋 VERDICT: ${verdict.result}`);
    this.log(`📝 ${verdict.reasoning?.slice(0, 200)}...`);
    this.log("✅ Forensic Agent: Done.");
  }

  private async generateReport(round: number, feedback: string, caseDesc: string): Promise<string> {
    const fb = feedback ? `\nAnalysis Agent feedback: "${feedback}"` : "";
    return this.askLLM(FORENSIC_PROMPT,
      `INVESTIGATION ROUND ${round}/3 for case: "${caseDesc}".\nTrace fund flows, list affected contracts, key tx hashes.${fb}`);
  }

  private async tryStore(round: number, content: string): Promise<string | null> {
    try { return await this.storage.storeEvidence(this.caseId, this.config.role, round, content); }
    catch { return null; }
  }
}

const agent = new ForensicAgent();
agent.start().catch((err) => { console.error("Forensic crashed:", err); process.exit(1); });
