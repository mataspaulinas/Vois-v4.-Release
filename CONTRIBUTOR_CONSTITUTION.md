# VOIS Contributor Constitution
## Developer, Designer, Reviewer, and Agent Operating Manual

Version: 1.1  
Status: Active governing document  
Applies to: all developers, designers, AI agents, reviewers, and contractors touching [VOIS v4.release](.)

---

## 1. Purpose

This document exists to protect VOIS from drifting back into a stitched, confusing, unsafe product while still allowing teams to improve it quickly.

It defines:

- what is sacred
- what is flexible
- how changes are classified
- what each class of change is allowed to touch
- what evidence is required before merge
- what is forbidden

This is not a style guide only.  
This is not a suggestions document.  
This is the operating constitution for all future work.

---

## 2. Constitution hierarchy

This document governs contributor behavior.

The architecture and ontology boundary are governed by:

- [OIS Core / Ontology Constitution](docs/architecture/OIS_CORE_ONTOLOGY_CONSTITUTION.md)

Visual reset and design-system reset work are additionally governed by:

- [VOIS Visual Reset Constitution](docs/architecture/VOIS_VISUAL_RESET_CONSTITUTION.md)

If this document conflicts with the architecture constitution:

- the architecture constitution wins

If visual reset work conflicts with product semantics, routing, permissions, or ontology boundaries:

- this contributor constitution and the architecture constitution win over visual reset instructions

If a contributor is unsure whether a question is behavioral or architectural:

- treat it as architectural and escalate before implementation

---

## 3. Product truth

VOIS is one product made of two major parts:

### A. OIS Core

The universal operational machine.

This includes:

- assessments
- signals as a system concept
- failure modes as a system concept
- response patterns as a system concept
- plans
- tasks
- dependencies
- comments
- progress
- escalations
- help requests
- proofs
- notifications
- role shells
- history
- trust artifacts
- execution truth
- ontology loading, validation, and mounting logic

### B. Ontology Packs

Industry-specific meaning packs.

These include:

- domain signals
- domain failure modes
- domain response patterns
- domain blocks
- domain tools
- domain standards
- domain vocabulary
- domain reference content
- domain report language fragments
- domain-specific guidance

Core is the machine.  
Ontology is the cartridge.

No contributor may blur this boundary casually.

---

## 4. Non-negotiable product laws

The following are product laws. They are not optional.

### Law 1 — Active plan is the only execution truth

No screen, endpoint, or feature may use newest-generated or latest plan as execution truth when an active plan exists.

### Law 2 — One source of truth per operational concept

No change may introduce a second source of truth for:

- active plan
- task state
- role default home
- ontology loading
- permissions
- help lane
- thread identity
- signal definition

### Law 3 — Core and ontology remain separate

Domain-specific knowledge must not be hardcoded into core behavior unless explicitly approved as universal.

### Law 4 — One default home per role

Owner, Manager, and Pocket must each have one clear default home.

### Law 5 — Semantic lanes remain distinct

These may not be flattened casually:

- comment
- progress
- escalation
- help request
- report something
- log or proof
- copilot chat

### Law 6 — No frontend-only protection

Permissions, critical state transitions, and truth safeguards must exist in backend logic, not only in UI logic.

### Law 7 — No duplicate destinations for the same primary action

A change may not create a second equally plausible home for a primary action without explicit review and approval.

### Law 8 — No hidden fallbacks

Temporary logic, compatibility paths, legacy shims, and bypasses must be explicit, documented, owned, and removable.

### Law 9 — No industry defaults in core runtime

Core runtime code must not rely on hardcoded industry defaults such as `restaurant` or `cafe` except in clearly marked compatibility-only code with an owner and retirement plan.

### Law 10 — Historical ontology identity is protected

No contributor may weaken or remove the required runtime ontology identity fields from persisted historical artifacts:

- `ontology_id`
- `ontology_version`
- `core_canon_version`
- `adapter_id`
- `manifest_digest`

### Law 11 — Invalid mounted packs may not fail open

If a mounted ontology pack becomes invalid:

- historical artifacts still render
- new runs are blocked
- no silent fallback to another pack is allowed
- no auto-rebinding is allowed

---

## 5. Protected layers

All work must identify which layer it touches.

### Layer 1 — Sacred core

