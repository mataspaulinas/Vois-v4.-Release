# Northside Collective — Showcase Walkthrough

Start the system:

```
# Terminal 1
cd "VOIS v4.release/apps/api"
python -m uvicorn app.main:app --reload --port 8000

# Terminal 2
cd "VOIS v4.release/apps/web"
npm run dev
```

Open http://localhost:5173 in your browser.

---

## Act 1: Owner Perspective (Tomas)

Login: `tomas@northside.lt` / `ois-demo-2026`

### 1.1 Portfolio View (landing page)

You land on the **Portfolio** view. You should see:

- [ ] 3 venue cards: Original, Riverside, Market
- [ ] Heartbeat strip in the top bar (ready tasks, blocked tasks, progress entries)
- [ ] Attention filters if present
- [ ] Venue status indicators (all ACTIVE)

Click each venue card to verify they exist and have data.

### 1.2 Owner Shell — Command Center

Click **Command** in the sidebar (or the owner nav).

- [ ] Configuration issues surface (if any venue has problems)
- [ ] Delegation overview
- [ ] Portfolio-level health indicators

### 1.3 Owner Shell — Intelligence

Click **Intelligence** in the owner sidebar.

- [ ] Signal Intelligence Map loads with 4 lens tabs: Concentration, Domains, Chain, Timeline
- [ ] **Concentration lens**: shows signals like S085, S099 with frequency bars and "Flag systemic" buttons
- [ ] **Domains lens**: shows distribution of signals across ontology domains
- [ ] **Chain lens**: select a signal to see the causal chain (signal → failure mode → response pattern → block)
- [ ] **Timeline lens**: shows assessment evolution over 12 weeks
- [ ] Switch between lenses — state persists (reload page, lens stays)

### 1.4 Owner Shell — People

Click **People** in the owner sidebar.

- [ ] Team members list (Ruta, Mantas, Ieva, Lukas, Gabija)

### 1.5 Select a Venue — Northside Original

Use the venue picker (top center or sidebar) to select **Northside Original**.

### 1.6 Venue → Overview

- [ ] Operating picture card
- [ ] Execution pulse
- [ ] Recent progress entries visible

### 1.7 Venue → Assessment

Click **Assessment** tab.

- [ ] Assessment journey strip at top
- [ ] Intake text area with quality bar below it
- [ ] Signal browse section showing detected signals
- [ ] History of 12 assessments visible (scroll/list)

### 1.8 Venue → Signals

Click **Signals** tab.

- [ ] Signals Review view loads
- [ ] Filter by domain, confidence, status
- [ ] Signal cards with downstream impact chain

### 1.9 Venue → Plan

Click **Plan** tab.

- [ ] Active plan loads ("Q2 Northside Original Plan 3")
- [ ] Completion progress bar
- [ ] Provenance strip (ontology identity)
- [ ] Task list grouped by status
- [ ] Expand a task — verify:
  - [ ] Sub-actions with checkboxes
  - [ ] Deliverables with checkboxes
  - [ ] **Assigned to** field (shows "Ruta Kazlauskiene")
  - [ ] **Due date** field (date picker)
  - [ ] **Priority** select (critical/high/normal)
  - [ ] **Task notes** textarea
  - [ ] **Comments section** — should show existing comments
  - [ ] Tasks show badges in collapsed view: assignee, priority, due date, effort hours

### 1.10 Venue → Report

Click **Report** tab.

- [ ] Report content loads (failure modes, response patterns)
- [ ] **Export MD** button — click it, file downloads
- [ ] **Export JSON** button — click it, file downloads
- [ ] AI narrative button (may show unavailable if no API key)
- [ ] Provenance lineage card
- [ ] Report comparison section (if multiple reports exist)

### 1.11 Venue → History

Click **History** tab.

- [ ] Timeline of 12 assessments/engine runs
- [ ] Each entry shows date, signal count, load classification
- [ ] Ontology identity visible per entry
- [ ] Click a historical entry to load its snapshot

### 1.12 Venue → Console

Click **Console** tab.

- [ ] Platform state information
- [ ] Audit trail entries
- [ ] Integration status

### 1.13 Copilot

Click **vOIS** button (top right or "Open VOIS" in role frame).

- [ ] Thread list — should show "Northside Original working thread"
- [ ] Open the thread — 12+ messages of strategic operational dialogue
- [ ] Global thread "Portfolio operations pulse" also available
- [ ] Messages alternate between user (Ruta/Tomas) and assistant

### 1.14 Notifications

Look for the **Notifications** button in the toolbar.

- [ ] Unread count badge shows a number
- [ ] Click to open dropdown
- [ ] List of notifications (assessment completed, task updated, etc.)
- [ ] Click a notification to mark as read — badge count decreases

### 1.15 Settings

Click **Settings** in the sidebar.

- [ ] Preferences (theme, skin)
- [ ] Trust posture section
- [ ] Session inventory
- [ ] Ontology posture section (shows mounted bundle stats + venue bindings)

### 1.16 Knowledge Base

Click **KB** in the sidebar.

- [ ] Reading Engine loads with articles
- [ ] Bookmarks, read/unread filter, search
- [ ] Glossary below (20 terms, 5 categories)
- [ ] Focus mode toggle

### 1.17 Reference

Click **Reference** in the sidebar.

- [ ] Signal/block/tool library
- [ ] Search and filter
- [ ] Detail panel when clicking an item

### 1.18 Tour (first-time only)

If you haven't dismissed the tour yet:

- [ ] Tour overlay appears in bottom-right corner
- [ ] Shows owner-specific steps (Welcome, Portfolio, Intelligence)
- [ ] "Next" advances, "Skip tour" dismisses
- [ ] After dismissing, it won't show again (localStorage)

