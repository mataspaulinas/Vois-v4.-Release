# VOIS Premium UX — Developer Integration Pass

Status: **Active project directive**
Date: 2026-03-29
Scope: File-by-file implementation checklist
Priority: This pass determines whether the product feels like one premium system or a redesign halfway through integration.

---

## Governing Rule

**Do not invent more surfaces.**
Force the current hero flows and support flows to obey one shell grammar, one inspector grammar, one drawer grammar, and one transition law.

---

## Execution Order

Do these in this order. The manager loop determines whether the product feels real.

1. `TodayBoard.tsx`
2. `PlanView.tsx`
3. `ExecutionWorkspace.tsx`
4. `VenueOverviewView.tsx`
5. `AssessmentView.tsx`
6. `ReportView.tsx`
7. `CommandCenter.tsx`
8. `EvidenceHub.tsx`
9. `EscalationChannel.tsx`
10. Pocket screens
11. Shell integration files
12. Cleanup / release discipline

---

## File-by-File Checklist

### 1. `apps/web/src/App.tsx`

**Problem:** Still far too large (3,500+ lines) and carrying too much orchestration.

**Do:**
- [ ] Split more route-specific behavior into shell-level frame logic, page-level controllers, and shared transition helpers
- [ ] Move page transition decisions out of top-level glue where possible
- [ ] Add one clear transition helper layer for: Overview → Assessment → Report → Plan → Workspace → Evidence / Escalations

**Remove / reduce:**
- [ ] Page-specific state orchestration that can live closer to the page
- [ ] Duplicated route-to-view logic
- [ ] Anything that keeps page chrome behavior centralized here

**Success condition:** App.tsx stops feeling like the real product brain.

---

### 2. `apps/web/src/components/PageLayout.tsx`

**Problem:** Good start, but too passive.

**Do:**
- [ ] Make this the default page contract for: Venue Overview, Assessment, Report, Plan, Today, Workspace, Command

**Add:**
- [ ] Optional labeled back row support
- [ ] Optional transition suggestion slot
- [ ] Stable inspector region sizing rules
- [ ] Stable drawer mounting position
- [ ] Optional sticky summary strip region

**Success condition:** Pages stop assembling their own chrome and start inheriting one.

---

### 3. `apps/web/src/components/ContextInspector.tsx`

**Problem:** Exists, but still too generic and underused.

**Do:**
- [ ] Adopt it on all hero screens

**Change:**
- [ ] Replace "x" close button with proper icon/button text treatment
- [ ] Support sectioned content blocks
- [ ] Support action footer pattern
- [ ] Support compact mode on medium widths

**Add:**
- [ ] Optional "Ask Copilot about this"
- [ ] Optional "Copy link"
- [ ] Optional "Open deeper"

**Use on:**
- [ ] PlanView.tsx
- [ ] ExecutionWorkspace.tsx
- [ ] VenueOverviewView.tsx
- [ ] AssessmentView.tsx
- [ ] ReportView.tsx
- [ ] CommandCenter.tsx

**Success condition:** Inspector becomes a real system behavior, not a spare component.

---

### 4. `apps/web/src/components/DeepDrawer.tsx`

**Problem:** Exists, but still too generic and underused.

**Do:**
- [ ] Use it consistently for: compare, history, evidence gallery, audit trail, comments thread, dependency chain

**Change:**
- [ ] Replace "x" close button with proper icon/button treatment
- [ ] Support tabbed drawer header
- [ ] Support 3 height presets
- [ ] Support remembered open/closed state per page

**Do NOT use for:**
- Main actions
- Primary reading surface
- Core execution controls

**Success condition:** Drawer becomes the home of deep support, everywhere.

---

### 5. `apps/web/src/components/TransitionSuggestion.tsx`

**Problem:** Right idea, but current implementation is too raw and probably too intrusive if dropped in as-is.

**Do:**
- [ ] Use it only for quiet contextual nudges

**Change:**
- [ ] Downgrade visual intensity
- [ ] Make action secondary-looking unless truly important
- [ ] Let pages decide when it appears
- [ ] Support non-auto-hide mode for some contexts