This includes:

- execution truth semantics
- ontology mounting
- engine contracts
- API truth contracts
- auth and permission model
- migrations and schema authority
- task and event truth
- active vs draft lifecycle
- historical ontology identity

Changes here are the most restricted.

### Layer 2 — Product logic

This includes:

- manager workflow
- owner workflow
- pocket workflow
- copilot behavior
- help and report flows
- support intelligence placement
- page ownership of actions

Changes here are allowed but governed.

### Layer 3 — UI shell and design system

This includes:

- layouts
- page composition
- spacing
- typography
- iconography
- motion
- skins and themes
- component styling

Changes here are flexible, but may not alter truth or workflow meaning implicitly.

### Layer 4 — Ontology content

This includes:

- ontology packs
- block libraries
- standards
- tools
- signal maps
- reference and KB content
- domain report language

Changes here require ontology validation.

---

## 6. Change classes

Every change must be classified before implementation begins.

### Class A — Visual only

Examples:

- button redesign
- typography changes
- icon replacement
- spacing adjustments
- animation refinement
- skin or theme change
- component styling update

May affect:

- Layer 3 only

Must not affect:

- truth
- workflow semantics
- permissions
- contracts
- ontology behavior

### Class B — UX structure

Examples:

- panel vs drawer decisions
- page layout redesign
- moving a feature from page to tab
- changing navigation order
- introducing a new page or route

May affect:

- Layer 2
- Layer 3

Must not affect:

- truth semantics unless explicitly reviewed

### Class C — Product behavior

Examples:

- help request flow
- new thread behavior
- task action changes
- new owner metrics
- workflow logic changes
- pocket drill-in behavior

May affect:

- Layer 2
- some Layer 1 interfaces

Requires product logic and workflow review.

### Class D — Core, runtime, or ontology system

Examples:

- contract changes
- engine behavior changes
- mounting logic changes
- auth changes
- persistence model changes
- active or draft lifecycle changes
- ontology format changes
- historical identity changes

May affect:

- Layer 1
- Layer 4

Requires the highest review level.

---

## 7. Required intake for any change

No contributor may begin implementation without a change request.

Required fields:

- title
- class (`A`, `B`, `C`, or `D`)
- problem being solved
- user role affected
- affected layer(s)
- affected screens, modules, and files
- whether truth is touched
- whether ontology is touched
- risk level
- acceptance criteria
- rollback condition

If this cannot be filled, the work is not ready.

---

## 8. Definition of done by class

### Class A — Visual only

Required:

- before and after screenshots
- frontend build green
- frontend tests green if affected
- no behavior change declared
- component-level regression check complete

### Class B — UX structure

Required:

- reason for structure change
- dominant question for each page or surface preserved
- no duplicate destination created
- role default not weakened
- screenshots or short walkthrough included
- workflow smoke test completed

### Class C — Product behavior

Required:

- mini-spec
- backend and frontend contract alignment
- acceptance criteria verified
- workflow impact documented
- tests added or updated
- regression check on adjacent flows complete

### Class D — Core, runtime, or ontology

Required:

- ADR or technical decision record
- affected-files list
- contract diff
- migration impact note
- ontology impact note if relevant
- parity impact note if relevant
- rollback path
- explicit approval before merge
- tests updated

No contributor self-approves Class D work.

---

## 9. Required gates

Every change must pass the correct gates.

### Green Gate — Build safety

Required repo checks:

- backend boot OK
- frontend build OK
- `python -m pytest -q` in [apps/api](apps/api)
- `npm run test` in [apps/web](apps/web)
- `npm run build` in [apps/web](apps/web)
- `alembic upgrade head` in [apps/api](apps/api)
- `alembic check` in [apps/api](apps/api)

### Blue Gate — Workflow safety

- role default home preserved
- primary workflow still coherent
- no duplicate destination introduced
- page ownership remains clear

### Orange Gate — Truth safety

- no draft or active leakage
- no cross-venue leakage
- no semantic lane collapse
- no second source of truth introduced

### Red Gate — Core safety

- contracts preserved or intentionally migrated
- auth and permissions safe
- ontology boundary preserved
- migrations valid
- parity unaffected or explicitly handled
- historical ontology identity preserved
- invalid-pack behavior preserved