**Repeat venue inspection for Riverside and Market** — use the venue picker to switch. Verify each has its own data, plan, signals.

---

## Act 2: Manager Perspective (Ruta)

Logout. Login: `ruta@northside.lt` / `ois-demo-2026`

### 2.1 Landing

- [ ] Manager workspace frame loads (not developer TopBar)
- [ ] "Manager workspace" label
- [ ] Venue picker shows Northside Original
- [ ] **Notifications bell** visible in toolbar (not just in TopBar)
- [ ] "Open VOIS" button visible

### 2.2 Manager Shell Navigation

- [ ] Today view (landing)
- [ ] Workspace view
- [ ] Plan view
- [ ] Evidence view
- [ ] Team view
- [ ] Escalations view
- [ ] Copilot view

Navigate each tab. Verify data loads.

### 2.3 Venue Workspace

Switch to venue workspace view.

- [ ] Full 7-tab venue nav (overview → assessment → signals → plan → report → history → console)
- [ ] All data from Tomas's perspective is also visible here
- [ ] Can expand tasks, see comments, view signals

### 2.4 Manager Tour

If first login:

- [ ] 5-step manager tour fires (Overview, Assessment, AI intake, Signals review, Plan)

### 2.5 Copilot as Manager

Open VOIS copilot.

- [ ] Sees "Northside Original working thread"
- [ ] Messages from Ruta's perspective visible
- [ ] Help request threads from Lukas visible

---

## Act 3: Manager Perspective (Mantas — Riverside)

Logout. Login: `mantas@northside.lt` / `ois-demo-2026`

- [ ] Sees Northside Riverside as primary venue
- [ ] Different assessment data, different plan, different signals
- [ ] Copilot thread is venue-specific (Riverside working thread)
- [ ] Notifications specific to Mantas's activity

---

## Act 4: Manager Perspective (Ieva — Market)

Logout. Login: `ieva@northside.lt` / `ois-demo-2026`

- [ ] Sees Northside Market as primary venue
- [ ] Smallest team, highest volatility
- [ ] Signal trajectory shows fastest improvement (scrappy team)

---

## Act 5: Barista Perspective (Lukas)

Logout. Login: `lukas@northside.lt` / `ois-demo-2026`

### 5.1 Landing

- [ ] Pocket workspace loads
- [ ] "Pocket workspace" label
- [ ] Venue picker shows Northside Original

### 5.2 Pocket Shell Navigation

- [ ] Shift view
- [ ] Standards view
- [ ] Help view
- [ ] Report view
- [ ] Log view

### 5.3 Help Requests

- [ ] Lukas's help requests visible (grinder calibration, temperature log question, peak setup)
- [ ] All marked as CLOSED with linked copilot threads

### 5.4 Pocket Tour

If first login:

- [ ] 3-step pocket tour (Shift, Standards, Help)

### 5.5 Notifications

- [ ] Bell visible in toolbar
- [ ] Lukas has 30-50 notifications

---

## Act 6: Barista Perspective (Gabija)

Logout. Login: `gabija@northside.lt` / `ois-demo-2026`

- [ ] Pocket mode at Riverside
- [ ] Help requests (allergy protocol, printer jam)
- [ ] Different notifications from Lukas

---

## Act 7: Cross-Cutting Verification

### 7.1 Data Arc Verification

Log back in as Tomas. For each venue:

1. Go to History tab
2. Scroll through the 12 assessment entries
3. Verify signal counts decrease over time:
   - Week 1: 16-19 signals
   - Week 6: 6-8 signals
   - Week 12: 1-2 signals

### 7.2 Plan Progression

For each venue in Plan view:

- [ ] Look for plan selector or history — should show 3 plans
- [ ] Plan 1 (archived): ~12 tasks, mostly completed
- [ ] Plan 2 (archived): ~10 tasks, mostly completed
- [ ] Plan 3 (active): ~8 tasks, mix of completed/in-progress/not-started

### 7.3 Progress Feed

In Overview or Plan view:

- [ ] Progress entries span 3 months
- [ ] Mix of notes, updates, milestones, risks, decisions
- [ ] Milestones like "First month of 100% food safety compliance"

### 7.4 Copilot Depth

Open copilot for each venue:

- [ ] Conversations are strategic and contextual
- [ ] Reference real signals (S085, S099)
- [ ] Show improvement awareness
- [ ] Global thread discusses portfolio patterns

### 7.5 Systemic Flags

In Intelligence map (as Tomas):

- [ ] Concentration lens shows "Flag systemic" buttons on high-frequency signals
- [ ] S085 and S099 have been flagged (visible in data)

### 7.6 KB Reading Progress

In KB view:

- [ ] Reading engine shows progress (bookmarks, read articles)
- [ ] Tomas: ~80% read
- [ ] Managers: ~60% read
- [ ] Baristas: ~40% read

---

## Summary Checklist

| Surface | Tomas (Owner) | Ruta (Manager) | Lukas (Barista) |
|---------|:---:|:---:|:---:|
| Portfolio | yes | — | — |
| Venue Overview | yes | yes | — |
| Assessment | yes | yes | — |
| Signals Review | yes | yes | — |
| Plan (tasks, comments, assignments) | yes | yes | — |
| Report (with export) | yes | yes | — |
| History | yes | yes | — |
| Console | yes | yes | — |
| Intelligence Map | yes | — | — |
| Command Center | yes | — | — |
| Pocket (Shift/Standards/Help) | — | — | yes |
| Copilot | yes | yes | yes |
| Notifications | yes | yes | yes |
| KB + Glossary | yes | yes | yes |
| Reference | yes | yes | yes |
| Settings | yes | yes | yes |
| Tours | yes | yes | yes |
