/**
 * KeeperHub Client — on-chain execution for JURI Protocol.
 * Supports direct transfer and workflow execution via REST API.
 */
import type { KeeperHubTransfer } from "./types";

export class KeeperHubClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl = "https://app.keeperhub.com") {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  get isConfigured(): boolean {
    return !!this.apiKey && this.apiKey.startsWith("kh_") && this.apiKey.length > 10;
  }

  /** Execute a direct token transfer (payout/action) */
  async executeTransfer(transfer: KeeperHubTransfer): Promise<{ txHash: string; status: string }> {
    if (!this.isConfigured) {
      return { txHash: "skipped", status: "keeperhub_not_configured" };
    }

    const res = await fetch(`${this.baseUrl}/api/direct/execute-transfer`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        to: transfer.to,
        amount: transfer.amount,
        token: transfer.token || "0G",
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`KeeperHub transfer failed (${res.status}): ${err}`);
    }

    const data = await res.json();
    console.log(`[KeeperHub] Transfer executed — TX: ${data.txHash || data.id}`);
    return { txHash: data.txHash || data.id, status: data.status || "submitted" };
  }

  /** Execute a contract call via KeeperHub */
  async executeContractCall(contractAddress: string, data: string, value = "0"): Promise<{ txHash: string; status: string }> {
    if (!this.isConfigured) {
      return { txHash: "skipped", status: "keeperhub_not_configured" };
    }

    const res = await fetch(`${this.baseUrl}/api/direct/execute-contract-call`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ contractAddress, data, value }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`KeeperHub contract call failed (${res.status}): ${err}`);
    }

    const data2 = await res.json();
    console.log(`[KeeperHub] Contract call — TX: ${data2.txHash || data2.id}`);
    return { txHash: data2.txHash || data2.id, status: data2.status || "submitted" };
  }

  /** Check execution status */
  async getExecutionStatus(executionId: string): Promise<{ status: string; logs?: string }> {
    const res = await fetch(`${this.baseUrl}/api/executions/${executionId}`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    return res.json();
  }
}