**Use on:**
- [ ] TodayBoard.tsx — when user stalls
- [ ] ReportView.tsx — to push toward Plan / Escalations
- [ ] VenueOverviewView.tsx — to suggest Report vs Plan vs Assessment
- [ ] AssessmentView.tsx — to push Run engine after reviewed signals

**Success condition:** It feels like guidance, not product nagging.

---

### 6. `apps/web/src/components/ErrorState.tsx`

**Problem:** Useful, but currently too plain.

**Do:**
- [ ] Adopt it everywhere instead of bespoke error fragments

**Add:**
- [ ] Object-specific titles
- [ ] One calm explanation
- [ ] One retry path
- [ ] One back path
- [ ] Optional "Copy error ref" only if useful

**Use on:** All major views with async data.

**Success condition:** Errors feel contained and dignified.

---

### 7. `apps/web/src/features/manager/TodayBoard.tsx`

**Problem:** One of the stronger changes, but still needs to become more opinionated.

**Do:**
- [ ] Restructure the page to always prioritize: summary strip → next executable work → tasks you can move now → waiting on dependencies

**Add:**
- [ ] Jump to Plan on each hero task row
- [ ] Small More menu per task row
- [ ] Quiet TransitionSuggestion when user stalls
- [ ] Explicit blocked reason language
- [ ] Task row "why surfaced now" clarity

**Move out of main canvas (into drawer):**
- [ ] Residue compare
- [ ] Yesterday vs today
- [ ] Blocked pattern

**Add inspector:**
- [ ] Why this surfaced
- [ ] What it unlocks
- [ ] Readiness confidence
- [ ] Proof expectation
- [ ] Owner dependency
- [ ] Quick jumps

**Remove / reduce:**
- [ ] Anything that makes Today feel like a generic task board
- [ ] Any secondary feeds on first view

**Success condition:** Manager can pick first real move in seconds.

---

### 8. `apps/web/src/features/views/PlanView.tsx`

**Problem:** Improved, but still too metadata-heavy.

**Do:**
- [ ] Use PageLayout
- [ ] Default body structure: Ready / Active / Blocked

**Card face should only show:**
- [ ] Title, owner, short rationale, due rhythm, state, dependency marker

**Move to inspector:**
- [ ] Full rationale
- [ ] Dependency chain
- [ ] Linked block/tool
- [ ] Evidence expectation
- [ ] Review state
- [ ] Owner dependency status

**Move to drawer:**
- [ ] Version diff
- [ ] Task history
- [ ] Dependency graph/chain
- [ ] Comments thread if long

**Add:**
- [ ] "Jump to owner-dependent tasks"
- [ ] Better blocked task seriousness
- [ ] True "Open Workspace" first-class action
- [ ] Compare hook into drawer

**Remove / reduce:**
- [ ] Visual clutter in expanded task area
- [ ] Comments becoming the real system
- [ ] Too much visible task metadata

**Success condition:** Plan feels believable, not comprehensive.

---

### 9. `apps/web/src/features/manager/ExecutionWorkspace.tsx`

**Problem:** Better structured, but still not immersive enough.

**Do:**
- [ ] Make this feel like the concentration chamber

**Main canvas order:**
- [ ] Task identity, rationale, status, sub-actions, deliverables, comments/notes

**Add:**
- [ ] Explicit Back to Today
- [ ] Explicit Back to Plan
- [ ] Inline completion guard: "2 deliverables still open"
- [ ] Stronger evidence trigger
- [ ] Stronger escalation trigger

**Move to inspector:**
- [ ] Dependencies, linked tools/blocks, owner context, recent evidence summary, history snippet, report excerpt if relevant

**Move to drawer:**
- [ ] Full evidence, audit trail, comments thread, previous-state compare

**Remove / reduce:**
- [ ] Any venue-level clutter inside workspace
- [ ] Any shell noise that weakens focus
- [ ] Overexposed support panels in the main body

**Success condition:** User feels protected from the rest of the app while doing one task.

---

