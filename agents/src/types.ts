import type { RuntimeCase } from "./case-runtime";

// ===================== AXL Message Protocol =====================

export type MessageType =
  | "CASE_CREATED"
  | "ARGUMENT_SUBMITTED"
  | "EVIDENCE_STORED"
  | "COUNTER_ARGUMENT"
  | "REBUTTAL"
  | "CLOSING_STATEMENT"
  | "VERDICT_ISSUED"
  | "HEARTBEAT";

export interface AgentMessage {
  type: MessageType;
  caseId: number;
  from: AgentRole;
  to: AgentRole | "all";
  content: string;
  evidenceRefs: string[]; // 0G Storage KV keys
  timestamp: number;
  signature?: string;
}

export type AgentRole = "forensic" | "analysis" | "verification";
export type Verdict = "PLAINTIFF" | "DEFENDANT" | "TIED";

export interface AgentIdentity {
  role: AgentRole;
  address: string;
  axlPeerId: string;
  axlPort: number;
}

// ===================== Case State =====================

export interface CaseState {
  id: number;
  disputeQuestion: string;
  status: "PENDING" | "ARBITRATION" | "RESOLVED";
  forensic: AgentIdentity;
  analysis: AgentIdentity;
  verification: AgentIdentity;
  forensicArguments: EvidenceEntry[];
  analysisArguments: EvidenceEntry[];
  verdict?: {
    result: "PLAINTIFF" | "DEFENDANT" | "TIED";
    reasoning: string;
    reasoningRef: string; // 0G Storage Log key
    onChainTx?: string;
  };
  stakeAmount: string; // in wei
  createdAt: number;
}

export interface EvidenceEntry {
  round: number;
  content: string;
  storageRef: string; // 0G KV key
  sources?: string[];
  timestamp: number;
}

// ===================== 0G Storage =====================

export interface StorageEntry {
  key: string;
  value: string;
  streamId: number;
  txHash?: string;
}

// ===================== KeeperHub =====================

export interface KeeperHubTransfer {
  to: string;
  amount: string;
  token?: string;
}

// ===================== AXL HTTP API =====================

export interface AxlNodeInfo {
  peerId: string;
  addresses: string[];
}

export interface AxlTopology {
  peers: AxlNodeInfo[];
}

export interface AxlMessage {
  from: string;
  to: string;
  data: string;
  timestamp: number;
}

export interface AgentControlCaseRequest {
  runtimeCase: RuntimeCase;
}
