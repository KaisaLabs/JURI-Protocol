#!/usr/bin/env node
import http from "http";
import { ethers } from "ethers";
import * as dotenv from "dotenv";
import { ZgStorage } from "./storage";
import { applyRuntimeUpdate, createRuntimeCase, type AgentRuntimeUpdate, type RuntimeCase, type RuntimeTimelineEvent } from "./case-runtime";
import { getRoleAddress, getRolePrivateKey, getRuntimeConfig, validateDistinctRoleSigners } from "./runtime-config";
import type { AgentControlCaseRequest, AgentRole } from "./types";

dotenv.config({ path: "../.env" });

const PORT = parseInt(process.env.API_PORT || "4000", 10);
const CONTRACT_ABI = [
  "function createCase(bytes32,address,address) payable returns (uint256)",
  "function joinCase(uint256) payable",
  "function getCaseCount() view returns (uint256)",
];

class Orchestrator {
  private readonly runtimeConfig = getRuntimeConfig();
  private readonly forensicKey = getRolePrivateKey("forensic");
  private readonly analysisKey = getRolePrivateKey("analysis");
  private readonly verificationKey = getRolePrivateKey("verification");
  private readonly storage = new ZgStorage({
    privateKey: this.forensicKey,
    rpcUrl: process.env.ZG_RPC_URL || "https://evmrpc-testnet.0g.ai",
    indexerUrl: process.env.ZG_STORAGE_INDEXER || "https://indexer-storage-testnet-turbo.0g.ai",
    kvNodeUrl: process.env.ZG_KV_NODE || "http://3.101.147.150:6789",
    network: "testnet",
  });
  private readonly provider = new ethers.JsonRpcProvider(process.env.ZG_RPC_URL || "https://evmrpc-testnet.0g.ai");
  private readonly forensicSigner = new ethers.Wallet(this.forensicKey, this.provider);
  private readonly analysisSigner = new ethers.Wallet(this.analysisKey, this.provider);
  private readonly verificationAddress = getRoleAddress("verification");
  private readonly contractAddress = process.env.CONTRACT_ADDRESS;
  private readonly activeCases = new Map<number, RuntimeCase>();

  constructor() {
    validateDistinctRoleSigners();
  }

  async start(): Promise<void> {
    console.log("⚖️  Agent Court Orchestrator starting...");
    await this.storage.connect();
    await this.startAPIServer();
    console.log(`Orchestrator ready on http://127.0.0.1:${PORT}`);
  }

  async createCase(dispute: string, stake: string, skipOnChainCreate = false): Promise<{ caseId: number }> {
    if (!this.contractAddress) {
      throw new Error("CONTRACT_ADDRESS is required for real case creation");
    }

    const contract = new ethers.Contract(this.contractAddress, CONTRACT_ABI, this.forensicSigner);
    const stakeWei = ethers.parseEther(stake);
    const disputeStorage = await this.storage.storeValue(`dispute:draft:${Date.now()}:${ethers.hexlify(ethers.randomBytes(4))}`, dispute);

    let runtimeCase = createRuntimeCase({
      id: 0,
      dispute,
      stake,
      transport: this.runtimeConfig.transportMode,
      forensicAddress: getRoleAddress("forensic"),
      analysisAddress: getRoleAddress("analysis"),
      verificationAddress: this.verificationAddress,
      disputeStorage,
    });

    runtimeCase.status = "funding";

    try {
      if (!skipOnChainCreate) {
        // Server-side: orchestrator creates case + joins
        runtimeCase.timeline.push(this.makeTimeline("orchestrator", "case_created", `Creating case for dispute: ${dispute}`, { stake, disputeStorage }));
        const createTx = await contract.createCase(disputeStorage.ref, this.analysisSigner.address, this.verificationAddress, { value: stakeWei });
        runtimeCase.onChain.create = { status: "submitted", txHash: createTx.hash };
        runtimeCase.timeline.push(this.makeTimeline("orchestrator", "onchain_create_submitted", "Forensic createCase transaction submitted", { txHash: createTx.hash }));
        await createTx.wait();
        runtimeCase.onChain.create = { status: "confirmed", txHash: createTx.hash };

        const actualCaseId = Number(await contract.getCaseCount());
        runtimeCase.id = actualCaseId;
      } else {
        // Client-side: user already created case via MetaMask, just get the latest case
        const actualCaseId = Number(await contract.getCaseCount());
        runtimeCase.id = actualCaseId;
        runtimeCase.timeline.push(this.makeTimeline("orchestrator", "case_created", `Case #${actualCaseId} already created on-chain by user. Joining as analysis...`, { stake, disputeStorage }));
      }

      this.activeCases.set(runtimeCase.id, runtimeCase);

      const analysisContract = new ethers.Contract(this.contractAddress, CONTRACT_ABI, this.analysisSigner);
      const joinTx = await analysisContract.joinCase(runtimeCase.id, { value: stakeWei });
      runtimeCase.onChain.join = { status: "submitted", txHash: joinTx.hash };
      runtimeCase.timeline.push(this.makeTimeline("orchestrator", "onchain_join_submitted", "Analysis joinCase transaction submitted", { txHash: joinTx.hash }));
      await joinTx.wait();
      runtimeCase.onChain.join = { status: "confirmed", txHash: joinTx.hash };
      runtimeCase.status = "ready";
      runtimeCase.timeline.push(this.makeTimeline("orchestrator", "case_ready", "Case funded and ready to seed to agents"));

      await this.notifyAgents(runtimeCase);
      return { caseId: runtimeCase.id };
    } catch (error) {
      runtimeCase.status = "failed";
      runtimeCase.timeline.push(this.makeTimeline("orchestrator", "case_failed", "Case creation failed", { error: (error as Error).message }));
      if (runtimeCase.id > 0) {
        this.activeCases.set(runtimeCase.id, runtimeCase);
      }
      throw error;
    }
  }

