# VOIS Premium UX Implementation Plan

Status: Proposed working plan
Date: 2026-03-29
Scope: `apps/web`
Primary audience: product, design, frontend, and review owners

---

## 1. Purpose

This document converts the product conversation in [Conversations.txt](./Conversations.txt) into a repo-grounded implementation plan.

It exists to answer four questions:

1. What is the actual UX doctrine we are committing to?
2. What parts of the current app already support that doctrine?
3. What is still preventing VOIS from feeling like one coherent premium system?
4. In what order should the team build the fix without violating the constitutions?

This is not a free-form redesign note.
This is a constitution-aware delivery brief.

---

## 2. Constitution Alignment

This plan is governed by:

- [CONTRIBUTOR_CONSTITUTION.md](../../CONTRIBUTOR_CONSTITUTION.md)
- [OIS_CORE_ONTOLOGY_CONSTITUTION.md](../architecture/OIS_CORE_ONTOLOGY_CONSTITUTION.md)
- [VOIS_VISUAL_RESET_CONSTITUTION.md](../architecture/VOIS_VISUAL_RESET_CONSTITUTION.md)

The following laws are directly relevant:

- Active plan is the only execution truth.
- One source of truth per operational concept.
- One default home per role.
- Semantic lanes remain distinct.
- No duplicate destinations for the same primary action.
- No frontend-only protection.
- Visual reset may not rewrite product semantics.

Therefore this UX program must not:

- create a second home for plan execution, escalation, evidence, or help
- move domain logic into core shell behavior
- collapse `comment`, `progress`, `escalation`, `help request`, `report something`, `log/proof`, and `copilot`
- rely on visual states that imply permissions or truth the backend does not enforce
- turn search, command, or notifications into alternate truth paths

Working assumption:

- This phase is primarily shell, page, and interaction convergence work.
- Backend changes are allowed only where they support UI coherence without changing execution semantics.

---

## 3. Product Essence

### 3.1 Core sentence

VOIS should feel like one calm operational instrument that stages one truthful object at a time.

### 3.2 Role homes

These remain locked:

- Owner -> `Command`
- Manager -> `Today`
- Pocket -> `My Shift`

### 3.3 Primary object model

The product should always center one dominant object:

- portfolio pressure
- venue state
- assessment
- report
- plan
- task workspace
- shift task

Everything else is support context.

### 3.4 The target emotional result

The product should make users feel:

- sharper
- calmer
- more oriented
- less privately burdened
- more able to act correctly under pressure

If the user feels the weight of the whole system while trying to do one thing, the page is failing.

---

## 4. Current Reality In This Repo

### 4.1 What is already strong

The app already has the right product nouns and route lanes:

- role shells and homes in [types.ts](../../apps/web/src/features/shell/types.ts)
- route persistence in [navigation.ts](../../apps/web/src/features/shell/navigation.ts)
- portfolio, venue, manager, pocket, owner, reference, KB, and settings surfaces in [App.tsx](../../apps/web/src/App.tsx)
- manager and owner lanes separated in feature folders under [features](../../apps/web/src/features)

The current structure already reflects good product intent:

- `Today`, `Plan`, `Workspace`, `Evidence`, `Escalations`
- `Overview`, `Assessment`, `Report`, `History`
- `Command`, `Delegations`, `People`
- `My Shift`, `Standards`, `Help`, `Report`, `Log`

This is important: the problem is not missing concepts.
The problem is that the concepts are not yet expressed through one consistent interaction grammar.

### 4.2 What is preventing coherence now

The main gaps are visible in code:

