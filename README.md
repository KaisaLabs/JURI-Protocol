# ⚖️ JURI Protocol — DeFi Exploit Forensics & Cross-Chain Knowledge Base

**Built for ETHGlobal Open Agents 2026**

> *"Every week, a DeFi protocol gets hacked. $3B+ lost. After the chaos, nothing is learned. The same exploits keep repeating. JURI Protocol fixes this."*

JURI is a decentralized DeFi exploit investigation system. Three specialized AI agents — **Forensic**, **Analysis**, and **Verification** — collaborate via encrypted P2P (Gensyn AXL), store evidence immutably on 0G Storage, and the Verification Agent uses 0G Compute's TEE-verified inference to publish a tamper-proof post-mortem. Every protocol learns from every exploit — so the same attack never works twice.

> 🏆 **Target Tracks:** 0G Autonomous Agents, Swarms & iNFT | Gensyn AXL | KeeperHub

---

## 🎥 Demo

- **Live Demo:** [juri-protocol.vercel.app](https://juri-protocol.vercel.app)
- **Demo Video:** [YouTube < 3 min](https://youtube.com)
- **Contract:** [`0xe6D5496aEfaA0b7A34E7C392800D0e022711E95d`](https://chainscan-galileo.0g.ai/address/0xe6D5496aEfaA0b7A34E7C392800D0e022711E95d) on 0G Galileo Testnet

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     WEB DASHBOARD                            │
│          Submit exploit → Monitor investigation → Post-mortem│
└────┬─────────────────┬──────────────────┬───────────────────┘
     │                 │                  │
┌────▼─────┐    ┌──────▼──────┐    ┌──────▼──────────┐
│🔍FORENSIC│    │📊 ANALYSIS  │    │✅ VERIFICATION  │
│  Agent   │◄──►│   Agent     │◄──►│    Agent        │
│          │AXL │             │AXL │                 │
│Trace     │P2P │Classify     │P2P │Cross-reference  │
│fund flows│    │attack vector│    │Publish report   │
│Collect   │    │Score sev.   │    │0G Compute TEE   │
│on-chain  │    │Match RAG    │    │(verifiable)     │
│evidence  │    │             │    │                 │
└────┬─────┘    └──────┬──────┘    └──────┬──────────┘
     │                 │                  │
     │      0G STORAGE KV (shared memory) │
     │      All evidence + state          │
     └─────────────────┬──────────────────┘
                       │
        ┌──────────────┼──────────────────┐
        │              │                  │
   ┌────▼─────┐  ┌─────▼──────┐  ┌───────▼──────┐
   │0G STORAGE│  │0G COMPUTE  │  │  KEEPERHUB   │
   │KV: state │  │TEE-verified│  │Auto-publish  │
   │Log:hist  │  │inference   │  │Execute action │
   │File: RAG │  │Sealed      │  │               │
   └──────────┘  └────────────┘  └───────────────┘
        │              │                  │
   ┌────▼──────────────▼──────────────────▼──────┐
   │           0G CHAIN (EVM, Chain ID 16602)     │
   │  AgentCourt.sol — Escrow + Staking + Verdict │
   │  0xe6D5496aEfaA0b7A34E7C392800D0e022711E95d │
   └──────────────────────────────────────────────┘
```

### How the swarm coordinates

The three agents communicate via Gensyn AXL encrypted P2P mesh (3 nodes, separate identities). Message types:

| Stage         | Message              | From → To                             |
| ------------- | -------------------- | ------------------------------------- |
| Case created  | `CASE_CREATED`         | Orchestrator → All agents             |
| Evidence      | `ARGUMENT_SUBMITTED`   | Forensic → Analysis                   |
| Analysis      | `COUNTER_ARGUMENT`     | Analysis → Forensic                   |
| Rebuttal      | `REBUTTAL`             | Forensic → Analysis                   |
| Closing       | `CLOSING_STATEMENT`    | Both → Verification                   |
| Post-mortem   | `VERDICT_ISSUED`       | Verification → All                    |

All messages are cryptographically signed with each agent's wallet (ethers.js). Evidence is stored to 0G Storage KV with keys `case:{id}:{role}:round:{n}`, accessible by all agents as shared memory.

---

## ⚡ Core Features

| Feature                 | Description                                                                                     | Status |
| ----------------------- | ----------------------------------------------------------------------------------------------- | ------ |
| **Escrow & Staking**        | Both sides lock funds in smart contract escrow. Verdict auto-executes payout.                   | ✅     |
| **Slashing Mechanism**      | Loser forfeits stake to winner. 10% judge fee funds protocol.                                   | ✅     |
| **Immutable Evidence**      | All investigation data stored on 0G Storage KV + Log. Tamper-proof audit trail.                 | ✅     |
| **Verifiable Inference**    | Verification Agent runs on 0G Compute TEE. Reasoning is cryptographically signed and verifiable.| ✅     |
| **P2P Encrypted Comm**      | Agents communicate via Gensyn AXL encrypted mesh — no central server.                           | ✅     |
| **Auto-Execution**          | KeeperHub executes post-investigation actions (payout, notification).                           | ✅     |
| **Cross-Chain Tracing**     | Forensic Agent traces fund flows across EVM chains.                                             | ✅     |

---

## 🎯 Protocol Features & SDKs Used

### 0G (Zero Gravity) — 3 of 4 products integrated

| Product       | SDK                                        | How JURI Uses It                                                                                |
| ------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| **0G Storage**    | `@0gfoundation/0g-ts-sdk` v1.2.6          | KV: agent state + evidence. Log: immutable post-mortems. File: historical exploit RAG dataset.  |
| **0G Compute**    | `@0glabs/0g-serving-broker` + OpenAI SDK    | Verification Agent inference via TEE-verified endpoint. Signed responses prove honest judgment.  |
| **0G Chain**      | Hardhat + ethers.js                         | `AgentCourt.sol` deployed on Galileo testnet (Chain ID 16602). Escrow, staking, verdict storage.|

> **Verified:** 10+ 0G Storage KV transactions on Galileo testnet. Contract: `0xe6D5496a...` on [chainscan](https://chainscan-galileo.0g.ai).

### Gensyn AXL — Encrypted P2P Agent Communication

- 3 AXL nodes running (Go binary, ed25519 identities)
- Peer discovery via topology API (`/topology`, `/send`, `/recv`)
- All agent messages encrypted + cryptographically signed
- Dual transport: AXL (production) + DIRECT HTTP (dev/test)

### KeeperHub — Reliable On-Chain Execution

- `execute_transfer` for verdict payout
- `execute_contract_call` for on-chain actions
- Organization-scoped API key authentication

---

## 🚀 Quick Start

```bash
git clone https://github.com/YOUR_USER/juri-protocol.git
cd juri-protocol
cp .env.example .env  # fill in your keys
pnpm install
bash scripts/setup.sh

# Run E2E (5 terminals or auto with test:e2e)
pnpm test:e2e

# Web UI
pnpm dev          # → http://localhost:3000
# Pitch deck
open http://localhost:3000/pitch
```

---

## 📦 Project Structure

```
juri-protocol/
├── contracts/              # Hardhat + Solidity
│   ├── AgentCourt.sol      # Escrow + staking + dispute resolution
│   ├── test/               # 20 tests (all passing)
│   └── scripts/deploy.ts
├── agents/                 # AI Agent runtime
│   ├── forensic.ts         # 🔍 Traces fund flows, collects evidence
│   ├── analysis.ts         # 📊 Classifies attack, matches patterns
│   ├── verification.ts     # ✅ Cross-references, publishes post-mortem
│   ├── agent-base.ts       # Shared agent class (transport, LLM, storage)
│   ├── transport.ts        # AXL + DIRECT transport layer
│   ├── storage.ts          # 0G Storage SDK wrapper (KV + Log)
│   ├── keeperhub.ts        # KeeperHub REST client
│   └── orchestrator.ts     # Coordinates agents + REST API
├── web/                    # Next.js 15 dashboard
│   ├── app/page.tsx        # Main investigation dashboard
│   ├── app/pitch/          # 9-slide pitch deck
│   └── components/         # CaseForm, AgentFeed, VerdictCard, PayoutStatus
├── docs/                   # PRD, architecture, strategy
├── scripts/                # Setup, E2E test, AXL launcher
└── .env.example
```

---

## 🧠 How the AI Reasoning Works

The Verification Agent receives a structured prompt containing:

1. **Forensic evidence** — traced fund flows, affected contracts, tx hashes (from 0G Storage KV)
2. **Analysis report** — attack vector classification, severity score, matched historical exploits
3. **On-chain ground truth** — verified via 0G Compute TEE inference

It returns structured output:
```
ATTACK_VECTOR: flash_loan_oracle_manipulation
SEVERITY: 9/10
ROOT_CAUSE: Unchecked oracle price deviation enabled by missing TWAP
PREVENTION: Implement 30-min TWAP + circuit breaker at 15% deviation
MATCHED_EXPLOIT: Cream Finance (Oct 2021, $130M) — 87% similarity
CONFIDENCE: 94%
```

This reasoning is cryptographically signed by 0G Compute TEE, stored immutably on 0G Storage Log, and recorded on 0G Chain.

---

## 🏆 Hackathon Tracks

| Track                                                        | Eligibility                                                                                     |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| **0G Autonomous Agents, Swarms & iNFT**                          | ✅ Specialist agent swarm (Forensic + Analysis + Verification), shared 0G Storage memory, TEE-verified inference |
| **Gensyn AXL**                                                   | ✅ 3 AXL nodes, encrypted P2P, peer discovery, signed messages                                  |
| **KeeperHub**                                                    | ✅ `execute_transfer` + `execute_contract_call`, clean architecture                             |
| **Uniswap API** (optional)                                       | Could trace swap flows through Uniswap pools for deeper forensics                               |

---

## 🗺️ Roadmap (Post-Hackathon)

| Phase              | Features                                                                 |
| ------------------ | ------------------------------------------------------------------------ |
| **Now (MVP)**          | Single-verifier forensics, 0G Storage + Compute, AXL P2P, contract escrow |
| **Phase 2**            | Multi-verifier consensus with weighted voting, appeal mechanism           |
| **Phase 3**            | Agent reputation scores on 0G Chain (accuracy tracking)                   |
| **Phase 4**            | Cross-chain tracing (Wormhole, LayerZero, bridges)                        |
| **Phase 5**            | Real-time mempool monitoring + automatic investigation triggers           |
| **Long-term**          | DAO-governed agent parameter tuning, premium forensic API                 |

---

## 👤 Team

- **Name:** [Your Name]
- **GitHub:** [@yourgithub]
- **Telegram:** [@yourtelegram]
- **X (Twitter):** [@yourxhandle]

---

## 📄 License

MIT — Built for ETHGlobal Open Agents 2026
