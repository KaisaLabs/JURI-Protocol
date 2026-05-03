# Demo-Ready 0G Testnet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the repo demo-ready on 0G Galileo testnet with a real hybrid runtime where `direct` is the default transport path and `axl` remains an optional supported path.

**Architecture:** Keep the existing orchestrator plus three-agent topology, but introduce one normalized runtime model shared across the agents and web UI. The direct path becomes the documented and verified default; AXL remains a pluggable transport mode rather than a separate demo path. The UI must render backend truth only and stop simulating success locally.

**Tech Stack:** TypeScript, Node.js, Next.js App Router, React, 0G TS SDK, ethers, OpenAI-compatible LLM clients, Gensyn AXL, pnpm

---

## Scope Guardrails

- Do not modify Solidity contracts in this plan.
- Do not add a new database.
- Do not redesign the UX beyond what is needed to expose truthful runtime state.
- Prefer small shared runtime files over large rewrites.

## File Map

### Existing files to modify

- `agents/src/orchestrator.ts`
- `agents/src/verification.ts`
- `agents/src/agent-base.ts`
- `agents/src/storage.ts`
- `agents/src/forensic.ts`
- `agents/src/analysis.ts`
- `agents/src/types.ts`
- `agents/package.json`
- `web/app/page.tsx`
- `web/app/components/VerdictCard.tsx`
- `web/app/components/PayoutStatus.tsx`
- `web/app/components/CaseForm.tsx`
- `web/app/api/case/route.ts`
- `web/lib/api.ts`
- `package.json`
- `README.md`
- `.env.example`

### New files likely needed

- `agents/src/runtime-config.ts`
- `agents/src/case-runtime.ts`
- `web/lib/case-types.ts`

Purpose of likely new files:

- `agents/src/runtime-config.ts`: centralize env parsing and demo transport policy.
- `agents/src/case-runtime.ts`: define the normalized case status model and helper mappers used by orchestrator and agents.
- `web/lib/case-types.ts`: share the web-facing case response types so components stop inventing local shapes.

## Execution Order

Implement in this order so each stage leaves the repo in a more truthful state:

1. Normalize runtime types and configuration.
2. Refactor orchestrator state and health API around that model.
3. Align agent lifecycle updates with the normalized case runtime.
4. Remove simulated frontend success behavior and bind components to backend truth.
5. Fix scripts, environment docs, and operator instructions.
6. Run direct-path verification first, then optional AXL verification.

### Task 1: Define the Shared Demo Runtime Contract

**Files:**
- Create: `agents/src/runtime-config.ts`
- Create: `agents/src/case-runtime.ts`
- Create: `web/lib/case-types.ts`
- Modify: `agents/src/types.ts`

- [ ] Add a central runtime config module that parses and documents:
  - `AGENT_TRANSPORT`
  - `API_PORT`
  - `ZG_RPC_URL`
  - `ZG_STORAGE_INDEXER`
  - `ZG_KV_NODE`
  - `ZG_SERVICE_URL`
  - `ZG_API_SECRET`
  - `CUSTOM_LLM_URL`
  - `CUSTOM_LLM_KEY`
  - `CUSTOM_LLM_MODEL`
  - `KEEPERHUB_API_KEY`
  - `CONTRACT_ADDRESS`

- [ ] In `agents/src/case-runtime.ts`, define a normalized case model for the demo. It should include at minimum:
  - case id
  - dispute text
  - lifecycle status
  - selected transport mode
  - storage status
  - compute provider
  - payout status
  - verdict payload
  - timeline/messages
  - evidence references

- [ ] Extend `agents/src/types.ts` so agent/orchestrator code can represent richer runtime outcomes without overloading raw message payloads.

- [ ] Mirror only the web-needed case types into `web/lib/case-types.ts` so `page.tsx`, `VerdictCard.tsx`, `PayoutStatus.tsx`, and `CaseForm.tsx` all consume one backend-driven shape.

- [ ] Keep the type system small. Do not create a second parallel protocol for the web; the web type should match the orchestrator response as closely as practical.

- [ ] Verify type-only changes compile:

Run:
```bash
pnpm --filter agents exec tsc --noEmit
pnpm --filter web exec tsc --noEmit
```

Expected:
- TypeScript exits successfully or exposes the next concrete mismatches to fix in later tasks.

### Task 2: Make the Orchestrator the Source of Truth

**Files:**
- Modify: `agents/src/orchestrator.ts`
- Modify: `agents/src/types.ts`
- Modify: `agents/src/case-runtime.ts`
- Modify: `agents/src/runtime-config.ts`

- [ ] Replace the current loose `activeCases` in-memory shape with the normalized case runtime model.

- [ ] Update case creation so the orchestrator:
  - creates a truthful case record before notifying agents,
  - records the chosen transport path,
  - records whether storage connectivity is available,
  - stores the dispute to 0G when possible,
  - appends timeline events that the web can render directly.

- [ ] Update inbound message handling so the orchestrator records message events, evidence references, verdict metadata, and payout progress rather than only pushing clipped text blobs.

- [ ] Clean up `/api/health` to return a stable, truthful payload. It should include:
  - transport mode
  - whether the orchestrator is running
  - whether storage is connected
  - whether the verification compute path is configured
  - active case count

- [ ] Update `/api/case`, `/api/case/:id`, and `/api/cases` responses so they return the normalized shape expected by the web app.

- [ ] Ensure direct mode remains the default if `AGENT_TRANSPORT` is unset.

- [ ] If `AGENT_TRANSPORT=axl` is selected and the runtime cannot reach AXL, fail loudly in logs and API status rather than pretending the case completed.

- [ ] Verify orchestrator boot and health route:

Run:
```bash
pnpm --filter agents exec tsx src/orchestrator.ts
curl http://localhost:4000/api/health
```

Expected:
- Orchestrator starts.
- Health JSON reports the selected transport and real connectivity fields.

### Task 3: Align Base Agent Runtime Behavior

**Files:**
- Modify: `agents/src/agent-base.ts`
- Modify: `agents/src/runtime-config.ts`
- Modify: `agents/src/types.ts`
- Modify: `agents/src/storage.ts`

- [ ] Move transport-mode selection in `agents/src/agent-base.ts` behind the shared runtime config so all agents inherit the same policy.

- [ ] Add small runtime helpers in the base agent for reporting:
  - selected transport mode
  - configured compute provider label
  - storage write result metadata
  - payout attempt metadata

- [ ] Keep existing message signing and retry behavior unless a minimal fix is necessary for the demo path.

- [ ] In `agents/src/storage.ts`, add or expose enough structured return data so orchestrator and verification can report whether dispute/evidence/verdict writes were:
  - written,
  - skipped because storage is unavailable,
  - failed with an error.

- [ ] Keep the storage wrapper testnet-specific for this milestone. Do not generalize across more networks.

- [ ] Verify the agents still typecheck after the base runtime changes:

Run:
```bash
pnpm --filter agents exec tsc --noEmit
```

Expected:
- Agent runtime compiles with the new shared contract.

### Task 4: Update Plaintiff and Defendant to Emit Truthful Case Progress

**Files:**
- Modify: `agents/src/forensic.ts`
- Modify: `agents/src/analysis.ts`
- Modify: `agents/src/agent-base.ts`
- Modify: `agents/src/types.ts`

- [ ] Keep the three-round structure, but ensure both agents produce runtime events the orchestrator can reflect in the UI without fabricating state client-side.

- [ ] Make sure dispute storage, evidence writes, and closing-statement evidence refs are preserved in a structured way that feeds the normalized case model.

- [ ] Keep direct mode fully operational without AXL-specific assumptions.

- [ ] Ensure each agent logs and reports enough metadata to distinguish:
  - argument generation,
  - evidence stored or skipped,
  - closing statement sent,
  - verdict received.

- [ ] Validate the direct transport path locally with all three agent processes plus the orchestrator:

Run in separate terminals:
```bash
pnpm --filter agents exec tsx src/orchestrator.ts
pnpm --filter agents exec tsx src/forensic.ts
pnpm --filter agents exec tsx src/analysis.ts
pnpm --filter agents exec tsx src/verification.ts
```

