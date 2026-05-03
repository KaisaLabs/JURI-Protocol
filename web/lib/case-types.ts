export type RuntimeCaseStatus =
  | "created"
  | "funding"
  | "ready"
  | "debating"
  | "awaiting_verdict"
  | "resolved"
  | "failed";

export type StorageWriteStatus = "written" | "skipped" | "failed";

export interface StorageWriteResult {
  status: StorageWriteStatus;
  key: string;
  ref: string;
  txHash?: string;
  error?: string;
}

export interface RuntimeTimelineEvent {
  at: number;
  actor: "forensic" | "analysis" | "verification" | "orchestrator";
  type: string;
  message: string;
  data?: Record<string, unknown>;
}

export interface RuntimeEvidenceRef {
  role: "forensic" | "analysis" | "verification";
  round: number;
  kind: "dispute" | "argument" | "closing" | "verdict";
  storage: StorageWriteResult;
}

export interface OnChainActionState {
  status: "pending" | "submitted" | "confirmed" | "skipped" | "failed";
  txHash?: string;
  error?: string;
}

export interface RuntimeVerdict {
  result: "FORENSIC" | "ANALYSIS" | "TIED";
  reasoning: string;
  reasoningRef: string;
  computeProvider: string;
  simulated: boolean;
  onChain: OnChainActionState;
  attackVector?: string;
  severity?: string;
  rootCause?: string;
  prevention?: string;
  patternMatch?: { count: number; totalLost: number; topMatch: string; technique: string };
}

export interface RuntimePayoutStatus {
  status: "not_attempted" | "attempted" | "succeeded" | "skipped" | "failed";
  path: "winner_withdrawal" | "tie_refund" | "verification_fee" | "none";
  actor?: "forensic" | "analysis" | "verification";
  txHash?: string;
  note?: string;
  error?: string;
}

export interface RuntimeCase {
  id: number;
  dispute: string;
  stake: string;
  transport: "direct" | "axl";
  status: RuntimeCaseStatus;
  createdAt: number;
  updatedAt: number;
  forensicAddress: string;
  analysisAddress: string;
  verificationAddress: string;
  disputeStorage: StorageWriteResult;
  evidence: RuntimeEvidenceRef[];
  timeline: RuntimeTimelineEvent[];
  verdict?: RuntimeVerdict;
  payout?: RuntimePayoutStatus;
  onChain: {
    create: OnChainActionState;
    join: OnChainActionState;
  };
}

export interface CreateCaseRequest {
  dispute: string;
  stake: string;
  skipOnChainCreate?: boolean;
}

export interface CreateCaseResponse {
  success: boolean;
  caseId: number;
}

export interface HealthResponse {
  status: string;
  transport: "direct" | "axl";
  storage: {
    connected: boolean;
    network: string;
  };
  contractConfigured: boolean;
  activeCases: number;
  controlPorts: {
    forensic: number;
    analysis: number;
    verification: number;
  };
}

export interface ApiErrorResponse {
  error: string;
}

export function isTerminalCaseStatus(status: RuntimeCaseStatus): boolean {
  return status === "resolved" || status === "failed";
}
