/**
 * 📊 Analysis Agent — Classifies attack vectors, scores severity, matches historical patterns.
 *
 * Transport: AXL (prod) / DIRECT (dev) | LLM: Custom (asi1) | Storage: 0G KV
 */
import { BaseAgent, type AgentConfig } from "./agent-base";
import * as dotenv from "dotenv";
dotenv.config({ path: "../.env" });

function getConfig(): AgentConfig {
  return {
    role: "analysis",
    port: 9092,
    address: process.env.ANALYSIS_ADDRESS || process.env.AGENT_ADDRESS || "0xAnalysis...",
    privateKey: process.env.ANALYSIS_KEY || process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000002",
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

const ANALYSIS_PROMPT = `You are the ANALYSIS Agent in JURI Protocol — a decentralized DeFi exploit investigation system.
Your role: CLASSIFY ATTACK VECTORS and SCORE SEVERITY.

Given forensic evidence, you must:
1. Classify the attack type (flash loan, oracle manipulation, reentrancy, access control, etc.)
2. Score severity 1-10
3. Match against known historical exploit patterns
4. Identify the root cause
5. Ask follow-up questions to Forensic Agent if evidence is incomplete

FORMAT: concise but thorough. Name the attack vector. Reference similar past exploits.`;

class AnalysisAgent extends BaseAgent {
  private caseDescription = "";
  private caseId = 1;
  private allForensicReports: string[] = [];

  constructor() { super(getConfig()); }

  async start(): Promise<void> {
    this.log("📊 Analysis Agent starting...");
    await this.connect();
    while (true) {
      const peers = await this.transport.getPeers();
      if (peers.length >= 1) break;
      this.log("Waiting for peers... (" + peers.length + "/1 minimum)");
      await new Promise(r => setTimeout(r, 2000));
    }
    this.log("Peers ready: " + (await this.transport.getPeers()).join(", "));

    const runtimeCase = await this.waitForCaseSeed(600000);
    this.caseDescription = runtimeCase.dispute;
    this.caseId = runtimeCase.id;
    this.log(`📋 Case #${this.caseId}: "${this.caseDescription}"`);

    // Round 1: Analyze forensic trace
    this.log("⏳ Waiting for Forensic Agent trace...");
    const trace1 = await this.waitForMessage("ARGUMENT_SUBMITTED", "forensic", 600000);
    this.allForensicReports.push(trace1.content);
    const analysis1 = await this.generateAnalysis(1, trace1.content);
    const ref1 = await this.tryStore(1, analysis1);
    await this.sendTo("forensic", "COUNTER_ARGUMENT", analysis1, ref1 ? [ref1] : []);
    this.log("Analysis sent to Forensic Agent");

    // Round 2: Deeper analysis
    const trace2 = await this.waitForMessage("REBUTTAL", "forensic", 600000);
    this.allForensicReports.push(trace2.content);
    const analysis2 = await this.generateAnalysis(2, trace2.content);
    const ref2 = await this.tryStore(2, analysis2);
    await this.sendTo("forensic", "COUNTER_ARGUMENT", analysis2, ref2 ? [ref2] : []);

    // Round 3: Final classification
    const trace3 = await this.waitForMessage("REBUTTAL", "forensic", 600000);
    this.allForensicReports.push(trace3.content);
    const analysis3 = await this.generateAnalysis(3, trace3.content);
    const ref3 = await this.tryStore(3, analysis3);

    // Closing → Verification Agent
    const allTraces = this.allForensicReports.map((a, i) => `[Trace ${i + 1}] ${a.slice(0, 300)}`).join("\n\n");
    const closing = await this.askLLM(ANALYSIS_PROMPT,
      `FINAL CLASSIFICATION. All forensic evidence:\n${allTraces}\n\nProvide: attack vector, severity score (1-10), root cause, matched historical exploits, and prevention recommendation.`);
    await this.sendTo("verification", "CLOSING_STATEMENT", closing, [ref1, ref2, ref3].filter(Boolean) as string[]);
    this.log("Final analysis sent to Verification Agent ✅");

    this.log("⏳ Waiting for investigation verdict...");
    const verdictMsg = await this.waitForMessage("VERDICT_ISSUED", "verification", 1200000);
    const verdict = JSON.parse(verdictMsg.content);
    this.log(`📋 VERDICT: ${verdict.result}`);
    this.log(`📝 ${verdict.reasoning?.slice(0, 200)}...`);
    this.log("✅ Analysis Agent: Done.");
  }

  private async generateAnalysis(round: number, forensicTrace: string): Promise<string> {
    return this.askLLM(ANALYSIS_PROMPT,
      `ROUND ${round}/3. Forensic trace:\n"${forensicTrace.slice(0, 500)}"\n\nClassify the attack vector, score severity, identify root cause. Ask follow-up questions if needed.`);
  }

  private async tryStore(round: number, content: string): Promise<string | null> {
    try { const r = await this.storage.storeEvidence(this.caseId, this.config.role, round, content); return r.ref; }
    catch { return null; }
  }
}

const agent = new AnalysisAgent();
agent.start().catch((err) => { console.error("Analysis crashed:", err); process.exit(1); });
