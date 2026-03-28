# Phase 2 Contract Freeze

## Status

Verdict: `PHASE 2 IMPLEMENTED BUT NOT STABILIZED`

Phase 2 now has an explicit shared contract layer under `packages/contracts/ois_contracts/`, generated TypeScript mirrors, JSON schema exports, and a machine-readable audit against the current backend/frontend platform shapes.

Phase 2 is not closed because the current platform still compresses or omits too many legacy semantics. The shared contracts are internally consistent, but the platform is only fully aligned on a small subset of those contracts.

## What Was Frozen

The shared contract source of truth is now:

- `packages/contracts/ois_contracts/contracts.py`
- `packages/contracts/ois_contracts/frontend.ts`

Generated Phase 2 artifacts live under `docs/migration/phase2/`:

- `contract_inventory.json`
- `contract_glossary.json`
- `shared_contract_schemas.json`
- `legacy_mapping_summary.json`
- `consistency_audit.json`
- `summary.json`

Regeneration command:

```powershell
python .\scripts\phase2_contract_freeze.py
```

## Contract Inventory

Forty-five contracts are frozen, including:

- organization/workspace
- venue/project and venue context
- assessment draft and assessment run request
- signal, failure mode, response pattern, and block activation
- generated engine plan and persisted execution plan
- task, task dependency, task event, task comment, sub-action, deliverable item, deliverable proof
- report and diagnostic result
- progress, observation, help request, follow-up, escalation
- notification subscription and notification event
- chat thread, chat message, chat reference, chat attachment
- knowledge reference
- AI trace and AI intake snapshot
- core mutation/create request payloads

## Preserved Semantic Distinctions

The frozen contracts intentionally keep these meanings separate:

- `TaskCommentContract` vs `ProgressEntryContract`
- `ProgressEntryContract` vs `ObservationContract`
- `FollowUpContract` vs `EscalationContract`
- `ReportContract` vs `TaskCommentContract`
- `HelpRequestContract` vs `ChatThreadContract`
- `GeneratedPlanContract` vs `PlanContract`
- `AITraceContract` vs `AIIntakeSnapshotContract`

Important preserved distinctions that the current platform still compresses:

- progress entry type (`milestone`, `note`, `update`, etc.)
- generated layered plan output vs persisted flat task list
- task comments/events/dependency edges as first-class objects
- markdown report artifact vs structured report summary
- help requests as a separate contract from generic copilot chat
- AI intake snapshot vs simplified intake preview response

## Legacy-To-Contract Mapping Summary

Full-fit legacy payloads:

- normalized signals -> `SignalContract`
- failure modes -> `FailureModeContract`
- response patterns -> `ResponsePatternContract`
- activation context -> `BlockActivationContract`
- generated action plan -> `GeneratedPlanContract`
- AI extraction snapshot -> `AIIntakeSnapshotContract`

Partial-fit payloads with acceptable adaptation:

- `project.json` -> `VenueProjectContract`
- `assessment.json` -> `AssessmentDraftContract`
- `fixture_input.json` -> `AssessmentRunRequestContract`
- `operational_plan.json` -> `PlanContract`
- `progress/entries.json` -> `ProgressEntryContract`
- `chat_history/t_*.json` -> `ChatThreadContract`
- `golden_report.md` -> `ReportContract`

## Current Platform Alignment

Shared Python contracts and generated TypeScript contracts match cleanly.

Current platform contracts fully aligned with the frozen contract set:

- `FollowUpContract`
- `EscalationContract`
- `ChatThreadContract`

Current platform internally mirrors many simplified shapes between backend and frontend, but those shapes still omit important fields. High-signal examples:

- `ProgressEntryRead` / `ProgressEntryRecord` omit `entry_type`
- `EngineRunOutput` / `EngineRunResponse` omit `normalized_signals`, `block_activations`, `constraint_report`, and the layered `generated_plan`
- `PlanTaskRead` / `PlanTaskRecord` omit first-class comments, events, richer task timing, and dependency semantics
- `CopilotMessageRead` / `CopilotMessageRecord` omit attachments
- no current first-class platform contracts exist for task comments, task events, task dependency edges, help requests, generated plans, or notification events

Inference: the backend and frontend are often consistent with each other, but they are consistently narrower than the frozen migration contract set.

## Risks Blocking Closure

1. Important legacy meaning is still flattened in the current platform, especially around execution history, progress typing, generated plans, and reports.
2. Some required seams still have no first-class current-platform type at all.
3. The shared contract layer exists in `OIS_Cafe_v2/`, but the active platform snapshot in `CODEX-VOIS-.../` has not adopted it yet.

## Required Fixes Before Phase 3

1. Adopt the shared contract package as the single contract source of truth for backend and frontend work.
2. Restore missing semantics in the new platform before schema drift hardens:
   - progress entry type
   - generated plan vs persisted plan
   - task comments, task events, task dependency edges
   - report markdown artifact
   - attachments on chat messages
   - help request and notification event contracts
3. Decide whether `AIIntakeSnapshotContract` becomes a persisted backend model or remains a translation-only migration seam.
4. Add a contract audit step to the migration workflow so future backend/frontend changes are checked against `packages/contracts/ois_contracts/`.
