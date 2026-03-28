# Phase 1 Engine Extraction

## Status

Verdict: `PHASE 1 IMPLEMENTED BUT NOT STABILIZED`

The engine has been extracted into a reusable package under `packages/engine/ois_engine/` and deterministic side-by-side parity against the legacy modules passes for all six Phase 0 fixtures. Phase 1 is not closed because fixture comparison against the frozen Phase 0 goldens still inherits the same instability already documented at the end of Phase 0.

## Extraction Boundary

The extracted engine package now contains only the operational intelligence core and the resource-path seam needed to load legacy ontology/data assets:

- `signal_normalization.py`
- `failure_mode_engine.py`
- `response_pattern_engine.py`
- `block_activation_engine.py`
- `constraint_engine.py`
- `plan_generator.py`
- `report_generator.py`
- `engine.py`
- `resources.py`
- `api.py`
- `__init__.py`

What belongs inside the engine package:

- signal normalization
- failure mode detection
- response pattern activation
- block activation
- constraint trimming
- plan generation
- report generation
- resource-path configuration for ontology, blocks, tools, data, and settings

What remains outside the engine package:

- Flask route wiring in `06_app/app.py`
- frontend UI logic in `06_app/static/*.js`
- filesystem-backed venue/project orchestration
- auth/session handling
- any future API transport layer

## New Engine Entrypoints

Public entrypoints now live in `packages.engine.ois_engine`:

- `run_diagnostic(raw_input, *, root_dir=None)`
  - full end-to-end diagnostic run
  - returns normalized signals, failure modes, response patterns, raw/constrained activation sets, constraint report, action plan, report markdown, report type, and captured console output
- `generate_plan(activation_set, activation_context, activated_fms, activated_rps, normalized_signals, *, root_dir=None)`
  - stable plan-generation entrypoint
- `build_report(action_plan, activated_fms, activated_rps, normalized_signals, venue_context, *, root_dir=None)`
  - stable report-generation entrypoint
- `save_pipeline_artifacts(run_result, raw_input)`
  - optional output writer for CLI-style runs
- `configure_resources(root_dir=...)` / `get_resources()`
  - explicit configuration seam for ontology/data locations

## Framework Dependencies Found Or Removed

Direct framework coupling not found in the extracted package:

- no Flask imports
- no FastAPI imports
- no request/session objects
- no database session or ORM usage
- no frontend data-structure imports

Remaining non-framework runtime dependencies that are still present and intentionally preserved:

- filesystem reads from legacy ontology and data directories
- environment-variable access for optional AI insight behavior
- optional `anthropic` dependency inside `report_generator.py`
- report settings loaded from `05_data/system/settings.json`

Inference: the package is transport-agnostic, but not yet fully self-contained, because it still reads legacy resource files from disk by design.

## Parity Results Vs Phase 0

Detailed parity output: `docs/migration/phase1/parity_summary.json`

Results:

- Deterministic legacy vs extracted parity: `PASS`
  - all six Phase 0 fixtures matched exactly when compared side-by-side with live AI disabled for both runners
- Extracted package vs Phase 0 frozen goldens: `NOT CLEAN`
  - the mismatch profile is the same instability pattern already recorded in Phase 0

Fixture summary:

- `F001_normal_followup_warsaw`
  - legacy vs extracted: clean
  - phase0 goldens vs extracted: `golden_report.md`
- `F002_degraded_pegasas`
  - legacy vs extracted: clean
  - phase0 goldens vs extracted: `golden_failure_modes.json`, `golden_action_plan.json`, `golden_report.md`
- `F003_conflicting_capacity_vs_cost`
  - legacy vs extracted: clean
  - phase0 goldens vs extracted: `golden_failure_modes.json`, `golden_action_plan.json`, `golden_report.md`
- `F004_existing_active_plan_kaunas`
  - legacy vs extracted: clean
  - phase0 goldens vs extracted: `golden_action_plan.json`, `golden_report.md`
- `F005_ambiguous_ai_preopening_muzos2`
  - legacy vs extracted: clean
  - phase0 goldens vs extracted: `golden_failure_modes.json`, `golden_action_plan.json`, `golden_report.md`
- `F006_complex_klaipeda_multi_surface`
  - legacy vs extracted: clean
  - phase0 goldens vs extracted: `golden_failure_modes.json`, `golden_action_plan.json`, `golden_report.md`

## Accepted Diffs

No new accepted extraction diffs were introduced.

Observed diffs against the Phase 0 goldens are inherited from the legacy baseline itself and remain unresolved:

- unstable nested ordering inside failure-mode payloads
- unstable ordering or derived-text drift inside action-plan payloads
- unstable report markdown, likely amplified by live AI insight generation

These diffs are documented, but they are not accepted as closure-quality parity. They block `PHASE 1 CLOSED`.

## Remaining Risks

- The extracted package still depends on the legacy ontology/data folder layout through the resource-path seam.
- The report layer still has optional live AI behavior, which makes report markdown non-deterministic when credentials are present.
- Phase 0 goldens are not yet fresh-process stable, so Phase 1 cannot claim a trustworthy fixture gate even though extraction parity is clean.
- The legacy CLI orchestrator and the new package now coexist; future work must avoid silently diverging the two.

## Required Fixes Before Phase 2

1. Stabilize Phase 0 fixture verification so extracted-engine runs can be checked against a trustworthy golden baseline.
2. Decide whether live AI insight belongs inside the engine contract or should be split into an optional post-processing layer.
3. Add a single parity command to CI or to the migration workflow that runs `scripts/phase1_engine_parity.py`.
4. Decide whether the extracted package should keep reading legacy resource folders directly or receive an explicit published resource bundle.
