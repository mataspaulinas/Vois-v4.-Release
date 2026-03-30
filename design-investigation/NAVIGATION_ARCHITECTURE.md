# VOIS Navigation Architecture — Per-Role Shell Specification

## The 3 Navigation Surfaces

```
┌─────────────────────────────────────────────────────────────────────┐
│                          TOP BAR (56px)                             │
│  [Breadcrumb]        [Venue Selector]        [Search] [Bell] [User]│
├────────────┬────────────────────────────────────────────────────────┤
│            │                                                        │
│  SIDEBAR   │              PRIMARY CANVAS                            │
│  (240px)   │              (scrollable)                              │
│            │                                                        │
│  Navigation│                                     ┌────────────────┐│
│  by role   │                                     │ STACKING       ││
│            │                                     │ DRAWERS        ││
│            │                                     │ (from right)   ││
│            │                                     └────────────────┘│
├────────────┴────────────────────────────────────────────────────────┤
│                    MOBILE TAB STRIP (64px, mobile only)             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## TOP BAR — Universal (all roles see the same bar)

```
┌─────────────────────────────────────────────────────────────────────┐
│ Portfolio / Venue Name    [Venue Selector ▾]    🔍 Cmd+K  🔔  👤  Copilot │
└─────────────────────────────────────────────────────────────────────┘
```

| Element | Purpose | All Roles |
|---------|---------|-----------|
| Breadcrumb | Orientation — where am I | Yes |
| Venue selector | Switch venue | Yes (Pocket: only assigned venue) |
| Search pill (Cmd+K) | Command palette | Yes |
| Notification bell | Activity alerts | Yes |
| Theme toggle | Light/dark | Yes |
| User name | Session identity | Yes |
| Copilot toggle | Open AI assistant | Yes |

**What does NOT go in the top bar:**
- Role-specific navigation (that's sidebar)
- Skin selector (moved to Settings)
- Heartbeat metrics (moved to Portfolio/sidebar pulse)
- Sign out (moved to Settings)

---

## SIDEBAR — Role-Specific

### Owner Sidebar

```
VOIS •                                              ‹

ORGANIZATION
  CM  Command Center        ← role home (Law 4)
  DL  Delegations
  PP  People Intelligence
  IN  Intelligence
  AD  Administration

VENUE (when venue selected)
  OV  Overview
  AS  Assessment
  SG  Signals
  PL  Plan
  RP  Report
  HI  History

REFERENCE
  BL  Blocks
  TL  Tools
  SG  Signals

GUIDANCE
  KB  Knowledge Base

─── spacer ───

SYSTEM
  ST  Settings
  AI  Copilot
```

**Owner sees everything.** The Organization section is their primary workspace.
When they select a venue, the Venue section appears for deep-diving.

---

### Manager Sidebar

```
VOIS •                                              ‹

WORKSPACE
  TD  Today                 ← role home (Law 4)
  WS  Workspace (Execution)
  PL  Plan
  EV  Evidence
  TM  Team Pulse
  ES  Escalations

VENUE (current venue)
  OV  Overview
  AS  Assessment
  SG  Signals
  RP  Report
  HI  History

REFERENCE
  BL  Blocks
  TL  Tools
  SG  Signals

GUIDANCE
  KB  Knowledge Base

─── spacer ───

SYSTEM
  ST  Settings
  AI  Copilot
```

**Manager sees their venue workspace.** No Organization section.
No Portfolio (they don't manage multiple venues).
No Administration.

---

### Pocket (Barista) Sidebar — DIFFERENT LAYOUT

Pocket users are on mobile, standing behind a counter. They get a BOTTOM TAB BAR instead of a sidebar.

```
Desktop: simplified sidebar (if they use desktop)

VOIS •                                              ‹

MY SHIFT
  SH  Shift                ← role home (Law 4)
  SD  Standards
  HP  Help
  RP  Report
  LG  Log

GUIDANCE
  KB  Knowledge Base

─── spacer ───

SYSTEM
  ST  Settings
  AI  Copilot
```

**Mobile: Bottom tab bar replaces sidebar**

```
┌─────────┬─────────┬─────────┬─────────┬─────────┐
│  Shift  │Standards│  Help   │  Report │   Log   │
│  (home) │         │         │         │         │
└─────────┴─────────┴─────────┴─────────┴─────────┘
```

**Pocket does NOT see:**
- Venue operational views (Assessment, Signals, Plan, Report, History)
- Reference library (Blocks, Tools, Signals)
- Any management or organizational views
- Portfolio

---

### Developer Sidebar (full access)

```
VOIS •                                              ‹

PORTFOLIO
  PF  Portfolio

VENUE (when venue selected)
  OV  Overview
  AS  Assessment
  SG  Signals
  PL  Plan
  RP  Report
  HI  History
  CO  Console

REFERENCE
  BL  Blocks
  TL  Tools
  SG  Signals

WORKSPACE
  MG  Manager  → (expands: Today, Workspace, Plan, Evidence, Team, Escalations)
  PK  Pocket   → (expands: Shift, Standards, Help, Report, Log)
  OW  Owner    → (expands: Command, Delegations, People, Intelligence, Copilot)

GUIDANCE
  KB  Knowledge Base

─── spacer ───

SYSTEM
  ST  Settings
  AI  Copilot
