# VOIS — Master App Tree & Design Selection Checklist (Corrected)

Purpose: one full-tree map of the app so each area can be reviewed in isolation and turned into design decisions, one by one.

**Spine decision:** Canvas (Stripe/Apple calm) with Cmd+K command palette import.
**Exception:** Pocket shell gets its own mobile-native skin sharing the same tokens.

How to use:
- Each top-level page or surface = one design decision unit
- Mark each item: Keep | Redesign visual | Redesign interaction | Needs review | Finalized
- Layout template per page: **Standard** (sidebar+canvas+inspector) | **Focused** (sidebar+full canvas) | **Pocket** (no sidebar, bottom tabs)

---

## 0. Global Product Layer

- [ ] **Global shell doctrine**
  - [ ] Left sidebar (240px, subtle, collapsible)
  - [ ] Top bar (orientation + global actions)
  - [ ] Cmd+K command palette (NEW — does not exist yet)
  - [ ] Notification bell + activity feed
  - [ ] Ask Copilot entry (top bar + contextual in inspector)
  - [ ] Theme / skin / profile / settings access
  - [ ] Role workspace frame (role-switching chrome)
  - [ ] Mobile tab strip behavior
  - [ ] Welcome overlay / resume flow
- [ ] **Global layout grammar**
  - [ ] Primary canvas (single scroll region)
  - [ ] Right inspector (contextual, never a second page)
  - [ ] Bottom drawer (deep support: history/compare/evidence/audit)
  - [ ] Back / "Back to …" logic (explicit labels)
  - [ ] "Jump to …" logic (lightweight links)
  - [ ] "More" menu logic (one per header, consistent placement)
  - [ ] Tooltip logic (status disambiguation only, never essential info)
  - [ ] Scroll / overflow behavior (no nested scroll traps)
- [ ] **Global system states**
  - [ ] Empty states (illustration + CTA)
  - [ ] Loading states (skeleton/spinner)
  - [ ] Error states (message + recovery action)
  - [ ] Error boundary (graceful failure)
- [ ] **Cross-device rules**
  - [ ] Desktop (sidebar + canvas + inspector)
  - [ ] Mobile (collapsed sidebar, bottom tabs, touch targets ≥44px)
  - [ ] Tablet / narrow desktop (sidebar collapses, single column)
- [ ] **Tours & onboarding**
  - [ ] Tour overlay system (TourOverlay, tourDefinitions, useTour)
  - [ ] Role-specific onboarding flows
  - [ ] Welcome overlay with resume capability

---

## 1. Shared Operational Spine

### 1.1 Portfolio
Layout: **Standard**
- [ ] Portfolio home (PortfolioView.tsx)
  - [ ] Venue list / grid / compare model
  - [ ] Cross-venue pressure display (venue pulses)
  - [ ] Attention filtering (all/critical/high/medium/low)
  - [ ] Sorting
  - [ ] Create venue entry
  - [ ] Drill-down into one venue
  - [ ] Inspector behavior
  - [ ] Drawer behavior

### 1.2 Venue Overview
Layout: **Standard**
- [ ] Venue Overview (VenueOverviewView.tsx)
  - [ ] Health state
  - [ ] Current pressure
  - [ ] Recommended next move
  - [ ] Recent activity
  - [ ] Quick route actions (assessment, plan, signals)
  - [ ] Inspector behavior
  - [ ] Drawer behavior

### 1.3 Assessment
Layout: **Focused** (writing-heavy)
- [ ] Assessment page (AssessmentView.tsx)
  - [ ] Raw evidence intake (rich text)
  - [ ] AI intake preview (signal suggestions)
  - [ ] Signal accept/reject/manual add
  - [ ] Management hours calibration
  - [ ] Save assessment
  - [ ] Run engine (generates report + draft plan)
  - [ ] Quick-load sample templates
  - [ ] Inspector behavior
  - [ ] Drawer behavior (assessment history)

### 1.4 Signals Review
Layout: **Standard**
- [ ] Signals Review (SignalsReviewView.tsx) — **separate from Assessment**
  - [ ] Signal heatmap grid (SignalHeatmapGrid.tsx)
  - [ ] Signal trend analysis (SignalTrend.tsx)
  - [ ] Signal intelligence map (SignalIntelligenceMap.tsx)
  - [ ] Impact analysis
  - [ ] Downstream impact visualization
  - [ ] Inspector behavior
  - [ ] Drawer behavior

