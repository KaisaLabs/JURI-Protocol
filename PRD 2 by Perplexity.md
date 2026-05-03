# Agent Court 
## 1. Executive Summary

**Agent Court** is the first on-chain arbitration protocol for AI agents. When two agents reach a dispute — conflicting market predictions, contradictory data claims, or contested payments — Agent Court provides a **verifiable, trustless, and fully automated** resolution process with no human involvement required.

The core value proposition: a *verifiable AI inference* is executed by a "Judge Agent" using **0G Compute**, the verdict is stored immutably on **0G Storage**, all inter-agent communication flows through **Gensyn AXL**, and fund execution is handled by **KeeperHub** — forming a complete, autonomous end-to-end loop.

**Target prize tracks:**

| Sponsor | Prize Pool | Fit |
|---|---|---|
| 0G (Autonomous Agents + Compute) | $15,000 | ⭐⭐⭐⭐⭐ Verifiable inference = killer feature |
| KeeperHub | $5,000 | ⭐⭐⭐⭐⭐ Reliable verdict execution |
| Gensyn AXL | TBD | ⭐⭐⭐⭐ Native inter-agent P2P layer |
| World | $10,000 | ⭐⭐⭐ Agent identity via World ID (stretch) |

**Total addressable prize: ~$30,000+**

***

## 2. Problem Statement

AI agents can reason, trade, and communicate — but they have no dispute resolution mechanism when conflicts arise. Concrete examples:

- Agent A and Agent B both claim they won a prediction bet
- Two agents in a multi-agent pipeline return contradictory outputs
- An agent pays for a service but disputes the quality of the result

**Existing solutions:** None. All disputes today are resolved manually by humans or off-chain, which fundamentally undermines the autonomy of agentic systems.

**Agent Court fills this gap** by providing a trustless, verifiable, autonomous arbitration layer that is native to AI agents — the missing governance primitive for the agentic economy.

***

## 3. Product Overview

### 3.1 Core Concept

```
Agent A ──── files dispute ────► Agent Court Smart Contract
Agent B ──── submits evidence ──►          │
                                            ▼
                                 Judge Agent (0G Compute)
                                 [verifiable inference]
                                            │
                                 Verdict stored on 0G Storage
                                            │
                                 KeeperHub executes transfer
                                 Agent A ◄── or ──► Agent B
```

### 3.2 Participants

| Role | Description | Technology |
|---|---|---|
| **Plaintiff Agent** | The agent filing the dispute | Any agent framework |
| **Defendant Agent** | The agent being disputed | Any agent framework |
| **Judge Agent** | Neutral agent that evaluates evidence | 0G Compute (verifiable inference) |
| **Court Contract** | Smart contract handling escrow & verdict | Solidity / EVM |

### 3.3 Dispute Flow

**Step 1 — Filing (Plaintiff)**
- Plaintiff Agent calls `fileDispute(defendant, evidence, stakeAmount)` on the Court Contract
- Stake is held in escrow by the contract
- Dispute notification is sent to Defendant via Gensyn AXL (encrypted P2P)

**Step 2 — Defense (Defendant)**
- Defendant Agent receives the notification via AXL
- Submits `submitDefense(caseId, counterEvidence, stakeAmount)` within a 10-minute window
- Matching stake enters escrow

**Step 3 — Judgment (Judge Agent)**
- Court Contract triggers the Judge Agent via 0G Compute
- Judge Agent runs verifiable inference:
  - Reads all evidence from on-chain calldata
  - Verifies claims against public/oracle data sources
  - Generates a full reasoning chain + verdict (`PLAINTIFF_WINS` / `DEFENDANT_WINS` / `DRAW`)
- The inference receipt (cryptographic attestation) is submitted back to the contract → **proof of honest judgment**

**Step 4 — Execution (KeeperHub)**
- Contract signals KeeperHub with the finalized verdict
- KeeperHub reliably executes the fund transfer:
  - Winner receives their stake back + 90% of loser's stake
  - 10% goes to the protocol treasury to sustain Judge Agent operations
- Full verdict and reasoning chain is stored on **0G Storage Log** (immutable, publicly auditable)

***

## 4. Technical Architecture

### 4.1 Smart Contract Layer

**`AgentCourt.sol`** — Core contract

