# Phase 0 Parity Baseline

## Status

Verdict: `PHASE 0 IMPLEMENTED BUT NOT STABILIZED`

This baseline package was created after migration work had already started elsewhere in the workspace (`07_v1/` and `CODEX-VOIS-claude-debug-api-500-error-HACD2/`). That means Phase 0 cannot be treated as a clean pre-migration gate, even though the freeze artifacts now exist.

## What Was Frozen

The machine-readable baseline package lives under `docs/migration/phase0/` and includes:

- `structure_manifest.json` - legacy entrypoints, engine modules, ontology files, UI shell files, and helper-content counts
- `route_inventory.json` - 104 Flask routes extracted from `06_app/app.py`
- `frontend_fetch_inventory.json` - frontend fetch-call inventory across the legacy static JS shell
- `persistence_surfaces.json` - every known persisted state surface in the filesystem-backed app
- `fixture_manifest.json` - six representative Phase 0 fixtures with source provenance and coverage summaries
- `fixtures/<fixture_id>/...` - frozen input payloads, optional source snapshots, and golden engine/report outputs
- `capture_summary.json` - top-level baseline capture summary
- `verification_summary.json` - fresh-process rerun check against the frozen goldens

## Fixtures Frozen

Six representative fixtures were captured:

1. `F001_normal_followup_warsaw` - normal venue
2. `F002_degraded_pegasas` - degraded venue
3. `F003_conflicting_capacity_vs_cost` - conflicting signals case
4. `F004_existing_active_plan_kaunas` - existing active plan case
5. `F005_ambiguous_ai_preopening_muzos2` - partial/ambiguous AI extraction case
6. `F006_complex_klaipeda_multi_surface` - richer operational complexity case

Each fixture includes:

- `fixture_input.json`
- `golden_normalized_signals.json`
- `golden_failure_modes.json`
- `golden_response_patterns.json`
- `golden_activation_set_raw.json`
- `golden_activation_context.json`
- `golden_activation_set_constrained.json`
- `golden_constraint_report.json`
- `golden_action_plan.json`
- `golden_report.md`
- `golden_summary.json`

When available, the fixture also includes copied legacy source snapshots such as:

- `project.json`
- `operational_plan.json`
- `signal_history.json`
- `progress/entries.json`
- `chat_history/_index.json`
- `chat_history/t_*.json`
- `assessment.json`
- `ai_extraction_snapshot.json`

## How To Run

Capture or refresh the Phase 0 package:

```powershell
python .\scripts\phase0_lock_baseline.py
```

Verify the package against a fresh rerun:

```powershell
python .\scripts\phase0_lock_baseline.py --verify
```

## Acceptable Vs Unacceptable Change

Acceptable during later phases:

- additive docs or tooling that do not change frozen inputs or golden outputs
- additive routes or UI surfaces that do not change the legacy fixture results
- migration code in separate trunks as long as parity is evaluated against the Phase 0 package

Unacceptable before Phase 1 parity is proven:

- changing any fixture input without explicitly updating the baseline and documenting why
- changing normalized signals, failure modes, response patterns, constrained activations, plan content, or report output for a frozen fixture without an approved parity explanation
- deleting or reshaping persisted legacy files (`project.json`, `operational_plan.json`, `assessments/*.json`, `chat_history/*.json`, `progress/entries.json`) without a compatibility story
- treating `07_v1/` or `CODEX-VOIS-.../` as parity-complete without comparing back to these fixtures

## Reproducibility Result

The capture succeeded, but verification currently fails.

Observed blocker patterns:

- engine output contains unstable nested ordering
  - example: `F002_degraded_pegasas/golden_failure_modes.json` reran with the same failure modes but a different `signal_ids` order inside a failure mode
- generated report prose is not fresh-process stable
  - example: `F001_normal_followup_warsaw/golden_report.md` changed wording between capture and verify for the same frozen input
- action-plan files also drift on rerun in several fixtures
  - top-level task counts remain stable, which suggests the drift is likely in nested ordering or derived text, not gross task loss

Inference: the legacy engine/report path still contains nondeterministic ordering or text-selection behavior. The Phase 0 package therefore exists, but it is not yet strong enough to serve as a clean binary gate without additional stabilization.

## Risks Recorded

- Migration work began before the Phase 0 baseline was fully locked.
- The AI intake baseline is frozen from recorded assessments, but live AI extraction remains externally model-dependent and is not replayed as a deterministic local check.
- The workspace currently has multiple candidate trunks, so the baseline needs to remain explicitly anchored to `OIS_Cafe_v2/`.

## Required Fixes Before Phase 1

1. Make legacy engine outputs deterministic enough for `python .\scripts\phase0_lock_baseline.py --verify` to pass in a fresh process.
2. Decide and document the single canonical trunk that must satisfy this baseline.
3. Add a parity check step to the future migration workflow so fixture drift is caught immediately.
4. Decide whether recorded AI extraction snapshots are sufficient, or whether cached AI responses must be replayable offline.
