# 🧬 JURI — The Immune System of DeFi

[![0G Chain](https://img.shields.io/badge/0G-Galileo_Testnet-blue)](https://chainscan-galileo.0g.ai/address/0x3D292445484133aDA2d06b8d299E6aD31f0A4ACC)
[![Smart Contract](https://img.shields.io/badge/Contract-0x3D29...4ACC-green)](https://chainscan-galileo.0g.ai/address/0x3D292445484133aDA2d06b8d299E6aD31f0A4ACC)
[![Tests](https://img.shields.io/badge/Tests-20%2F20-brightgreen)]()
[![License](https://img.shields.io/badge/License-MIT-yellow)]()

> *"$16.5B stolen across 513 hacks. 40 protocols exploited by the exact same technique — twice. DeFi has no memory. JURI fixes that."*

**JURI** is a cross-chain exploit intelligence network powered by an AI agent swarm. Every exploit is automatically investigated, classified, and stored immutably on 0G Storage — building a shared memory that makes DeFi self-learning. The same attack never succeeds twice.

Built for **ETHGlobal Open Agents 2026**.

> 🏆 **Tracks:** 0G Autonomous Agents & iNFT | Gensyn AXL | KeeperHub

---

## The Problem

DeFi has no immune system.

Every week a protocol gets hacked. Post-mortems are scattered across Twitter threads and Discord messages — unverifiable, incomplete, siloed. There is no trustless source of truth that the entire ecosystem can learn from.

The consequences are brutal:

| Stat | Reality |
|------|---------|
| **$16.5B lost** | Across 513 documented hacks |
| **40 protocols** | Exploited by the exact same technique more than once |
| **29 flash loan oracle attacks** | $428M lost — same vector, different victims |
| **15% of hacks** | Cross-chain, zero unified tracking tools |
| **0 immutable post-mortems** | Every report is centralized, mutable, or missing |

*Real data from DefiLlama Hacks API, verified May 2026.*

---

## The Solution

**JURI is three AI agents that never forget.**

When an exploit is reported:

1. 🔍 **Forensic Agent** traces fund flows across chains, collects on-chain evidence, stores it on 0G Storage
2. 📊 **Analysis Agent** classifies the attack vector, scores severity, cross-references 513 historical exploits
3. ✅ **Verification Agent** runs on 0G Compute TEE — tamper-proof inference — publishes an immutable post-mortem

The result: a **permanent, verifiable, cross-chain exploit record** that any protocol can query before they become the next victim.

```
Hack reported
     │
     ▼
┌─────────────────────────────────────────────────────┐
│  🔍 FORENSIC          📊 ANALYSIS       ✅ VERIFY   │
│  ─────────────        ───────────       ──────────  │
│  Trace fund flow  →   Classify attack → Cross-ref   │
│  Collect tx data      Score severity   TEE inference │
│  Cross-chain track    Match 513 hacks  Publish PDF  │
│  Store → 0G KV        Store → 0G KV   Store → 0G Log│
└─────────────────────────────────────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │  IMMUTABLE RECORD  │
                    │  on 0G Storage     │
                    │                    │
                    │  Attack vector     │
                    │  Severity: 9/10    │
                    │  Root cause        │
                    │  Pattern match:    │
                    │  "29 similar hacks │
                    │   $428M total"     │
                    │  Prevention guide  │
                    └────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │   0G CHAIN         │
                    │   AgentCourt.sol   │
                    │   On-chain attest. │
                    └────────────────────┘
```

---

## Three Layers of Value

### Layer 1 — Exploit Memory (Core)
Every exploit submitted → agents investigate → immutable post-mortem on 0G Storage.
**Free to submit. Public to read. Impossible to alter.**

### Layer 2 — Pattern Intelligence (Differentiator)
Every new post-mortem is cross-referenced against all previous exploits.
Protocols can query: *"Is my contract vulnerable to any known attack pattern?"*

Output example:
```
⚠️  HIGH RISK — Pattern Match Found
Attack: flash_loan_oracle_manipulation
Severity: 9/10
Matched: 29 previous exploits | $428M total lost
Latest: Kelp Finance (Apr 2026, $293M) — 94% similarity
Root cause: Missing TWAP + no circuit breaker
Prevention: Implement 30-min TWAP + 15% deviation threshold
Verified by: 0G Compute TEE | Attestation: 0x...
```

### Layer 3 — Trustless Arbitration (Bug Bounty Layer)
When a security researcher and a protocol disagree on a vulnerability:
- Both parties stake → JURI agents investigate → on-chain verdict → automatic payout
- Trustless Immunefi. No centralized arbiter.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        WEB DASHBOARD                             │
│   Report exploit (free) → Watch agents live → Read post-mortem  │
│   Query pattern database → Bug bounty arbitration               │
└──────┬────────────────────┬──────────────────┬──────────────────┘
       │ REST                │                  │
┌──────▼──────┐    ┌─────────▼──────┐   ┌──────▼──────────┐
│ 🔍 FORENSIC │    │ 📊 ANALYSIS    │   │ ✅ VERIFICATION │
│   Agent     │◄──►│    Agent       │◄──►│    Agent        │
│             │AXL │                │AXL │                 │
│ • Fund trace│P2P │ • Attack class.│P2P │ • Cross-ref     │
│ • TX collect│    │ • Severity 1-10│    │ • TEE inference │
│ • Cross-ch. │    │ • Pattern match│    │ • Publish PM    │
│ • 0G KV     │    │ • Root cause   │    │ • 0G Log        │
└─────────────┘    └────────────────┘   └─────────────────┘
       │                    │                    │
       └────────────────────┼────────────────────┘
                            │ Shared 0G Storage KV
              ┌─────────────┼──────────────┐
              │             │              │
       ┌──────▼──────┐ ┌────▼──────┐ ┌────▼──────────┐
       │ 0G STORAGE  │ │0G COMPUTE │ │   KEEPERHUB   │
       │             │ │           │ │               │
       │ KV: state   │ │TEE-signed │ │ Auto-execute  │
       │ Log: history│ │inference  │ │ post-verdict  │
       │ File: RAG   │ │qwen-2.5-7b│ │ actions       │
       └──────┬──────┘ └─────┬─────┘ └───────────────┘
              │              │
       ┌──────▼──────────────▼──────────────────────┐
       │         0G CHAIN (Galileo, ID 16602)        │
       │  AgentCourt.sol — Staking + Verdict + Attest│
       │  0x3D292445484133aDA2d06b8d299E6aD31f0A4ACC │
       └─────────────────────────────────────────────┘
```

### Agent Communication (Gensyn AXL)

Three AXL nodes communicate via encrypted P2P mesh. All messages cryptographically signed.

| Stage | Message | Flow |
|-------|---------|------|
| Evidence | `ARGUMENT_SUBMITTED` | Forensic → Analysis |
| Questions | `COUNTER_ARGUMENT` | Analysis → Forensic |
| Rebuttal | `REBUTTAL` | Forensic → Analysis |
| Closing | `CLOSING_STATEMENT` | Both → Verification |
| Verdict | `VERDICT_ISSUED` | Verification → All |

---

## Tech Stack

| Layer | Technology | Usage |
|-------|-----------|-------|
| **Chain** | 0G Chain (Galileo, EVM ID 16602) | AgentCourt.sol — staking, verdict, attestation |
| **Storage** | 0G Storage KV + Log + File | Evidence state, immutable post-mortems, RAG dataset |
| **Compute** | 0G Compute TEE (qwen-2.5-7b) | Verification Agent — tamper-proof inference |
| **P2P Comm** | Gensyn AXL | Encrypted agent-to-agent messaging |
| **Execution** | KeeperHub | Post-verdict actions (payout, notification) |
| **LLM** | ASI1 (OpenAI-compatible) | Forensic + Analysis agents |
| **Search** | Brave Search + Serper + Rekt.news | Real-time exploit intel feed |
| **Frontend** | Next.js 15 + React 19 + Tailwind v4 | Investigation dashboard |
| **Contract** | Solidity 0.8.24 + Hardhat + OZ | 20/20 tests passing |

---

## 0G Integration Depth

### 0G Storage — 3 modes used

```typescript
// KV Store — shared agent memory
await storage.storeValue(`case:${id}:forensic:round:1`, forensicReport);
await storage.storeValue(`case:${id}:analysis:round:2`, analysisReport);

// Log — immutable post-mortem (append-only)
await storage.storeVerdict(caseId, JSON.stringify(verdict));

// File — historical exploit RAG dataset
await storage.uploadFile("exploits-database.json");
```

### 0G Compute TEE — verified inference

```typescript
// Verification Agent calls 0G Compute broker
const { endpoint } = await broker.inference.getServiceMetadata(providerAddress);
const headers = await broker.inference.getRequestHeaders(providerAddress);
// Response is TEE-signed — cryptographic proof of honest inference
const verdict = await fetch(`${endpoint}/chat/completions`, { headers, body: prompt });
```

### 0G Chain — on-chain attestation

```solidity
// AgentCourt.sol
function createCase(bytes32 _disputeRef, address _analysis, address _verifier)
    external payable returns (uint256)

function resolveCase(uint256 _caseId, Verdict _verdict, bytes32 _reasoningRef)
    external  // only verifier agent can call

function withdrawWinnings(uint256 _caseId) external  // trustless payout
```

---

## Live Demo Flow

**Case: Kelp Finance — $293M exploit, April 2026**
*(Real hack from DefiLlama data — LayerZero OFT bridge exploit, Ethereum + Arbitrum)*

```
1. User reports: "Kelp Finance LayerZero bridge exploit — $293M drained"
   → No wallet needed. Free to submit.

2. 🔍 Forensic Agent activates:
   → Searches Brave + Serper + Rekt.news for real-time intel
   → "Found: 4 articles, 2 on-chain traces"
   → Traces: attacker 0x... → 3 intermediate wallets → Tornado Cash
   → Stores evidence: 0G Storage KV

3. 📊 Analysis Agent responds:
   → "Attack vector: LayerZero OFT message spoofing"
   → "Severity: 10/10 — CRITICAL"
   → "Pattern match: 6 similar bridge exploits, $890M total"
   → "Root cause: Missing source chain validation in OFT receiver"

4. ✅ Verification Agent (0G Compute TEE):
   → Cross-references all findings
   → "CONFIRMED. Attack vector verified."
   → "Prevention: Validate msg.sender == trustedRemote on ALL chains"
   → Post-mortem published → 0G Storage Log (immutable)
   → resolveCase() called → 0G Chain attestation

5. Output:
   → Permanent record: storagescan-galileo.0g.ai
   → On-chain: chainscan-galileo.0g.ai/tx/0x...
   → Pattern database updated: "Bridge exploit #7 recorded"
```

---

## Quick Start

### Prerequisites

```bash
node >= 20
pnpm >= 9
0G Galileo testnet wallet (get 0G from faucet: faucet.0g.ai)
```

### Setup

```bash
git clone https://github.com/YOUR_HANDLE/juri-protocol
cd juri-protocol
cp .env.example .env
# Fill in: FORENSIC_KEY, ANALYSIS_KEY, VERIFICATION_KEY, ZG_API_SECRET
pnpm install
```

### Run

```bash
# Option 1: Full stack (agents + UI)
pnpm dev:all

# Option 2: E2E test only
pnpm test:e2e

# Option 3: UI only (connects to running agents)
cd web && pnpm dev    # → http://localhost:3000
```

### Environment Variables

```bash
# 0G Chain
ZG_RPC_URL=https://evmrpc-testnet.0g.ai
CONTRACT_ADDRESS=0x3D292445484133aDA2d06b8d299E6aD31f0A4ACC

# Agent wallets (must be distinct, each needs 0G balance)
FORENSIC_KEY=0x...       # creates cases on-chain
ANALYSIS_KEY=0x...       # joins cases on-chain
VERIFICATION_KEY=0x...   # resolves cases + earns 10% fee

# 0G Compute TEE
ZG_API_SECRET=app-sk-... # format: app-sk-{base64(json|sig)}

# 0G Storage
ZG_STORAGE_INDEXER=https://indexer-storage-testnet-turbo.0g.ai
ZG_KV_NODE=http://3.101.147.150:6789

# Search (real-time intel)
BRAVE_API_KEY=...
SERPER_API_KEY=...

# Optional: skip slow 0G storage writes for fast testing
ZG_SKIP_STORAGE=true
```

---

## Project Structure

```
juri-protocol/
├── contracts/
│   ├── AgentCourt.sol          # Staking + verdict + trustless payout
│   ├── test/AgentCourt.test.ts # 20/20 tests passing
│   └── scripts/deploy.ts
├── agents/src/
│   ├── forensic.ts             # 🔍 Fund flow tracing + evidence collection
│   ├── analysis.ts             # 📊 Attack classification + pattern matching
│   ├── verification.ts         # ✅ TEE cross-reference + post-mortem publish
│   ├── orchestrator.ts         # Case lifecycle + agent seeding + REST API
│   ├── agent-base.ts           # Shared: transport, LLM, storage, signing
│   ├── transport.ts            # AXL + DIRECT transport abstraction
│   ├── storage.ts              # 0G Storage SDK (KV + Log + File)
│   ├── search.ts               # Brave + Serper + Rekt.news intel feed
│   └── keeperhub.ts            # KeeperHub execution client
├── web/
│   ├── app/page.tsx            # Investigation dashboard
│   ├── app/pitch/              # Pitch deck (9 slides)
│   ├── lib/contract.ts         # AgentCourt ABI + address
│   └── components/
│       ├── AgentFeed.tsx       # Live agent timeline
│       ├── VerdictCard.tsx     # Post-mortem display
│       └── PayoutStatus.tsx    # Staking + withdrawal UI
├── scripts/
│   ├── e2e-test.ts             # Full pipeline test
│   └── run-all.sh              # Launch all agents
└── docs/
    ├── PRD.md
    └── ARCHITECTURE.md
```

---

## Smart Contract

**AgentCourt.sol** — deployed on 0G Galileo Testnet

`0x3D292445484133aDA2d06b8d299E6aD31f0A4ACC`

| Function | Who calls | What it does |
|----------|-----------|-------------|
| `createCase(disputeRef, analysis, verifier)` | Orchestrator (server-side, FORENSIC_KEY) | Opens case for free submissions. User wallet optional for bug bounty disputes. |
| `joinCase(caseId)` | Analysis agent | Matches stake |
| `resolveCase(caseId, verdict, reasoningRef)` | Verification agent | Issues verdict, enables payouts |
| `withdrawWinnings(caseId)` | Winner | Claims 90% of pool |
| `withdrawJudgeFee(caseId)` | Verification agent | Claims 10% fee |

Verdict enum: `PENDING` / `FORENSIC_WINS` / `ANALYSIS_WINS` / `TIED`

---

## Roadmap

| Phase | Feature | Status |
|-------|---------|--------|
| **MVP** | 3 agent swarm, 0G full stack, AXL P2P, contract escrow | ✅ Done |
| **Phase 2** | Pattern query API — "is my contract vulnerable?" | 🔨 Next |
| **Phase 3** | Historical exploit RAG on 0G File storage | 🔨 Next |
| **Phase 4** | Real-time mempool monitoring + auto-trigger | 📋 Planned |
| **Phase 5** | Agent reputation scores on 0G Chain | 📋 Planned |
| **Phase 6** | Multi-verifier consensus + appeal mechanism | 📋 Planned |
| **Phase 7** | DAO governance for agent parameters | 📋 Future |

---

## Why 0G

0G is the only infrastructure where all three layers of JURI can exist trustlessly:

- **Storage** — evidence that can't be deleted or altered by any protocol team
- **Compute TEE** — inference that can't be manipulated by the node operator  
- **Chain** — verdict and payout that executes automatically, no middleman

Without verifiable compute + immutable storage + programmable settlement in one ecosystem, JURI is just another centralized forensics tool. 0G makes it trustless.

---

## Team

- **Builder:** [Your Name] — [@handle]
- **ETHGlobal Open Agents 2026** — Solo submission

---

## License

MIT
