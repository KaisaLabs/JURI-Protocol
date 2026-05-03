/**
 * 0G Storage Client — KV + File storage.
 * SDK: @0gfoundation/0g-ts-sdk v1.2.6+
 * Network: Galileo Testnet
 *
 * Uses getFlowContract to create proper contract instances.
 * Flow address auto-discovered from Indexer node selection.
 */
import { Indexer, KvClient, Batcher, MemData, getFlowContract } from "@0gfoundation/0g-ts-sdk";
import { ethers } from "ethers";
import type { StorageWriteResult } from "./case-runtime";

export const ZG_NETWORKS = {
  testnet: {
    rpc: "https://evmrpc-testnet.0g.ai", chainId: 16602,
    turbo: { indexer: "https://indexer-storage-testnet-turbo.0g.ai" },
    standard: { indexer: "https://indexer-storage-testnet-standard.0g.ai" },
    kvNode: "http://3.101.147.150:6789",
    explorer: "https://chainscan-galileo.0g.ai",
    storageScan: "https://storagescan-galileo.0g.ai",
  },
} as const;

export type ZgNetwork = keyof typeof ZG_NETWORKS;
const DEFAULT_STREAM_ID = ethers.keccak256(ethers.toUtf8Bytes("agent-court-kv-v1"));

// Flow contract auto-discovered by Indexer (confirmed via networkIdentity.flowAddress)
const AUTO_FLOW = "0x22E03a6A89B950F1c82ec5e74F8eCa321a105296";

export class ZgStorage {
  private indexer: Indexer;
  private kvClient: KvClient;
  private signer: ethers.Wallet;
  private provider: ethers.JsonRpcProvider;
  private rpcUrl: string;
  private streamId: string;
  private kvNodeUrl: string;
  public readonly network: ZgNetwork;
  private connected = false;

  constructor(config: {
    privateKey: string;
    rpcUrl?: string; indexerUrl?: string; kvNodeUrl?: string;
    streamId?: string; network?: ZgNetwork;
  }) {
    this.network = config.network || "testnet";
    const net = ZG_NETWORKS[this.network];
    this.rpcUrl = config.rpcUrl || net.rpc;
    this.kvNodeUrl = config.kvNodeUrl || net.kvNode || "";
    this.streamId = config.streamId || DEFAULT_STREAM_ID;
    this.provider = new ethers.JsonRpcProvider(this.rpcUrl);
    this.signer = new ethers.Wallet(config.privateKey, this.provider);
    this.indexer = new Indexer(config.indexerUrl || net.turbo.indexer);
    this.kvClient = new KvClient(this.kvNodeUrl);
  }

  async connect(): Promise<boolean> {
    if (process.env.ZG_SKIP_STORAGE === "true") {
      this.connected = false;
      this.log(`Skipping 0G storage (ZG_SKIP_STORAGE=true)`);
      return false;
    }
    try {
      await this.indexer.getShardedNodes();
      this.connected = true;
      this.log(`Connected wallet=${this.signer.address}`);
      return true;
    } catch (err) {
      this.log(`⚠️  ${(err as Error).message}`);
      this.connected = false; return false;
    }
  }

  isConnected(): boolean { return this.connected; }

  async storeEvidence(caseId: number, role: string, round: number, content: string): Promise<StorageWriteResult> {
    const key = `case:${caseId}:${role}:round:${round}`;
    return this.storeValue(key, content);
  }

  async storeDispute(caseId: number, dispute: string): Promise<StorageWriteResult> {
    const key = `case:${caseId}:dispute`;
    return this.storeValue(key, dispute);
  }

  async storeVerdict(caseId: number, reasoning: string): Promise<StorageWriteResult> {
    const key = `case:${caseId}:verdict:${Date.now()}`;
    return this.storeValue(key, reasoning);
  }

  async storeValue(key: string, value: string): Promise<StorageWriteResult> {
    const ref = this.toStorageRef(key);
    if (!this.connected) {
      this.log(`[local] ${key}`);
      return { status: "skipped", key, ref, error: "0G storage unavailable" };
    }

    try {
      const txHash = await this.writeKV(key, value);
      return { status: "written", key, ref, txHash };
    } catch (error) {
      // Non-fatal: evidence can still be sent via transport message even if KV write fails
      const message = (error as Error).message;
      this.log(`⚠️ KV write failed for ${key}: ${message}`);
      return { status: "failed", key, ref, error: message };
    }
  }

  async readValue(key: string): Promise<string | null> {
    if (!this.connected) return null;
    try {
      const kb = Uint8Array.from(Buffer.from(key, "utf-8"));
      const value = await this.kvClient.getValue(this.streamId, kb);
      return typeof value === "string" ? value : value == null ? null : JSON.stringify(value);
    } catch (e) { this.log(`Read: ${(e as Error).message}`); return null; }
  }

  async storeLog(_caseId: number, entry: object): Promise<{ rootHash: string; txHash: string } | null> {
    if (!this.connected) return null;
    try {
      const file = new MemData(new TextEncoder().encode(JSON.stringify(entry)));
      const [result, err] = await this.indexer.upload(file, this.rpcUrl, this.signer);
      if (err) throw err;
      return {
        rootHash: "rootHash" in result ? result.rootHash : result.rootHashes[0],
        txHash: "txHash" in result ? result.txHash : result.txHashes[0],
      };
    } catch (e) { this.log(`Log: ${(e as Error).message}`); return null; }
  }

  private async writeKV(key: string, value: string): Promise<string> {
    const [nodes, err] = await this.indexer.selectNodes(1);
    if (err || !nodes.length) throw new Error(`Nodes: ${err || "none"}`);

    const flow = getFlowContract(AUTO_FLOW, this.signer);
    const batcher = new Batcher(1, nodes, flow, this.rpcUrl);

    const kb = Uint8Array.from(Buffer.from(key, "utf-8"));
    const vb = Uint8Array.from(Buffer.from(value, "utf-8"));
    batcher.streamDataBuilder.set(this.streamId, kb, vb);

    const [tx, batchErr] = await batcher.exec();
    if (batchErr) throw new Error(`Batch: ${batchErr}`);

    this.log(`KV: ${key} (${value.length}B)`);
    return typeof tx === "string" ? tx : JSON.stringify(tx);
  }

  toStorageRef(k: string): string { return ethers.keccak256(ethers.toUtf8Bytes(k)); }
  async getBalance(): Promise<string> { return ethers.formatEther(await this.provider.getBalance(this.signer.address)); }
  getAddress(): string { return this.signer.address; }
  private log(msg: string): void { console.log(`[0G] ${msg}`); }
}