### 10. `apps/web/src/features/views/VenueOverviewView.tsx`

**Problem:** Cleaner, but still not enough of a true hub.

**Do:**
- [ ] Turn it into a real routing surface

**Central logic:**
- [ ] Current health → recommended next move → recent progress → pressure summary

**Add:**
- [ ] Strong recommended-next-move block
- [ ] Explicit route buttons: Open Assessment, Open Report, Open Plan, Open Escalations
- [ ] Better distinction between: stale truth, sequence problem, blocked truth

**Move to inspector:**
- [ ] Current venue context, what is shaping the venue now, why recommended route is what it is

**Move to drawer:**
- [ ] History, compare, trace

**Remove / reduce:**
- [ ] Any detail that belongs to Assessment or Report
- [ ] Any over-detailed activity feed on first view

**Success condition:** Venue Overview becomes the calm home base, not a nicer summary page.

---

### 11. `apps/web/src/features/views/AssessmentView.tsx`

**Problem:** Direction is right, but the page needs sharper job definition.

**Do:**
- [ ] Separate clearly into: raw intake → extracted signals → signal corrections → save/run actions

**Add:**
- [ ] Explicit reviewed-signal state
- [ ] Stronger Run engine action prominence after review
- [ ] TransitionSuggestion after corrections: "Signals reviewed. Run engine?"

**Add inspector:**
- [ ] Assessment context, current confidence, what changed from last cycle, best next route after save

**Add drawer:**
- [ ] Previous cycle compare, signal notes, engine preview

**Remove / reduce:**
- [ ] Any fuzzy mixing of intake and review
- [ ] Fragmented local search feel
- [ ] Any sense that this is just another generic form page

**Success condition:** Assessment feels like structured truth capture, not admin input.

---

### 12. `apps/web/src/features/views/ReportView.tsx`

**Problem:** Cleaner, but risks becoming a reading surface instead of a consequence surface.

**Do:**
- [ ] Make every report push action

**Add:**
- [ ] Primary consequence actions: Open Plan, Open Escalations, Open owner-dependent tasks, Compare previous cycle

**Add inspector:**
- [ ] Managerial implication, owner implication, best next route, report confidence/pressure summary

**Add drawer:**
- [ ] Compare previous, raw trace, citations/support detail

**Remove / reduce:**
- [ ] Passive narrative without next-step pressure
- [ ] Export emphasis over operating consequence

**Success condition:** Report changes behavior, not just understanding.

---

### 13. `apps/web/src/features/owner/CommandCenter.tsx`

**Problem:** Improved frame, but not strict enough as a true Command surface.

**Do:**
- [ ] First fold should be only: pressure strip, top attention list, delegation weakness, people risk

**Add:**
- [ ] Jump to last escalation
- [ ] View last change
- [ ] Explicit blocked reason language: "Blocked by decision", "Blocked by budget", "Blocked by unresolved ownership"

**Add inspector:**
- [ ] Selected venue pressure context, why surfaced now, recommended next route

**Add drawer:**
- [ ] Trend, escalation thread, compare

**Remove / reduce:**
- [ ] Anything that invites the owner to browse operations instead of intervene strategically

**Success condition:** Owner identifies the top intervention in under 30 seconds.

---

### 14. `apps/web/src/features/manager/EvidenceHub.tsx`

**Problem:** Better than before, but at risk of becoming storage instead of trust.

**Do:**
- [ ] Differentiate proof states visually: uploaded, awaiting verification, verified, weak proof

**Add:**
- [ ] Proof weight / trust relevance
- [ ] Linked task consequence
- [ ] Fast verification action
- [ ] Jump back to task / workspace

**Add inspector:**
- [ ] Why this proof matters, what claim it supports, whether it is enough

**Remove / reduce:**
- [ ] Undifferentiated evidence list behavior

**Success condition:** Evidence feels like trust support, not file attachment.

---

### 15. `apps/web/src/features/manager/EscalationChannel.tsx`

**Problem:** Improved, but too close to issue-list behavior.

**Do:**
- [ ] Make escalation type shape the row strongly: owner decision, structural clarity, resource gap, quality concern, team concern