```

**Developer sees everything.** Including Console (diagnostics).

---

## STACKING DRAWERS — What Can Open From Where

Drawers are contextual panels that open from the right, pushing the canvas left.
They are NOT navigation — they are contextual deep-dives.

### Drawer Types (by color)

| Type | Color | When it opens | Trigger |
|------|-------|---------------|---------|
| Block | Purple #6C5CE7 | Clicking a block code (B105, B172) | Any text with block reference |
| Tool | Blue #3B82F6 | Clicking a tool code (T042) | Any text with tool reference |
| Signal | Green #10B981 | Clicking a signal code (S008, S166) | Any text with signal reference |
| Failure Mode | Red #EF4444 | Clicking a failure mode code (FM003) | Any text with FM reference |
| Response Pattern | Amber #F59E0B | Clicking an RP code (RP007, RP051) | Any text with RP reference |
| Copilot | Gradient purple | Clicking "Copilot" or "Ask about this" | TopBar, sidebar, or contextual |

### Drawer Content Structure

**Block Drawer:**
```
───────────────────────────────────
B172 · Service Flow Block    BLOCK ×
───────────────────────────────────
PURPOSE
  [description text]

KEY INTERVENTIONS
  1. [intervention text]
  2. [intervention with T042 Tool link]
  3. [intervention with S008 Signal link]

EXPECTED OUTCOME
  [outcome text]

FAILURE MODES
  [FM003 link]

RESPONSE PATTERNS
  [RP007 link]

MEASUREMENT
  [measurement text]

→ Open in Reference Library
───────────────────────────────────
```

**Copilot Drawer (resizable):**
```
───────────────────────────────────
● Copilot                   AI  ×
───────────────────────────────────
Context: [Plan Task + B172 + T042]

USER: How should I measure...?
COPILOT: Based on T042...

[Ask about these items...]  [Send]
───────────────────────────────────
```

### Who Can Open What Drawers

| Drawer | Owner | Manager | Pocket | Developer |
|--------|-------|---------|--------|-----------|
| Block | Yes | Yes | No | Yes |
| Tool | Yes | Yes | Yes (from Standards) | Yes |
| Signal | Yes | Yes | No | Yes |
| Failure Mode | Yes | Yes | No | Yes |
| Response Pattern | Yes | Yes | No | Yes |
| Copilot | Yes | Yes | Yes | Yes |

Pocket users can open Tool drawers when referenced in Standards,
but don't see Block/Signal/FM/RP references in their simplified views.

---

## MOBILE TAB STRIP — Per Role

### Owner (mobile)
```
┌─────────┬─────────┬─────────┬─────────┬─────────┐
│ Command │Delegate │ People  │  Venue  │ Copilot │
│  (home) │         │         │         │         │
└─────────┴─────────┴─────────┴─────────┴─────────┘
```

### Manager (mobile)
```
┌─────────┬─────────┬─────────┬─────────┬─────────┐
│  Today  │  Plan   │  Team   │ Signals │ Copilot │
│  (home) │         │         │         │         │
└─────────┴─────────┴─────────┴─────────┴─────────┘
```

### Pocket (mobile) — PRIMARY experience
```
┌─────────┬─────────┬─────────┬─────────┬─────────┐
│  Shift  │Standards│  Help   │ Report  │   Log   │
│  (home) │         │         │         │         │
└─────────┴─────────┴─────────┴─────────┴─────────┘
```

---

## NAVIGATION RULES

### Rule 1: One Home Per Role (Constitution Law 4)
- Owner → Command Center
- Manager → Today
- Pocket → My Shift

### Rule 2: Back Logic
Every screen has a clear "back" destination:
- Plan task → Back to Plan
- Workspace (execution) → Back to Plan or Today
- Venue view → Back to Portfolio (owner) or Today (manager)
- Drawer → Close (X or Escape)
- Settings → Back to previous screen

### Rule 3: Jump Logic
Lightweight "jump to" links for cross-cutting navigation:
- "Jump to Plan" from Today/Workspace
- "Jump to Escalations" from blocked tasks
- "Jump to Standards" from Pocket task detail
- "Ask Copilot about this" from any inspector/expanded card

### Rule 4: No Duplicate Destinations (Constitution Law 7)
- Plan is in ONE place: sidebar "Plan" under Workspace (manager) or Venue (developer)
- Settings is in ONE place: sidebar bottom
- Copilot is in ONE place: sidebar bottom + TopBar toggle (same destination)

### Rule 5: Sidebar Auto-Collapse
When stacking drawers push the canvas below 300px:
1. Sidebar collapses to 48px icon rail
2. If still too tight, oldest drawer auto-closes
3. Sidebar re-expands when space is available

### Rule 6: Mobile Behavior
- Sidebar hidden on mobile (< 768px)
- Bottom tab strip is primary navigation
- Drawers become full-screen sheets with back button
- Copilot is a full-screen sheet

---

## DECISION TREE: Where Does X Go?

```
Is it a DESTINATION the user navigates TO?
  → SIDEBAR (or bottom tab on mobile)

Is it a GLOBAL ACTION available everywhere?
  → TOP BAR (search, notifications, copilot, theme)

Is it CONTEXTUAL DETAIL about something on screen?
  → STACKING DRAWER (block, tool, signal, copilot)

Is it a RARE/ADMIN action?
  → SETTINGS (sign out, skin, export, session management)

Is it a QUICK STATUS indicator?
  → TOP BAR breadcrumb or sidebar section header
```

---

## SUMMARY MATRIX

| Surface | Owner | Manager | Pocket (desktop) | Pocket (mobile) |
|---------|-------|---------|-------------------|-----------------|
| **TopBar** | Universal | Universal | Universal | Simplified |
| **Sidebar sections** | Org + Venue + Ref + Guidance | Workspace + Venue + Ref + Guidance | Shift views + Guidance | Hidden (tabs) |
| **Sidebar item count** | ~18 items | ~15 items | ~7 items | 0 (tabs) |
| **Bottom tabs** | 5 on mobile | 5 on mobile | 5 always | 5 always |
| **Drawers available** | All 6 types | All 6 types | Tool + Copilot | Tool + Copilot |
| **Default home** | Command Center | Today | My Shift | My Shift |