- Page layout is still mostly `SectionCard` driven in [SectionCard.tsx](../../apps/web/src/components/SectionCard.tsx), which encourages repeated local page compositions rather than a shared shell grammar.
- The manager loop is split across different interaction models in [TodayBoard.tsx](../../apps/web/src/features/manager/TodayBoard.tsx), [PlanView.tsx](../../apps/web/src/features/views/PlanView.tsx), [ExecutionWorkspace.tsx](../../apps/web/src/features/manager/ExecutionWorkspace.tsx), [EvidenceHub.tsx](../../apps/web/src/features/manager/EvidenceHub.tsx), and [EscalationChannel.tsx](../../apps/web/src/features/manager/EscalationChannel.tsx).
- Owner and Pocket sub-navigation are still rendered as local button strips inside [App.tsx](../../apps/web/src/App.tsx) instead of feeling like one stable role-level system.
- Search is local and fragmented. Reference has its own search in [ReferenceView.tsx](../../apps/web/src/features/views/ReferenceView.tsx). Assessment has signal browse search in [AssessmentView.tsx](../../apps/web/src/features/views/AssessmentView.tsx). There is no true global command/search surface.
- Notification APIs exist in [api.ts](../../apps/web/src/lib/api.ts), but there is no coherent notification center surfaced in the shell.
- Empty, loading, and error states are inconsistent and often generic in page code and in [ErrorBoundary.tsx](../../apps/web/src/components/ErrorBoundary.tsx).
- Critical manager interactions still contain low-trust seams such as prompt-driven actions in [App.tsx](../../apps/web/src/App.tsx).
- Top-level shell behavior in [TopBar.tsx](../../apps/web/src/features/shell/TopBar.tsx) and [RoleWorkspaceFrame.tsx](../../apps/web/src/features/shell/RoleWorkspaceFrame.tsx) does not yet define a universal premium interaction contract.

### 4.3 Summary diagnosis

The current app has product breadth and working role separation.
It does not yet have a disciplined premium operating grammar.

That is why it can feel like "several strong pages plus weaker support pages" instead of one coherent system.

---

## 5. Target UX System

## 5.1 Desktop layout model

Desktop should be standardized around:

- stable left rail for role navigation and venue switching
- one `SurfaceHeader` for the current object
- one `PrimaryCanvas` for the dominant object
- one `ContextInspector` on the right for quiet support truth
- one `DeepDrawer` at the bottom for history, compare, trace, full threads, and dense evidence
- one global `CopilotDrawer`

The right inspector must clarify.
It must not become a second page.

The bottom drawer must deepen.
It must not become required just to understand the surface.

## 5.2 Mobile layout model

Mobile should be role-specific, not desktop-shrunk:

- Pocket is mobile-first and should be the clearest mobile experience in the product.
- Manager mobile is continuity-first, not analysis-first.
- Owner mobile is pressure-first, not dashboard-first.
- Support depth opens in sheets and drawers, never as stacked dense regions.

## 5.3 Shared chrome contract

Every major surface should use the same chrome rules:

- top-left: `Back` or `Back to ...` when user arrived from a deeper child state
- top-center: current object label and status posture
- top-right: one primary action, `More`, `Ask VOIS`, and optional `Jump to`
- secondary actions belong in `More`, not as permanent button clutter
- tooltips are allowed only where a label is non-obvious or a status needs disambiguation
- scroll should happen inside the canvas, inspector, and drawer independently, not across the whole page body

## 5.4 Micro-interaction rules

The details that make the app feel "fully thought through":

- `Back` returns to the parent object, not to an arbitrary previous hash
- `Back to Plan`, `Back to Today`, `Back to Report` should appear when the parent context is explicit
- `Jump to` should move within the current object, not across unrelated modules
- `Ask VOIS` should open Copilot already grounded to the current role, venue, and selected object
- `More` should hold secondary operations such as copy link, open history, compare, or export
- sticky action rows should exist only where work continuation matters
- status chips should explain themselves on hover
- empty states should always tell the user what the next meaningful move is
- loading states should be shaped like the surface they belong to, not generic centered text where avoidable
- error states should preserve orientation and offer recovery actions

---

## 6. Exact Transition Logic

The venue operating sequence should be made explicit and stable:

### 6.1 Overview -> Assessment

Use when:

- there is no saved assessment
- the operating picture is stale
- a new observation cycle is needed

Overview should answer:

- what is the current venue state
- what is the recommended next move

It should not absorb assessment detail.

### 6.2 Assessment -> Report

Assessment is the capture and review lane.

It must support:

- evidence capture
- AI intake
- signal confirmation
- save assessment
- run engine

After a successful engine run, the default next move is `Open report`.

Assessment should not pretend to be the report.

### 6.3 Report -> Plan

Report is the diagnosis lane.

It must answer:

- what is most likely breaking
- what changed relative to prior state
- what logic is recommended
- whether the result is trustworthy enough to act on

Report should not mutate execution state directly, except where a draft activation step is already legitimate.
The default next move is `Open linked plan`.

### 6.4 Plan -> Workspace

Plan is the sequencing lane.

It must answer:

- what is ready
- what is active
- what is blocked
- why

Workspace is the execution lane.

It must answer:

- how do I move this task honestly right now

Plan chooses the task.
Workspace executes the task.
Do not blur those jobs.

### 6.5 Workspace -> Evidence / Escalation

Evidence and Escalation are support lanes for execution truth.

- Evidence proves work.
- Escalation admits work cannot move honestly at the current level.

They should be reachable from Workspace without feeling like the user left the task.

### 6.6 History / Compare

History is not a dead archive.
It is a comparison and learning surface.

History should support:

- load snapshot
- compare current vs prior
- compare latest vs selected
- jump to linked report

Compare behavior should be shared across History and Report rather than invented twice.

---

## 7. Search And Command Behavior

Global search / command is required if VOIS is going to feel like one premium system.

### 7.1 Open behavior

- `Ctrl+K` or `Cmd+K`
- top-bar trigger
- persistent access on desktop
- compact access point on mobile where appropriate

### 7.2 Search scope

Search results should be grouped by object type:

- venues
- tasks
- reports
- assessments
- escalations
- help requests
- reference items
- settings destinations

### 7.3 Command scope

Commands should be scoped by role and current context:

- open current venue plan
- open task workspace
- raise escalation
- add evidence
- ask VOIS about this task
- search reference
- open latest report

### 7.4 Safety rules

Search and command must not:

- bypass permissions
- create alternate mutation paths
- surface destinations the current role should not act in
- destroy the one-home-per-primary-action rule

### 7.5 UX rule

Search should feel like an accelerator for known objects.
It should not feel like a second navigation system competing with the shell.

---

## 8. Notifications Behavior

Notifications should become an explicit shell behavior, not just latent API support.

### 8.1 Notification taxonomy

Only four classes should exist in the main UX:

- action required
- blocked / escalation
- review / approval
- informational

### 8.2 Shell behavior

Desktop:

- top-bar bell
- notification drawer or panel
- unread count
- item click opens the exact object and preserves context

Mobile:

- compact inbox surface
- action-first ordering

### 8.3 Notification design rules

Notifications must:

- point to one clear next move
- show object, reason, and age
- be dismissible or markable as seen

Notifications must not:

- become an activity feed
- duplicate history
- replace the real escalation lane

---

## 9. Support Surfaces That Must Reach Premium Parity

The hero pages alone are not enough.
The product will still feel unfinished if these remain weak.

### 9.1 Venue Overview

Needs to become a true orientation surface instead of a multi-card summary page.

Current anchor:

- [VenueOverviewView.tsx](../../apps/web/src/features/views/VenueOverviewView.tsx)

### 9.2 Assessment

Needs to become a disciplined operating loop with clearer staging and a better browse/review posture.

Current anchor:

- [AssessmentView.tsx](../../apps/web/src/features/views/AssessmentView.tsx)

### 9.3 Report

Needs to feel diagnostic, comparable, and trustworthy without reading like a giant output page.

Current anchor:

- [ReportView.tsx](../../apps/web/src/features/views/ReportView.tsx)

### 9.4 Escalations

Needs to feel like blocked-truth governance, not a generic issue list.

Current anchor:

- [EscalationChannel.tsx](../../apps/web/src/features/manager/EscalationChannel.tsx)