Then create a case:
```bash
curl -X POST http://localhost:4000/api/case -H 'Content-Type: application/json' -d '{"dispute":"Is direct transport the right default demo path?"}'
```

Expected:
- Case creation succeeds.
- Forensic and analysis exchange messages through the selected transport.
- The orchestrator records progress in `/api/case/:id`.

### Task 5: Make Judge Outcomes and Payout Status First-Class Runtime Data

**Files:**
- Modify: `agents/src/verification.ts`
- Modify: `agents/src/storage.ts`
- Modify: `agents/src/case-runtime.ts`
- Modify: `agents/src/types.ts`

- [ ] Keep the current judge sequence, but normalize its outputs into explicit runtime fields:
  - verdict result
  - reasoning
  - reasoning reference
  - compute provider
  - on-chain tx, if any
  - payout result and payout path

- [ ] Distinguish these states clearly:
  - compute configured and used,
  - compute fell back to custom provider,
  - verdict simulated only because upstream provider failed.

- [ ] Distinguish payout states clearly:
  - not attempted,
  - attempted via KeeperHub,
  - attempted via contract path,
  - skipped,
  - failed.

- [ ] Prefer small return-shape improvements over rewriting the verification agent architecture.

- [ ] Verify end-to-end verdict visibility via API:

Run:
```bash
curl http://localhost:4000/api/cases
curl http://localhost:4000/api/case/1
```

Expected:
- The case response includes verdict, compute provider, evidence refs, and payout status in normalized fields.

### Task 6: Remove Frontend Simulation and Bind the UI to Backend Truth

**Files:**
- Modify: `web/app/page.tsx`
- Modify: `web/app/components/VerdictCard.tsx`
- Modify: `web/app/components/PayoutStatus.tsx`
- Modify: `web/app/components/CaseForm.tsx`
- Modify: `web/lib/api.ts`
- Modify: `web/lib/case-types.ts`

- [ ] Remove the local `simulateLocal()` happy-path behavior from `web/app/page.tsx`.

- [ ] Change the create-case flow so failure is displayed as failure, not auto-simulated success.

- [ ] Update polling to consume the normalized backend case shape and timeline/messages directly.

- [ ] Update `VerdictCard.tsx` to render the actual backend verdict rather than its current hardcoded simulated verdict.

- [ ] Update `PayoutStatus.tsx` to render the real payout state and real runtime labels rather than always claiming KeeperHub payout completed after resolution.

- [ ] Update `CaseForm.tsx` copy so it matches the direct-default demo flow and does not imply behavior the backend is not yet performing.

- [ ] Update `web/lib/api.ts` to match the normalized orchestrator endpoints and case response types.

- [ ] Verify the web app against the running orchestrator:

Run:
```bash
pnpm --filter web dev
```

Expected:
- The page shows backend connection truthfully.
- Case creation only succeeds when the backend succeeds.
- Verdict and payout panels reflect backend truth instead of hardcoded demo content.

### Task 7: Clarify the Next.js API Boundary

**Files:**
- Modify: `web/app/api/case/route.ts`
- Modify: `web/lib/api.ts`
- Modify: `README.md`

- [ ] Decide and implement one truthful story for `web/app/api/case/route.ts`.

Preferred direction for this repo:
- make the route a thin proxy to the orchestrator or mark it explicitly unused for the demo path.

- [ ] Do not leave it as a disconnected stub that suggests production behavior the app is not actually using.

- [ ] Make sure README explains whether the web app talks directly to `http://localhost:4000` or through the Next.js route.

- [ ] Verify the chosen boundary manually:

Run one of:
```bash
curl -X POST http://localhost:3000/api/case -H 'Content-Type: application/json' -d '{"dispute":"boundary check"}'
curl -X POST http://localhost:4000/api/case -H 'Content-Type: application/json' -d '{"dispute":"boundary check"}'
```

Expected:
- The documented path is the path that actually works and returns the normalized response shape.

### Task 8: Fix Scripts and Operator Workflow

**Files:**
- Modify: `agents/package.json`
- Modify: `package.json`
- Modify: `README.md`
- Modify: `.env.example`

