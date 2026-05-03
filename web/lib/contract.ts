// AgentCourt contract ABI (minimal for frontend)
export const AGENT_COURT_ABI = [
  "function createCase(bytes32 _disputeRef, address _analysis, address _verifier) payable returns (uint256)",
  "function joinCase(uint256 _caseId) payable",
  "function getCaseCount() view returns (uint256)",
  "function caseCount() view returns (uint256)",
  "function resolveCase(uint256 _caseId, uint8 _verdict, bytes32 _reasoningRef)",
  "function withdrawWinnings(uint256 _caseId)",
  "function withdrawJudgeFee(uint256 _caseId)",
  "function cases(uint256) view returns (tuple(uint256,address,address,address,bytes32,uint256,uint256,uint256,uint256,uint8,bytes32,uint256,uint256,bool,bool,bool))",
  "event CaseCreated(uint256 indexed caseId, address forensic, bytes32 disputeRef, uint256 stakeAmount)",
  "event DefendantJoined(uint256 indexed caseId, address analysis)",
  "event CaseResolved(uint256 indexed caseId, uint8 verdict, bytes32 reasoningRef)",
  "function MIN_STAKE() view returns (uint256)",
] as const;

export const AGENT_COURT_ADDRESS = "0x3D292445484133aDA2d06b8d299E6aD31f0A4ACC";

export const ANALYSIS_ADDRESS = "0xAEFa858f9Cf00260247B2C848f1da31d1D65B757";
export const VERIFICATION_ADDRESS = "0x8c675EbEE7531672769022e37768D7Fa150B1441";