### 9.5 History / Compare

Needs a shared compare grammar and stronger recovery paths.

Current anchor:

- [HistoryView.tsx](../../apps/web/src/features/views/HistoryView.tsx)

### 9.6 Settings

Needs to feel premium and calm despite administrative density.

Current anchor:

- [SettingsView.tsx](../../apps/web/src/features/views/SettingsView.tsx)

### 9.7 Reference / Library

Needs to feel like a real library and inspector pattern, not a local search list and detail split only.

Current anchor:

- [ReferenceView.tsx](../../apps/web/src/features/views/ReferenceView.tsx)

### 9.8 Knowledge Base

Needs a clearer doctrine vs live posture distinction and a calmer information hierarchy.

Current anchor:

- [KnowledgeBaseView.tsx](../../apps/web/src/features/views/KnowledgeBaseView.tsx)

### 9.9 Empty / Loading / Error states

Need a shared product language.

Current anchors:

- [App.tsx](../../apps/web/src/App.tsx)
- [ErrorBoundary.tsx](../../apps/web/src/components/ErrorBoundary.tsx)
- [styles.css](../../apps/web/src/styles.css)

---

## 10. Implementation Phases

## Phase 0 - Lock The UX Execution Spec

Deliverables:

- this plan accepted as the working delivery brief
- one short addendum for acceptance criteria and audit scorecard

Goal:

- prevent redesign drift before code changes begin

## Phase 1 - Build Shared Shell Primitives

Create shared primitives before rewriting hero pages:

- `SurfaceHeader`
- `PrimaryCanvas`
- `ContextInspector`
- `DeepDrawer`
- `ActionBar`
- `EmptyState`
- `LoadingState`
- `ErrorState`
- `CompareDrawer`

Files likely touched:

- [SectionCard.tsx](../../apps/web/src/components/SectionCard.tsx)
- [RoleWorkspaceFrame.tsx](../../apps/web/src/features/shell/RoleWorkspaceFrame.tsx)
- [TopBar.tsx](../../apps/web/src/features/shell/TopBar.tsx)
- [styles.css](../../apps/web/src/styles.css)
- new component files under `apps/web/src/components` or `apps/web/src/features/shell`

Exit condition:

- page layout no longer depends on ad hoc `SectionCard` composition as the primary screen model

## Phase 2 - Rebuild The Manager Loop First

Priority order:

1. `Today`
2. `Plan`
3. `Workspace`
4. `Evidence`
5. `Escalations`

Files likely touched:

- [TodayBoard.tsx](../../apps/web/src/features/manager/TodayBoard.tsx)
- [PlanView.tsx](../../apps/web/src/features/views/PlanView.tsx)
- [ExecutionWorkspace.tsx](../../apps/web/src/features/manager/ExecutionWorkspace.tsx)
- [EvidenceHub.tsx](../../apps/web/src/features/manager/EvidenceHub.tsx)
- [EscalationChannel.tsx](../../apps/web/src/features/manager/EscalationChannel.tsx)
- manager route handling in [App.tsx](../../apps/web/src/App.tsx)

Exit condition:

- a manager can identify the next real move, open the right task, attach proof, and escalate blockage without browsing multiple unrelated surfaces

## Phase 3 - Rebuild The Venue Flow

Priority order:

1. `Venue Overview`
2. `Assessment`
3. `Report`
4. `History / Compare`

Files likely touched:

- [VenueOverviewView.tsx](../../apps/web/src/features/views/VenueOverviewView.tsx)
- [AssessmentView.tsx](../../apps/web/src/features/views/AssessmentView.tsx)
- [ReportView.tsx](../../apps/web/src/features/views/ReportView.tsx)
- [HistoryView.tsx](../../apps/web/src/features/views/HistoryView.tsx)
- comparison helpers under `features/views`
- venue routing and transition logic in [App.tsx](../../apps/web/src/App.tsx)

Exit condition:

- the venue sequence feels like one guided object journey rather than four separate pages

## Phase 4 - Rebuild Owner Oversight

Priority order:

1. `Command`
2. `Portfolio`
3. `Delegations`
4. `People`

Files likely touched:

- [CommandCenter.tsx](../../apps/web/src/features/owner/CommandCenter.tsx)
- [PortfolioView.tsx](../../apps/web/src/features/views/PortfolioView.tsx)
- owner feature files under `apps/web/src/features/owner`
- owner routing in [App.tsx](../../apps/web/src/App.tsx)

Exit condition:

- owners see pressure and intervention, not operational sprawl

## Phase 5 - Rebuild Pocket

Priority order:

1. `My Shift`
2. task drill-in
3. `Standards`
4. `Help`
5. `Report`
6. `Log`

Files likely touched:

- Pocket components under `apps/web/src/features/pocket`
- [types.ts](../../apps/web/src/features/shell/types.ts) if a true task detail route is introduced
- [navigation.ts](../../apps/web/src/features/shell/navigation.ts)
- pocket flow in [App.tsx](../../apps/web/src/App.tsx)

Exit condition:

- Pocket feels task-native, not like a mobile wrapper around admin concepts

## Phase 6 - System Behaviors And Support Surfaces

Build after the hero flows are coherent:

- command palette
- notifications center
- compare drawer
- premium empty/loading/error states
- settings / reference / knowledge base refinement

Files likely touched:

- [TopBar.tsx](../../apps/web/src/features/shell/TopBar.tsx)
- [App.tsx](../../apps/web/src/App.tsx)
- [ReferenceView.tsx](../../apps/web/src/features/views/ReferenceView.tsx)
- [KnowledgeBaseView.tsx](../../apps/web/src/features/views/KnowledgeBaseView.tsx)
- [SettingsView.tsx](../../apps/web/src/features/views/SettingsView.tsx)
- [ErrorBoundary.tsx](../../apps/web/src/components/ErrorBoundary.tsx)
- [api.ts](../../apps/web/src/lib/api.ts)
- [styles.css](../../apps/web/src/styles.css)

Exit condition:

- the "boring" pages stop breaking the premium feeling

---

## 11. File Ownership Map

### Core orchestration

- [App.tsx](../../apps/web/src/App.tsx)
  - central route orchestration
  - top-level transition logic
  - current owner / manager / pocket sub-navigation behavior
  - future host for command, notifications, inspector, and drawer state

### Shell system

- [types.ts](../../apps/web/src/features/shell/types.ts)
  - role homes and route contract
- [navigation.ts](../../apps/web/src/features/shell/navigation.ts)
  - hash routes and persistence
- [RoleWorkspaceFrame.tsx](../../apps/web/src/features/shell/RoleWorkspaceFrame.tsx)
  - role-level frame contract
- [TopBar.tsx](../../apps/web/src/features/shell/TopBar.tsx)
  - candidate home for command and notifications triggers
- [Sidebar.tsx](../../apps/web/src/features/shell/Sidebar.tsx)
  - stable navigation cleanup

### Shared visual / behavioral primitives

- [SectionCard.tsx](../../apps/web/src/components/SectionCard.tsx)
- [styles.css](../../apps/web/src/styles.css)
- [ErrorBoundary.tsx](../../apps/web/src/components/ErrorBoundary.tsx)

### Manager loop

- [TodayBoard.tsx](../../apps/web/src/features/manager/TodayBoard.tsx)
- [ExecutionWorkspace.tsx](../../apps/web/src/features/manager/ExecutionWorkspace.tsx)
- [EvidenceHub.tsx](../../apps/web/src/features/manager/EvidenceHub.tsx)
- [EscalationChannel.tsx](../../apps/web/src/features/manager/EscalationChannel.tsx)
- [TeamPulse.tsx](../../apps/web/src/features/manager/TeamPulse.tsx)
- [PlanView.tsx](../../apps/web/src/features/views/PlanView.tsx)

### Venue flow