```solidity
// Core state
struct Case {
    address plaintiff;       // agent wallet
    address defendant;       // agent wallet
    bytes32 evidenceHash;    // 0G Storage pointer
    bytes32 defenseHash;
    uint256 stakeAmount;
    CaseStatus status;       // FILED, PENDING, JUDGING, CLOSED
    Verdict verdict;         // PLAINTIFF_WINS, DEFENDANT_WINS, DRAW
    uint256 filedAt;
    uint256 closedAt;
}

// Key functions
function fileDispute(address defendant, bytes calldata evidence) payable external;
function submitDefense(uint256 caseId, bytes calldata counterEvidence) payable external;
function submitVerdict(uint256 caseId, Verdict verdict, bytes calldata reasoning, bytes calldata inferenceProof) external onlyJudge;
function executeVerdict(uint256 caseId) external; // called by KeeperHub
```

**Deployment target:** Sepolia testnet for demo. Extendable to any EVM L2 (Arbitrum, Base) for production.

### 4.2 Judge Agent (0G Compute)

The Judge Agent is the most critical component — it is what makes Agent Court *verifiable*, not just "an LLM decides."

**0G Compute Integration:**
- Judge Agent is deployed as an inference node on the 0G Compute network
- Every inference job produces a **cryptographic receipt** (attestation) submitted back to the contract
- The contract verifies the attestation signature before accepting the verdict
- This means: nobody can manipulate the judge's output without the 0G Compute network detecting it

**Judge Agent Logic (pseudocode):**
```python
async def evaluate_case(case_id: str, evidence: dict, defense: dict) -> Verdict:
    # 1. Parse and normalize claims from both parties
    claims = extract_claims(evidence, defense)
    
    # 2. Fetch verifiable ground truth (price feeds, on-chain data)
    oracle_data = await fetch_oracle_data(claims.time_range)
    
    # 3. Evaluate each claim against ground truth
    scores = evaluate_claims(claims, oracle_data)
    
    # 4. Generate reasoning chain (stored on 0G Storage)
    reasoning = generate_reasoning(claims, scores)
    
    # 5. Return structured verdict with confidence score
    return Verdict(
        winner=determine_winner(scores),
        reasoning=reasoning,
        confidence=scores.confidence,
        evidence_hash=hash(evidence + defense + oracle_data)
    )
```

### 4.3 Gensyn AXL Integration

AXL is used as the **inter-agent communication layer** for:

1. **Dispute notification** — When a case is filed, the Court Contract emits an event → AXL node broadcasts to Defendant Agent's inbox
2. **Evidence exchange** — Plaintiff and Defendant exchange evidence via encrypted P2P AXL channels before judgment
3. **Verdict notification** — Judge Agent broadcasts the final verdict to both parties via AXL

```typescript
// Notify defendant of new dispute via AXL
const axlClient = new AXLClient(config);
await axlClient.send({
  to: defendantAgentId,
  topic: "dispute.filed",
  payload: {
    caseId,
    evidenceSummary,
    deadline: Date.now() + 10 * 60 * 1000,
    stakeRequired: stakeAmount
  },
  encrypted: true
});
```

### 4.4 KeeperHub Integration

KeeperHub serves as the **reliable execution layer** for verdict enforcement because:
- Verdict execution must happen even when gas prices spike
- An immutable execution audit trail is essential for protocol trust
- Retry logic is critical since agents may be offline when a verdict is ready

```typescript
// Register verdict execution job with KeeperHub
const keeper = new KeeperHub({ apiKey: KEEPER_API_KEY });
await keeper.schedule({
  contract: COURT_CONTRACT_ADDRESS,
  function: "executeVerdict",
  args: [caseId],
  trigger: {
    type: "event",
    event: "VerdictReady",
    contractAddress: COURT_CONTRACT_ADDRESS
  },
  gasConfig: {
    priority: "high",
    maxGasPrice: "50gwei"
  }
});
```

### 4.5 0G Storage Integration

All verdicts and reasoning chains are stored on **0G Storage Log** for immutability and public auditability:

```typescript
// Store verdict on 0G Storage
const zgClient = new ZGStorageClient(config);
const verdictData = {
  caseId,
  verdict,
  reasoning,           // full LLM reasoning chain
  evidenceSnapshot,    // evidence at time of judgment
  inferenceProof,      // 0G Compute attestation receipt
  timestamp: Date.now()
};

const storageReceipt = await zgClient.uploadLog(
  JSON.stringify(verdictData),
  { immutable: true, indexed: true }
);

// Store content hash on-chain, full data on 0G
await courtContract.finalizeCase(caseId, storageReceipt.hash);
```

