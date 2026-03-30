# VOIS RPA-02 — Developer Patch Paths

This document lists the exact files and the specific role-integrity problems to patch.

## P0 — Pocket / barista Copilot containment

### 1. `apps/api/app/services/copilot.py`

#### Problem
`_load_threads()` still allows baristas to receive threads beyond a fully sealed Pocket-safe help lane.

#### What to patch
- Restrict barista thread listing to only:
  - their own help-request threads
  - any explicitly approved Pocket-safe scope if you deliberately introduce one
- Do not allow venue/global/general copilot threads to appear for baristas by default
- Keep manager and owner rules separate

#### Patch target
- `_load_threads()`
- any helper used to derive thread visibility

---

### 2. `apps/api/app/api/deps/auth.py`

#### Problem
`require_thread_access()` only adds extra barista restriction for `HELP_REQUEST` scope.

#### What to patch
- Baristas must not access any non-Pocket-safe thread scope
- Enforce this at backend authority level, not just in UI filtering
- Treat route/UI filtering as defense-in-depth, not the main guard

#### Patch target
- `require_thread_access()`

---

### 3. `apps/web/src/App.tsx`

#### Problem
Frontend thread filtering and thread preference logic are still too broad for Pocket.

#### What to patch
- `filterThreadsForScope()` must become fully role-aware and Pocket-safe
- `preferredThreadId()` must never auto-select a non-Pocket-safe thread for baristas
- Pocket help-request creation/opening must not route into broader thread selection behavior
- Pocket should open only a safe help-thread lane

#### Patch target
- `filterThreadsForScope()`
- `preferredThreadId()`
- `handlePktCreateHelpRequest()`
- Pocket help-thread open logic

## P1 — Pocket task lane

### 4. `apps/web/src/App.tsx`

#### Problem
Pocket task tap still routes into Standards.

#### What to patch
- Replace the current task tap behavior with a real Pocket task-detail route/state
- Pocket task detail should become the frontline work surface
- Standards, Help, Report, and Proof should be support actions from task detail, not replacements for task detail

#### Patch target
- `onOpenTask` wiring in Pocket shell rendering
- route/state handling for Pocket task detail

---

### 5. `apps/web/src/features/pocket/*`

#### Problem
Pocket needs an actual task-first lane instead of support-surface substitution.

#### What to patch
- add or finish `TaskDetail` / equivalent Pocket task surface
- ensure back path returns to My Shift
- keep the shell minimal and frontline-safe

#### Patch target
- task-detail component and any supporting type/navigation files

## P1/P2 — Notification role-awareness

### 6. `apps/web/src/features/shell/NotificationBell.tsx`

#### Problem
Notifications are rendered with raw title/body plus title-keyword view guessing.

#### What to patch
- Add role-aware notification presentation rules
- Hide or rewrite wrong-tier wording for Pocket
- Replace title-keyword routing heuristics with safer structured routing where possible
- Ensure click-through lands only on role-allowed destinations

#### Patch target
- notification rendering
- click handler routing
- any level badges / route hints

## P1/P2 — Pocket route purity

### 7. `apps/web/src/App.tsx`

#### Problem
`coerceRouteForRole()` still allows `reference` and `kb` for `barista`.

#### What to patch
Choose one of two policies explicitly:

#### Option A — strict Pocket purity
- allow only `pocket`
- block `reference` and `kb`

#### Option B — curated Pocket-safe support
- keep `kb` and/or `reference`
- but explicitly scope those surfaces to Pocket-safe content only
- no ontology/system/admin browsing

#### Patch target
- `coerceRouteForRole()`
- any render logic for Pocket access to support surfaces

## Recommended patch order

1. backend Copilot listing restriction
2. backend thread access restriction
3. frontend Pocket thread filtering / preferred-thread fix
4. Pocket help-thread opening fix
5. Pocket task-detail lane
6. notification role-awareness
7. route purity decision for Pocket Reference / KB

## Re-test after patching

After fixes, re-run:
- Pocket help request creation/opening
- Pocket Copilot thread visibility
- Pocket task tap behavior
- Pocket notifications
- Owner walkthrough
- Manager walkthrough
- Pocket walkthrough
- leakage attack audit
