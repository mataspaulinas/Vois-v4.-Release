# VOIS RPA-02 — GitHub Main Audit Report

Repo audited: `mataspaulinas/Vois-v4.-Release`
Branch audited: `main`
Audit type: release-prep role integrity and shell containment audit
Audit scope: current GitHub state only

## Final release call

**No-go**

## Why this audit was run

The product is designed as one system with three distinct working altitudes:
- Owner -> Command
- Manager -> Today
- Pocket / Barista -> My Shift

The audit was triggered by a concrete red flag: owner-context / Copilot leakage into Pocket.

## Executive summary

The current GitHub `main` state still contains role-boundary failures serious enough to block release.

The strongest blocker is a Pocket / barista Copilot containment issue:
- frontend route and thread-selection logic do not fully seal Pocket from broader Copilot context
- backend thread listing/access rules do not fully restrict baristas to Pocket-safe help lanes only

Additional important issues remain:
- Pocket task tap still routes into Standards rather than a true task-detail lane
- notifications are user-scoped server-side, but the presentation layer is not role-aware enough
- baristas are still allowed into `reference` and `kb` by route coercion, which weakens shell purity unless those surfaces are explicitly Pocket-safe

## Positive findings

1. The repo is clearly structured as the clean release-candidate root.
2. The documented authorization model is explicit about role boundaries.
3. Top-level role coercion exists in frontend route logic.
4. User-scoped notification fetching reduces cross-user leakage risk.
5. Backend venue-assignment checks exist for manager/barista venue scope.

## Findings

### RPA-02-001 — P0
**Pocket / barista Copilot containment failure**

#### What is wrong
Baristas are not fully restricted to their own Pocket-safe help thread lane.

#### Why it matters
Pocket must remain task-first and containment-safe. Any broader thread visibility or thread selection is a release-blocking trust failure.

#### Where it appears
- frontend thread filtering / preferred-thread selection in `apps/web/src/App.tsx`
- backend thread listing in `apps/api/app/services/copilot.py`
- backend thread access in `apps/api/app/api/deps/auth.py`

#### Release impact
P0 — release blocker

---

### RPA-02-002 — P1
**Pocket help flow can still act as a doorway into general Copilot behavior**

#### What is wrong
Pocket help request creation/opening still routes through the general Copilot selection/opening path instead of a strictly Pocket-safe support lane.

#### Why it matters
Even if top-level shell routing looks correct, Help becomes a leakage vector.

#### Where it appears
- `apps/web/src/App.tsx`

#### Release impact
P1 by itself, effectively part of the P0 lane

---

### RPA-02-003 — P1
**Pocket task lane is structurally broken**

#### What is wrong
Task tap in Pocket routes to Standards instead of a real task-detail screen.

#### Why it matters
This breaks the frontline execution shell and forces Pocket users into a support surface instead of the primary work surface.

#### Where it appears
- `apps/web/src/App.tsx`

#### Release impact
P1

---

### RPA-02-004 — P1/P2
**Notification presentation is not role-aware enough**

#### What is wrong
Notifications are rendered with raw title/body plus title-keyword routing heuristics.

#### Why it matters
Even if the backend notification list is user-scoped, the shell can still show wrong-tier language or misleading route suggestions.

#### Where it appears
- `apps/web/src/features/shell/NotificationBell.tsx`

#### Release impact
P1 if mixed-role or shared-testing contexts are common
P2 if accounts are strictly role-separated

---

### RPA-02-005 — P1/P2
**Pocket is still allowed into Reference and KB by route coercion**

#### What is wrong
The current route law for `barista` explicitly allows `pocket`, `reference`, and `kb`.

#### Why it matters
This may be acceptable only if those surfaces are tightly curated for frontline use. Otherwise it weakens shell purity and exposes unnecessary system depth.

#### Where it appears
- `apps/web/src/App.tsx`

#### Release impact
P1 if content is not Pocket-safe
P2 if those areas are intentionally curated for baristas

## Release conclusion

The current GitHub main state should not be released as final.

The key reason is not visual polish. It is role integrity.

The product is close to a strong shell model, but Pocket still does not have trustworthy containment.

## Required next action

Fix the P0/P1 items first, then re-run:
- Owner walkthrough
- Manager walkthrough
- Pocket walkthrough
- leakage attack audit
- final go/no-go decision