***

## 5. Demo Script (Judging Session — 7 Minutes)

This is a **scripted demo** designed to maximize WOW factor within a judging session.

### Scene 1: The Bet (1 min)
- Open the Agent Court UI
- Spawn **Agent Alpha** (bull): *"ETH price will be above $3,000 in 1 hour"*
- Spawn **Agent Beta** (bear): *"ETH price will be below $2,800 in 1 hour"*
- Both agents stake 0.01 ETH into escrow
- Show the live countdown timer

### Scene 2: The Dispute (1 min)
- Timer expires. Price feed shows ETH = $2,850
- Agent Alpha files dispute: *"ETH closed ABOVE $2,800, not below — Beta is wrong!"*
- Agent Beta counterfiles: *"My prediction was below $2,800. ETH at $2,850 means I was correct."*
- *(Intentionally ambiguous to showcase judgment capability)*

### Scene 3: The Judgment (2 min)
- Judge Agent picks up the case via 0G Compute
- Live-stream the reasoning in the UI:
  ```
  [Judge Agent] Fetching oracle data for ETH/USD at timestamp 1746...
  [Judge Agent] Agent Alpha claim: "above $3,000" → FAILED (actual: $2,850)
  [Judge Agent] Agent Beta claim: "below $2,800" → FAILED (actual: $2,850)
  [Judge Agent] Both agents failed their stated predictions.
  [Judge Agent] Verdict: DRAW — stakes returned to both agents
  [Judge Agent] Confidence: 97.3%
  ```
- Display the 0G Compute inference receipt (cryptographic attestation) on screen

### Scene 4: The Execution (1 min)
- KeeperHub triggers `executeVerdict(caseId)` automatically
- Live transaction hash appears on screen
- Both agents receive their stakes back (DRAW outcome)
- Full verdict + reasoning stored on 0G Storage, queryable by hash

### Scene 5: The Audit (30 sec)
- Click *"View Full Verdict on 0G Storage"*
- Show the immutable record with the complete reasoning chain
- Highlight: *"This verdict cannot be altered by anyone — not even us."*

**Total demo: ~5.5 minutes** — 1.5 minutes remaining for judge Q&A

***

## 6. Frontend UI Specification

### 6.1 Pages

**1. Court Dashboard (`/`)**
- Active cases list with status badges: `FILED` / `PENDING` / `JUDGING` / `CLOSED`
- Recent verdicts feed
- Protocol stats: total cases, total value arbitrated, Judge Agent uptime

**2. File Dispute (`/file`)**
- Connect wallet (agent wallet)
- Select defendant by agent address or AXL ID
- Structured evidence form: claim type, timestamp, supporting data
- Stake amount input (ETH)

**3. Case Detail (`/case/:id`)**
- Timeline: filed → defense submitted → judging → closed
- Expandable evidence from both parties
- Live Judge Agent reasoning stream (WebSocket)
- Verdict card with 0G Storage deep-link
- KeeperHub execution receipt

**4. Verdict Explorer (`/verdicts`)**
- Searchable history of all verdicts
- Filter by verdict type, agent address, date range
- 0G Storage link for every verdict record

### 6.2 Frontend Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS + shadcn/ui |
| Web3 | wagmi + viem |
| Real-time | WebSocket for live reasoning stream |
| Storage viewer | 0G Storage SDK |

***

## 7. Build Plan (3 Days)

Hackathon submission deadline: **May 3, 2026 — 12:00 PM EDT** (~72 hours from project start)

### Day 1 (Apr 30): Core Contracts + Judge Agent
- [ ] `AgentCourt.sol` — fileDispute, submitDefense, submitVerdict, executeVerdict
- [ ] Deploy to Sepolia testnet
- [ ] Judge Agent skeleton (Node.js + OpenAI API)
- [ ] Mock 0G Compute integration (real integration Day 2)
- [ ] Contract unit tests

### Day 2 (May 1): All Integrations
- [ ] 0G Compute — plug Judge Agent into verifiable inference node
- [ ] 0G Storage — store verdict + reasoning on finalization
- [ ] KeeperHub — register verdict execution trigger
- [ ] Gensyn AXL — dispute notification + encrypted evidence exchange
- [ ] Frontend: file dispute form + case detail page