- [VenueOverviewView.tsx](../../apps/web/src/features/views/VenueOverviewView.tsx)
- [AssessmentView.tsx](../../apps/web/src/features/views/AssessmentView.tsx)
- [ReportView.tsx](../../apps/web/src/features/views/ReportView.tsx)
- [HistoryView.tsx](../../apps/web/src/features/views/HistoryView.tsx)
- `historyInsights.ts`
- `reportInsights.ts`

### Owner flow

- [CommandCenter.tsx](../../apps/web/src/features/owner/CommandCenter.tsx)
- [PortfolioView.tsx](../../apps/web/src/features/views/PortfolioView.tsx)
- [DelegationConsole.tsx](../../apps/web/src/features/owner/DelegationConsole.tsx)
- [OwnerAdministrationView.tsx](../../apps/web/src/features/owner/OwnerAdministrationView.tsx)
- [PeopleIntelligence.tsx](../../apps/web/src/features/owner/PeopleIntelligence.tsx)

### Pocket flow

- [MyShift.tsx](../../apps/web/src/features/pocket/MyShift.tsx)
- [MyStandards.tsx](../../apps/web/src/features/pocket/MyStandards.tsx)
- [AskForHelp.tsx](../../apps/web/src/features/pocket/AskForHelp.tsx)
- [ReportSomething.tsx](../../apps/web/src/features/pocket/ReportSomething.tsx)
- [MyLog.tsx](../../apps/web/src/features/pocket/MyLog.tsx)

### Support surfaces

- [ReferenceView.tsx](../../apps/web/src/features/views/ReferenceView.tsx)
- [KnowledgeBaseView.tsx](../../apps/web/src/features/views/KnowledgeBaseView.tsx)
- [SettingsView.tsx](../../apps/web/src/features/views/SettingsView.tsx)
- [api.ts](../../apps/web/src/lib/api.ts)

---

## 12. Acceptance Criteria

The redesign should be judged against explicit pass / fail rules:

### Product-wide

- A user can tell where they are within 3 to 5 seconds.
- A user can tell what the page is for within 3 to 5 seconds.
- A user can identify one dominant next move without scanning unrelated panels.
- No primary action has two equally plausible homes.
- Blocked truth is easier to see than decorative activity.
- Status language remains truthful to backend semantics.

### Owner

- Top 1 to 3 intervention points are visible within 30 seconds.
- `Command` does not invite task-level wandering.

### Manager

- First real move is clear within 20 seconds.
- `Today`, `Plan`, `Workspace`, `Evidence`, and `Escalations` feel like one loop.

### Pocket

- A frontline user can begin correct action within 10 seconds.
- Task detail does not require interpreting managerial concepts.

### Support surfaces

- Search results are useful and role-correct.
- Notifications point to action, not activity.
- History and compare clarify change, not just chronology.
- Settings, Reference, and KB do not break the premium tone.

---

## 13. What This Phase Explicitly Does Not Do

This phase does not authorize:

- ontology redesign
- role model changes
- execution-truth rule changes
- permission model changes
- semantic lane collapse
- domain logic moving into shell code

If a UX proposal requires any of those, it must be escalated as architecture work first.

---

## 14. Recommended Immediate Build Order

If the team wants the fastest path to a real product lift, build in this order:

1. shared shell primitives
2. manager `Today`
3. manager `Plan`
4. manager `Workspace`
5. venue `Overview`
6. venue `Assessment`
7. venue `Report`
8. `Escalations`
9. owner `Command`
10. pocket task drill-in
11. command/search
12. notifications
13. history/compare convergence
14. settings / reference / KB / empty-loading-error polish

Reason:

If the manager loop is not exceptional, the product will still feel theoretical.
If the support surfaces remain weak, the product will still feel unfinished.

---

## 15. Final Product Standard

The app should not try to impress users by showing the full system.
It should earn trust by revealing the right layer at the right time.

The standard is:

one calm operational truth at a time,
with the rest of the system always one clear step away.
