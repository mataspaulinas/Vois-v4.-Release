# VOIS Premium Interaction Addendum

Status: Implementation specification
Date: 2026-03-29
Parent: [VOIS_PREMIUM_UX_IMPLEMENTATION_PLAN.md](./VOIS_PREMIUM_UX_IMPLEMENTATION_PLAN.md)
Scope: Finish-quality interaction rules that close the last 10-15% of the build brief

---

## 1. Purpose

This addendum converts the conversation-level interaction specificity into hard implementation rules. It covers everything the parent plan implies but does not encode:

- page chrome placement
- Back / Back to / Jump to logic
- More menus
- Ask Copilot grounding
- tooltip usage
- drawer trigger placement
- scroll containers
- sticky actions
- mobile sheets
- page-by-page inspector and drawer contents
- Console treatment
- visual restraint rules

Every rule here is enforceable in code review.

---

## 2. Universal Chrome Contract

Every major surface in the product must follow this exact chrome layout:

### 2.1 SurfaceHeader placement rules

| Zone | Content | Rule |
|------|---------|------|
| **Top-left** | `Back to {parent}` button | Show only when the user arrived from a deeper child state. Label must name the parent: "Back to Today", "Back to Plan", "Back to list". Never generic "Back". |
| **Top-center** | Object title + status chip | Title is the current dominant object name. Status chip uses semantic color (success/warning/danger/neutral). Chip text must match backend status exactly. |
| **Top-right** | Primary action → More → Ask VOIS | At most one primary button visible. All secondary actions live inside "More" dropdown. "Ask VOIS" opens Copilot grounded to current context. |

### 2.2 What must NOT appear in the header

- Multiple primary buttons competing for attention
- Decorative badges that do not map to backend truth
- Breadcrumb trails longer than 2 levels
- Search inputs (search belongs in the command palette)
- Notification counts (notification bell is shell-level, not page-level)

---

## 3. Back / Back to / Jump to Logic

### 3.1 Back to

| From | Back to | Label |
|------|---------|-------|
| Workspace (task selected) | Workspace (list) | "Back to list" |
| Workspace (via Today) | Today | "Back to Today" |
| Report (via Assessment) | Assessment | "Back to assessment" |
| Plan (via Report) | Report | "Back to report" |
| Task detail (Pocket) | My Shift | "Back to shift" |
| Any venue sub-view | Venue Overview | "Back to overview" |
| Venue (via Portfolio) | Portfolio | "Back to portfolio" |

**Rule:** `Back to` returns to the parent object context, not to browser history. It is a semantic navigation action, not `window.history.back()`.

### 3.2 Jump to

Jump to moves within the current object, not across modules.

| Surface | Jump to items |
|---------|---------------|
| Plan | "Ready tasks", "Blocked tasks", "Completed tasks" |
| Report | "Failure modes", "Response patterns", "Trust surface", "Comparison" |
| Today | "Actions", "Ready to execute", "Blocked" |
| History | "Latest", "First assessment" |
| Workspace | "Sub-actions", "Deliverables", "Evidence", "Comments" |

**Rule:** Jump to uses `scrollIntoView({ behavior: 'smooth' })` within the PrimaryCanvas. It never navigates to a different route.

### 3.3 Implementation

The `SurfaceHeader` component already supports `onBack` + `backLabel`. Jump to should be added as a `jumpToItems` prop rendering an in-page anchor dropdown.

---

## 4. More Menu Rules

The "More" dropdown in `SurfaceHeader` holds secondary actions that do not deserve permanent button space.

### 4.1 Per-surface More contents

| Surface | More items |
|---------|-----------|
| **Today** | "Compare with yesterday", "View follow-up log", "Export day summary" |
| **Plan** | "Review report", "Timeline", "Compare with prior plan", "Export plan" |
| **Workspace** | "View task history", "View linked signals", "Copy task link" |
| **Report** | "Revisit assessment", "Export markdown", "Export JSON", "Compare with prior report" |
| **History** | "New assessment", "Open plan", "Export timeline" |
| **Evidence** | "Filter by task", "Filter by type", "Export evidence log" |
| **Escalations** | "Show resolved", "Export escalation log" |
| **Command** | "View portfolio", "View delegations", "View people" |
| **Overview** | "Open signals", "Open report", "Open plan", "Open history" |

