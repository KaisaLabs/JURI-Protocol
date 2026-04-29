/**
 * AXL HTTP Client — wraps the Gensyn AXL node's local HTTP API.
 * Each agent runs an AXL node and communicates via this client.
 *
 * AXL API reference: https://docs.gensyn.ai/tech/agent-exchange-layer
 */
import type { AxlTopology, AxlMessage, AgentMessage } from "./types";

export class AxlClient {
  private baseUrl: string;
  public peerId: string | null = null;

  constructor(port: number) {
    this.baseUrl = `http://127.0.0.1:${port}`;
  }

  /** Check if AXL node is running */
  async ping(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/topology`);
      return res.ok;
    } catch {
      return false;
    }
  }

  /** Get network topology — list of connected peers */
  async getTopology(): Promise<AxlTopology> {
    const res = await fetch(`${this.baseUrl}/topology`);
    const data = await res.json();
    // Cache our own peer ID
    if (!this.peerId && data.self?.peerId) {
      this.peerId = data.self.peerId;
    }
    return data;
  }

  /** Send a message to another AXL peer */
  async sendMessage(toPeerId: string, message: AgentMessage): Promise<boolean> {
    const res = await fetch(`${this.baseUrl}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: toPeerId,
        data: JSON.stringify(message),
      }),
    });
    const result = await res.json();
    return result.ok === true || res.ok;
  }

  /** Receive pending messages (poll-based) */
  async receiveMessages(): Promise<{ from: string; message: AgentMessage }[]> {
    const res = await fetch(`${this.baseUrl}/recv`);
    const data = await res.json();

    if (!data.messages || !Array.isArray(data.messages)) return [];

    return data.messages.map((m: AxlMessage) => ({
      from: m.from,
      message: JSON.parse(m.data) as AgentMessage,
    }));
  }

  /** Wait for AXL node to be ready */
  async waitForReady(maxRetries = 30, intervalMs = 1000): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      if (await this.ping()) return;
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    throw new Error("AXL node not ready after timeout");
  }
}
