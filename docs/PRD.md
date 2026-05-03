# JURI Protocol — Product Requirements Document

> **DeFi Exploit Forensics & Cross-Chain Knowledge Base**  
> ETHGlobal Open Agents 2026 | Solo Builder | Deadline: May 3, 2026

---

## 1. Executive Summary

**JURI Protocol** is a decentralized DeFi exploit forensics platform. When a DeFi protocol is hacked, JURI's AI agents automatically trace fund flows across chains, classify attack vectors, and publish an immutable, verifiable post-mortem. Every protocol learns from every exploit — so the same attack never succeeds twice.

---

## 2. Problem

### The DeFi forensics gap

| Current State                          | Consequence                               |
| -------------------------------------- | ----------------------------------------- |
| No standardized post-mortem            | Evidence scattered across Twitter/Discord |
| Cross-chain exploits hard to trace     | $2B+ lost in bridge/multichain attacks    |
| Manual investigation (weeks)           | Other protocols exploited by same vector  |
| No shared knowledge base               | Same exploit patterns repeat endlessly    |
| Post-mortems are subjective            | Victim protocol controls the narrative    |

### Key stat

> *"Over 60% of DeFi exploits re-use attack vectors from previous incidents. 
> There is no open, verifiable system for protocols to learn from each other."*

---

## 3. Solution

### JURI Protocol — Exploit Once. Learn Forever.

```
┌───────────────────────────────────────────────────────────┐
│              PROTOCOL GETS HACKED                          │
│                                                            │
│  🔍 FORENSIC AGENT         📊 ANALYSIS AGENT               │
│  ─────────────────         ──────────────────              │
│  • Trace fund flow         • Classify attack vector        │
│  • Collect on-chain tx     • Match historical patterns     │
│  • Cross-chain tracking    • Severity scoring              │
│  • Evidence → 0G Storage   • RAG on past exploits          │
│                                                            │
│  ✅ VERIFICATION AGENT                                     │
│  ─────────────────────                                     │
│  • Cross-reference findings                                │
│  • TEE-verified reasoning (0G Compute)                     │
│  • Publish immutable post-mortem (0G Storage Log)          │
│  • Generate prevention guide                                │
│                                                            │
│  📚 OUTPUT: PUBLIC KNOWLEDGE BASE (0G Storage)             │
│  • Root cause • Attack vector • Prevention • Evidence      │
└───────────────────────────────────────────────────────────┘
```

### Core value props

1. **Immutable evidence** — all data stored on 0G Storage, tamper-proof
2. **Verifiable analysis** — 0G Compute TEE ensures no bias
3. **Cross-chain** — trace funds across EVM + alt chains
4. **Self-learning** — pattern matching against all previous exploits
5. **Public good** — open knowledge base, any protocol can learn

---

## 4. Target Users

| Persona                         | Need                                                |
| ------------------------------- | --------------------------------------------------- |
| **DeFi protocol teams**             | Learn from others' exploits, patch their own code   |
| **Security researchers**            | Access standardized, verifiable post-mortems        |
| **Insurance assessors**             | Evidence for claim validation                       |
| **DeFi users/community**            | Transparency on what happened to their funds        |
| **Regulators/investigators**        | Immutable audit trail for compliance                |

---

## 5. Architecture

### System diagram