### 4.2 Rule

- More should never contain the primary action (that belongs as the visible button)
- More items should be ordered by likely usage frequency
- Destructive actions (if any) go last with a visual separator

---

## 5. Ask Copilot Grounding

When the user clicks "Ask VOIS" from any surface, the Copilot drawer must open **already grounded** to:

| Context | Grounding |
|---------|-----------|
| Role | Current auth role (owner/manager/barista) |
| Venue | Current workspace venue (if any) |
| Surface | Current page name (today, plan, workspace, report, etc.) |
| Object | Currently selected object ID (task ID, assessment ID, etc.) |

**Rule:** The copilot must never open blank. The first system message should reference the current context: "You're looking at {venue_name}'s {surface}. How can I help?"

**Implementation:** The `onToggleCopilot` callback in App.tsx already receives context. Ensure `copilotContextLabel` and `copilotContextSummary` are set before opening.

---

## 6. Tooltip Rules

Tooltips are allowed **only** in these cases:

| Case | Example |
|------|---------|
| Status chip disambiguation | Hover "Active" → "This plan is the current execution truth" |
| Abbreviated metric | Hover "72%" → "72% of plan tasks completed (18 of 25)" |
| Icon-only button | Hover collapse icon → "Collapse sidebar" |
| Truncated text | Hover ellipsized title → full title |

### 6.1 What must NOT have tooltips

- Obvious labeled buttons ("Save", "Export", "Back")
- Full-text links
- Anything already explained by adjacent copy
- Decorative elements

### 6.2 Implementation

Use native `title` attribute for simple cases. For rich tooltips (multi-line, styled), create a `<Tooltip>` component that positions absolutely on hover with `var(--motion-fast)` fade-in.

---

## 7. Scroll Container Rules

### 7.1 Independent scroll zones

Each of these must scroll independently:

| Zone | Scroll behavior |
|------|----------------|
| Sidebar | `overflow-y: auto` within its fixed height |
| PrimaryCanvas | `overflow-y: auto`, fills remaining height after SurfaceHeader |
| ContextInspector | `overflow-y: auto`, independent from canvas |
| DeepDrawer body | `overflow-y: auto`, independent from everything above |
| CopilotDrawer messages | `overflow-y: auto`, scroll-to-bottom on new message |

### 7.2 What must NOT scroll

- SurfaceHeader (sticky at top of its zone)
- Sidebar navigation section headers
- ActionBar when `sticky` is set
- DeepDrawer header (drag handle + title + close)

### 7.3 Body scroll

The page `<body>` must **never** scroll. All scroll happens inside the zones above. This prevents the "whole page shifts" feeling that makes enterprise apps feel heavy.

**Implementation:** Set `html, body { overflow: hidden; height: 100vh; }` and let the grid layout manage overflow per zone.

---

## 8. Sticky Action Rules

### 8.1 Where sticky actions appear

| Surface | Sticky action | Position |
|---------|---------------|----------|
| Workspace (task selected) | "Set follow-up", "Attach evidence", "Escalate" | Bottom of PrimaryCanvas |
| Assessment (intake mode) | "Save assessment", "Run AI intake" | Bottom of intake zone |
| Escalation (detail expanded) | "Resolve" button | Bottom of expanded card |
| Pocket Task Detail | "Help", "Report", "Add proof" | Sticky footer |

### 8.2 Rule

- Sticky actions pin to the bottom of their scroll container, not the viewport
- They must not overlap content — reserve space via `padding-bottom`
- They use `ActionBar` component with `sticky` prop
- Maximum 3 actions in a sticky bar. If more are needed, they belong in "More"

---

## 9. Drawer Trigger Placement

### 9.1 DeepDrawer triggers

| Surface | Trigger | Drawer content |
|---------|---------|----------------|
| Today | "Compare" link in summary strip | Today vs yesterday comparison |
| Plan | "Compare" in More menu | Plan version diff |
| Report | "Compare" in More menu | Report vs prior report |
| History | Click a historical entry | Snapshot detail + comparison |
| Workspace | "Full thread" link in comments | Complete comment/audit thread |
| Command | "Portfolio compare" in More | Cross-venue comparison grid |

### 9.2 Rule