**Add:**
- [ ] Stronger open vs resolved semantics
- [ ] Consequence field in visible row
- [ ] Jump back to blocked task / plan
- [ ] Copy escalation link

**Add inspector:**
- [ ] Why escalation exists, what made local management insufficient, what route should follow resolution

**Move to drawer:**
- [ ] Thread, history, compare

**Remove / reduce:**
- [ ] Generic issue list tone

**Success condition:** Escalations feel like blocked-truth handling, not tickets.

---

### 16. `apps/web/src/features/manager/TeamPulse.tsx`

**Problem:** Potentially useful, but likely still too chronology-led.

**Do:**
- [ ] Refocus around: recent progress, follow-up burden, escalation pattern, human strain

**Add:**
- [ ] Pattern summary at top
- [ ] Clearer grouping
- [ ] Jump to offending area: Plan, Escalations, Evidence, Task

**Move heavy chronology to drawer:**
- [ ] Follow-up history, escalation history

**Success condition:** Page reveals pattern, not just timeline.

---

### 17. `apps/web/src/features/pocket/MyShift.tsx`

**Problem:** Improved framing, but Pocket still needs more attention.

**Do:**
- [ ] Make brutally simple: current tasks, one priority note, maybe one readiness summary, nothing else competing

**Add:**
- [ ] Stronger direct task entry
- [ ] Very fast standards/help/report paths
- [ ] Cleaner empty state

**Remove / reduce:**
- [ ] Extra explanation, manager-like language, anything admin-heavy

**Success condition:** User knows what to do in seconds.

---

### 18. `apps/web/src/features/pocket/MyStandards.tsx`

**Do:**
- [ ] Make standards scannable and action-oriented

**Add:**
- [ ] "What good looks like"
- [ ] "What to do if missing / wrong"
- [ ] "Back to current task"

**Remove / reduce:**
- [ ] Long descriptive prose, anything that reads like documentation

**Success condition:** User gets correct procedure fast.

---

### 19. `apps/web/src/features/pocket/AskForHelp.tsx`

**Do:**
- [ ] Keep help task-contextual

**Add:**
- [ ] Current task context at top
- [ ] Back to task
- [ ] Open Standards
- [ ] Clearer distinction from Report Something

**Remove / reduce:**
- [ ] Generic assistant feel, loose conversation without task grounding

**Success condition:** Help feels easier than guessing.

---

### 20. `apps/web/src/features/pocket/ReportSomething.tsx`

**Do:**
- [ ] Make the issue path cleaner and more structured

**Add:**
- [ ] Issue category first
- [ ] One-sentence explanation of why reporting matters
- [ ] Back to shift, Back to task
- [ ] Clear separation from Help

**Remove / reduce:**
- [ ] Plain generic wording, form feel without consequence feel

**Success condition:** Reporting feels serious but easy.

---

### 21. `apps/web/src/features/pocket/MyLog.tsx`

**Do:**
- [ ] Keep logs short and meaningful

**Add:**
- [ ] Examples of good short logs
- [ ] Clearer distinction from reports
- [ ] Maybe one-line helper: "Useful trace, not full story"

**Remove / reduce:**
- [ ] Open-ended note culture, anything encouraging essays

**Success condition:** Logs remain lightweight shift memory.

---

### 22. `apps/web/src/features/views/SettingsView.tsx`

**Do:**
- [ ] Organize around: profile/auth, appearance/behavior, organization controls

**Add:**
- [ ] Instant reversibility
- [ ] Restore defaults
- [ ] Replay onboarding
- [ ] Clearer proactive behavior explanation

**Remove / reduce:**
- [ ] Cluttered admin feel, too much equal-weight setting exposure

**Success condition:** Settings feel quiet and reversible.

---

### 23. `apps/web/src/features/views/ReferenceView.tsx`

**Do:**
- [ ] Make reference feel support-first

**Add:**
- [ ] Stronger contextual entry
- [ ] Search-first behavior
- [ ] Jump back to source object
- [ ] Compact object summaries

