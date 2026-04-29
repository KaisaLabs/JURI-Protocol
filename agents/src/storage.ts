/**
 * 0G Storage Client — handles KV (state/evidence) + File (immutable Log).
 *
 * SDK: @0gfoundation/0g-ts-sdk v1.2.6+
 * Network: Galileo Testnet (Turbo mode)
 *
 * Flow contract is auto-discovered from the Indexer status endpoint.
 * KV read/write for agent state + MemData upload for immutable logs.
 */
import { Indexer, KvClient, Batcher, MemData } from "@0gfoundation/0g-ts-sdk";
import { ethers } from "ethers";

// ===================== 0G Network Constants =====================

/** Galileo Testnet endpoints */
export const ZG_NETWORKS = {
  testnet: {
    rpc: "https://evmrpc-testnet.0g.ai",
    chainId: 16602,
    turbo: {
      indexer: "https://indexer-storage-testnet-turbo.0g.ai",
      flowContract: "0xbD75117F80b4E22698D0Cd7612d92BDb8eaff628",
    },
    standard: {
      indexer: "https://indexer-storage-testnet-standard.0g.ai",
      flowContract: "0x22E03a6A89B950F1c82ec5e74F8eCa321a105296", // legacy
    },
    kvNode: "http://3.101.147.150:6789",
    explorer: "https://chainscan-galileo.0g.ai",
    storageScan: "https://storagescan-galileo.0g.ai",
  },
  mainnet: {
    rpc: "https://evmrpc.0g.ai",
    chainId: 16661,
    turbo: {
      indexer: "https://indexer-storage-turbo.0g.ai",
    },
    standard: {
      indexer: "https://indexer-storage.0g.ai",
    },
    explorer: "https://chainscan.0g.ai",
  },
} as const;

export type ZgNetwork = keyof typeof ZG_NETWORKS;

// ===================== ZgStorage Class =====================

export class ZgStorage {
  private indexer: Indexer;
  private kvClient: KvClient;
  private signer: ethers.Wallet;
  private provider: ethers.JsonRpcProvider;
  private rpcUrl: string;
  private indexerUrl: string;
  private streamId: number;
  private flowContract: string;
  private kvNodeUrl: string;
  public readonly network: ZgNetwork;
  private connected = false;
  private flowContractAddress: string;

  constructor(config: {
    privateKey: string;
    rpcUrl?: string;
    indexerUrl?: string;
    kvNodeUrl?: string;
    streamId?: number;
    network?: ZgNetwork;
  }) {
    this.network = config.network || "testnet";
    const net = ZG_NETWORKS[this.network];

    this.rpcUrl = config.rpcUrl || net.rpc;
    this.indexerUrl = config.indexerUrl || net.turbo.indexer;
    this.kvNodeUrl = config.kvNodeUrl || net.kvNode || "";
    this.streamId = config.streamId || 1;
    this.flowContractAddress = net.turbo.flowContract || "";

    this.provider = new ethers.JsonRpcProvider(this.rpcUrl);
    this.signer = new ethers.Wallet(config.privateKey, this.provider);
    this.indexer = new Indexer(this.indexerUrl);
    this.kvClient = new KvClient(this.kvNodeUrl);
    this.flowContract = this.flowContractAddress;
  }

  // ===================== Connection =====================

