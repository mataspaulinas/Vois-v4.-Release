# Phase 7 Support Intelligence Audit

Date: 2026-03-27
Verdict: PHASE 7 IMPLEMENTED BUT NOT STABILIZED

## Executive summary

Phase 7 is no longer a pure failure state. Support intelligence is materially stronger than in the earlier audit:

- Pocket Help is now a real persisted help-request lane.
- Copilot persists attachments and the drawer renders them.
- Report now surfaces richer trust artifacts including grounding references, persisted report evidence, and AI trace metadata.
- Assessment, Report, and History remain clearly distinct.

Phase 7 is still not closed. The strongest remaining blockers are that Copilot is not yet truly role-aware in its backend thread model, product Help is still not a dedicated "how to use the product" destination, and some AI runtime portfolio logic still reasons over latest-plan patterns rather than fully role/active-truth-aware semantics.

## Copilot findings

Pass:

- Threads and messages persist through explicit routes and services in `apps/api/app/api/routers/copilot.py` and `apps/api/app/services/copilot.py`.
- Message serialization includes references and attachments, and the drawer now renders persisted attachments in `apps/web/src/features/copilot/CopilotDrawer.tsx`.
- Pocket Help requests create dedicated linked `help_request` Copilot threads through `apps/api/app/services/help_requests.py`.
- Venue-grounded Copilot selection is more disciplined in `apps/web/src/App.tsx`.

Remaining:

- Copilot thread scope is still not deeply role-aware. It distinguishes `global`, `venue`, `task`, and `help_request`, but not owner/manager/pocket as first-class backend scopes.
- Bootstrap still seeds generic working threads rather than role-native defaults.
- Some portfolio-style AI runtime analysis still uses latest-plan reasoning patterns rather than purely active-truth semantics.

## KB, Reference, Help findings

Pass:

- Knowledge Base remains doctrine and operating posture in `apps/web/src/features/views/KnowledgeBaseView.tsx`.
- Reference remains entity/object lookup in `apps/web/src/features/views/ReferenceView.tsx`.
- Operational Help is now a real persisted lane through `apps/web/src/features/pocket/AskForHelp.tsx` and `apps/api/app/services/help_requests.py`.

Remaining:

- Product Help, meaning guidance on how to use the platform itself, is still not a dedicated top-level destination.
- The new Pocket Help lane improves support semantics, but it does not fully satisfy the product-help interpretation of the Phase 7 requirement.

## History, Report, Assessment findings

Pass:

- Assessment remains the place where new diagnostic truth is created.
- History remains the comparison/timeline surface.
- Report remains the interpretation surface.
- The frontend now exposes more of the persisted report-trust surface through `apps/web/src/features/views/ReportView.tsx`, including grounding references, persisted report markdown evidence, normalized-signal counts, diagnostic snapshot presence, plan snapshot presence, and AI trace metadata.

## Navigation placement findings

Pass:

- Reference and Knowledge Base remain easy to reach without replacing live work.
- Copilot remains reachable as support rather than becoming the only path to understanding the system.
- Pocket Help now lives inside the Pocket workflow instead of pretending to be generic coaching text.

Remaining:

- Copilot is still a persistent global drawer, so its placement must continue to be handled carefully to avoid turning it into a second operating mode.
- Product Help navigation is still asymmetric compared with KB and Reference.

## Trust and trace findings

Pass:

- Backend trust artifacts remain real: normalized signals, diagnostic snapshot, plan snapshot, report markdown, and AI trace.
- The web Report surface now exposes a meaningful subset of those trust artifacts.
- Copilot drawer now shows persisted attachments and grounded references instead of dropping them.

Remaining:

- Trust is better surfaced, but not yet fully unified across all support surfaces.
- Some AI grounding logic still uses latest-plan-oriented portfolio analysis paths in `apps/api/app/services/ai_runtime.py`.
- Role-aware trust framing is still thinner than it should be.

## Verification run

Executed on 2026-03-27:

- `python -m pytest tests/test_copilot.py tests/test_ai_runtime.py tests/test_api.py -q` -> passed
- `npm --prefix apps/web run test` -> passed
- `npm --prefix apps/web run build` -> passed

## Closure judgment

Phase 7 is implemented but not stabilized.

The support-intelligence layer is now materially more truthful and better integrated than in the previous audit. It still needs:

1. deeper role-aware Copilot semantics
2. a dedicated product-help destination
3. final cleanup of latest-plan-oriented AI reasoning paths where active truth should dominate

Until those are finished, Phase 7 should not be marked closed.