  private async notifyAgents(runtimeCase: RuntimeCase): Promise<void> {
    const payload: AgentControlCaseRequest = { runtimeCase };
    const failures: string[] = [];

    for (const role of ["forensic", "analysis", "verification"] as AgentRole[]) {
      const port = this.runtimeConfig.controlPorts[role];
      try {
        const res = await fetch(`http://127.0.0.1:${port}/case`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-agent-token": this.runtimeConfig.controlToken,
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) {
          failures.push(`${role}:${res.status}`);
        }
      } catch (error) {
        failures.push(`${role}:${(error as Error).message}`);
      }
    }

    if (failures.length > 0) {
      runtimeCase.status = "failed";
      runtimeCase.timeline.push(this.makeTimeline("orchestrator", "seed_failed", "Failed to seed one or more agents", { failures }));
      throw new Error(`Agent seed failed: ${failures.join(", ")}`);
    }

    runtimeCase.status = "debating";
    runtimeCase.timeline.push(this.makeTimeline("orchestrator", "seed_complete", "All agents received case seed"));
  }

  getCase(caseId: number): RuntimeCase | null {
    return this.activeCases.get(caseId) || null;
  }

  getCases(): RuntimeCase[] {
    return Array.from(this.activeCases.values()).sort((a, b) => b.id - a.id);
  }

  private async startAPIServer(): Promise<void> {
    const server = http.createServer(async (req, res) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-agent-token");

      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }

      const url = new URL(req.url || "/", `http://127.0.0.1:${PORT}`);

      if (req.method === "POST" && url.pathname === "/api/case") {
        const body = await this.readJsonBody(req);
        try {
          const dispute = typeof body.dispute === "string" ? body.dispute.trim() : "";
          const stake = typeof body.stake === "string" ? body.stake.trim() : "";
          const skipCreate = body.skipOnChainCreate === true;
          if (!dispute || !stake) {
            this.writeJson(res, 400, { error: "dispute and stake are required" });
            return;
          }
          const result = await this.createCase(dispute, stake, skipCreate);
          this.writeJson(res, 200, { success: true, ...result });
        } catch (error) {
          this.writeJson(res, 500, { error: (error as Error).message });
        }
        return;
      }

      const runtimeMatch = url.pathname.match(/^\/api\/case\/(\d+)\/runtime$/);
      if (req.method === "POST" && runtimeMatch) {
        if (!this.hasValidControlToken(req)) {
          this.writeJson(res, 401, { error: "Unauthorized" });
          return;
        }
        const caseId = parseInt(runtimeMatch[1], 10);
        const runtimeCase = this.getCase(caseId);
        if (!runtimeCase) {
          this.writeJson(res, 404, { error: "Case not found" });
          return;
        }
        const update = await this.readJsonBody(req) as unknown as AgentRuntimeUpdate;
        applyRuntimeUpdate(runtimeCase, update);
        this.writeJson(res, 200, { ok: true });
        return;
      }

      const caseMatch = url.pathname.match(/^\/api\/case\/(\d+)$/);
      if (req.method === "GET" && caseMatch) {
        const caseId = parseInt(caseMatch[1], 10);
        const runtimeCase = this.getCase(caseId);
        if (!runtimeCase) {
          this.writeJson(res, 404, { error: "Case not found" });
          return;
        }
        this.writeJson(res, 200, runtimeCase);
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/cases") {
        this.writeJson(res, 200, this.getCases());
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/health") {
        this.writeJson(res, 200, {
          status: "ok",
          transport: this.runtimeConfig.transportMode,
          storage: {
            connected: this.storage.isConnected(),
            network: "0G Galileo Testnet (Turbo)",
          },
          contractConfigured: Boolean(this.contractAddress),
          activeCases: this.activeCases.size,
          controlPorts: this.runtimeConfig.controlPorts,
        });
        return;
      }

      this.writeJson(res, 404, { error: "Not found" });
    });

    await new Promise<void>((resolve) => server.listen(PORT, this.runtimeConfig.bindHost, () => resolve()));
  }

  private makeTimeline(actor: RuntimeTimelineEvent["actor"], type: string, message: string, data?: Record<string, unknown>): RuntimeTimelineEvent {
    return { at: Date.now(), actor, type, message, data };
  }

  private async readJsonBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
    const chunks: string[] = [];
    for await (const chunk of req) {
      chunks.push(typeof chunk === "string" ? chunk : chunk.toString("utf-8"));
    }
    return chunks.length > 0 ? JSON.parse(chunks.join("")) : {};
  }

  private writeJson(res: any, statusCode: number, body: unknown): void {
    res.writeHead(statusCode, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body));
  }

  private hasValidControlToken(req: http.IncomingMessage): boolean {
    return req.headers["x-agent-token"] === this.runtimeConfig.controlToken;
  }
}

const orchestrator = new Orchestrator();
orchestrator.start().catch((error) => {
  console.error(error);
  process.exit(1);
});
