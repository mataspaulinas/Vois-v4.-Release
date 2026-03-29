# Deep Comparison Audit: OIS Cafe v2 vs VOIS v4.release

Date: 2026-03-29
Purpose: Surface-level function comparison, gap identification, and innovation opportunities

---

## 1. Architecture Comparison

| Dimension | OIS Cafe v2 (donor) | VOIS v4.release |
|-----------|--------------------|-----------------|
| Stack | Flask + Jinja2 + Vanilla JS | FastAPI + React + TypeScript |
| Storage | Local JSON files | PostgreSQL + SQLAlchemy + Alembic |
| Auth | Session-based, single user | Firebase + local password + sessions + RBAC |
| Roles | Implicit (one user) | 4 explicit roles: owner/manager/barista/developer |
| Multi-tenant | Single workspace | Organization → venues → users → memberships |
| Ontology | Hardcoded cafe pack | Modular pack system (cafe, restaurant-legacy, extensible) |
| AI | Direct Claude API calls | Abstracted AI runtime with provider switching |
| Tests | None | 30 frontend + 73 backend tests |

**Verdict:** v4 is architecturally stronger in every dimension. The donor was a prototype; v4 is production-grade.

---

## 2. Surface-by-Surface Comparison

### 2.1 Portfolio / Home

| Feature | Cafe v2 | VOIS v4 | Gap |
|---------|---------|---------|-----|
| Venue cards with health status | Yes | Yes | None |
| Health ring visualization (SVG) | Yes (SVG circle) | No | **MISSING** |
| Venue comparison mode | Yes (side-by-side) | No | **MISSING** |
| Common signals frequency | Yes (cross-venue) | Partial (intelligence map) | Minor |
| Attention filtering | No | Yes (attention items) | v4 better |
| Execution velocity per venue | No | Yes | v4 better |
| Brand/team filtering | Yes | No | **MISSING** |

### 2.2 Venue Overview

| Feature | Cafe v2 | VOIS v4 | Gap |
|---------|---------|---------|-----|
| Venue profile card | Yes (type, stage, brand) | Yes (concept, location, size) | Equal |
| Recent activity timeline | Yes (events timeline) | Yes (progress entries) | Equal |
| Next action recommendation | Yes (system-generated) | Yes (next-move description) | Equal |
| Quick links to other tabs | Yes | Yes (SurfaceHeader More menu) | v4 better |
| Health state messaging | Yes (contextual) | Yes (status chip) | Equal |

### 2.3 Assessment / Intake