```
┌──────────────────────────────────────────────────────────┐
│                    USER / WEB UI                          │
│          Submit exploit → Trigger investigation           │
│          View post-mortem → Browse knowledge base         │
└──────────────┬──────────────┬──────────────┬─────────────┘
               │              │              │
    ┌──────────▼──┐  ┌────────▼───┐  ┌──────▼──────────┐
    │ 🔍 FORENSIC │  │📊 ANALYSIS │  │✅ VERIFICATION  │
    │   Agent     │  │   Agent    │  │    Agent        │
    │             │  │            │  │                 │
    │ Trace funds │  │ Classify   │  │ Cross-reference │
    │ Collect txs │  │ Score sev. │  │ Publish report  │
    │ Multi-chain │  │ Match RAG  │  │ Prevention guide│
    └──────┬──────┘  └─────┬──────┘  └───────┬─────────┘
           │               │                 │
           └───────────────┼─────────────────┘
                           │
              ┌────────────▼────────────┐
              │   GENSYN AXL P2P NET    │ ← Encrypted agent comm
              │   (3 nodes, encrypted)  │
              └────────────┬────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────▼─────┐   ┌───────▼──────┐   ┌───────▼──────┐
   │0G STORAGE│   │ 0G COMPUTE   │   │  KEEPERHUB   │
   │KV: state │   │ TEE infer.   │   │ Auto-publish │
   │Log: hist │   │ Verify claim │   │ Notify proto │
   │Files: RAG│   │ Pattern match│   │               │
   └──────────┘   └──────────────┘   └──────────────┘
        │                  │                  │
   ┌────▼──────────────────▼──────────────────▼──────┐
   │              0G CHAIN (EVM, ID 16602)            │
   │    JURICase.sol — Case registry + attestation    │
   │    0xE648Fd01B7a61CB858AfAE74273EB47D91244397   │
   └─────────────────────────────────────────────────┘
```

### Agent roles

| Agent               | Role                                    | LLM            |
| ------------------- | --------------------------------------- | -------------- |
| 🔍 **Forensic Agent**   | Trace on-chain fund flows, collect evidence | Custom (asi1)      |
| 📊 **Analysis Agent**   | Classify attack vector, severity, match RAG | Custom (asi1)      |
| ✅ **Verification Agent** | Cross-reference, publish immutable report   | **0G Compute TEE** |

### Data flow

```
1. User/auto-detection submits exploit case
2. Forensic Agent traces funds → stores evidence to 0G KV
3. Analysis Agent classifies attack → matches against RAG (0G Storage)
4. Verification Agent cross-references → TEE-verified reasoning (0G Compute)
5. Final report published to 0G Storage Log (immutable)
6. KeeperHub triggers notification to affected protocols
7. Smart contract records case attestation on 0G Chain
```

---

## 6. Tech Stack

| Layer          | Technology                                                    |
| -------------- | ------------------------------------------------------------- |
| **Chain**          | 0G Chain (EVM, Galileo Testnet, ID 16602)                     |
| **Storage**        | 0G Storage KV (state) + Log (immutable) + File (RAG dataset)  |
| **Compute**        | 0G Compute (TEE-verified inference, qwen-2.5-7B)              |
| **Communication**  | Gensyn AXL (P2P encrypted, 3 nodes)                           |
| **Execution**      | KeeperHub (auto-publish + notify)                            |
| **LLM (Forensic)** | asi1 (custom OpenAI-compatible provider)                     |
| **LLM (Analysis)** | asi1 (custom OpenAI-compatible provider)                     |
| **LLM (Verify)**   | 0G Compute (qwen-2.5-7B-instruct, TEE-signed)                |
| **Smart Contract** | Solidity 0.8.24 + Hardhat + OpenZeppelin                     |
| **Frontend**       | Next.js 15 + React 19 + Tailwind CSS v4                      |
| **Deployed at**    | AgentCourt: `0xE648Fd01B7a61CB858AfAE74273EB47D91244397` |

---

## 7. Hackathon Track Eligibility

### 🏆 0G Autonomous Agents, Swarms & iNFT Innovations
- ✅ Multi-agent swarm: Forensic + Analysis + Verification
- ✅ 0G Storage for evidence (KV), immutable history (Log), RAG (File)
- ✅ 0G Compute for TEE-verified inference (Verification Agent)
- ✅ 0G Chain smart contract (JURICase.sol deployed)
- ✅ Working example agent: Verification Agent with full reasoning trail

### 🏆 Gensyn AXL — Best Application
- ✅ 3 AXL nodes, encrypted P2P communication
- ✅ No centralized message broker
- ✅ Cross-node communication (distinct identities)
- ✅ Real utility: agent coordination for exploit investigation