### 1.5 Report
Layout: **Focused** (reading-heavy)
- [ ] Report page (ReportView.tsx)
  - [ ] Narrative diagnosis
  - [ ] Diagnostic spine
  - [ ] Expected vs actual
  - [ ] Consequence actions (immediately after findings, not buried)
  - [ ] Compare previous cycle
  - [ ] Inspector behavior
  - [ ] Drawer behavior

### 1.6 Plan
Layout: **Standard**
- [ ] Plan page (PlanView.tsx)
  - [ ] Ready / Active / Blocked lanes (or grouped list)
  - [ ] Task card face (title/owner/rationale/state/dependency marker)
  - [ ] Task selection model
  - [ ] Filters
  - [ ] Plan activation workflow (draft → active)
  - [ ] Completed section (collapsed)
  - [ ] Inspector behavior (full rationale + chain + proof expectation)
  - [ ] Drawer behavior (compare + history + dependency trail)

### 1.7 History / Compare
Layout: **Standard**
- [ ] History page (HistoryView.tsx)
  - [ ] Assessment history
  - [ ] Report history
  - [ ] Engine / run history
  - [ ] Compare current vs prior
  - [ ] Compare selected states
  - [ ] Jump back into active object

### 1.8 Console
Layout: **Standard**
- [ ] Console page (ConsoleView.tsx) — **developer/admin facing, review if it stays**
  - [ ] Integration connector health
  - [ ] Integration event logs / retry
  - [ ] Audit entries
  - [ ] Session inventory
  - [ ] Ontology binding status
  - [ ] Security posture review
  - [ ] Organization export/backup

---

## 2. Owner Shell

### 2.1 Command Center
Layout: **Standard** — Role home for Owner
- [ ] Command Center (CommandCenter.tsx)
  - [ ] Attention items by severity (critical/high/medium/low)
  - [ ] Venue health pulses
  - [ ] Delegation weakness signals
  - [ ] People risk signals
  - [ ] First-fold discipline (summary → top item → act)
  - [ ] Inspector behavior
  - [ ] Drawer behavior

### 2.2 Delegation Console
Layout: **Standard**
- [ ] Delegations (DelegationConsole.tsx)
  - [ ] Active delegations
  - [ ] Overdue delegations
  - [ ] Completed delegations
  - [ ] Follow-through weakness
  - [ ] Inspector behavior
  - [ ] Drawer behavior

### 2.3 People Intelligence
Layout: **Standard**
- [ ] People page (PeopleIntelligence.tsx)
  - [ ] Overload map
  - [ ] Flight risk signals
  - [ ] Human bottlenecks
  - [ ] Team health visibility
  - [ ] Inspector behavior
  - [ ] Drawer behavior

### 2.4 Owner Administration
Layout: **Standard**
- [ ] Admin page (OwnerAdministrationView.tsx) — **missing from original checklist**
  - [ ] Organization settings
  - [ ] Member provisioning / role assignment
  - [ ] Venue management
  - [ ] Ontology binding management

### 2.5 Owner Setup / Onboarding
Layout: **Focused**
- [ ] Setup flow (OwnerSetupView.tsx) — **missing from original checklist**
  - [ ] Claim organization
  - [ ] Create first venue
  - [ ] Bind ontology pack
  - [ ] Provision team members

### 2.6 Owner Copilot
Layout: **Standard** (drawer/panel)
- [ ] Owner Copilot (OwnerCopilot.tsx) — **missing from original checklist**
  - [ ] Organization-scoped AI guidance
  - [ ] Thread management

### 2.7 Owner mobile
- [ ] Owner mobile shell
  - [ ] Compact Command
  - [ ] Compact Portfolio
  - [ ] Escalation response behavior
  - [ ] "Open deeper" logic

---

## 3. Manager Shell

