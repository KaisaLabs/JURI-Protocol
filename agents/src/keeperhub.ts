/**
 * KeeperHub Client — executes on-chain payouts via MCP server.
 *
 * We call the KeeperHub API directly (REST) for execute_transfer.
 * MCP server integration available as fallback.
 */
import type { KeeperHubTransfer } from "./types";

export class KeeperHubClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl = "https://app.keeperhub.com/api") {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  /** Execute a direct transfer (payout) */
  async executeTransfer(transfer: KeeperHubTransfer): Promise<{ txHash: string; status: string }> {
    const res = await fetch(`${this.baseUrl}/direct/execute-transfer`, {
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
      throw new Error(`KeeperHub transfer failed: ${err}`);
    }

    const data = await res.json();
    console.log(`[KeeperHub] Transfer executed — TX: ${data.txHash}`);
    return { txHash: data.txHash, status: data.status };
  }

  /** Check execution status */
  async getExecutionStatus(executionId: string): Promise<{ status: string; logs?: string }> {
    const res = await fetch(`${this.baseUrl}/executions/${executionId}`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    return res.json();
  }
}
