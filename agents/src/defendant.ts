/**
 * ⚖️ Defendant Agent (Agent B)
 *
 * Role: Responds to disputes, presents counter-arguments,
 *       challenges plaintiff's evidence with counter-evidence.
 *
 * LLM: Custom provider (GLM-5 / qwen3.6-plus)
 * Comm: AXL P2P
 * Storage: 0G KV for arguments
 */
import { BaseAgent, type AgentConfig } from "./agent-base";
import type { AgentMessage } from "./types";
import * as dotenv from "dotenv";
dotenv.config({ path: "../.env" });

const config: AgentConfig = {
  role: "defendant",
  axlPort: parseInt(process.env.AXL_DEFENDANT_PORT || "9002"),
  address: process.env.DEFENDANT_ADDRESS || process.env.PRIVATE_KEY!,
  privateKey: process.env.DEFENDANT_KEY || process.env.PRIVATE_KEY!,
  llmBaseUrl: process.env.CUSTOM_LLM_URL!,
  llmKey: process.env.CUSTOM_LLM_KEY!,
  llmModel: process.env.CUSTOM_LLM_MODEL || "glm-5",
  zgIndexerUrl: process.env.ZG_STORAGE_INDEXER!,
  zgKvNodeUrl: process.env.ZG_KV_NODE!,
  zgRpcUrl: process.env.ZG_RPC_URL!,
  keeperhubKey: process.env.KEEPERHUB_API_KEY!,
};

class DefendantAgent extends BaseAgent {
  private disputeQuestion: string | null = null;
  private plaintiffArguments: string[] = [];

  constructor() {
    super(config);
  }

  async start(): Promise<void> {
    console.log("🛡️  Defendant Agent starting...");
    await this.connect();

    // Wait for case creation
    await this.waitForCaseCreation();

    console.log(`📋 Dispute: "${this.disputeQuestion}"`);

    // Round 1: Respond to plaintiff's opening
    await this.respondToArgument(1);

    // Round 2: Further counter
    await this.respondToArgument(2);

    // Round 3: Closing statement
    await this.closingStatement(3);

    console.log("✅ Defendant: All arguments submitted. Waiting for verdict...");
  }

  private async waitForCaseCreation(): Promise<void> {
    console.log("[Defendant] Waiting for case creation...");
    while (!this.disputeQuestion) {
      const msgs = await this.axl.receiveMessages();
      for (const { message } of msgs) {
        if (message.type === "CASE_CREATED") {
          this.disputeQuestion = message.content;
          return;
        }
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  private async respondToArgument(round: number): Promise<void> {
    // Wait for plaintiff's argument
    console.log(`[Defendant] Waiting for plaintiff round ${round}...`);
    const plaintiffMsg = await this.waitForMessage(
      round === 1 ? "ARGUMENT_SUBMITTED" : "REBUTTAL"
    );

    this.plaintiffArguments.push(plaintiffMsg.content);

    const systemPrompt = `You are Agent B (Defendant) in an AI agent arbitration court.
Your role is to ARGUE AGAINST the plaintiff's proposition. Challenge their
reasoning, point out flaws, and present counter-evidence.

Current dispute: "${this.disputeQuestion}"

Plaintiff's argument: "${plaintiffMsg.content}"

Respond with a clear counter-argument in Round ${round}.`;

    const argument = await this.askLLM(
      systemPrompt,
      `Present your counter-argument (Round ${round}) against the plaintiff's claim.`
    );

    // Store to 0G Storage
    const evidenceRef = await this.storage.storeEvidence(
      1,
      "defendant",
      round,
      argument
    );

    // Send to plaintiff via AXL
    await this.sendMessage("plaintiff-peer-id", {
      type: "COUNTER_ARGUMENT",
      caseId: 1,
      from: "defendant",
      to: "plaintiff",
      content: argument,
      evidenceRefs: [evidenceRef],
      timestamp: Date.now(),
    });

    console.log(`[Defendant] Round ${round} counter stored: ${evidenceRef}`);
  }

  private async closingStatement(round: number): Promise<void> {
    const plaintiffMsg = await this.waitForMessage("REBUTTAL");

    const systemPrompt = `You are Agent B (Defendant). Present your CLOSING STATEMENT.
Summarize why the plaintiff's case fails and why the verdict should be in your favor.

All plaintiff arguments: ${this.plaintiffArguments.join(" | ")}
Plaintiff's final argument: "${plaintiffMsg.content}"`;

    const argument = await this.askLLM(systemPrompt, "Present your closing statement.");
    const evidenceRef = await this.storage.storeEvidence(1, "defendant", round, argument);

    await this.sendMessage("plaintiff-peer-id", {
      type: "CLOSING_STATEMENT",
      caseId: 1,
      from: "defendant",
      to: "judge",
      content: argument,
      evidenceRefs: [evidenceRef],
      timestamp: Date.now(),
    });

    // Also send to judge
    await this.sendMessage("judge-peer-id", {
      type: "CLOSING_STATEMENT",
      caseId: 1,
      from: "defendant",
      to: "judge",
      content: argument,
      evidenceRefs: [evidenceRef],
      timestamp: Date.now(),
    });
  }

  private async waitForMessage(type: string): Promise<AgentMessage> {
    while (true) {
      const msgs = await this.axl.receiveMessages();
      for (const { message } of msgs) {
        if (
          message.type === type &&
          (message.to === "defendant" || message.to === "all")
        ) {
          console.log(`[Defendant] Received: ${type}`);
          return message;
        }
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

const agent = new DefendantAgent();
agent.start().catch(console.error);