### 3.1 Today
Layout: **Standard** — Role home for Manager
- [ ] Today page (TodayBoard.tsx)
  - [ ] Summary strip (what's happened, what needs you)
  - [ ] Next executable work
  - [ ] Tasks you can move now
  - [ ] Blocked items with blocked reason visible
  - [ ] Overdue / escalation detection
  - [ ] More menus per task row
  - [ ] Jump to Plan links
  - [ ] Inspector behavior ("why surfaced" + "proof")
  - [ ] Drawer behavior (residue/compare)

### 3.2 Execution Workspace
Layout: **Standard**
- [ ] Workspace page (ExecutionWorkspace.tsx)
  - [ ] Task identity + rationale
  - [ ] Status management
  - [ ] Sub-actions / deliverables
  - [ ] Comments / notes
  - [ ] Evidence trigger
  - [ ] Escalation trigger
  - [ ] Completion guard (required deliverables)
  - [ ] Back to Today / Plan
  - [ ] Inspector behavior (dependencies + recent evidence)
  - [ ] Drawer behavior (evidence/audit/comments)

### 3.3 Evidence Hub
Layout: **Standard**
- [ ] Evidence Hub (EvidenceHub.tsx)
  - [ ] Evidence list
  - [ ] Evidence types
  - [ ] Verification states
  - [ ] Proof quality / trust weight
  - [ ] Jump back to task / workspace
  - [ ] Inspector behavior
  - [ ] Drawer behavior

### 3.4 Escalation Channel
Layout: **Standard**
- [ ] Escalation Channel (EscalationChannel.tsx)
  - [ ] Escalation list
  - [ ] Type grouping
  - [ ] Open vs resolved logic
  - [ ] Consequence language
  - [ ] Resolution workflow
  - [ ] Jump back to plan / blocked task
  - [ ] Inspector behavior
  - [ ] Drawer behavior

### 3.5 Team Pulse
Layout: **Standard**
- [ ] Team Pulse (TeamPulse.tsx)
  - [ ] Member profiles
  - [ ] Workload / progress
  - [ ] Follow-ups
  - [ ] Escalations
  - [ ] Pattern summary
  - [ ] Human strain visibility
  - [ ] Inspector behavior
  - [ ] Drawer behavior

### 3.6 Manager Copilot
Layout: **Standard** (drawer/panel)
- [ ] Manager Copilot (ManagerCopilot.tsx) — **missing from original checklist**
  - [ ] Venue-scoped AI guidance
  - [ ] Assessment context pre-grounding
  - [ ] Thread management

### 3.7 Manager mobile
- [ ] Manager mobile shell
  - [ ] Today
  - [ ] Plan
  - [ ] Task / workspace lite
  - [ ] Team
  - [ ] Escalations

---

## 4. Pocket / Frontline Shell

**Layout: Pocket** (no sidebar, bottom tabs, card-native, mobile-first)

### 4.1 My Shift
Role home for Barista
- [ ] My Shift (MyShift.tsx)
  - [ ] Current task assignments
  - [ ] Priority note
  - [ ] Shift readiness check (ShiftReadinessCheck.tsx — daily gate, shows once)
  - [ ] Open task quickly
  - [ ] Empty state behavior
  - [ ] Task detail inline (NOT a separate page — happens via expansion/sheet)

### 4.2 Standards
- [ ] Standards (MyStandards.tsx)
  - [ ] How we do this here
  - [ ] What good looks like
  - [ ] What to do if something is wrong / missing
  - [ ] Back to task / shift

### 4.3 Ask for Help
- [ ] Help (AskForHelp.tsx)
  - [ ] Task-contextual help request
  - [ ] Distinction from reporting
  - [ ] Return to task
  - [ ] Standards jump

### 4.4 Report Something
- [ ] Report (ReportSomething.tsx)
  - [ ] Issue categories
  - [ ] Why reporting matters
  - [ ] Back to task / shift
  - [ ] Separation from Help

### 4.5 My Log
- [ ] Log (MyLog.tsx)
  - [ ] Short meaningful entries
  - [ ] Difference from Report
  - [ ] Good-entry examples
  - [ ] Shift continuity value

---

## 5. Cross-Cutting Systems

### 5.1 Copilot System
- [ ] Copilot drawer (CopilotDrawer.tsx) — **missing from original checklist entirely**
  - [ ] Multi-thread conversation management
  - [ ] File attachment support
  - [ ] Context-aware (assessment/venue/organization scope)
  - [ ] Signal suggestion + approval workflow
  - [ ] Role-scoped state (RoleCopilotState.tsx)
  - [ ] Integration into command palette as "Ask:" mode

### 5.2 Search / Command
- [ ] Global search — **currently basic, command palette is NEW**
  - [ ] Venue results
  - [ ] Task results
  - [ ] Report / assessment results
  - [ ] Escalation results
  - [ ] Reference results
  - [ ] Settings destinations
- [ ] Command palette behavior (NEW)
  - [ ] Current venue actions
  - [ ] Role-aware commands
  - [ ] Recent searches
  - [ ] "Ask Copilot about current selection" mode
  - [ ] Keyboard shortcuts (↑↓ navigate, Enter open, Esc close)

### 5.3 Notifications
- [ ] Notification system (NotificationBell.tsx, ActivityFeed.tsx)
  - [ ] Action required
  - [ ] Blocked / escalation
  - [ ] Review / approval
  - [ ] Informational
  - [ ] Grouping logic
  - [ ] Role-specific routing
  - [ ] Click-through behavior

### 5.4 Inspector / Drawer grammar
- [ ] Inspector rules across the whole app
- [ ] Drawer rules across the whole app
- [ ] Compare behavior consistency
- [ ] History behavior consistency
- [ ] "Ask Copilot about this" slot in inspector

---

## 6. Support Surfaces

### 6.1 Settings
Layout: **Standard**
- [ ] Settings (SettingsView.tsx)
  - [ ] Theme / skin customization
  - [ ] Sidebar preferences
  - [ ] Session management
  - [ ] Security posture review
  - [ ] Organization backup/export
  - [ ] Ontology binding review
  - [ ] Replay onboarding

### 6.2 Reference / Library
Layout: **Standard**
- [ ] Reference (ReferenceView.tsx)
  - [ ] Signals reference
  - [ ] Blocks reference (ontology intervention blocks)
  - [ ] Tools reference (operating tools)
  - [ ] Full-text search
  - [ ] Related items cross-linking
  - [ ] Jump back to source object

### 6.3 Knowledge Base
Layout: **Focused** (reading-heavy)
- [ ] Knowledge Base (KnowledgeBaseView.tsx)
  - [ ] Product help articles
  - [ ] Glossary (Glossary.tsx)
  - [ ] Reading engine (ReadingEngine.tsx)
  - [ ] Integration knowledge
  - [ ] Context-aware help suggestions
  - [ ] Search-first behavior
  - [ ] Back to current object

### 6.4 Help layer
- [ ] Context help system (ContextHelp.tsx, WorkflowGuide.tsx) — **missing from original**
  - [ ] Per-page contextual help
  - [ ] Workflow guidance
  - [ ] Help registry (helpRegistry.ts)
  - [ ] Workflow definitions (workflowDefinitions.ts)

---

## 7. Design Decision Per Page

For every page above, answer:

1. Which layout template? (Standard / Focused / Pocket)
2. What's on the canvas? (list rows, cards, text blocks, or mixed)
3. What's in the inspector? (detail of selected item)
4. What's in the drawer? (history, compare, evidence, audit)
5. What's the primary action? (one button in header)
6. What's the density level? (sparse / medium / dense)
7. How does it translate to mobile?
8. What are the empty/loading/error states?

---

## 8. Prioritized Execution Order

| Priority | Page | Why first |
|----------|------|-----------|
| 1 | Manager Today | Highest traffic, sets the tone |
| 2 | Manager Plan | Core operational screen |
| 3 | Manager Workspace | Execution happens here |
| 4 | Owner Command | Leadership entry point |
| 5 | Pocket My Shift + Task | Frontline adoption make-or-break |
| 6 | Venue Overview | Orientation screen |
| 7 | Assessment | Content-heavy, different layout |
| 8 | Report | Reading-heavy, different layout |
| 9 | Portfolio | Multi-venue overview |
| 10 | Escalation Channel | Operational urgency |
| 11 | Evidence Hub | Proof workflow |
| 12 | Search / Command Palette | Power-user accelerator |
| 13 | Notifications | Activity awareness |
| 14 | Team Pulse | People visibility |
| 15 | Pocket Standards/Help/Report/Log | Support surfaces |
| 16 | Copilot | AI assistant skin |
| 17 | Settings | Low traffic |
| 18 | Reference | Library browsing |
| 19 | Knowledge Base | Help content |
| 20 | History / Compare | Deep analysis |
| 21 | Console | Developer-only, maybe remove |
