# JURI Protocol — Architecture

## System Overview

JURI Protocol is a decentralized arbitration system for AI agents. Three specialized agents store evidence on decentralized storage, use verifiable compute for judgment, and settle through the 0G Chain contract. The current demo-ready default runtime is direct local orchestration, while AXL remains an optional transport mode.

## Agent Roles

### Plaintiff (Agent A)
- **LLM:** ASI1 (custom provider)
- **Role:** Argues IN FAVOR of a proposition
- **Actions:** Opening argument → Rebuttal → Closing statement
- **AXL Port:** 9001

### Defendant (Agent B)
- **LLM:** ASI1 (custom provider)
- **Role:** Argues AGAINST the proposition
- **Actions:** Counter-argument → Rebuttal → Closing statement
- **AXL Port:** 9002

### Judge (Agent C)
- **LLM:** 0G Compute (qwen-2.5-7b-instruct, TEE-verified)
- **Role:** Evaluates all evidence impartially
- **Actions:** Collect evidence → Evaluate → Issue verdict → Trigger payout path
- **AXL Port:** 9003

## Communication Flow

```
Web UI ──(REST)──> Next.js API ──(REST)──> Orchestrator
                                              │
                                   ┌──────────┼──────────┐
                                   │          │          │
                              Agent A     Agent B     Agent C
                            (Plaintiff) (Defendant)   (Judge)
                                   │          │          │
                                   └──────┬───┴───┬──────┘
                                          │       │
                                   direct or AXL  │
                                          │       │
                                   (0G Storage)   │
                                   (0G Compute)   │
                                   (0G Chain Contract)
```

## Data Flow

1. **Dispute Creation:** User submits dispute through the web app → Next.js API → orchestrator → dispute stored to 0G KV and case created on-chain
2. **Argument Phase:** Orchestrator seeds the agents → agents exchange arguments over the configured transport (direct by default, AXL optional) → each stores evidence to 0G KV
3. **Evidence Collection:** Judge reads all evidence from 0G KV
4. **Verdict:** Judge evaluates via 0G Compute TEE → stores reasoning to 0G Log
5. **Payout:** The runtime reports contract withdrawal or refund attempts through the case payout status payload

## Security

- **AXL:** End-to-end encrypted P2P communication (no central server)
- **0G Compute:** TEE-signed inference — verifiable, tamper-proof
- **Messages:** Signed with agent's wallet (ethers.js)
- **Storage:** Client-side encrypted before upload to 0G
- **Smart Contract:** ReentrancyGuard, access controls

## Sponsor Integration Depth

### 0G (Deep Integration)
- Storage KV: Evidence + state
- Storage Log: Immutable verdict history
- Compute: TEE-verified Judge inference
- Chain: AgentCourt.sol smart contract
- RPC: Galileo testnet

### Gensyn AXL (Deep Integration)
- 3 separate AXL nodes
- P2P encrypted communication
- HTTP API bridge for agent interaction
- Topology-aware peer discovery

### KeeperHub (Available Integration)
- KeeperHub client and integration hooks exist in the repo, but it is not the default active payout path in the current demo runtime
- Intended for future workflow automation / sponsor-track integration work
- API key authentication
