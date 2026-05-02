import type { AgentRole, Verdict } from "./types";
import type { TransportMode } from "./runtime-config";

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
  actor: AgentRole | "orchestrator";
  type: string;
  message: string;
  data?: Record<string, unknown>;
}

export interface RuntimeEvidenceRef {
  role: AgentRole;
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
  result: Verdict;
  reasoning: string;
  reasoningRef: string;
  computeProvider: string;
  simulated: boolean;
  onChain: OnChainActionState;
}

export interface RuntimePayoutStatus {
  status: "not_attempted" | "attempted" | "succeeded" | "skipped" | "failed";
  path: "winner_withdrawal" | "tie_refund" | "judge_fee" | "none";
  actor?: AgentRole;
  txHash?: string;
  note?: string;
  error?: string;
}

export interface RuntimeCase {
  id: number;
  dispute: string;
  stake: string;
  transport: TransportMode;
  status: RuntimeCaseStatus;
  createdAt: number;
  updatedAt: number;
  plaintiffAddress: string;
  defendantAddress: string;
  judgeAddress: string;
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

export interface AgentRuntimeUpdate {
  caseId: number;
  status?: RuntimeCaseStatus;
  timeline?: RuntimeTimelineEvent;
  evidence?: RuntimeEvidenceRef[];
  verdict?: RuntimeVerdict;
  payout?: RuntimePayoutStatus;
}

export function createRuntimeCase(input: {
  id: number;
  dispute: string;
  stake: string;
  transport: TransportMode;
  plaintiffAddress: string;
  defendantAddress: string;
  judgeAddress: string;
  disputeStorage: StorageWriteResult;
  createdAt?: number;
}): RuntimeCase {
  const createdAt = input.createdAt || Date.now();
  return {
    id: input.id,
    dispute: input.dispute,
    stake: input.stake,
    transport: input.transport,
    status: "created",
    createdAt,
    updatedAt: createdAt,
    plaintiffAddress: input.plaintiffAddress,
    defendantAddress: input.defendantAddress,
    judgeAddress: input.judgeAddress,
    disputeStorage: input.disputeStorage,
    evidence: [],
    timeline: [],
    onChain: {
      create: { status: "pending" },
      join: { status: "pending" },
    },
  };
}

export function applyRuntimeUpdate(runtimeCase: RuntimeCase, update: AgentRuntimeUpdate): RuntimeCase {
  runtimeCase.updatedAt = Date.now();
  if (update.status) runtimeCase.status = update.status;
  if (update.timeline) runtimeCase.timeline.push(update.timeline);
  if (update.evidence?.length) runtimeCase.evidence.push(...update.evidence);
  if (update.verdict) runtimeCase.verdict = update.verdict;
  if (update.payout) runtimeCase.payout = update.payout;
  return runtimeCase;
}
