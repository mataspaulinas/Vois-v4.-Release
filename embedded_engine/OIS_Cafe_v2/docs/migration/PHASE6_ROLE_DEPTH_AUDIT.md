# Phase 6 Role Depth Audit

Date: 2026-03-27
Verdict: PHASE 6 IMPLEMENTED BUT NOT STABILIZED

## Executive summary

Phase 6 is no longer a failed shell experiment. The role defaults are clear, the manager graph route no longer competes with Plan, Pocket Help is now a real persisted lane, and the frontend build/test posture is clean again.

Phase 6 is still not closed. The role layer is healthier, but closure still depends on the workflow core underneath it. The strongest remaining blocker is that Pocket task drill-in is still indirect, and the role-depth verdict should not be upgraded to closed until the refreshed Phase 5 workflow-truth audit is fully rerun.

## Role defaults

- Owner default home: `command`
  - Defined in `apps/web/src/features/shell/types.ts`
  - Used by `handleEnterOwnerShell()` in `apps/web/src/App.tsx`
- Manager default home: `today`
  - Defined in `apps/web/src/features/shell/types.ts`
  - Used by `handleEnterManagerShell()` in `apps/web/src/App.tsx`
- Pocket default home: `shift`
  - Defined in `apps/web/src/features/shell/types.ts`
  - Used by `handleEnterPocketShell()` in `apps/web/src/App.tsx`

These defaults are now route-stable and coherent.

## High-signal findings

### 1. Graph no longer competes with Plan

The separate manager `graph` route and nav entry were removed from the shell route model and parser:

- `apps/web/src/features/shell/types.ts`
- `apps/web/src/features/shell/navigation.ts`

Dependency context now lives inside `PlanView` as supporting structure rather than a competing manager home.

Impact:
- Manager depth is more disciplined.
- Today remains the command desk and Plan remains the structure view.

### 2. Pocket Help is now first-class and persisted

Pocket help is no longer only advisory UI. The platform now has a canonical persisted help-request lane backed by:

- `apps/api/app/models/domain.py`
- `apps/api/app/services/help_requests.py`
- `apps/api/app/api/routers/pocket.py`
- `apps/web/src/features/pocket/AskForHelp.tsx`

Each help request creates or links a dedicated `help_request` Copilot thread.

Impact:
- Help is now distinct from report/log lanes at the operational level.
- Pocket depth is more semantically real than in the previous audit.

### 3. Execution-facing role surfaces are more active-plan anchored

Role surfaces now default more consistently to active execution truth instead of silently falling back to latest-generated truth:

- `apps/web/src/App.tsx`
- `apps/api/app/api/routers/pocket.py`
- `apps/api/app/services/portfolio.py`
- `apps/api/app/services/people_intelligence.py`

Impact:
- Manager and Pocket now align more cleanly on the active plan.
- Owner surfaces are less exposed to draft/latest leakage than before.

### 4. Pocket task drill-in is still indirect

`MyShift` still does not open a task-native work surface. Task selection continues to push the user toward broader standards/work context rather than a focused task drill-in.

Impact:
- Pocket has a clear home, but the "current task" experience is still thinner than the phase goal requires.

### 5. Phase 5 still needs formal refreshed closure

The role shell is stronger, but Phase 6 should not be marked closed until the workflow-truth audit is rerun formally against the current codebase.

Impact:
- Role depth is improved and usable.
- Closure discipline still requires Phase 5 truth to be re-certified, not assumed.

## Role-by-role assessment

### Owner

Good:
- `CommandCenter` remains a clear strategic default home.
- `DelegationConsole` and `PeopleIntelligence` remain distinct support surfaces.
- Owner views are more consistently tied to live operational truth than before.

Still open:
- Owner depth should remain subordinate to the final active-plan truth refresh rather than being treated as independently closed.

### Manager

Good:
- `TodayBoard` remains the dominant home.
- `ExecutionWorkspace` and `PlanView` now sit on a cleaner route model.
- Graph no longer creates route sprawl as a placeholder page.

Still open:
- Final closure still depends on re-confirming that Today, Workspace, Plan, and supporting surfaces all resolve the same active truth under the refreshed Phase 5 audit.

### Pocket

Good:
- `MyShift` remains the clear default home.
- report, log, standards, and help each answer a distinct user question.
- help is now a real persisted workflow lane.

Still open:
- task drill-in is still indirect
- the pocket experience is clearer, but not yet task-native enough for closure

## Verification performed

Observed command results:

- `npm --prefix apps/web run test`: passed
  - 11 tests passed
- `npm --prefix apps/web run build`: passed
- `python -m pytest tests/test_manager_workflow.py tests/test_pocket_workflow.py tests/test_phase6_integration.py -q`: passed
  - covered by the full backend suite

Test caveat:
- these checks show the role shell is materially healthier than before
- they do not, by themselves, certify final workflow-truth closure underneath Phase 6

## Required fixes before closure

1. Refresh and rerun the formal Phase 5 workflow-discipline audit on the current codebase.
2. Add a task-native drill-in path for Pocket `My Shift`.
3. Keep role surfaces pinned to active truth only; do not allow later cleanup to reintroduce latest-plan execution fallbacks.

## Files most likely needing further product changes

- `apps/web/src/App.tsx`
- `apps/web/src/features/pocket/MyShift.tsx`
- `apps/web/src/features/views/PlanView.tsx`