**Remove / reduce:**
- [ ] Browse-for-browse's-sake feel

**Success condition:** Reference helps, but never competes with the operating loop.

---

### 24. `apps/web/src/features/views/KnowledgeBaseView.tsx`

**Do:**
- [ ] Add stronger contextual return paths: Back to Today, Back to task, Back to Report

**Add:**
- [ ] Recent help
- [ ] Pinned guides
- [ ] Search-first behavior

**Remove / reduce:**
- [ ] Long-hierarchy browsing emphasis

**Success condition:** KB reduces uncertainty without stealing focus.

---

### 25. `apps/web/src/features/shell/RoleWorkspaceFrame.tsx`

**Do:**
- [ ] Make this the actual behavioral shell for role pages

**Add:**
- [ ] Stable page slot contract
- [ ] Optional inspector region
- [ ] Optional drawer region
- [ ] Persistent page-level action row behavior
- [ ] Stronger role home/back semantics

**Success condition:** Role shell becomes unmistakable.

---

### 26. `apps/web/src/features/shell/TopBar.tsx`

**Do:**
- [ ] Keep top bar focused on: page orientation, venue, search, copilot, notifications, theme/profile

**Add:**
- [ ] Page title/subtitle consistency if missing
- [ ] Better search/command entry prominence
- [ ] Cleaner top action hierarchy

**Remove / reduce:**
- [ ] Unnecessary topbar health noise if it competes with page orientation

**Success condition:** Top bar feels quiet and premium.

---

### 27. `apps/web/src/features/shell/Sidebar.tsx`

**Do:**
- [ ] Reduce the feeling that the sidebar is "the product"

**Add:**
- [ ] Clearer grouping by role home / venue / support
- [ ] Less visual weight on secondary/support routes
- [ ] Stable selection rules

**Remove / reduce:**
- [ ] Overexposure of too many routes at once
- [ ] Equal visual treatment of primary and secondary destinations

**Success condition:** Sidebar gives access, not content.

---

### 28. `apps/web/src/styles.css`

**Problem:** This is where the whole shell grammar either wins or loses.

**Do:**
- [ ] Audit for: inspector styles, drawer styles, page layout spacing, mobile sticky action rows, status differentiation, scrollbar visibility, quiet tooltip styling, "More" menu consistency, back/jump link hierarchy

**Add stable visual rules for:**
- [ ] Primary canvas
- [ ] Support regions
- [ ] Deep support surfaces
- [ ] Empty/loading/error states
- [ ] Mobile sheets

**Remove / reduce:**
- [ ] Legacy styles that keep old page behavior alive
- [ ] Inconsistent visual weights

**Success condition:** The visual system enforces the new doctrine instead of tolerating both old and new.

---

## Release Discipline Checklist

### Repo / package
- [ ] Remove junk artifacts
- [ ] Remove accidental files
- [ ] Clean working tree before review package
- [ ] Ensure reproducible install / build / test

### Verify
- [ ] TypeScript clean (`npx tsc --noEmit`)
- [ ] App build green (`npm run build`)
- [ ] Critical route smoke test
- [ ] Major page loading / empty / error states
- [ ] Mobile shell sanity check

---

## Acceptance Test

Every screen must pass this audit (from the UX scorecard):

1. Can I tell where I am immediately?
2. Can I tell what this page is for immediately?
3. Can I tell what the next meaningful move is immediately?
4. Can I trust the statuses shown here?
5. Can I act without browsing elsewhere first?
6. Does this screen reduce or increase cognitive load?
7. Is there one dominant visual surface?
8. Is secondary detail present but quiet?
9. Would a tired user still understand this?
10. Would a first-week user still understand this?
11. Does this page protect the user's role altitude?
12. Would this screen still feel good after repeated daily use?
13. Does this feel like management leverage rather than admin burden?

**If more than 3 of those are "no" for any screen, the screen is failing and must be reworked.**

---

## Final Standard

The app should not try to impress users by showing the full system.
It should earn trust by revealing the right layer at the right time.

One calm operational truth at a time,
with the rest of the system always one clear step away.