| Feature | Cafe v2 | VOIS v4 | Gap |
|---------|---------|---------|-----|
| AI text-to-signals intake | Yes | Yes | Equal |
| Manual signal selection | Yes (browse + add) | Yes (browse + checkbox) | Equal |
| Signal notes per signal | Yes | No | **MISSING** |
| Assessment type selection | Yes (full/follow-up/custom) | Partial (type exists but UI doesn't offer choice) | Minor gap |
| Intake quality guidance | No | Yes (IntakeQualityBar) | v4 better |
| Journey strip / stage tracking | No | Yes (5-stage journey) | v4 better |
| Load previous assessment | Yes | Yes (history) | Equal |
| Follow-up aware (prior signals) | Yes | No | **MISSING** |
| Venue context enrichment | Yes (type, team, stage) | Yes (capacity profile) | Equal |
| Draft review gate | No | Yes | v4 better |

### 2.4 Signals Review

| Feature | Cafe v2 | VOIS v4 | Gap |
|---------|---------|---------|-----|
| Signal browser with filters | Yes (severity, domain, active) | Yes (mode, domain, confidence) | Equal |
| Signal detail drawer | Yes (description, mappings) | Yes (impact chain) | v4 better |
| Downstream impact chain | Yes (signal→FM→RP→block) | Yes | Equal |
| Precursor analysis | Yes | No | **MISSING** |
| Signal frequency across blocks | Yes | No | Minor |
| Search across signals | Yes | Yes | Equal |

### 2.5 Operational Plan

| Feature | Cafe v2 | VOIS v4 | Gap |
|---------|---------|---------|-----|
| AI-generated plan from engine | Yes | Yes | Equal |
| 3-layer execution model (L1/L2/L3) | Yes (3-day/21-day/90-day) | Yes (layer field on tasks) | Equal |
| Task status management | Yes (4 states) | Yes (6 states) | v4 better |
| Sub-action checkboxes | Yes | Yes | Equal |
| Deliverable checkboxes | Yes | Yes | Equal |
| Task comments | Yes (threaded) | Yes (load + create) | Equal |
| Task assignment | Yes | Yes | Equal |
| Task due dates | Yes | Yes (new) | Equal |
| Task priority | No | Yes | v4 better |
| Plan versioning / archival | Yes (versions per engine run) | Yes (draft/active/archived) | Equal |
| Add block to plan from library | Yes (drag into plan) | No | **MISSING** |
| Plan review workflow | Yes (request review, approve/reject) | No | **MISSING** |
| KPIs on tasks | Yes (quantitative + qualitative) | No | **MISSING** |
| Expected output per task | Yes | No | Minor |
| Verification methods per task | Yes | No | Minor |
| Completion progress bar | Yes (by layer) | Yes (overall %) | Equal |
| Provenance strip | No | Yes (ontology identity) | v4 better |
| Dependency visualization | No | Yes (blocking deps) | v4 better |

### 2.6 Execution Workspace

| Feature | Cafe v2 | VOIS v4 | Gap |
|---------|---------|---------|-----|
| Task detail with all context | Yes | Yes | Equal |
| Status change | Yes | Yes | Equal |
| Sub-action/deliverable tracking | Yes | Yes | Equal |
| Notes editing | Yes | Yes | Equal |
| Follow-up creation | No | Yes | v4 better |
| Evidence attachment trigger | No | Yes | v4 better |
| Escalation trigger | No | Yes | v4 better |
| Sticky action bar | No | Yes (new ActionBar) | v4 better |

### 2.7 Report

| Feature | Cafe v2 | VOIS v4 | Gap |
|---------|---------|---------|-----|
| Markdown-rendered report | Yes | Yes | Equal |
| Failure mode analysis | Yes | Yes | Equal |
| Response pattern recommendations | Yes | Yes | Equal |
| Block recommendations | Yes | Yes (spine section) | Equal |
| Tools per block | Yes | No | Minor |
| AI enhanced narrative | No | Yes | v4 better |
| Report comparison | No | Yes | v4 better |
| Export (markdown + JSON) | Partial (export in settings) | Yes (per-report buttons) | v4 better |
| Trust surface | No | Yes | v4 better |
| Provenance lineage | No | Yes | v4 better |

### 2.8 History / Timeline

| Feature | Cafe v2 | VOIS v4 | Gap |
|---------|---------|---------|-----|
| Assessment timeline | Yes | Yes | Equal |
| Signal change tracking | Yes | Yes (signal delta) | Equal |
| Load historical snapshot | Yes | Yes | Equal |
| Comparison (current vs prior) | Yes | Yes | Equal |
| Ontology identity per entry | No | Yes | v4 better |

### 2.9 Signal Map / Intelligence

| Feature | Cafe v2 | VOIS v4 | Gap |
|---------|---------|---------|-----|
| Portfolio heatmap (signals x venues) | Yes (true heatmap grid) | No (bar-based concentration) | **MISSING** |
| Timeline lens | Yes | Yes | Equal |
| Trace lens (signal→FM→RP→block) | Yes | Yes (causal chain) | Equal |
| Domain distribution | No | Yes | v4 better |
| Cross-venue density | No | Yes | v4 better |
| Signal frequency sorting | Yes | Yes | Equal |
| Add block from map | Yes | No | **MISSING** |
| Flag signal as systemic | Yes | Yes (new) | Equal |
| Precursor visualization | Yes | No | **MISSING** |
| Scope filtering (brand, venue) | Yes | No | Minor |

### 2.10 Libraries (Reference)

| Feature | Cafe v2 | VOIS v4 | Gap |
|---------|---------|---------|-----|
| Blocks library with 3 view modes | Yes (grid/list/module) | Yes (tabs, search, detail) | Equal |
| Tools library | Yes | Yes | Equal |
| Signals library | Yes | Yes | Equal |
| Block detail (L1/L2/L3 frameworks) | Yes (deep execution detail) | No (summary only) | **MISSING** |
| Tool detail (usage, related blocks) | Yes | Partial | Minor |
| Search across all reference | Yes | Yes | Equal |
| Filter by module/priority | Yes | Yes | Equal |

### 2.11 Knowledge Base

| Feature | Cafe v2 | VOIS v4 | Gap |
|---------|---------|---------|-----|
| Article library (58 articles) | Yes | Depends on ontology pack content | Equal |
| Domain categorization | Yes | Yes | Equal |
| Full-text search | Yes | Yes | Equal |
| Reading progress tracking | No | Yes (ReadingEngine) | v4 better |
| Bookmarks | No | Yes | v4 better |
| Notes per article | No | Yes | v4 better |
| Focus mode | No | Yes | v4 better |
| Struggle marking | No | Yes | v4 better |
| Glossary | No | Yes (20 terms) | v4 better |
| Backend-synced reading state | No | Yes (new) | v4 better |

### 2.12 Settings

| Feature | Cafe v2 | VOIS v4 | Gap |
|---------|---------|---------|-----|
| Theme toggle | Yes | Yes | Equal |
| Skin selector | Yes (5 skins) | Yes (4 skins) | Equal |
| API key management | Yes | Via env config | Different approach |
| Engine config (model selection) | Yes | Via env config | Different approach |
| Export/backup | Yes (ZIP per project) | Yes (org-level export) | Equal |
| Compact mode toggle | Yes | No | Minor |
| Motion reduction | Yes | No | Minor |
| Font size preferences | Yes | No | Minor |
| Nav history limit | Yes | No | Minor |
| Trust posture display | No | Yes | v4 better |
| Session management (revoke) | No | Yes | v4 better |
| Ontology posture display | No | Yes | v4 better |

### 2.13 Help / Onboarding

| Feature | Cafe v2 | VOIS v4 | Gap |
|---------|---------|---------|-----|
| Interactive tours | Yes (guided walkthroughs) | Yes (role-specific tours) | Equal |
| Full manual (chapters) | Yes (complete handbook) | No | **MISSING** |
| By-page context help | Yes | No | **MISSING** |
| By-workflow help | Yes (7 workflows) | No | **MISSING** |
| Terminology index | Yes | Yes (Glossary) | Equal |
| Troubleshooting guide | Yes | No | **MISSING** |
| Changelog | Yes | No | Minor |

### 2.14 Console

| Feature | Cafe v2 | VOIS v4 | Gap |
|---------|---------|---------|-----|
| Raw JSON state viewer | Yes | No | Minor (developer tool) |
| Integration event display | No | Yes | v4 better |
| Audit trail | No | Yes | v4 better |
| Platform state | No | Yes | v4 better |

### 2.15 Copilot / Chat

| Feature | Cafe v2 | VOIS v4 | Gap |
|---------|---------|---------|-----|
| Multi-threaded chat | Yes | Yes | Equal |
| Thread naming/archiving | Yes | Yes | Equal |
| File attachment upload | Yes | Yes | Equal |
| Proactive AI suggestions | Yes (by project health) | Partial (signal suggestions) | Minor gap |
| Contextual grounding | Yes (venue context) | Yes (role + venue + surface) | v4 better |
| Bulk thread operations | Yes (delete/archive multiple) | No | Minor |
| Search within threads | Yes | No | Minor |

### 2.16 Notifications / Activity

| Feature | Cafe v2 | VOIS v4 | Gap |
|---------|---------|---------|-----|
| Notification categories | Yes (info/warning/critical) | Yes (IN_APP with levels) | Equal |
| Unread tracking | Yes | Yes (unread count) | Equal |
| Notification detail | Yes | Yes (dropdown list) | Equal |
| Activity feed (cross-project) | Yes | No | **MISSING** |
| Due-soon task alerts | Yes | No | **MISSING** |
| Health state change alerts | Yes | No | **MISSING** |
| Proactive notifications | Yes | No | **MISSING** |
| Bulk dismiss | Yes | No | Minor |

### 2.17 Data Visualization

| Feature | Cafe v2 | VOIS v4 | Gap |
|---------|---------|---------|-----|
| SVG health ring | Yes | No | **MISSING** |
| Signal severity bar chart | Yes (stacked) | Yes (bars in intelligence) | Equal |
| Portfolio heatmap grid | Yes (signals x venues) | No | **MISSING** |
| Timeline visualization | Yes (events over time) | Yes (assessment timeline) | Equal |
| Plan progress bars | Yes (by layer) | Yes (overall %) | Equal |
| Completion timeline | Yes | No | Minor |

---

## 3. Summary of MISSING Features (v4 does NOT have)

### Critical (affects product completeness)

| # | Feature | Cafe v2 had | Impact |
|---|---------|------------|--------|
| 1 | **Portfolio heatmap grid** (signals x venues) | True cross-tabular heatmap | High — the most impressive analytical visualization in the donor |
| 2 | **Plan review workflow** (request review, approve/reject) | Structured review process | High — missing governance layer for plans |
| 3 | **Add block to plan from library** | Drag-to-plan from blocks library | Medium — cross-surface action |
| 4 | **By-page context help** ("?" button per page) | Context-sensitive help | Medium — onboarding depth |
| 5 | **By-workflow help** (7 guided workflows) | Step-by-step workflow guides | Medium — onboarding depth |
| 6 | **Full manual** (chapter-based handbook) | Complete product handbook | Medium — documentation depth |
| 7 | **Signal precursor analysis** | "What leads to this signal" | Medium — diagnostic intelligence |
| 8 | **Follow-up-aware assessment** (prior signals pre-loaded) | Follow-up assessments inherit prior state | Medium — workflow continuity |
| 9 | **Due-soon / proactive notifications** | System-generated alerts for upcoming deadlines | Medium — activity management |
| 10 | **Activity feed** (cross-venue recent events) | Unified activity stream | Medium — portfolio awareness |

### Minor (nice-to-have, not blocking)

| # | Feature | Notes |
|---|---------|-------|
| 11 | Venue comparison mode (side-by-side) | Portfolio analytics |
| 12 | Brand/team filtering | Multi-brand portfolio |
| 13 | Signal notes per signal | Assessment detail |
| 14 | Task KPIs (quantitative + qualitative) | Execution quality |
| 15 | Block detail with L1/L2/L3 frameworks | Reference depth |
| 16 | Compact mode / motion reduction / font size prefs | Accessibility |
| 17 | Troubleshooting guide | Help depth |
| 18 | Changelog display | Transparency |
| 19 | Health ring SVG | Visual polish |
| 20 | Bulk thread operations in copilot | Convenience |

---

## 4. What v4 Has That Cafe v2 Did NOT

| Feature | v4 advantage |
|---------|-------------|
| Role-based shells (owner/manager/barista/developer) | Completely new — the donor was single-user |
| Pocket mobile experience | New — frontline workers had nothing |
| Ontology binding system | New — explicit venue-to-pack binding |
| Organization/membership/access control | New — multi-tenant with RBAC |
| Execution workspace with follow-up/evidence/escalation | New — the donor had task management but not this execution loop |
| Report comparison | New — compare current vs prior reports |
| Report trust surface | New — diagnostic credibility assessment |
| KB reading engine (bookmarks/progress/notes/focus) | New — deep learning tool |
| Glossary | New |
| Intelligence map (4 lenses) | Enhanced — donor had 3 lenses, v4 has 4 with domain distribution |
| Systemic flagging | Enhanced — was implicit, now explicit model |
| Due-date editing on tasks | New |
| Task priority management | New |
| Tours (role-specific onboarding) | Enhanced — donor had generic tours |
| Session management / security posture | New — enterprise security |
| Ontology posture in settings | New — transparency |
| Backend test suite (73 tests) | New — engineering quality |
| Frontend test suite (30 tests) | New |
| Design token system | New — consistent visual language |
| Shell primitives (SurfaceHeader, PrimaryCanvas, etc.) | New — premium UX foundation |

---

## 5. Innovation Opportunities

### 5.1 Restore and Enhance

These donor features should be restored with v4 improvements:

**A. Portfolio Heatmap (signals x venues)**
The donor's cross-tabular heatmap was the single most impressive analytical surface. Restore it as an SVG grid in the intelligence map with:
- Rows = signals (sorted by frequency)
- Columns = venues
- Cell color = severity intensity
- Click cell → opens signal detail in ContextInspector
- Sortable rows/columns
- Filter by domain, severity threshold

**B. Plan Review Workflow**
The donor had request-review + approve/reject. Build it properly:
- "Request review" button on active plans
- Review state visible in SurfaceHeader status chip (draft → review → active)
- Reviewer can approve, reject with notes, or request changes
- Notification to reviewer
- Audit trail entry

**C. Precursor Analysis**
The donor traced "what leads to this signal." Restore in intelligence map:
- In causal chain lens: show precursor signals upstream
- Visual: signal A → precursor → signal B → failure mode chain
- This makes the diagnostic intelligence feel predictive, not just reactive

**D. Context-Sensitive Help ("?" per page)**
The donor had by-page help. Build as a lightweight system:
- Small "?" button in SurfaceHeader trailing slot
- Opens ContextInspector with help content for the current surface
- Content sourced from a static help registry (one help entry per surface)

### 5.2 Innovate Beyond Both

These are features neither version has that would push the product forward:

**A. Operational Pulse Animation**
Replace static health indicators with a subtle ambient pulse:
- Venue cards in portfolio have a slow breathing animation when healthy
- Pulse speed increases as signals accumulate
- This creates an emotional "living system" feel without adding UI noise
- Implementation: CSS keyframe on border or shadow opacity, speed driven by signal count

**B. Signal Trend Arrows**
Show direction, not just current state:
- Each signal in assessment/signals view gets a tiny trend indicator: improving, stable, worsening
- Derived from comparing last 3 assessments
- This answers "is it getting better?" without opening history

**C. Smart Transition Suggestions**
After completing a key action, the system suggests the natural next step:
- After saving assessment → "Run engine" prompt
- After reviewing report → "Open linked plan" prompt
- After completing all plan tasks → "Start next assessment cycle" prompt
- Implementation: contextual banner below SurfaceHeader, dismissible, auto-hides after 10s

**D. Delegation Health Score**
For the owner shell, compute a delegation health metric:
- Based on: follow-up completion rate, escalation frequency, overdue rate per manager
- Show as a simple score (0-100) in Command center
- Color-coded (green/yellow/red)
- This makes the owner feel like the system is monitoring delegation quality

**E. Shift Readiness Check (Pocket)**
Before shift start, the system presents a 3-question readiness check:
1. "Is the station set up?" (yes/no)
2. "Any carry-over issues from last shift?" (yes/no + note)
3. "Equipment OK?" (yes/no)
- Creates a ritual that makes the pocket experience feel intentional
- Data feeds into the venue's operational health

**F. Weekly Digest Email**
Auto-generated weekly summary for each role:
- Owner: portfolio pressure changes, top 3 attention items, delegation health
- Manager: signal trend, task completion this week, upcoming follow-ups
- Uses existing notification infrastructure
- Implementation: scheduled backend job using NotificationEvent with EMAIL channel

**G. Comparative Analytics Dashboard**
A new owner view that answers: "How do my venues compare over time?"
- Side-by-side signal trend lines (12-week view)
- Completion velocity comparison
- Time-to-resolution metrics per venue
- This was partially in the donor (compare venues) but v4 can do it properly with real time-series data

**H. Evidence Quality Scoring**
Score evidence items on trustworthiness:
- Photo > checklist > document > observation (type hierarchy)
- Linked to specific task > unlinked (context hierarchy)
- Recent > old (freshness hierarchy)
- Show a simple quality indicator on evidence cards
- This makes evidence feel like a trust mechanism, not a filing cabinet

---

## 6. Recommended Build Priority

### Tier 1: Restore (high impact, already proven)

1. Portfolio heatmap grid (SVG, intelligence map)
2. Plan review workflow (request/approve/reject)
3. Precursor analysis in intelligence chain
4. Context-sensitive help ("?" per surface)

### Tier 2: Innovate (high impact, new value)

5. Signal trend arrows (improving/stable/worsening)
6. Smart transition suggestions (contextual next-step)
7. Delegation health score (owner command)
8. Shift readiness check (pocket)

### Tier 3: Complete (medium impact, fills gaps)

9. Follow-up-aware assessment (prior signals pre-loaded)
10. Activity feed (cross-venue recent events)
11. Due-soon proactive notifications
12. Full manual / by-workflow help

### Tier 4: Polish (nice-to-have)

13. Venue comparison mode
14. Task KPIs
15. Block detail L1/L2/L3 frameworks
16. Operational pulse animation
17. Evidence quality scoring
18. Weekly digest email
19. Comparative analytics dashboard

---

## 7. Final Verdict

VOIS v4.release is **materially stronger** than OIS Cafe v2 in:
- Architecture (production-grade vs prototype)
- Role separation (4 shells vs single user)
- Execution workflow (workspace + follow-up + evidence + escalation)
- Learning tools (KB reading engine, glossary, tours)
- Security (RBAC, sessions, audit trail)
- Report quality (comparison, trust surface, export, provenance)
- Ontology flexibility (modular packs vs hardcoded)

The donor is **still stronger** in:
- Portfolio analytics (heatmap grid, venue comparison)
- Diagnostic intelligence (precursor analysis)
- Help system depth (full manual, by-page help, by-workflow help, troubleshooting)
- Plan governance (review workflow)
- Notification intelligence (due-soon alerts, proactive notifications)
- Visual richness (SVG charts, health rings)

The gap is approximately **10 specific features** that can be restored. The innovation opportunities (trend arrows, smart transitions, delegation health, shift readiness) would push v4 beyond what either version has ever offered.
