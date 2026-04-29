/**
 * 0G Storage Client — handles KV (state/evidence) and Log (immutable history).
 *
 * SDK: @0gfoundation/0g-ts-sdk
 * Network: Galileo Testnet
 */
import { Indexer, KvClient, Batcher } from "@0gfoundation/0g-ts-sdk";
import { ethers } from "ethers";
import type { StorageEntry } from "./types";

export class ZgStorage {
  private indexer: Indexer;
  private kvClient: KvClient;
  private signer: ethers.Wallet;
  private rpcUrl: string;
  private streamId: number;
  private flowContract: string;

  // Pre-deployed Flow contract on 0G Galileo testnet
  private static FLOW_CONTRACT = "0x22E03a6A89B950F1c82ec5e74F8eCa321a105296";

  constructor(
    privateKey: string,
    rpcUrl: string,
    indexerUrl: string,
    kvNodeUrl: string,
    streamId: number = 1
  ) {
    this.rpcUrl = rpcUrl;
    this.streamId = streamId;
    this.flowContract = ZgStorage.FLOW_CONTRACT;

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    this.signer = new ethers.Wallet(privateKey, provider);
    this.indexer = new Indexer(indexerUrl);
    this.kvClient = new KvClient(kvNodeUrl);
  }

  /** Store evidence / argument to 0G KV */
  async storeEvidence(caseId: number, agentRole: string, round: number, content: string): Promise<string> {
    const key = `case:${caseId}:${agentRole}:round:${round}`;
    await this.writeKV(key, content);
    return key;
  }

  /** Store the dispute question */
  async storeDispute(caseId: number, dispute: string): Promise<string> {
    const key = `case:${caseId}:dispute`;
    await this.writeKV(key, dispute);
    return key;
  }

  /** Store the final verdict reasoning (immutable via 0G Log) */
  async storeVerdict(caseId: number, reasoning: string): Promise<string> {
    const key = `case:${caseId}:verdict`;
    await this.writeKV(key, reasoning);
    return key;
  }

  /** Read from 0G KV */
  async readValue(key: string): Promise<string | null> {
    try {
      const keyBytes = ethers.encodeBase64(
        new Uint8Array(Buffer.from(key, "utf-8"))
      );
      const value = await this.kvClient.getValue(this.streamId, keyBytes);
      return value || null;
    } catch (err) {
      console.error(`[Storage] KV read error for key ${key}:`, err);
      return null;
    }
  }

  /** Write to 0G KV */
  private async writeKV(key: string, value: string): Promise<string> {
    const [nodes, err] = await this.indexer.selectNodes(1);
    if (err) throw new Error(`Indexer error: ${err}`);

    const batcher = new Batcher(1, nodes, this.flowContract, this.rpcUrl);
    const keyBytes = Uint8Array.from(Buffer.from(key, "utf-8"));
    const valueBytes = Uint8Array.from(Buffer.from(value, "utf-8"));
    batcher.streamDataBuilder.set(this.streamId, keyBytes, valueBytes);

    const [tx, batchErr] = await batcher.exec();
    if (batchErr) throw new Error(`Batch error: ${batchErr}`);

    console.log(`[Storage] KV written: ${key} → TX: ${tx}`);
    return tx as string;
  }


  /** Generate storage reference key for smart contract */
  toStorageRef(key: string): string {
    return ethers.keccak256(ethers.toUtf8Bytes(key));
  }
}
