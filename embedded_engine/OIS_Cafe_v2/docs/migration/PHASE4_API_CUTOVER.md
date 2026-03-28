# Phase 4 Legacy Bridge Integration / API Cutover

## Executive verdict

`PHASE 4 IMPLEMENTED BUT NOT STABILIZED`

The API runtime now executes through the extracted Phase 1 engine package, not the lower-fidelity embedded copy. The cutover harness is migration-backed and passes cleanly against the direct legacy route on all six frozen fixtures. Phase 4 is still not closed because API output remains divergent from the real Phase 0 goldens on every fixture.

## What is now true

- The assessment execution path in the FastAPI backend resolves through the extracted engine authority.
- The parity harness in `scripts/phase4_api_cutover.py` now boots a migrated temp database instead of relying on schema side effects.
- API vs direct legacy route is clean across:
  - `F001_normal_followup_warsaw`
  - `F002_degraded_pegasas`
  - `F003_conflicting_capacity_vs_cost`
  - `F004_existing_active_plan_kaunas`
  - `F005_ambiguous_ai_preopening_muzos2`
  - `F006_complex_klaipeda_multi_surface`

## What is still blocking closure

- API vs Phase 0 goldens is still not clean across all six fixtures.
- Common deterministic diff pattern:
  - `golden_normalized_signals.json`
  - `golden_report.md`
- Additional blocking diffs remain on several fixtures:
  - `golden_failure_modes.json`
  - `golden_action_plan.json`

The machine artifact is in `docs/migration/phase4/summary.json`, and every current baseline diff is classified as `blocking`.

## Interpretation

This phase is no longer blocked by the wrong engine authority. It is now blocked by true fidelity. The remaining problem is not transport or persistence. The remaining problem is that the extracted-engine path still does not reproduce the richer Phase 0 frozen outputs.

## Verification

- `python C:\Users\matas\Documents\00\OIS_Cafe_v2\scripts\phase4_api_cutover.py`
- `python -m pytest tests/test_phase4_api_cutover_parity.py -q`

## Required next fix

Stabilize the extracted engine itself against the real Phase 0 baseline, starting with:

1. normalized signal parity
2. failure-mode parity where still drifting
3. action-plan parity where still drifting
4. markdown report parity or an explicitly narrowed deterministic report contract