- [ ] Align the repo scripts with the current package names and actual commands. In particular, fix the mismatch where root scripts reference `dev:forensic`, `dev:analysis`, and `dev:verification` but `agents/package.json` exposes `forensic`, `analysis`, `verification`, and `orchestrator`.

- [ ] Add a documented direct-default startup path that works from a clean clone after env setup.

- [ ] Add a separate optional AXL startup path that is clearly labeled secondary.

- [ ] Update `.env.example` comments to reflect the new transport policy:
  - `direct` is default and recommended for demo readiness
  - `axl` is optional when the AXL node environment is available

- [ ] Update README to include:
  - demo-ready architecture summary
  - exact startup commands
  - expected ports
  - how to verify 0G storage connectivity
  - how to explain the hybrid direct-default story during the demo

- [ ] Verify scripts from the repo root:

Run:
```bash
pnpm install
pnpm run build
pnpm run dev
```

Expected:
- Scripts are internally consistent.
- Build succeeds or exposes only known remaining issues tied to in-flight work.

### Task 9: Demo Verification Checklist

**Files:**
- Modify if needed: `README.md`
- No new code required unless verification reveals a real bug.

- [ ] Verify direct mode as the primary happy path:

Run:
```bash
AGENT_TRANSPORT=direct pnpm --filter agents exec tsx src/orchestrator.ts
AGENT_TRANSPORT=direct pnpm --filter agents exec tsx src/forensic.ts
AGENT_TRANSPORT=direct pnpm --filter agents exec tsx src/analysis.ts
AGENT_TRANSPORT=direct pnpm --filter agents exec tsx src/verification.ts
pnpm --filter web dev
```

Manual check:
- Submit a dispute in the UI.
- Confirm the feed shows real backend events.
- Confirm verdict and payout status are truthful.
- Confirm health endpoint reports `direct`.

- [ ] Verify optional AXL mode only if the local AXL environment exists:

Run:
```bash
AGENT_TRANSPORT=axl pnpm --filter agents exec tsx src/orchestrator.ts
AGENT_TRANSPORT=axl pnpm --filter agents exec tsx src/forensic.ts
AGENT_TRANSPORT=axl pnpm --filter agents exec tsx src/analysis.ts
AGENT_TRANSPORT=axl pnpm --filter agents exec tsx src/verification.ts
```

Manual check:
- Submit a dispute.
- Confirm the same lifecycle completes.
- Confirm the UI labels the runtime path as AXL.

- [ ] Capture the final operator checklist in `README.md` so another team member can run the demo without reverse-engineering the codebase.

## Risks To Watch While Implementing

- `agents/src/orchestrator.ts` currently mixes API handling, case state, and transport notification in one file. Keep the refactor minimal and push shared shape logic into the new runtime helpers instead of splitting the orchestrator into many modules.
- `web/app/page.tsx` currently assumes it can safely simulate progress. Removing that may expose backend rough edges quickly; that is desirable because the UI must become truthful.
- `agents/src/storage.ts` currently returns string refs in places where structured metadata would help. Improve return shapes carefully to avoid unnecessary churn.
- `AGENT_TRANSPORT=axl` should remain optional. Do not let AXL-specific work delay the direct-default demo path.

## Definition Of Done

- Direct transport is the documented default and works end-to-end.
- AXL remains selectable and uses the same case lifecycle.
- The UI no longer invents verdicts, payouts, or timelines.
- The orchestrator API is the source of truth for case state.
- README and `.env.example` match the actual runtime.
- The repo is demoable on 0G Galileo testnet by following documented commands.

## Self-Review

- Spec coverage: current state, target architecture, shared runtime contract, direct-default transport policy, truthful UI, scripts/docs, and verification are all mapped to tasks above.
- Placeholder scan: no `TBD`, no "implement later", and no fake references to unspecified files outside the listed likely additions.
- Type consistency: the plan consistently refers to a normalized runtime case shape shared by orchestrator, agents, and the web UI.

Plan complete and saved to `docs/superpowers/plans/2026-05-02-demo-ready-testnet.md`. Two execution options:

1. Subagent-Driven (recommended) - I dispatch a fresh subagent per task, review between tasks, fast iteration
2. Inline Execution - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
