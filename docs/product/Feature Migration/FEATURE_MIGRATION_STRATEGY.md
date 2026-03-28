# Feature Migration Strategy

Status: active governing planning document  
Scope: feature recovery from `OIS_Cafe_v2` into current `VOIS v4.release`

## 1. Purpose

This strategy translates the raw donor analysis in this folder into a disciplined migration plan that fits the product as it exists now.

It does not authorize legacy code transplant.
It does not authorize architecture regression.
It does not authorize café assumptions leaking back into core.

Its purpose is to restore product depth while preserving the cleaner machine now being built in `VOIS v4.release`.

## 2. Governing rule

`OIS_Cafe_v2` is a donor of product value, not a source of architectural truth.

Current `VOIS v4.release` remains authoritative for:

- role model
- auth and authorization
- owner claim and workspace setup
- venue ontology binding
- core vs ontology separation
- active vs draft workflow truth
- historical artifact identity
- hosted/local deployment posture

If this strategy conflicts with the current constitutions or architecture docs, those documents win.

Relevant governing documents:

- [README.md](../../README.md)
- [Technical Specification](../TECHNICAL_SPECIFICATION.md)
- [OIS Core / Ontology Constitution](../../architecture/OIS_CORE_ONTOLOGY_CONSTITUTION.md)
- [Real Authorization Matrix](../../architecture/REAL_AUTHORIZATION_MATRIX.md)

## 3. Current VOIS baseline

This strategy assumes the current product baseline is:

- normal boot is empty-by-default
- the first authenticated owner claims and creates the first organization in-product
- owner provisions venues, roles, and access inside VOIS
- owner, manager, and barista use role-native shells rather than a shared developer frame
- developer is the only role that should see diagnostics-oriented chrome
- venue meaning is resolved through ontology binding and mounted ontology packs
- non-developer AI flows should fail closed when live AI is unavailable
- execution truth is protected by active vs draft discipline

This matters because the donor app predates those disciplines.
The migration work must strengthen the current product, not drag it backward.

## 4. Migration laws

### 4.1 Restore capability, not implementation

Restore:

- product surfaces
- workflow sequence
- user trust layers
- operational richness
- explainability and learning depth

Do not restore:

- old file structure
- old monolithic JavaScript patterns
- old route naming by habit
- old persistence shortcuts
- old auth posture
- old demo-seeded workspace assumptions

### 4.2 Preserve current truth boundaries

Do not create or weaken duplicate truths for:

- reviewed signals
- report lineage
- active plan execution
- historical artifact meaning
- venue access and role authority

### 4.3 Respect the Core / Ontology split

Core owns:

- shells
- workflow mechanics
- artifact models
- execution and review mechanics
- libraries/help/KB engines as systems
- thread, file, and activity infrastructure

Ontology packs own:

- domain signals
- domain intervention content
- domain doctrine
- domain reference
- domain KB content
- domain-specific interpretation language

No migration wave may reintroduce café-specific defaults into core runtime.

### 4.4 Respect role-native product structure

The target product shape is:

- `owner`
  - setup, portfolio, organization administration, people/access administration, venue creation
- `manager`
  - venue workspace, assessment, signal review, plan, report, history, venue copilot
- `barista`
  - pocket workflow, My Shift, standards, help, proof/log flows
- `developer`
  - diagnostics, workbench, mount inspection, parity-only tooling

The donor app's shared shell must be translated into this structure, not reintroduced wholesale.

### 4.5 Migrate in waves only

No broad parallel feature expansion.
No random page-by-page copying.
No visual redesign used to smuggle semantic changes.

Each migration wave must have:

- scoped area
- current-state audit
- donor capability summary
- gap statement
- implementation closure report

## 5. Capability classification

### 5.1 Must restore

These are the highest-value donor capabilities and should return in disciplined early waves:

- venue workspace shell
- assessment UX richness
- visible signals review
- plan execution richness
- history continuity

### 5.2 Strongly restore

These are major richness surfaces that should return once the serious workflow spine is stable:

- console / copilot richness
- owner portfolio / home triage layer
- report artifact confidence
- libraries / ontology browsing
- help / manual / tours / terminology

### 5.3 Restore as systems with content split

These should return, but only with explicit separation between core systems and ontology content:

- knowledge base engine
- product help vs domain doctrine
- notifications / activity realism

### 5.4 Protect for later restoration

These are strategically valuable, but they should return only after the main product workflow is stable:

- signal map / heatmap / advanced intelligence surfaces
- deeper admin/settings trust surfaces beyond launch needs

## 6. Target landing map

### 6.1 Owner surfaces

Target owner responsibilities:

- first-run setup and claim
- portfolio heartbeat and venue triage
- venue creation
- ontology binding visibility where allowed
- people, role, and access administration
- strategic read-through into venue health, reports, and history

Donor capabilities that should land here:

- portfolio / home heartbeat
- compare and cross-venue triage
- selected cross-venue copilot intelligence later
- higher-level activity and notification summaries

### 6.2 Manager surfaces

Target manager workspace:

- Overview
- Assessment
- Signals Review
- Copilot
- Plan / Execution
- Report
- History

This is the primary donor landing zone.
It is where most of the old app's operational richness should be re-expressed.

### 6.3 Pocket surfaces

Target pocket responsibilities:

