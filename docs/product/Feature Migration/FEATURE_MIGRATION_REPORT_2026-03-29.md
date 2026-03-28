# Feature Migration Report

Status: in-progress snapshot  
Date: 2026-03-29  
Scope: `OIS_Cafe_v2` donor richness recovery into `VOIS v4.release`

## Executive Summary

Feature migration is materially advanced and now covers the core workflow spine, plan/history/report continuity, major owner and copilot richness, and the explainability surfaces defined in the migration strategy.

The current overall migration completion rating is:

- `78% complete`

This percentage is a product-capability score against the governing migration strategy, not a claim that the repo is fully stabilized or production-verified.

The cleanest summary is:

- Waves 1 and 2 are substantially restored
- Waves 3 and 4 are meaningfully restored but still have partial donor-depth gaps
- Wave 5 remains intentionally deferred
- the venue ontology seam has been materially cleaned, including removal of `Venue.vertical` from live venue runtime

## Rating Method

The score is weighted by the strategy's priority order rather than by raw file count:

- Wave 1 — Serious workflow spine: 25%
- Wave 2 — Execution and continuity: 20%
- Wave 3 — Living intelligence: 20%
- Wave 4 — Explainability and adoption: 20%
- Wave 5 — Advanced platform intelligence: 15%

Wave scores used for this snapshot:

- Wave 1: `100%`
- Wave 2: `90%`
- Wave 3: `72%`
- Wave 4: `82%`
- Wave 5: `12%`

Weighted result:

- `78%`

## Wave Status

### Wave 1 — Serious Workflow Spine

Verdict:

- `CLOSED`

Restored:

- explicit venue workflow sequence in the manager venue shell
- dedicated Signals Review surface
- stronger assessment guidance through intake quality support
- visible reviewed-signal layer with downstream impact visibility

Evidence in repo:

- `apps/web/src/features/views/SignalsReviewView.tsx`
- `apps/web/src/features/views/AssessmentView.tsx`
- `apps/web/src/features/shell/types.ts`
- `apps/web/src/features/shell/Sidebar.tsx`

### Wave 2 — Execution and Continuity

Verdict:

- `CLOSED` for the main migration objective
- some donor-depth follow-up remains

Restored:

- richer plan execution surface
- completion and provenance visibility
- stronger history continuity
- stronger report artifact lineage
- inline task comments

Still partial:

- assignments and due-date editing
- report export

Evidence in repo:

- `apps/web/src/features/views/PlanView.tsx`
- `apps/web/src/features/views/HistoryView.tsx`
- `apps/web/src/features/views/ReportView.tsx`
- `apps/api/app/api/routers/assessments.py`

### Wave 3 — Living Intelligence

Verdict:

- `PARTIAL`

Restored:

- stronger owner portfolio triage posture
- configuration issues surfaced to the owner command layer
- copilot and portfolio routing aligned to the new venue subviews

Still partial:

- notifications and unread/due-soon realism are still lighter than donor depth
- activity is present, but not yet a full notification system
- thread organization depth is still modest compared with the donor app

Evidence in repo:

- `apps/web/src/features/views/PortfolioView.tsx`
- `apps/web/src/App.tsx`

### Wave 4 — Explainability and Adoption

Verdict:

- `IMPLEMENTED BUT NOT FULLY MATURE`

Restored:

- product help separated from doctrine
- KB reading engine with bookmarks, notes, progress, and focus mode
- glossary / terminology layer
- stronger knowledge surface structure

Still partial:

- tours and guided onboarding are not yet implemented
- reading state is local-storage backed rather than backend-synced
- deeper citation-chain and study posture can still grow

Evidence in repo:

- `apps/web/src/features/views/KnowledgeBaseView.tsx`
- `apps/web/src/features/kb/ReadingEngine.tsx`
- `apps/web/src/features/kb/Glossary.tsx`

### Wave 5 — Advanced Platform Intelligence

Verdict:

- `DEFERRED`

Not yet restored:

- signal map / heatmap / intelligence map
- deeper systemic portfolio intelligence
- fuller advanced admin trust surfaces

Reason for defer:

- the migration strategy explicitly places this after core workflow and ontology seam stabilization

## Ontology Seam Status

Status:

- `materially improved`

Completed in this tranche:

- live venue runtime no longer uses `Venue.vertical`
- live venue creation and owner setup now rely on explicit ontology binding only
- backfill logic now reconstructs bindings from persisted ontology identity rather than venue vertical hints
- dev fixture import now derives explicit ontology bindings directly

Evidence in repo:

- `apps/api/app/models/domain.py`
- `apps/api/app/schemas/domain.py`
- `apps/api/app/services/ontology_bindings.py`
- `apps/api/app/services/workspace_setup.py`
- `apps/api/alembic/versions/20260329_0036_drop_venue_vertical.py`

Residual note:

- some ontology services still use the parameter name `vertical` internally as a compatibility naming convention for ontology-pack operations, but that is no longer venue runtime truth

## What Is Strong Today

- owner claim / empty-by-default posture
- role-native shells
- explicit venue ontology binding
- serious venue workflow chain
- reviewed-signal accountability layer
- plan/report/history lineage
- strong product help and KB foundation

## What Is Still Missing

- advanced Wave 5 intelligence surfaces
- full notifications/activity realism
- tours/onboarding depth
- backend-synced KB reading state
- some remaining execution richness such as assignments/due dates/export

## Verification Status

Verification during this snapshot was mixed because the sandbox was partially constrained.

Confirmed in this environment:

- frontend TypeScript compile passed
- search gates confirmed live venue runtime no longer references `venue.vertical`

Not fully runnable in this environment:

- backend pytest, because no runnable `python` or `py` launcher was exposed in the active sandbox
- Vite/Vitest full build/test, because `esbuild` child-process spawn failed with `EPERM`

So the migration score reflects implementation completeness, not full stabilization confidence.

## Final Verdict

- Migration strategy execution status: `substantially advanced`
- Current product-richness restoration rating: `78%`
- Repo stabilization status for this snapshot: `implemented but not fully stabilized`

## Recommended Next Step

The next highest-value step is not another broad feature wave.

It is:

- run full backend and frontend verification in a shell with working Python and unrestricted `esbuild` spawn
- close the remaining stabilization gap on the ontology cleanup tranche
- then choose between:
  - deeper Wave 3 activity/notifications restoration
  - or beginning Wave 5 advanced intelligence surfaces
