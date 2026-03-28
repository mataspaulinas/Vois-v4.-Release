# VOIS Visual Reset Constitution
## Plus Execution Prompt for Designers / Frontend Squad / AI Agents

Version: 1.0  
Status: Active governing document  
Scope: visual reset of VOIS to a neutral, disciplined baseline  
Goal: remove all old visual language and replace it with a tokenized, easily reskinnable design system

Governance note:

- this document governs visual reset work only
- it does not override product truth, auth, ontology, routing, or execution semantics
- if this document conflicts with [Contributor Constitution](../../CONTRIBUTOR_CONSTITUTION.md) or [OIS Core / Ontology Constitution](OIS_CORE_ONTOLOGY_CONSTITUTION.md), those constitutions win

---

# PART I - VOIS Visual Reset Constitution

## 1. Purpose

This reset exists to wipe the app's inherited visual drift and replace it with one neutral baseline system.

The new visual baseline must be:

- calm
- highly readable
- low-noise
- modern
- premium but restrained
- operational rather than decorative
- easy to reskin later without touching product logic

The reset is not a feature redesign.  
It is not a workflow rewrite.  
It is not a chance to invent product semantics through styling.

It is a controlled visual reset only.

---

## 2. Design intent

The target feel is:

- neutral and sharp
- clean like a serious productivity product
- restrained like ChatGPT/OpenAI product interfaces in spirit
- strong hierarchy, low ornament
- clear states, clear density, clear structure
- no "dashboard chaos"
- no startup-template clutter
- no role-based rainbow branding

The app should feel like:

one product, three roles, one visual language

---

## 3. Non-negotiable visual laws

### Law 1 - Token-first only

All colors, typography, spacing, radius, shadows, motion, and z-index values must come from tokens.

No ad hoc page-level styling values.

### Law 2 - One visual system

Owner, Manager, and Pocket may differ in density and composition, but not in brand language.

### Law 3 - Typography does more work than color

Hierarchy must come primarily from:

- size
- weight
- spacing
- layout

not decorative color variation.

### Law 4 - Color indicates meaning, not personality

Color may indicate:

- primary action
- success
- warning
- danger
- info

It may not be used casually to make screens "interesting."

### Law 5 - One icon family only

No mixed icon sets.

### Law 6 - Motion must be subtle

Animation exists for:

- continuity
- clarity
- state feedback

not spectacle.

### Law 7 - No page-level reinvention

Pages must consume the system. They may not invent their own visual grammar.

### Law 8 - No semantic change through visual reset

This phase may not change:

- active vs draft truth
- role defaults
- route ownership
- task semantics
- ontology/core boundary
- permission logic

---

## 4. Scope of the reset

### In scope

- color system
- typography system
- spacing scale
- radius scale
- shadow system
- motion system
- icon system
- primitive components
- shell structure styling
- page layout styling
- visual states
- empty/loading/error states

### Out of scope

- new product features
- new pages unless strictly necessary
- workflow redesign
- backend logic changes
- ontology behavior changes
- role model changes
- information architecture changes unless separately approved

---

## 5. Baseline aesthetic rules

### Palette

The baseline palette must be:

- white / near-white backgrounds
- subtle neutral surface steps
- dark neutral text
- restrained border system
- one primary accent family
- semantic colors for meaning only

Do not use:

- bright gradients
- role-colored shells
- decorative neon
- multiple independent accent colors by module

### Typography

Use one primary neutral sans-serif family:

- Inter preferred
- system sans acceptable fallback

Use one mono family for code/IDs if needed.

Typography roles must be fixed:

- Display
- Page title
- Section title
- Card title
- Body
- Secondary body
- Label
- Caption
- Mono

Do not create many one-off text sizes.

### Surfaces

Surfaces should be:

- mostly flat or softly elevated
- separated by border, spacing, and hierarchy
- not over-shadowed
- not card-stacked for no reason

### Borders

Borders should be subtle and consistent.

Do not mix:

- heavy borders
- random separators
- multiple border colors on one page

### Shadows

Use a very small shadow system:

- sm
- md
- lg