- Drawer triggers must be text links or More menu items, never permanent buttons
- Drawers open at 40vh by default
- Drawers have a drag handle for resize (future)
- Closing a drawer returns focus to the canvas
- Only one drawer open at a time (drawer replaces drawer, not stacks)

---

## 10. ContextInspector Per-Surface Contents

### 10.1 What each inspector shows

| Surface | Inspector title | Inspector contents |
|---------|----------------|-------------------|
| **Today** | "Task context" | Selected action rationale, dependency preview, proof expectation, route to Plan/Workspace |
| **Plan** | "Task detail" | Full rationale, dependency chain, linked block/tool references, evidence expectation, escalation status |
| **Workspace** | "Execution context" | Dependency context, linked signals, linked tools/blocks, owner context if blocked, recent evidence, movement history |
| **Report** | "Signal detail" | Selected failure mode or response pattern deep view, linked signals, confidence data |
| **Command** | "Venue summary" | Selected venue state, why it needs attention, last meaningful change, recommended next layer |
| **Overview** | "Venue context" | Ontology binding, last assessment date, plan status, progress summary |
| **Evidence** | "Evidence detail" | Selected evidence item full view, linked task, timestamp, description |
| **Escalation** | "Escalation detail" | Full reason, resolution thread, linked task, timeline |

### 10.2 Inspector behavior rules

- Inspector opens on object selection (click a task, click a signal, click a venue card)
- Inspector closes on clicking the close button or pressing Escape
- Inspector does not open automatically on page load (only on explicit selection)
- On mobile: inspector opens as a right-sheet overlay with backdrop
- Inspector width: 320px default, never wider than 40% of viewport
- Inspector never contains primary actions (those live in canvas or ActionBar)

---

## 11. Mobile Sheet Behavior

### 11.1 Sheet types

| Pattern | Trigger | Height | Dismissal |
|---------|---------|--------|-----------|
| Inspector sheet | Tap task/item on mobile | 50vh | Swipe down or backdrop tap |
| Drawer sheet | "Compare" or "Full thread" | 70vh | Swipe down or backdrop tap |
| Action sheet | Long-press or "More" on mobile | Auto (content height) | Backdrop tap |
| Copilot sheet | "Ask VOIS" on mobile | 85vh | Close button |

### 11.2 Rules

- All mobile sheets slide up from the bottom
- All sheets have a drag handle at top center
- Backdrop is `rgba(0,0,0,0.2)` with `var(--motion-fast)` fade-in
- Sheet content scrolls independently
- Only one sheet at a time
- Sheets use `var(--radius-lg)` top corners

---

## 12. Console Treatment

Console is the system transparency surface. It answers: "What is the system actually doing?"

### 12.1 Console structure

| Zone | Content |
|------|---------|
| SurfaceHeader | "Console" title, venue name subtitle, no primary action |
| Canvas section 1 | **Platform state** — ontology binding, engine status, AI provider status |
| Canvas section 2 | **Integration health** — connected providers, last sync, error count |
| Canvas section 3 | **Audit trail** — chronological log of system actions (not user actions) |
| Inspector | Selected audit entry detail: full payload, actor, timestamp, entity |
| Drawer | Extended audit history, filterable by entity type |

### 12.2 Console rules

- Console is read-only. No mutations.
- Console never shows raw JSON by default (structured display only)
- Console is available to owner and developer roles only
- Console does not show in Pocket navigation
- Audit trail pagination: 50 entries per page, load-more pattern

---

## 13. Visual Restraint Rules

These enforce the Apple/OpenAI-level simplicity the product requires.

### 13.1 Color discipline

| Usage | Allowed |
|-------|---------|
| Status meaning | `--color-success`, `--color-warning`, `--color-danger`, `--color-info` |
| Accent/brand | `--color-accent` (sparingly — primary buttons only) |
| Text | `--color-text-primary`, `--color-text-secondary`, `--color-text-muted` |
| Surfaces | `--color-bg`, `--color-surface`, `--color-surface-elevated` |
| Everything else | **No color.** No decorative backgrounds. No gradient fills. No colored borders unless they encode status. |

### 13.2 Border discipline

