/**
 * API client for Agent Court Orchestrator.
 * The orchestrator runs on port 4000 (configurable via API_PORT).
 */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export interface CaseInfo {
  id: number;
  dispute: string;
  status: string;
  verdict?: { result: string; reasoning: string };
  messages: { role: string; content: string; timestamp: number }[];
}

export async function createCase(dispute: string): Promise<{ success: boolean; caseId: number }> {
  const res = await fetch(`${API_BASE}/api/case`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dispute }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to create case");
  }

  return res.json();
}

export async function getCase(caseId: number): Promise<CaseInfo | null> {
  const res = await fetch(`${API_BASE}/api/case/${caseId}`);
  if (!res.ok) return null;
  return res.json();
}

export async function getCases(): Promise<CaseInfo[]> {
  const res = await fetch(`${API_BASE}/api/cases`);
  if (!res.ok) return [];
  return res.json();
}

export async function healthCheck(): Promise<{ status: string; transport: string }> {
  const res = await fetch(`${API_BASE}/api/health`);
  return res.json();
}
