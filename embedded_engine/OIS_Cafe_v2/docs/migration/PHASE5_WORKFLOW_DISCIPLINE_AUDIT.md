# Phase 5 Closure Audit — V1 Workflow Discipline in CODEX UI

## Executive summary

Phase 5 is not closed.

The codebase contains real implementation work toward draft-first workflow discipline, but the closure conditions are not met. The strongest failures found in this audit are:

- draft tasks can still be mutated through backend task endpoints before approval
- rerunning an assessment while an active plan exists causes the newest draft to take over the "latest" plan endpoints
- several backend and frontend surfaces still use "latest plan" as a proxy for execution truth
- cross-venue next-action resolution leaks in-progress tasks from other venues

## Files audited first

Read during the audit:

- `C:\Users\matas\Documents\00\CODEX-VOIS-claude-debug-api-500-error-HACD2\walkthrough.md`
- `task.md` was not present anywhere in the workspace
- `C:\Users\matas\Documents\00\CODEX-VOIS-claude-debug-api-500-error-HACD2\apps\web\src\App.tsx`
- `C:\Users\matas\Documents\00\CODEX-VOIS-claude-debug-api-500-error-HACD2\apps\web\src\features\views\AssessmentView.tsx`
- `C:\Users\matas\Documents\00\CODEX-VOIS-claude-debug-api-500-error-HACD2\apps\web\src\features\manager\TodayBoard.tsx`
- `C:\Users\matas\Documents\00\CODEX-VOIS-claude-debug-api-500-error-HACD2\apps\web\src\features\views\PlanView.tsx`
- `C:\Users\matas\Documents\00\CODEX-VOIS-claude-debug-api-500-error-HACD2\apps\web\src\lib\api.ts`
- `C:\Users\matas\Documents\00\CODEX-VOIS-claude-debug-api-500-error-HACD2\apps\api\app\schemas\domain.py`
- `C:\Users\matas\Documents\00\CODEX-VOIS-claude-debug-api-500-error-HACD2\apps\api\app\api\routers\plans.py`
- `C:\Users\matas\Documents\00\CODEX-VOIS-claude-debug-api-500-error-HACD2\apps\api\app\services\plans.py`
- `C:\Users\matas\Documents\00\CODEX-VOIS-claude-debug-api-500-error-HACD2\apps\api\app\services\assessment_runtime.py`

## Reproducible evidence

Audit script:

- `python C:\Users\matas\Documents\00\OIS_Cafe_v2\scripts\phase5_closure_audit.py`

Structured result:

- `C:\Users\matas\Documents\00\OIS_Cafe_v2\docs\migration\phase5\summary.json`

Frontend/build verification:

- `npm --prefix apps/web run test`
- `npm --prefix apps/web run build`

Backend verification:

- `python -m pytest -q`

Observed status:

- backend pytest: fail
  - `tests/test_persistence.py::test_round_trip_persistence`
  - SQLite schema mismatch: `assessments.assessment_type` missing in that test setup
- frontend tests: pass
  - 4 files, 10 tests passed
- frontend build/typecheck: fail
  - `src/App.tsx(2061,21): Type 'string | undefined' is not assignable to type 'string'`
- lint: not configured in `apps/web/package.json`

## Key findings

### 1. New plans do initialize as draft

Confirmed in:

- `assessment_runtime.execute_assessment(...)`
- `OperationalPlan.status` model default

This closure condition is satisfied.

### 2. Draft is not fully protected as non-execution truth

Observed in the audit script:

- `/api/v1/plans/latest/execution-summary` returns ready tasks for a draft plan before approval
- `/api/v1/plans/tasks/{task_id}` accepts note mutation for draft tasks
- `/api/v1/plans/tasks/{task_id}` accepts status mutation for draft tasks

This violates workflow-discipline closure.

### 3. Latest plan is treated as execution truth in too many places

Backend:

- `latest_plan_for_venue(...)` returns newest plan by `created_at`
- `latest_execution_summary_for_venue(...)` also uses newest plan by `created_at`

Frontend:

- `App.tsx` sets `latestPlan` from `/plans/latest`
- `App.tsx` immediately mirrors `latestPlan` into `activePlan` on venue refresh
- manager Today, Evidence, Team, and Copilot surfaces consume `latestPlan` directly

This means rerun behavior is not preserving active execution truth as the default truth source.

### 4. Approval is real and duplicate activation is idempotent

Confirmed:

- activation is a real backend `PATCH /api/v1/plans/{plan_id}` state transition
- first activation writes audit/progress history
- second activation produces no duplicate audit/progress entry

This part is working.

### 5. Cross-view consistency is not closed

- Plan view uses `activePlan`
- Today uses `latestPlan`
- Graph is only a placeholder, not a live plan consumer
- Evidence and Team also use `latestPlan`

These views are not all anchored to the same plan identity or same truth rules.

### 6. Additional scoping bug found

`resolve_next_actions(...)` selects in-progress tasks without venue filtering, which leaked task ids from one venue into another venue's next-action feed during the audit.

## Conclusion

Phase 5 should not be marked closed. The project has meaningful implementation progress, but the enforcement boundary between draft review and live execution is still porous, and latest-vs-active plan truth is still inconsistent across API and UI surfaces.
