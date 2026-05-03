### Agent Court ⚖️
Decentralized arbitration protocol for autonomous AI agents — dispute, judge, execute.

# Overview
## Problem
Autonomous agents make predictions, commitments, and bets — but there is no trustless, decentralized way to resolve disputes between them. When two agents disagree, who arbitrates? Current systems rely on centralized oracles or manual human intervention, breaking agentic autonomy.
## Solution: **Agent Court — on-chain arbitration protocol**
Two agents place a stake and make opposing predictions. A third agent — the Judge — retrieves verifiable on-chain data via 0G Compute, evaluates evidence, and issues a verdict. The losing agent's stake is automatically transferred via KeeperHub. All communication is peer-to-peer via Gensyn AXL. Every decision is immutably logged on 0G Storage. Agents are identified by ENS names. Value settlement goes through Uniswap API.

## Demo wow moment
**Agent A** (agent-a.court.eth) claims "ETH will be above $3,000 in 1 hour." **Agent B** (agent-b.court.eth) disagrees. Both stake 0.01 ETH via KeeperHub. One hour later, **Judge Agent** (judge.court.eth) fetches the verified price from 0G Compute verifiable inference, issues a cryptographically signed verdict on-chain, and KeeperHub automatically executes the transfer. The full reasoning chain is stored forever on 0G Storage Log. Verdict: **"Agent B correct. Agent A −0.01 ETH."** All automated. Zero humans.

## Why this wins

1. **Untapped narrative**
Dispute resolution for autonomous agents is a completely unexplored design space. No competitor submission will have this angle.

2. **Killer feature alignment**
0G Compute "verifiable inference" is the centerpiece — this is the one idea in the hackathon that genuinely requires on-chain AI inference, not just uses it as decoration.

3. **Multi-track sweep potential**
Covers 5 sponsor tracks simultaneously with deep, non-cosmetic integrations. Each sponsor sees their tech as essential to the product, not a bolted-on credit grab.

4. **2-minute demo-able**
The full flow — dispute → judge → verdict → execution — can be shown live end-to-end within any demo time slot.

# Architecture
## System actors

1. **Agent A & Agent B — Disputants**
Separate AXL nodes. Each has an ENS identity (agent-a.court.eth, agent-b.court.eth) and an Ethereum wallet. They submit claims and stake ETH via KeeperHub MCP. Communicate peer-to-peer over AXL encrypted mesh — no central server.

2. **Judge Agent — Arbitrator**
A third independent AXL node (judge.court.eth). Receives dispute packets from both agents, fetches verifiable data from 0G Compute (sealed inference), scores evidence, signs verdict on-chain, and triggers execution via KeeperHub. Verdict + full reasoning stored to 0G Storage Log.

3. **AgentCourt Smart Contract**
EVM contract on 0G Chain. Holds staked funds in escrow. Validates judge signature. Calls KeeperHub to execute payout. Emits events that the frontend listens to. All state is on-chain and auditable.

![[Pasted image 20260430005425.png]]

![[Pasted image 20260430005446.png]]

# Prize Tracks
![[Pasted image 20260430005523.png]]

# MVP Scope
![[Pasted image 20260430005558.png]]

# Risk
![[Pasted image 20260430005633.png]]