- Borders use `--color-border-subtle` (8% opacity) by default
- Strong borders (`--color-border-strong`, 14% opacity) only for active/selected states
- No colored borders except status indicators (left border on task cards)
- No double borders, no dashed borders, no border-radius on flat lists

### 13.3 Shadow discipline

- `--shadow-sm` on elevated cards and dropdowns
- `--shadow-md` on drawers and inspectors
- `--shadow-lg` on modals only
- No shadows on flat list items, table rows, or inline elements

### 13.4 Typography discipline

- Page titles: `--text-card` weight `--weight-semibold`
- Section headers: `--text-body` weight `--weight-semibold`
- Body text: `--text-body` weight `--weight-regular`
- Metadata/captions: `--text-small` weight `--weight-regular` color `--color-text-muted`
- No ALL CAPS except very short badges (2-3 word max)
- No font size mixing within the same visual group

### 13.5 Spacing discipline

- Card padding: `--spacing-md` (16px)
- Section gaps: `--spacing-lg` (24px)
- Inline element gaps: `--spacing-xs` (8px) or `--spacing-sm` (12px)
- No arbitrary pixel values in inline styles. Use token variables only.

### 13.6 Animation discipline

- Transitions: `var(--motion-fast)` for hover/focus, `var(--motion-base)` for open/close
- Easing: `var(--easing-standard)` for most, `var(--easing-emphasized)` for drawers/sheets
- No bounce, no spring, no playful animation
- No animation on data load (content should appear immediately, not fade in)

---

## 14. Information Density By Role

| Role | Default density | Dense on demand |
|------|----------------|-----------------|
| Owner | Sparse. Pressure + intervention only. | Portfolio compare, people detail via inspector/drawer. |
| Manager | Moderate. One strong focus object at a time. | Task deep context, evidence detail via inspector/drawer. |
| Pocket | Low. Always. | Standards detail via sheet. Never dense by default. |
| Developer | Dense is acceptable. | Full system state, raw audit, ontology inspection. |

---

## 15. Empty / Loading / Error State Rules

### 15.1 Empty states

Every empty state must answer: **"What is the next meaningful move?"**

| Pattern | Rule |
|---------|------|
| Title | Factual, not apologetic. "No tasks yet" not "Oops, nothing here!" |
| Description | One sentence explaining what would create content here |
| Action | Optional button for the most likely next action |
| Visual | No illustrations, no icons. Text only. Centered in canvas. |

### 15.2 Loading states

| Pattern | Rule |
|---------|------|
| Shape | Loading skeleton must match the layout it replaces (list shimmer for lists, card shimmer for cards) |
| Duration | If load takes <200ms, show nothing. If >200ms, show skeleton. If >3s, add "Still loading..." text below skeleton. |
| Placement | Loading state replaces canvas content only. Header and sidebar remain stable. |

### 15.3 Error states

| Pattern | Rule |
|---------|------|
| Title | "Something went wrong" (generic) or specific: "Could not load plan" |
| Description | What happened (not stack traces). What the user can do. |
| Actions | "Try again" (retry) + "Go back" (navigate to parent) |
| Orientation | Error state must NOT destroy the page layout. Header and sidebar remain. |

---

## 16. Acceptance Baseline

The static mockup pack and conversation transcripts in [Conversations.txt](./Conversations.txt) constitute the **interaction reference set**. Any implementation that deviates from the screen-by-screen contracts defined in this addendum and the parent plan must be reviewed against the original conversation before shipping.

The audit scorecard from Conversations.txt (Section 6) is the acceptance test:

> Can I tell where I am immediately?
> Can I tell what this page is for immediately?
> Can I tell what the next meaningful move is immediately?
> Can I trust the statuses shown here?
> Can I act without browsing elsewhere first?
> Does this screen reduce or increase cognitive load?
> Is there one dominant visual surface?
> Is secondary detail present but quiet?
> Would a tired user still understand this?
> Would a first-week user still understand this?
> Does this page protect the user's role altitude?
> Would this screen still feel good after repeated daily use?
> Does this feel like management leverage rather than admin burden?

If more than 3 of those are "no" for any screen, the screen is failing and must be reworked before release.

---

## 17. Non-Negotiable Product Standard

The app should not try to impress users by showing the full system.
It should earn trust by revealing the right layer at the right time.

One calm operational truth at a time,
with the rest of the system always one clear step away.