  async connect(): Promise<boolean> {
    try {
      // Verify indexer is reachable
      await this.indexer.getShardedNodes();
      this.connected = true;
      this.log(`Connected to 0G Storage (${this.network}/turbo)`);
      this.log(`  Indexer: ${this.indexerUrl}`);
      this.log(`  RPC:     ${this.rpcUrl}`);
      this.log(`  KV Node: ${this.kvNodeUrl}`);
      this.log(`  Wallet:  ${this.signer.address}`);
      return true;
    } catch (err) {
      this.log(`⚠️  0G Storage unavailable: ${(err as Error).message}`);
      this.log("  Agents will continue without persistent storage");
      this.connected = false;
      return false;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  // ===================== KV Operations =====================

  /** Store evidence/argument to 0G KV */
  async storeEvidence(caseId: number, agentRole: string, round: number, content: string): Promise<string> {
    const key = `case:${caseId}:${agentRole}:round:${round}`;
    if (this.connected) {
      await this.writeKV(key, content);
    } else {
      this.log(`[LOCAL] KV write: ${key}`);
    }
    return key;
  }

  /** Store dispute question */
  async storeDispute(caseId: number, dispute: string): Promise<string> {
    const key = `case:${caseId}:dispute`;
    if (this.connected) {
      await this.writeKV(key, dispute);
    } else {
      this.log(`[LOCAL] KV write: ${key}`);
    }
    return key;
  }

  /** Store verdict reasoning */
  async storeVerdict(caseId: number, reasoning: string): Promise<string> {
    const key = `case:${caseId}:verdict:${Date.now()}`;
    if (this.connected) {
      await this.writeKV(key, reasoning);
    } else {
      this.log(`[LOCAL] KV write: ${key}`);
    }
    return key;
  }

  /** Read value from 0G KV */
  async readValue(key: string): Promise<string | null> {
    if (!this.connected) return null;

    try {
      const keyBytes = ethers.encodeBase64(
        new Uint8Array(Buffer.from(key, "utf-8"))
      );
      const value = await this.kvClient.getValue(this.streamId, keyBytes);
      if (value) {
        this.log(`KV read: ${key}`);
      }
      return value || null;
    } catch (err) {
      this.log(`KV read error: ${key} — ${(err as Error).message}`);
      return null;
    }
  }

  /** Batch read multiple keys */
  async readValues(keys: string[]): Promise<Map<string, string | null>> {
    const results = new Map<string, string | null>();
    for (const key of keys) {
      results.set(key, await this.readValue(key));
    }
    return results;
  }

  // ===================== File Upload (Immutable Log) =====================

  /** Store immutable log entry as a file on 0G Storage */
  async storeLog(caseId: number, entry: object): Promise<{ rootHash: string; txHash: string } | null> {
    if (!this.connected) {
      this.log("[LOCAL] Log entry stored locally only");
      return null;
    }

    try {
      const content = JSON.stringify(entry, null, 2);
      const file = new MemData(new TextEncoder().encode(content));
      const [result, uploadErr] = await this.indexer.upload(
        file, this.rpcUrl, this.signer
      );

      if (uploadErr) throw uploadErr;

      const rootHash = "rootHash" in result ? result.rootHash : result.rootHashes[0];
      const txHash = "txHash" in result ? result.txHash : result.txHashes[0];

      this.log(`Log stored: ${rootHash} — TX: ${txHash}`);
      this.log(`  Verify: ${ZG_NETWORKS[this.network].storageScan}`);
      return { rootHash, txHash };
    } catch (err) {
      this.log(`Log upload error: ${(err as Error).message}`);
      return null;
    }
  }

  // ===================== Private =====================

  private async writeKV(key: string, value: string): Promise<string> {
    const [nodes, err] = await this.indexer.selectNodes(1);
    if (err || !nodes.length) throw new Error(`Indexer error: ${err || "no nodes"}`);

    const batcher = new Batcher(1, nodes, this.flowContract, this.rpcUrl);
    const keyBytes = Uint8Array.from(Buffer.from(key, "utf-8"));
    const valueBytes = Uint8Array.from(Buffer.from(value, "utf-8"));
    batcher.streamDataBuilder.set(this.streamId, keyBytes, valueBytes);

    const [tx, batchErr] = await batcher.exec();
    if (batchErr) throw new Error(`Batch error: ${batchErr}`);

    this.log(`KV written: ${key} (${value.length} bytes) → TX: ${tx}`);
    return tx as string;
  }

  // ===================== Utils =====================

  /** Generate storage reference hash for smart contract */
  toStorageRef(key: string): string {
    return ethers.keccak256(ethers.toUtf8Bytes(key));
  }

  /** Get wallet balance */
  async getBalance(): Promise<string> {
    const bal = await this.provider.getBalance(this.signer.address);
    return ethers.formatEther(bal);
  }

  /** Get wallet address */
  getAddress(): string {
    return this.signer.address;
  }

  private log(msg: string): void {
    console.log(`[0G Storage] ${msg}`);
  }
}

// ===================== Quick Helper =====================

export function createStorage(privateKey: string, network?: ZgNetwork): ZgStorage {
  return new ZgStorage({
    privateKey,
    network: network || "testnet",
    indexerUrl: process.env.ZG_STORAGE_INDEXER,
    kvNodeUrl: process.env.ZG_KV_NODE,
    rpcUrl: process.env.ZG_RPC_URL,
  });
}
