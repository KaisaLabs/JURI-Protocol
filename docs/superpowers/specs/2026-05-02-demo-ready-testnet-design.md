# Demo-Ready 0G Testnet Design: Hybrid Real Path (Direct Default, AXL Optional)

Date: 2026-05-02
Status: Approved design snapshot for implementation
Scope: Demo-readiness only. No application code changes are made by this document.

## Summary

This design makes the project demo-ready on 0G Galileo testnet by treating the direct HTTP transport as the default real execution path and keeping Gensyn AXL as an optional transport that can be enabled when available. The demo must use real orchestration, real agent turns, real 0G testnet storage and verification output when configured, while avoiding the current fallback-heavy behavior that masks backend failures with simulated UI results.

## Current State

The current repo already contains most of the pieces needed for a compelling demo, but the runtime is not yet coherent enough to be treated as the primary happy path.

### What exists now

- `agents/src/orchestrator.ts` exposes a lightweight HTTP API and seeds `CASE_CREATED` to the three agents.
- `agents/src/forensic.ts`, `agents/src/analysis.ts`, and `agents/src/verification.ts` implement a simple three-agent debate flow.
- `agents/src/transport.ts` already supports `direct` and `axl` transport modes.
- `agents/src/storage.ts` already wraps 0G Storage KV and file/log upload primitives for Galileo testnet.
- `web/app/page.tsx` and related components already present a demo dashboard.
- `web/lib/api.ts` already targets the orchestrator API on port `4000`.

### Gaps blocking a demo-ready claim

- The web app still simulates arbitration locally when backend calls fail, so the UI can show a fake successful demo.
- `web/app/components/VerdictCard.tsx` and `web/app/components/PayoutStatus.tsx` still render simulated/static data instead of a fully normalized backend response.
- `web/app/api/case/route.ts` is stubbed and does not reflect the actual orchestrator-backed runtime path.
- `agents/src/orchestrator.ts` keeps in-memory case state only, does not present a normalized runtime status model, and contains health/status rough edges.
- The agents do not share a single runtime policy describing whether the run is using direct transport, optional AXL, storage availability, payout mode, and compute provider.
- The package scripts are inconsistent with the current package manifests, which makes the advertised startup flow unreliable.
- README and `.env.example` still describe the broader vision more than the concrete demo-ready path.

## Problem Statement

For the demo, the team needs one dependable path that works on a local machine against 0G Galileo testnet without requiring AXL to be operational. That path must still be real enough to demonstrate:

- real agent-to-agent orchestration,
- real verification output,
- real 0G testnet storage when credentials are present,
- a truthful UI that reports the actual runtime path and payout/storage status.

AXL remains valuable for sponsor depth, but it should no longer be a prerequisite for the main demo path.

## Target Architecture

### Runtime principle

The primary runtime is a hybrid real path:

- Default path: `direct`
- Optional path: `axl`

"Hybrid" means the product still uses the same orchestration model, case lifecycle, storage layer, verification flow, and UI regardless of transport mode. The only thing that changes is how agent messages move between processes.

### Architecture goals

- Keep the direct transport as the default and most reliable demo mode.
- Preserve AXL as a pluggable transport mode rather than a separate code path.
- Normalize case state so backend and frontend agree on case lifecycle, evidence refs, verdict metadata, and payout status.
- Ensure the UI reports real runtime state and never silently swaps to a fabricated local success flow.
- Keep the implementation minimal and repo-local without introducing a new service boundary.

### Target flow

1. User submits a dispute from the web UI.
2. `web/lib/api.ts` calls the orchestrator-backed API.
3. The orchestrator creates a case record, stores the dispute to 0G when configured, and marks the case as running on the selected transport.
4. The orchestrator notifies the forensic, analysis, and verification using the selected transport.
5. Forensic and analysis exchange arguments over the same transport and persist evidence references through the shared storage wrapper.
6. The judge reads evidence, produces a verdict through the configured provider, stores verdict artifacts, and attempts payout handling.
7. The orchestrator exposes normalized case state for polling by the UI.
8. The UI renders actual verdict, transport, storage, and payout outcomes for the case.