- My Shift
- standards lookup
- help request
- report/log/proof flows

Pocket should not inherit the donor app's full workspace shell.
It should receive only the role-appropriate fragments of that richness.

### 6.4 Developer surfaces

Developer should keep:

- diagnostics
- ontology workbench
- mount inspection
- parity/testing tools

Developer should not remain the hidden default personality of the product.

## 7. Migration waves

### Wave 1 — Serious workflow spine

Scope:

- venue workspace shell
- assessment UX richness
- signals review

Reason:

- this is the core operational chain
- it most directly affects trust in the product
- it is the minimum recovery needed to make venue work feel serious again

### Wave 2 — Execution and continuity

Scope:

- plan execution richness
- history continuity
- report artifact confidence

Reason:

- diagnosis without rich execution and memory still feels thin
- this wave restores accountability, continuity, and formal artifacts

### Wave 3 — Living intelligence

Scope:

- console / copilot richness
- portfolio / home triage
- notifications / activity realism

Reason:

- this wave makes the app feel alive, contextual, and multi-venue aware
- it should follow workflow stabilization, not precede it

### Wave 4 — Explainability and adoption

Scope:

- libraries / reference browsing
- help / manual / tours / terminology
- knowledge base engine

Reason:

- this wave makes the system teachable and explainable
- it is where much of the donor app's hidden maturity should be restored cleanly

### Wave 5 — Advanced platform intelligence

Scope:

- signal map / heatmap / intelligence map
- deeper advanced settings/admin trust surfaces
- systemic portfolio intelligence

Reason:

- this is distinctive, but it is not the first-live dependency
- it should be rebuilt only after the core workflow and ontology seams are stable

## 8. Area-by-area applicability to current VOIS

### Portfolio / Home

- target home: owner portfolio / command surface
- fit with current VOIS: strong
- caution: do not let it become a decorative dashboard or a duplicate owner home

### Venue workspace shell

- target home: manager venue shell with selected owner read-through
- fit with current VOIS: strong
- caution: preserve current role shells and route ownership

### Overview

- target home: first page inside a venue
- fit with current VOIS: strong
- caution: keep it situational, not a duplicate dashboard or plan page

### Assessment

- target home: manager venue workflow
- fit with current VOIS: very strong
- caution: preserve ontology-bound execution and historical identity

### Signals Review

- target home: explicit stage after assessment
- fit with current VOIS: very strong
- caution: reviewed signals must remain formal truth, not informal UI state

### Console / Copilot

- target home: manager venue copilot and later owner portfolio copilot
- fit with current VOIS: strong
- caution: never let copilot become a second truth system or a hidden executor

### Plan

- target home: manager execution workspace
- fit with current VOIS: very strong
- caution: restore richness without weakening active vs draft discipline

### Report

- target home: venue report artifact view
- fit with current VOIS: strong
- caution: keep provenance visible and tied to reviewed-signal lineage

### History

- target home: venue history page
- fit with current VOIS: very strong
- caution: preserve stored ontology identity for historical truth

### Libraries / Reference

- target home: universal reference shell with mounted ontology content
- fit with current VOIS: very strong
- caution: this is a boundary surface between core shell and ontology content; keep that boundary explicit

### Knowledge Base

- target home: universal KB engine plus mounted domain content
- fit with current VOIS: strong
- caution: separate product knowledge from domain doctrine

### Help / Manual / Tours

- target home: product help center with role-aware onboarding
- fit with current VOIS: strong
- caution: do not mix domain doctrine into universal product help

### Settings

- target home: split between user settings and admin/system trust surfaces
- fit with current VOIS: moderate to strong
- caution: avoid turning settings into a junk drawer of old environment controls

### Users / Notifications / Activity

- target home: role-aware activity and alerting layer
- fit with current VOIS: strong
- caution: restore useful movement, not noise or fake activity

### Signal Map / Heatmap

- target home: later owner intelligence and advanced manager analysis
- fit with current VOIS: conditional
- caution: do not make this an early dependency before ontology graph and action hooks are mature

## 9. What must not be carried over

The following patterns are explicitly rejected:

- demo venue names and demo workspace assumptions in normal runtime
- shared-shell thinking that ignores role-native frames
- café wording in universal product surfaces
- product help mixed with café/domain doctrine
- old storage shortcuts and route structures
- hidden AI side effects
- weak report/plan/history lineage
- chat surfaces that mutate truth invisibly
- legacy JS file organization as an implementation template

## 10. Required execution method

Every migration wave should follow this sequence:

1. audit the current VOIS implementation in the scoped area
2. audit the donor capability in `OIS_Cafe_v2`
3. write a specific gap statement
4. identify what current VOIS already does better and must protect
5. implement only the scoped wave
6. run checks
7. produce a closure report with an honest verdict

Recommended verdicts:

- `CLOSED`
- `IMPLEMENTED BUT NOT STABILIZED`
- `PARTIAL`
- `BLOCKED`

## 11. Success standard

This migration succeeds only if VOIS becomes:

- richer in user-facing operational depth
- more trustworthy in workflow and artifact lineage
- more explainable without ontology leakage into core
- easier to learn and operate
- more role-real, not more demo-like

The simplest summary is:

- preserve current VOIS as the clean machine
- recover `OIS_Cafe_v2` as product richness
- never let donor implementation become architectural authority