### Day 3 (May 2): Demo Polish + Submission
- [ ] Full end-to-end test with scripted ETH prediction scenario
- [ ] Frontend polish: dashboard + verdict explorer
- [ ] Record 2–4 minute demo video with voiceover
- [ ] Write project description for ETHGlobal submission form
- [ ] README with architecture diagram + setup instructions
- [ ] Submit before May 3, 12:00 PM EDT

### Scope Cuts (Not in MVP)
- Multi-jurisdiction rule sets for different dispute types
- Appeal mechanism (dispute the verdict)
- World ID integration (nice-to-have, unlocks +$10K World track)
- Judge Agent reputation scoring

***

## 8. ETHGlobal Submission Checklist

- [ ] **GitHub repository** — public, with authentic commit history (no single giant commit)
- [ ] **README** — what it is, architecture diagram, setup instructions, how each integration is used
- [ ] **Working demo** — live URL or recorded video (2–4 minutes)
- [ ] **Demo video** — narrated, follows the scripted scenario above
- [ ] **Project description** — ETHGlobal form: problem, solution, tech stack, integrations
- [ ] **Track submissions**: 0G Autonomous Agents, 0G Compute, KeeperHub, Gensyn AXL
- [ ] KeeperHub: short write-up explaining the specific use of KeeperHub
- [ ] All team member profiles linked in submission

***

## 9. Winning Narrative

### Core Messages to Land with Judges

1. **"Nobody has built this before"** — Agent governance and dispute resolution is completely untapped. This is not another agent app — it is foundational infrastructure.
2. **"0G Compute is the essential piece"** — Without verifiable inference, the judge could be manipulated. 0G Compute makes judgment *trustless* and proves why inference must be on-chain.
3. **"This solves a real problem agents will face at scale"** — As the agentic economy grows, disputes are inevitable. Agent Court is the missing primitive.
4. **"Real money moves in the demo"** — 0.01 ETH actual stakes, real execution via KeeperHub. Not a mock.

### High-Impact Moments
- Live Judge Agent reasoning stream = cinematic and memorable for judges
- 0G Compute attestation receipt shown on screen = technical credibility
- *"This verdict is immutable on 0G Storage"* = blockchain narrative that is novel yet instantly relatable
- Clean, production-feeling UI that goes beyond a hackathon prototype

### Pitfalls to Avoid
- Do not ship many half-finished features — one perfect flow beats five broken ones
- Do not push a single giant commit — judges check GitHub activity for authenticity
- Demo video must have clear voiceover narration, not a silent screen recording
- README must be specific about how each integration is used, not generic boilerplate

***

## 10. System Architecture Diagram

```
┌──────────────────────────────────────────────────────────┐
│                    Agent Court System                     │
│                                                          │
│  ┌──────────┐    AXL (P2P encrypted)   ┌──────────┐     │
│  │ Agent A  │◄────────────────────────►│ Agent B  │     │
│  │(Plaintiff│                          │(Defendant│     │
│  └────┬─────┘                          └────┬─────┘     │
│       │ fileDispute()                       │ submitDefense()
│       └──────────────┐   ┌─────────────────┘           │
│                       ▼   ▼                              │
│              ┌─────────────────┐                        │
│              │  AgentCourt.sol │◄──── KeeperHub         │
│              │    (Sepolia)    │      (execution trigger)│
│              └────────┬────────┘                        │
│                       │ trigger inference job            │
│                       ▼                                  │
│              ┌─────────────────┐                        │
│              │   Judge Agent   │                        │
│              │  (0G Compute)   │                        │
│              │verifiable LLM   │                        │
│              └────────┬────────┘                        │
│                       │ verdict + attestation            │
│                       ├──────────────────────► 0G Storage
│                       │                        (immutable)│
│                       ▼                                  │
│              KeeperHub executes fund transfer            │
│              Winner receives stakes automatically        │
└──────────────────────────────────────────────────────────┘
```

***

## 11. Key Resources

| Resource | URL |
|---|---|
| 0G Documentation | https://docs.0g.ai |
| 0G Compute | https://docs.0g.ai/compute |
| KeeperHub Docs | https://docs.keeperhub.com |
| Gensyn AXL | https://docs.gensyn.ai/axl |
| ETHGlobal Open Agents | https://ethglobal.com/events/openagents |
| **Submission Deadline** | **May 3, 2026 — 12:00 PM EDT** |