### Required runtime model

The backend should expose a single normalized case shape that covers at least:

- case identity and dispute text,
- lifecycle status,
- selected transport path (`direct` or `axl`),
- storage connectivity and stored references,
- compute provider used by the verification,
- verdict payload,
- payout attempt/result,
- timeline or message feed suitable for the web UI.

The exact type names can be chosen during implementation, but this shape must be shared across agent runtime and web consumption.

### Transport policy

- `AGENT_TRANSPORT=direct` is the default documented path and the expected demo mode.
- `AGENT_TRANSPORT=axl` remains supported when AXL nodes are available.
- If AXL is requested but unavailable, the runtime should fail clearly rather than quietly pretending the case completed.
- Direct mode should not require any AXL process or AXL repo checkout.

### Storage policy

- 0G Galileo testnet is the intended storage target.
- Evidence and verdict reasoning should be written through `agents/src/storage.ts` when connectivity is available.
- The runtime may continue without storage writes only if it reports degraded mode truthfully in API and UI.
- The demo-ready happy path is storage-connected, not simulation-based.

### UI policy

- The web app must stop fabricating verdicts, payout completion, and simulated debate messages.
- The UI should clearly label the runtime path as direct or AXL.
- The UI should show when storage, compute, or payout are real, skipped, degraded, or failed.
- The UI should remain demo-friendly, but every displayed state must come from backend truth.

## Files Expected To Change During Implementation

The implementation is expected to modify these exact files:

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

Likely new shared runtime files, if needed to keep the change small and coherent:

- `agents/src/runtime-config.ts`
- `agents/src/case-runtime.ts`
- `web/lib/case-types.ts`

Equivalent names are acceptable if the responsibilities are the same: shared runtime config, normalized case/status mapping, and shared web-facing case types.

## Acceptance Criteria

The project is demo-ready for this design only when all of the following are true:

1. A single local operator can run the demo on 0G Galileo testnet with `direct` transport as the default path.
2. The main happy-path demo does not require AXL to be installed or running.
3. When `AGENT_TRANSPORT=axl` is intentionally enabled and AXL is available, the same case lifecycle works through AXL.
4. The web app no longer uses local simulated verdicts, simulated debate messages, or static payout completion to hide backend failures.
5. A created case returns a normalized backend case shape that the UI can poll until completion.
6. The UI displays the actual transport mode, actual verdict data, actual storage references when available, and actual payout attempt status.
7. The verification verdict includes enough metadata to explain whether 0G Compute, a custom provider, or a degraded fallback path produced the decision.
8. The orchestrator health/status endpoints report truthful runtime details relevant to the demo.
9. Startup scripts in `package.json` and `agents/package.json` are aligned with the actual commands needed to run the demo.
10. `README.md` and `.env.example` describe the direct-default testnet demo path clearly and do not imply that simulated UI behavior is the intended production demo.

## Non-Goals

This design explicitly does not include:

- redesigning or replacing the smart contract,
- adding wallet-authenticated end-user flows,
- building production-grade persistence beyond what is needed for the demo,
- guaranteeing AXL auto-fallback from requested `axl` to `direct`,
- adding a new database,
- polishing every UI detail unrelated to truthful runtime state,
- broad contract/indexer infrastructure work outside the demo path.

## Implementation Notes

- Prefer a small shared runtime layer over duplicating transport/storage status logic in every file.
- Keep the current direct transport and agent loop structure unless a minimal refactor is necessary to expose normalized state.
- Do not create a second parallel API contract between web and orchestrator; standardize on one case response model.
- Preserve sponsor narrative depth by keeping AXL support visible and testable, but secondary to the direct default path.

## Demo Definition Of Done

The demo is considered ready when an operator can:

1. configure `.env`,
2. start the orchestrator, agents, and web app,
3. submit a dispute from the UI,
4. watch a real case progress through arbitration,
5. see a real verdict and truthful runtime status in the UI,
6. explain that the default path is real direct transport on 0G testnet, with AXL available as an optional path.