Merge is blocked if required gates are not green.

---

## 10. What designers are allowed to do

Designers may change:

- visual hierarchy
- spacing
- typography
- iconography
- motion
- card layouts
- panel layouts
- drawer layouts
- skins and themes
- visual density
- empty states
- loading states
- responsive behavior

Designers may not change without approval:

- state semantics
- page ownership of core actions
- role defaults
- plan truth semantics
- task meaning
- lane semantics
- ontology or core boundary
- permission assumptions

Freedom in presentation does not equal freedom in product meaning.

---

## 11. What feature squads are allowed to do

Feature squads may:

- improve workflows
- add role depth
- improve support intelligence
- add panels, drawers, or tabs
- refine task and thread experience
- expand ontology-driven features through stable seams

Feature squads may not:

- invent new API shapes casually
- copy legacy architecture because a feature existed there
- hardcode Cafe logic into core
- create silent fallbacks
- flatten semantic lanes
- create new truth paths without review
- add new primary pages without proving they are needed

---

## 12. Mandatory artifacts

Depending on class, the following artifacts may be required:

- change request
- mini-spec
- screenshots
- walkthrough
- tests
- ADR
- contract diff
- migration note
- ontology validation note
- parity note
- rollback note

If the required artifact is missing, the change is incomplete.

---

## 13. Anti-patterns (forbidden)

The following are banned unless explicitly approved:

- copying legacy structure to restore a feature
- using latest plan as execution truth
- frontend-only permission protection
- generic message stream replacing distinct lanes
- hardcoding industry-specific values into core
- adding a page where a panel or drawer would do
- hidden debug or bypass logic in live workflows
- temporary compatibility code with no owner and no expiry
- silent fallback to old endpoints or old truth
- silent fallback to another ontology pack
- weakening historical ontology identity
- cosmetic redesign that weakens workflow clarity
- support intelligence becoming a competing operating mode

---

## 14. Mandatory questions before any merge

Every reviewer must ask:

1. What layer did this touch?
2. What class of change is this?
3. Did it alter truth?
4. Did it alter role defaults?
5. Did it create a second home for an action?
6. Did it introduce domain-specific assumptions into core?
7. Did it preserve semantic lanes?
8. Did it pass the required gates?
9. Is rollback possible?
10. Is the product more coherent after this change, not just richer?

If several answers are unclear, do not merge.

---

## 15. Role defaults that must remain protected

### Owner

Default home:

- `Command`

### Manager

Default home:

- `Today`

### Pocket

Default home:

- `My Shift`

These defaults may not be weakened casually.

---

## 16. Product surface rules

A page or surface must answer one dominant question.

Examples:

- `Today`: what moves now?
- `Plan`: what is the intervention structure?
- `Report`: what did this run conclude?
- `History`: what changed over time?
- `Pocket Shift`: what do I need to do now?
- `Owner Command`: where do I matter most?

If a new page cannot be described by one dominant question, it should not be added yet.

---

## 17. Ontology protection rules

When working on ontology features:

- ontology changes may not require core code edits unless the mounting contract itself changes
- domain-specific vocabulary belongs in ontology packs
- domain-specific signals, failure modes, response patterns, blocks, tools, standards, and reference content belong in ontology packs
- the app must read ontology through stable mounting seams
- historical artifacts must retain ontology identity and version context

No contributor may “just add a dental exception” or “just hardcode café logic” into core.

---

## 18. Escalation rules

A contributor must stop and escalate if:

- they are touching active or draft semantics
- they are unsure if something is core or ontology
- they need to add a new truth source
- they need to add a new route that competes with an existing role default
- they are changing contracts
- they are changing auth or permissions
- they are introducing a new persisted operational entity
- they are changing ontology identity or binding behavior
- they are changing invalid-pack handling
- they are moving a feature from support to primary workflow

Stop before implementation, not after damage.

---

## 19. Clean merge rule

A change is acceptable only if it makes the app:

- clearer
- safer
- more coherent
- more truthful
- more role-appropriate

or

- more visually disciplined

Richness alone is not enough.

---

## 20. Final principle

You may improve anything in VOIS.

But you may not:

- break the machine
- blur the ontology boundary
- split the truth
- weaken role clarity
- make the product broader at the cost of coherence

This is the standard for all future work.
