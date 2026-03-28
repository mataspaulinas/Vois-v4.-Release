# Phase 3 Persistence Migration / Canonical Truth

## Executive summary

Phase 3 established canonical persistence in the FastAPI backend snapshot at
`C:\Users\matas\Documents\00\CODEX-VOIS-claude-debug-api-500-error-HACD2\apps\api`.

The persistence layer now stores:

- canonical venue, assessment, engine-run, plan, and task entities
- canonical task dependencies, task events, task comments, deliverable proofs, and notification events
- snapshot artifacts for raw intake, normalized signals, diagnostic output, plan snapshot, markdown report, and AI trace

The phase is implemented, but not yet fully stabilized. The main remaining issue is schema drift on SQLite detected by `alembic check` after the migration chain reaches head.

## Canonical tables frozen in Phase 3

Canonical relational entities now present in the SQLAlchemy model and Alembic chain:

- `organizations`
- `users`
- `venues`
- `assessments`
- `engine_runs`
- `operational_plans`
- `plan_tasks`
- `task_dependencies`
- `task_events`
- `task_comments`
- `progress_entries`
- `follow_ups`
- `escalations`
- `evidence`
- `deliverable_proofs`
- `notification_events`
- `copilot_threads`
- `copilot_messages`
- `file_assets`
- `push_subscriptions`

## Snapshot artifacts retained

The new persistence model now keeps these snapshot-style artifacts instead of flattening them away:

- `assessments.raw_input_text`
- `assessments.raw_intake_payload`
- `assessments.venue_context_json`
- `engine_runs.normalized_signals_json`
- `engine_runs.diagnostic_snapshot_json`
- `engine_runs.plan_snapshot_json`
- `engine_runs.report_markdown`
- `engine_runs.report_type`
- `engine_runs.ai_trace_json`
- `operational_plans.snapshot_json`

This preserves legacy diagnostic/report/plan truth while the product model is still converging.

## Verification performed

### Migration integrity

Verified successfully:

- fresh SQLite database -> `alembic upgrade head`
- fresh SQLite database -> `alembic upgrade 20260318_0030` -> `alembic upgrade head`

Result:

- migration chain is repeatable from zero
- upgrade from the pre-Phase-3 revision to head works

### Fixture persistence

Representative Phase 0 fixtures imported and reloaded successfully:

- `F004_existing_active_plan_kaunas`
- `F005_ambiguous_ai_preopening_muzos2`

Verified on import/reload:

- assessment metadata and venue context
- raw intake payload and AI trace retention
- normalized signals and diagnostic snapshots
- markdown report persistence
- plan snapshot persistence
- task counts
- dependency edge creation from legacy module-level dependencies
- copilot thread/message persistence with attachment metadata

### State integrity

Verified successfully after fixture import:

- task status mutation persists `started_at`, `updated_at`, and task-event audit rows
- progress entries persist with `entry_type`
- task comments persist and are reachable through API routes
- overdue follow-up -> escalation path persists escalation, task events, and risk progress
- evidence and deliverable proof rows persist
- notification dispatch persists notification events

### Targeted regression coverage

Passing targeted pytest coverage:

- `tests/test_phase3_persistence_migration.py`
- `tests/test_assessments.py`
- `tests/test_copilot.py`
- `tests/test_engine_history.py`
- `tests/test_ecl_cycle.py`

## Remaining stabilization risks

`alembic check` still reports model/migration drift on SQLite after upgrade head:

1. `users.venue_id` foreign key exists in the model, but the SQLite migration chain still leaves that column without an FK.
2. `copilot_threads.scope` type is still seen as drift between migrated SQLite schema and SQLAlchemy enum metadata.
3. `task_events.status` type is still seen as drift between migrated SQLite schema and SQLAlchemy enum metadata.

Because of those unresolved drifts, Phase 3 should not be marked closed yet.

## Required fixes before Phase 4

1. Remove the remaining Alembic drift so `alembic check` passes after `upgrade head`.
2. Decide whether SQLite stays a first-class migration target or only a test/dev convenience, then align enum/FK strategy accordingly.
3. Expose task events, task dependencies, deliverable proofs, and notification events through stable service/API seams if the frontend will consume them in Phase 4.
4. Decide whether additional legacy progress/chat/history artifacts need direct importer coverage beyond the Phase 0 fixture package already frozen.
