# VOIS Design Implementation Rules

These rules govern every screen implementation. They exist to prevent the redesign from accidentally hiding, breaking, or masking any existing feature.

---

## Rule 1: No Feature Left Behind

Before restyling ANY screen, the implementer MUST:

1. **Read the existing component file** line by line
2. **List every feature, action, and data point** currently rendered
3. **Verify each one has a home** in the new design
4. **If something has no obvious home** — STOP and surface it as a gap

A feature includes:
- Every button and what it does
- Every link and where it goes
- Every data field shown to the user
- Every status indicator
- Every conditional state (empty, loading, error, permission-denied)
- Every "More" menu item
- Every keyboard shortcut
- Every tooltip that conveys essential info
- Every navigation path (back, jump, drill-down)

---

## Rule 2: Function Audit Per Screen

For each screen being restyled, create a checklist:

```
Screen: [TodayBoard.tsx]
Features found:
- [ ] Summary strip with counts → WHERE in new design?
- [ ] Next executable task highlight → WHERE?
- [ ] Overdue detection with red indicator → WHERE?
- [ ] "Jump to Plan" per task → WHERE?
- [ ] "Ask Copilot" contextual entry → WHERE?
- [ ] More menu per task (escalate, reassign, defer) → WHERE?
- [ ] Inspector: "why surfaced" explanation → WHERE?
- [ ] Inspector: proof/evidence section → WHERE?
- [ ] Drawer: history/compare → WHERE?
- [ ] Empty state when no tasks → WHERE?
- [ ] Loading skeleton → WHERE?
- [ ] Error recovery → WHERE?
ALL accounted for: [ ] YES / [ ] NO — if NO, stop and surface gaps
```

---

## Rule 3: Test Every Path

After restyling, manually verify:

1. **Can the user reach every action** that existed before? (No hidden buttons)
2. **Can the user read every piece of information** that existed before? (No truncated-and-lost data)
3. **Does every status color/indicator still communicate clearly?** (Minimalism didn't mute a critical warning)
4. **Does progressive disclosure work both ways?** (Hidden things can be found, shown things can be dismissed)
5. **Does mobile show everything desktop shows?** (Maybe rearranged, but not removed)
6. **Does the stacking panel system not block any underlying action?** (Can still interact with canvas when drawers are open)

---

## Rule 4: Gap Logging

When a feature doesn't fit the new design cleanly, log it:

| ID | Screen | Feature | Issue | Proposed Solution | Status |
|----|--------|---------|-------|-------------------|--------|
| GAP-001 | | | | | open |

Gap statuses: open → proposed → decided → implemented

Never skip a gap. Never silently drop a feature.

---

## Rule 5: Constitution Compliance

Every implementation must pass the 11 constitution laws. Quick check:

1. Active plan is execution truth? (not latest)
2. One source of truth per concept?
3. Core and ontology separate?
4. Correct default home per role?
5. Semantic lanes distinct?
6. Backend enforces security?
7. No duplicate destinations?
8. No hidden fallbacks?
9. No industry defaults in core?
10. Historical ontology identity protected?
11. Invalid packs fail closed?

---

## Rule 6: Style Cannot Override Meaning

- A "danger" action must still LOOK dangerous (red, not muted gray)
- A "blocked" task must still FEEL blocked (not just a subtle color change)
- An "overdue" item must still CREATE urgency (not blend into the list)
- A "primary action" must still be the OBVIOUS next step (not hidden in a menu)
- An "empty state" must still GUIDE the user (not just show blank space)

Minimalism means removing noise, not removing signal.

---

## Rule 7: Implementation Order

Follow the master checklist priority order. For each screen:

1. Read existing component, list all features
2. Map features to new design (Standard/Focused/Pocket template)
3. Identify gaps, log them
4. Implement the restyle
5. Verify all features are accessible
6. Test responsive (desktop → tablet → mobile)
7. Test states (empty, loading, error, full)
8. Mark screen as done in checklist

---

## Rule 8: No Emojis in UI

- Only Copilot chat responses may use emojis
- All UI uses the 106-icon SVG library
- All status uses colored dots + text labels
- All ontology references use colored inline pills
- No Unicode symbols as substitutes (no ★ ● ▸ etc. — use SVG icons)
- Exception: basic punctuation marks and mathematical symbols are fine

---

## Rule 9: Time Format

- Default: 24h format (08:00, 14:30, 23:59)
- User setting available for 12h format
- All mockups and implementations use 24h as default
