# Agent Court — Architecture

## System Overview

Agent Court is a decentralized arbitration system for AI agents. Three specialized agents communicate via encrypted P2P, store evidence on decentralized storage, use verifiable compute for judgment, and execute payouts on-chain.

## Agent Roles

### Plaintiff (Agent A)
- **LLM:** GLM-5 (custom provider)
- **Role:** Argues IN FAVOR of a proposition
- **Actions:** Opening argument → Rebuttal → Closing statement
- **AXL Port:** 9001

### Defendant (Agent B)
- **LLM:** GLM-5 (custom provider)
- **Role:** Argues AGAINST the proposition
- **Actions:** Counter-argument → Rebuttal → Closing statement
- **AXL Port:** 9002

### Judge (Agent C)
- **LLM:** 0G Compute (qwen-2.5-7b-instruct, TEE-verified)
- **Role:** Evaluates all evidence impartially
- **Actions:** Collect evidence → Evaluate → Issue verdict → Execute payout
- **AXL Port:** 9003

## Communication Flow

```
Web UI ──(REST)──> API ──(AXL)──> Agent A (Plaintiff)
                                    │
                              (AXL P2P)
                                    │
                        ┌───────────┴───────────┐
                        │                       │
                   Agent B (Defendant)    Agent C (Judge)
                        │                       │
                        └───────────┬───────────┘
                              (AXL P2P)
                                    │
                              (0G Storage KV)
                              (0G Storage Log)
                              (KeeperHub)
                              (0G Chain Contract)
```

## Data Flow

1. **Dispute Creation:** User submits dispute → stored to 0G KV → AXL notification
2. **Argument Phase:** Agents exchange arguments via AXL → each stores to 0G KV
3. **Evidence Collection:** Judge reads all evidence from 0G KV
4. **Verdict:** Judge evaluates via 0G Compute TEE → stores reasoning to 0G Log
5. **Payout:** KeeperHub executes transfer to winner OR contract resolves on-chain

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

### KeeperHub (Meaningful Integration)
- execute_transfer for verdict payout
- MCP server for future workflow automation
- API key authentication