No custom per-page shadows.

### Radius

Use a constrained radius scale:

- sm
- md
- lg
- xl

No random rounded values in page code.

### Motion

Allow:

- opacity transitions
- soft translate
- drawer transitions
- loading shimmer
- hover/press feedback
- small accordion/card expansions

Do not allow:

- bouncy motion
- attention-seeking animated ornaments
- large decorative screen transitions

---

## 6. Required token system

At minimum define tokens for:

### Color tokens

- bg
- bg-muted
- surface
- surface-subtle
- surface-elevated
- text-primary
- text-secondary
- text-muted
- border-subtle
- border-strong
- accent
- accent-foreground
- success
- success-foreground
- warning
- warning-foreground
- danger
- danger-foreground
- info
- info-foreground

### Typography tokens

- font-sans
- font-mono
- text-display
- text-page
- text-section
- text-card
- text-body
- text-small
- weight-regular
- weight-medium
- weight-semibold
- weight-bold
- lh-tight
- lh-normal
- lh-loose

### Spacing tokens

At minimum:

- 4
- 8
- 12
- 16
- 20
- 24
- 32
- 40
- 48

### Radius tokens

- radius-sm
- radius-md
- radius-lg
- radius-xl

### Shadow tokens

- shadow-sm
- shadow-md
- shadow-lg

### Motion tokens

- motion-fast
- motion-base
- motion-slow
- easing-standard
- easing-emphasized

### Layering tokens

- z-base
- z-sticky
- z-drawer
- z-modal
- z-toast

---

## 7. Primitive component set

These primitives must be system-owned and rebuilt before page work:

- Button
- IconButton
- Input
- Textarea
- Select
- Checkbox
- Radio
- Toggle
- Card
- Badge
- Tabs
- Segment control
- Drawer
- Modal
- Tooltip
- Table
- List row
- Empty state
- Skeleton
- Toast
- Banner
- Divider
- Avatar if needed

No page may ship custom replacements for these without explicit approval.

---

## 8. Domain component set

After primitives, rebuild domain-level components against the primitives:

- TaskCard
- SectionCard
- EventFeed
- CommentItem
- HelpRequestCard
- PlanRow
- PlanNode
- SignalChip
- FMChip
- RPChip
- ProofCard
- CopilotMessage
- CopilotThreadRow
- RoleHeader
- WorkspacePanel
- HistoryComparisonRow
- ReferenceEntityCard
- KBArticleCard

Domain components may carry product semantics, but not visual independence.

---

## 9. Page anatomy rules

Every major page must use a predictable anatomy:

- page header
- optional context strip
- main workspace
- optional secondary panel/drawer
- predictable actions area
- predictable loading/error/empty state

No page should invent a completely unrelated structure unless justified.

### Role density rules

#### Owner

- calmer
- more spaced
- more summary-driven
- lower information density

#### Manager

- most operationally dense
- clear action hierarchy
- support panels subordinate to the main workspace

#### Pocket

- touch-first
- high clarity
- single-task emphasis
- fewer simultaneous controls

---

## 10. Navigation rules

The reset must not create:

- extra primary destinations
- duplicate routes for the same purpose
- styling that suggests a new product structure where none exists

Visual work must preserve:

- one default home per role
- one dominant question per page

---

## 11. Accessibility and usability rules

The reset must preserve or improve:

- focus states
- keyboard visibility
- readable contrast
- touch target size
- loading clarity
- error clarity
- disabled-state clarity

No visual cleanup may remove usability.

---

## 12. Forbidden patterns

The following are banned:

- module-specific color identities
- random page-local colors
- gradient-heavy product chrome
- decorative badges everywhere
- multiple icon families
- excessive shadows
- ad hoc spacing values
- page-local font scales
- ad hoc hover states
- bespoke "special" cards on random pages
- animation for decoration only
- styling logic hidden inside page files
- introducing new routes to solve layout problems
- using visual emphasis to fake product importance

---

## 13. Required implementation order

The squad must work in this order only.

### Phase A - Token reset

Implement:

- color tokens
- typography tokens
- spacing tokens
- radius tokens
- shadow tokens
- motion tokens

### Phase B - Primitive reset

Rebuild all primitive components on the token system.

### Phase C - Shell reset

Apply baseline styling to:

- app frame
- sidebar
- top header
- page header
- container widths
- panel/drawer structure
- empty/loading/error states

### Phase D - Domain component reset

Rebuild domain components against primitives.

### Phase E - Page pass

Only after A-D are stable:

- Today
- Plan
- Graph/panel if applicable
- Assessment
- Report
- History
- Owner shell
- Pocket shell
- Reference
- KB
- Copilot

No page restyling should begin before primitives are stable.

---

## 14. Required deliverables

For the reset to be accepted, the squad must produce:

- token file(s)
- primitive component inventory
- domain component inventory
- shell screenshots
- before/after screenshots for key pages
- style migration notes
- known exceptions list
- visual regression checklist

---

## 15. Definition of done

The visual reset is complete only if:

- old visual language is gone
- all pages consume the token system
- primitives are consistent across the app
- role shells feel like one product
- no page uses ad hoc color/type/spacing values
- build/typecheck/tests still pass
- no product semantics changed accidentally
- future reskinning can happen mostly at the token/component level

---

# PART II - Execution Prompt

Use this prompt with the designer/frontend squad or an implementation agent.

```text
You are performing a strict visual reset of VOIS.

Goal:
Replace the entire inherited visual language with a neutral, disciplined baseline inspired by ChatGPT/OpenAI product clarity:
- calm
- restrained
- highly readable
- operational
- premium but low-noise

Important:
This is a visual system reset, not a feature rewrite and not a workflow redesign.

Non-negotiable rules:
1. Do not change product semantics.
2. Do not change role defaults.
3. Do not change active/draft logic.
4. Do not add or remove routes unless explicitly required and justified.
5. Do not style pages ad hoc.
6. Everything must be tokenized for easy future reskinning.
7. One visual system only across Owner, Manager, and Pocket.

Your implementation order is mandatory:

STEP 1 - Token system
Create or normalize a single design-token system for:
- color
- typography
- spacing
- radius
- shadow
- motion
- z-index

STEP 2 - Primitive rebuild
Rebuild or normalize all primitive components:
- Button
- Input
- Select
- Card
- Badge
- Tabs
- Drawer
- Modal
- Table
- Skeleton
- EmptyState
- Toast
and any other shared primitives

STEP 3 - Shell reset
Apply the baseline to:
- app frame
- sidebar
- page header
- top bar
- content containers
- empty/loading/error states

STEP 4 - Domain component reset
Normalize domain components:
- TaskCard
- EventFeed
- PlanRow / PlanNode
- CopilotMessage
- HelpRequestCard
- Signal/FM/RP chips
- HistoryComparisonRow
- Reference and KB cards

STEP 5 - Page pass
Only after tokens, primitives, shells, and domain components are stable:
restyle pages and screens.

Required visual direction:
- white / soft neutral backgrounds
- dark neutral text
- subtle borders
- one restrained accent family
- minimal shadows
- no rainbow module colors
- one icon family
- subtle motion only
- typography hierarchy stronger than color emphasis

You must preserve:
- one default home per role
- one dominant question per page
- role density differences by structure, not by different branding

You must not introduce:
- flashy gradients
- dashboard clutter
- new semantic states
- decorative color usage
- multiple icon sets
- page-local typography systems
- custom styling that bypasses tokens

Required output:
1. Token map
2. Primitive component list
3. Domain component list
4. Before/after screenshots for key surfaces
5. Files changed
6. Any exceptions or limitations
7. Confirmation that no product semantics changed

Acceptance gates:
- build passes
- typecheck passes
- visual hierarchy is consistent
- no page-level ad hoc styling remains in touched areas
- role shells still feel like one product
- future reskinning can mostly happen through tokens and shared components
```

---

## 16. Final rule

The visual reset succeeds only if the app becomes:

- easier to read
- easier to trust
- easier to extend
- easier to reskin later

If it becomes merely prettier but not more disciplined, the reset failed.