### 🏆 KeeperHub — Best Use
- ✅ `execute_transfer` / workflow for post-investigation actions
- ✅ Clean code + documented architecture
- ✅ Working demo

### 🏆 Uniswap API (Optional Add-on)
- 🔲 Could trace fund flows through Uniswap pools for DeFi exploit forensics
- 🔲 Add `FEEDBACK.md` for builder experience

---

## 8. Demo Flow (3 minutes)

| Time  | Scene                                                       |
| ----- | ----------------------------------------------------------- |
| 0:00  | **Hook:** "Protocol XYZ just got hacked for $50M. Cross-chain. What now?" |
| 0:15  | **Problem:** Show Twitter chaos — no standardized response   |
| 0:30  | **JURI activates:** 3 agents spin up                        |
| 0:50  | 🔍 Forensic Agent: fund flow traced across 3 chains         |
| 1:15  | 📊 Analysis Agent: "Flash loan + oracle manipulation. 87% match to Cream Finance 2021." |
| 1:45  | ✅ Verification Agent: TEE-verified cross-reference. PUBLISHED. |
| 2:00  | **Show post-mortem:** root cause, attack vector, prevention |
| 2:30  | "Immutable on 0G Storage. Every protocol can learn."        |
| 2:45  | "Exploit once. Learn forever. JURI Protocol."               |

---

## 9. Product Scope

### MVP (Hackathon — Day 1-3) ✅ DONE
- [x] Smart contract (AgentCourt.sol) deployed on 0G Galileo
- [x] 3 agents communicating via DIRECT transport
- [x] 0G Storage KV for evidence
- [x] 0G Compute integration for Verification Agent
- [x] Web dashboard with case creation + live feed
- [x] 20/20 smart contract tests passing
- [x] E2E flow working (dispute → debate → verdict)

### Polish (Hackathon — Day 4, May 3)
- [x] Rename agents: Plaintiff→Forensic, Defendant→Analysis, Judge→Verification
- [ ] Update LLM prompts to exploit forensics context
- [ ] Deploy web UI to Vercel
- [ ] Record demo video (< 3 min)
- [ ] Architecture diagram
- [ ] GitHub README with full narrative
- [ ] Fill submission form

### Post-Hackathon
- [ ] AXL production integration
- [ ] Historical exploit RAG dataset on 0G Storage
- [ ] Cross-chain tracing (Wormhole, LayerZero, bridges)
- [ ] Real-time mempool monitoring integration
- [ ] DAO governance for agent parameter tuning

---

## 10. Competition & Differentiation

| Project            | Focus                            | JURI Differentiator                    |
| ------------------ | -------------------------------- | -------------------------------------- |
| **Protocol Guardian** | Prevent exploits (mempool watch) | **Post-exploit forensics + learn**         |
| **Loupe**              | Pre-deploy code audit            | **Post-mortem + cross-chain tracing**      |
| **DIVE**               | Prediction market truth           | **DeFi exploit attribution**               |
| **Forta**              | Alerting only                     | **Full investigation + immutable report**   |
| **JURI Protocol**      | **Forensics + knowledge base**     | **Only end-to-end post-exploit solution**   |

---

## 11. Success Criteria (Hackathon)

| Criteria                 | Target                                           |
| ------------------------ | ------------------------------------------------ |
| Working demo             | Full flow: case → forensics → report → publish   |
| 0G integration depth     | Storage + Compute + Chain (3 of 4 products)       |
| AXL usage                | 3 nodes, encrypted P2P                           |
| KeeperHub usage          | Post-report action execution                      |
| Code quality             | 20/20 tests, clean README, setup instructions     |
| Demo video               | < 3 min, live working demo                       |
| Architecture diagram     | Included in README                                |

---

*Built for ETHGlobal Open Agents 2026. Deadline: May 3, 2026.*
