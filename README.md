# ⚖️ JURI Protocol — Decentralized AI Agent Arbitration

**Built for ETHGlobal Open Agents 2026**

Agent Court is a decentralized arbitration system where AI agents settle disputes on-chain. Three specialized agents — **Plaintiff**, **Defendant**, and **Judge** — store evidence on 0G Storage, and the Judge uses 0G Compute's TEE-verified inference to issue fair verdicts. The current demo-ready default runtime is **direct local orchestration**: the web app talks to Next.js API routes, those routes proxy to the orchestrator, and the orchestrator coordinates the agents. `AGENT_TRANSPORT=axl` is still available when you want the AXL transport path.

> 🏆 **Tracks:** 0G Autonomous Agents · Gensyn AXL · KeeperHub

---

## 🎥 Demo

- **Live Demo:** [agent-court.vercel.app](https://agent-court.vercel.app) _(deploy after build)_
- **Demo Video:** [YouTube (under 3 min)](https://youtube.com) _(record Day 4)_
- **Contract:** `0x...` on [0G Galileo Testnet](https://chainscan-galileo.0g.ai)

---

## 🏗️ Architecture

```
User (Web UI)
    │
    ├── Creates dispute → 0G Storage KV
    │
    ▼
┌──────────────────────────────────────────┐
│         AGENT COURT SYSTEM               │
│                                          │
│  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│  │Plaintiff │  │Defendant │  │ JUDGE  │ │
│  │ Agent A  │  │ Agent B  │  │Agent C │ │
│  │LLM:GLM-5 │  │LLM:GLM-5 │  │0G Comp.│ │
│  └────┬─────┘  └────┬─────┘  └───┬────┘ │
│       │              │            │      │
│       └──────────────┼────────────┘      │
│                      │                   │
│           GENSYN AXL P2P NET             │
│           (encrypted, 3 nodes)           │
└──────────────────────────────────────────┘
           │           │           │
    ┌──────▼──┐  ┌─────▼────┐  ┌──▼──────┐
    │0G Store │  │0G Compute│  │KeeperHub│
    │KV + Log │  │  TEE ✓   │  │Payout   │
    └─────────┘  └──────────┘  └─────────┘
           │           │           │
    ┌──────▼───────────▼───────────▼──────┐
    │        0G CHAIN (EVM)               │
    │   AgentCourt.sol — Staking + Verdict│
    └─────────────────────────────────────┘
```

![Architecture Diagram](docs/ARCHITECTURE.png)

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+
- Go 1.25+ (only if you want to run AXL transport)
- 0G testnet wallet (funded via [faucet.0g.ai](https://faucet.0g.ai))

### Setup

```bash
# 1. Clone
git clone https://github.com/YOUR_USERNAME/agent-court.git
cd agent-court

# 2. Run setup
bash scripts/setup.sh

# 3. Edit environment variables
cp .env.example .env
# Fill in the required values listed below

# 4. Install dependencies
pnpm install
```

### Required environment variables

The direct-default demo flow is real and depends on the orchestrator + agents being able to perform storage, compute, and on-chain steps.

Required for the web/orchestrator path:

- `AGENT_CONTROL_TOKEN`
- `API_PORT` (defaults to `4000`)
- `ORCHESTRATOR_URL` (defaults to `http://127.0.0.1:4000`)
- `CONTRACT_ADDRESS`

Required for 0G / chain integration:

- `ZG_RPC_URL`
- `ZG_STORAGE_INDEXER`
- `ZG_KV_NODE`
- `ZG_SERVICE_URL`
- `ZG_API_SECRET`

Required for distinct on-chain actors when `CONTRACT_ADDRESS` is set:

- `PLAINTIFF_KEY`
- `DEFENDANT_KEY`
- `JUDGE_KEY`

Optional runtime settings:

- `AGENT_TRANSPORT=direct` for the local default
- `AGENT_TRANSPORT=axl` if you want to run the AXL transport path
- `PLAINTIFF_CONTROL_PORT`, `DEFENDANT_CONTROL_PORT`, `JUDGE_CONTROL_PORT`

### Start the demo-ready runtime

You need **5 terminals** for the default local demo:

```bash
# Terminal 1: Orchestrator API + runtime state server
pnpm agent:orchestrator

# Terminal 2: Plaintiff agent
pnpm agent:plaintiff

# Terminal 3: Defendant agent
pnpm agent:defendant

# Terminal 4: Judge agent
pnpm agent:judge

# Terminal 5: Next.js web app
pnpm dev
```

Then visit `http://localhost:3000`.

The browser does **not** call the orchestrator directly. It calls Next.js API routes under `web/app/api/*`, and those routes proxy requests to the orchestrator.

### Start with AXL transport instead

If you want the AXL path instead of the direct default:

```bash
# Terminal 1: start the AXL nodes
bash scripts/run-axl.sh
# Then run the node commands printed by that script

# Separate terminals: orchestrator, plaintiff, defendant, judge, web
AGENT_TRANSPORT=axl pnpm agent:orchestrator
AGENT_TRANSPORT=axl pnpm agent:plaintiff
AGENT_TRANSPORT=axl pnpm agent:defendant
AGENT_TRANSPORT=axl pnpm agent:judge
pnpm dev
```

### Honest demo notes

- There is no frontend simulation fallback anymore.
- If the orchestrator is down, misconfigured, or cannot reach storage / compute / contract dependencies, the UI will show the real error state.
- If `CONTRACT_ADDRESS` is missing, case creation will fail because the orchestrator currently requires a real contract-backed create flow.
- Verdict metadata and payout status are rendered from the runtime payload reported by the backend, including simulated compute fallback and on-chain skip/failure states when present.

---

## 📦 Project Structure

```
agent-court/
├── contracts/           # Hardhat + Solidity
│   ├── contracts/
│   │   └── AgentCourt.sol   # Staking + dispute resolution (0G Chain)
│   ├── scripts/deploy.ts
│   └── hardhat.config.ts
├── agents/              # Agent scripts (Node.js/TypeScript)
│   ├── src/
│   │   ├── plaintiff.ts     # Agent A — argues FOR
│   │   ├── defendant.ts     # Agent B — argues AGAINST
│   │   ├── judge.ts         # Agent C — evaluates + verdict
│   │   ├── agent-base.ts    # Base agent class
│   │   ├── axl-client.ts    # AXL HTTP API wrapper
│   │   ├── storage.ts       # 0G Storage SDK wrapper
│   │   ├── keeperhub.ts     # KeeperHub MCP/REST client
│   │   └── types.ts         # Shared types
│   └── config/              # AXL node configs (JSON)
├── web/                 # Next.js frontend
│   ├── app/
│   │   ├── page.tsx         # Main dashboard
│   │   ├── components/      # CaseForm, AgentFeed, VerdictCard, PayoutStatus
│   │   └── api/             # Next.js proxy routes to orchestrator
│   └── next.config.js
├── scripts/             # Setup & run scripts
├── docs/                # Architecture docs
└── .env.example
```

---

## 🎯 Hackathon Track Eligibility

### 🏆 0G Autonomous Agents, Swarms & iNFT Innovations
- ✅ Working example agent (Judge with TEE-verified inference)
- ✅ 0G Storage for evidence (KV) and immutable reasoning (Log)
- ✅ 0G Compute for verifiable Judge inference
- ✅ 0G Chain smart contract (AgentCourt.sol deployed on Galileo testnet)
- ✅ Multi-agent coordination (Plaintiff + Defendant + Judge)

### 🏆 Gensyn AXL — Best Application of Agent eXchange Layer
- ✅ 3 separate AXL nodes communicating P2P (encrypted)
- ✅ Real utility: dispute resolution between agents
- ✅ No centralized message broker — pure AXL P2P
- ✅ Cross-node communication (different ports, distinct identities)

### 🏆 KeeperHub — Best Use of KeeperHub
- ✅ `execute_transfer` for verdict payout
- ✅ Clean code + documented architecture
- ✅ Working demo with real execution flow

### 🏆 Uniswap API — Best Uniswap API Integration (Optional)
- Could be added by enabling agents to swap stake tokens via Uniswap API
- Add `FEEDBACK.md` for Uniswap builder feedback

---

## 🔧 Technologies

| Layer          | Technology                                           |
| -------------- | ---------------------------------------------------- |
| Chain          | **0G Chain** (EVM, Galileo Testnet, Chain ID 16602)  |
| Storage        | **0G Storage** (KV + Log, TS SDK)                    |
| Compute        | **0G Compute** (TEE-verified inference, qwen-2.5-7B) |
| Communication  | **Gensyn AXL** (P2P encrypted, 3 nodes)              |
| Execution      | **KeeperHub** (execute_transfer, MCP server)         |
| LLM (Agents)   | GLM-5 / qwen3.6-plus (custom OpenAI-compatible)      |
| LLM (Judge)    | 0G Compute (qwen-2.5-7b-instruct, TEE-signed)       |
| Frontend       | Next.js 15 + React 19 + Tailwind CSS v4              |
| Smart Contract | Solidity 0.8.24 + Hardhat + OpenZeppelin             |

---

## 📜 Smart Contract

**AgentCourt.sol** deployed on **0G Chain Galileo Testnet**:

- `createCase()` — Plaintiff creates dispute + stakes tokens
- `joinCase()` — Defendant joins by matching stake
- `resolveCase()` — Judge issues verdict
- `withdrawWinnings()` — Winner claims payout
- `withdrawJudgeFee()` — Judge claims 10% fee

View on [0G Chainscan](https://chainscan-galileo.0g.ai)

---

## 👥 Team

- **Name:** xfajarr
- **Telegram:** [Telegram](https://t.me/xfajarrr)
- **X (Twitter):** [Twitter](https://x.com/fajarr0x)

---

## 📄 License

MIT — Built for ETHGlobal Open Agents 2026
