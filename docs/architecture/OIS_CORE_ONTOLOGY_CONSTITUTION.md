# OIS Core / Ontology Constitution

## 1. Status

This document is the governing implementation constitution for splitting [VOIS v4.release](../..) into:

- `OIS Core`
- mountable `Ontology Packs`

It is not a vision note.
It is not a migration diary.
It is the execution law for the split.

If code, folder moves, or schema changes conflict with this document, this document wins unless it is explicitly superseded.

Contributor behavior and merge discipline are governed by:

- [Contributor Constitution](../../CONTRIBUTOR_CONSTITUTION.md)

## 2. Purpose

The current product root is still carrying multiple architecture layers at once:

- a universal product core
- an ontology runtime package layer
- mountable ontology packs and shared canon
- an embedded-engine compatibility archive

That is useful for getting the product rebuilt, but it is not the final architecture.

The purpose of this constitution is to:

- define the canonical separation line
- freeze the terminology
- define the required runtime identity model
- define the ontology mount contract
- define pack validation levels
- define invalid-pack behavior
- define what must never remain hardcoded from Cafe
- define the safe execution order for the split

## 3. Canonical Glossary

These terms are locked and should be used consistently in code, docs, and planning.

- `OIS Core`
  - The universal operational machine.
  - Owns product behavior, persistence, transport, roles, workflows, audit, and runtime orchestration.
- `Ontology Pack`
  - A domain package that provides industry meaning.
  - Example: `cafe`.
  - Future example: `dental`.
- `Ontology Manifest`
  - The pack identity and compatibility file.
  - Declares pack id, version, mount entrypoints, and compatibility.
- `Ontology Mount`
  - A resolved runtime instance of an ontology pack.
  - It tells the app what is mounted, where it lives, what version it is, and whether it is valid.
- `Venue Ontology Binding`
  - The explicit venue or workspace assignment to an ontology pack/version.
- `Adapter`
  - The compatibility layer between runtime pack artifacts and engine/runtime consumers.
- `Core Canon`
  - The shared universal semantic layer outside any pack.
  - It is not UI product code and it is not Cafe-owned.
- `Source Ontology Assets`
  - Authoring-time CSV, JSON, tools, standards, reference, and pack-local content used to build a pack.
- `Runtime Ontology Artifacts`
  - The validated, mounted artifacts actually consumed by the app and engine.

## 4. Current Root Diagnosis

The current root [VOIS v4.release](../..) contains four architecture layers:

- Product core under [apps](../../apps)
- Ontology runtime under [packages](../../packages)
- Mountable ontology packs and shared canon under [ontology_packs](../../ontology_packs) and [ontology_shared](../../ontology_shared)
- Archived extracted-engine migration evidence under [embedded_engine/OIS_Cafe_v2](../../embedded_engine/OIS_Cafe_v2)

This split is not yet clean because runtime meaning is still spread across:

- [apps/api/app/services/ontology.py](../../apps/api/app/services/ontology.py)
- [packages/ontology_runtime](../../packages/ontology_runtime)
- [ontology_packs](../../ontology_packs)
- [ontology_shared](../../ontology_shared)
- [apps/api/app/libs](../../apps/api/app/libs)

## 5. Separation Line

### 5.1 What belongs in OIS Core

These remain in core:

- auth and sessions
- organizations, users, venues, workspace structure
- assessments as a product concept
- draft, active, archived plan lifecycle
- plans, tasks, dependencies, task events
- comments
- progress entries
- help requests
- evidence and deliverable proofs
- files and upload metadata
- copilot thread and message infrastructure
- history and auditability
- report and history surfaces as product concepts
- owner, manager, and pocket shells
- health, readiness, scheduler model, notifications
- persistence model
- API transport
- ontology loading, validation, binding, and mount resolution machinery

Concrete current anchors:

- [apps/api/app/models/domain.py](../../apps/api/app/models/domain.py)
- [apps/api/app/schemas/domain.py](../../apps/api/app/schemas/domain.py)
- [apps/api/app/services/plans.py](../../apps/api/app/services/plans.py)
- [apps/api/app/services/help_requests.py](../../apps/api/app/services/help_requests.py)
- [apps/web/src/features](../../apps/web/src/features)

### 5.2 What belongs in an Ontology Pack

These belong to a mounted pack, never to core:

- domains
- modules
- signals
- failure modes
- response patterns
- signal to failure-mode mappings
- failure-mode to response-pattern mappings
- response-pattern to block mappings
- response-pattern to module mappings
- module dependencies
- block definitions
- tool definitions
- domain standards content
- domain reference content
- domain-specific KB content
- domain extraction hints and domain terminology
- optional domain-specific report language

### 5.3 Borderline but default-core

These may be configurable, but are core-owned by default:

- page chrome
- layout
- role shell structure
- generic headings
- generic dashboard emphasis
- product Help

Rule:

- if it changes the machine, it is core
- if it changes the meaning, it is ontology

## 6. Required Runtime Identity

The minimum persisted ontology identity is locked.

For every runtime artifact that must remain historically truthful, the following fields are required:

- `ontology_id`
- `ontology_version`
- `core_canon_version`
- `adapter_id`
- `manifest_digest`

This is mandatory for:

- `Assessment`
- `EngineRun`
- `OperationalPlan`

This identity must be added to:

- [apps/api/app/models/domain.py](../../apps/api/app/models/domain.py)
- [apps/api/app/schemas/domain.py](../../apps/api/app/schemas/domain.py)

`manifest_digest` is required, not optional.

Reason:

- version strings alone are not enough to guarantee historical truth
- the digest is the last defense against accidental or sloppy pack mutation

## 7. Venue Ontology Binding Law

`Venue.vertical` is not a sufficient runtime authority.

It may remain temporarily as a compatibility label, but it must stop being the machine's source of truth.

The app must introduce an explicit venue binding model:

- `venue_id`
- `ontology_id`
- `ontology_version`
- `binding_status`
- `bound_at`
- `bound_by`

The binding resolver becomes the only way to answer:

- what pack is mounted for this venue now
- what version is mounted now
- whether the mount is valid
- whether new runs are allowed

## 8. Ontology Manifest Law

Every mountable pack must contain `ontology_manifest.json`.

Minimum manifest contract:

```json
{
  "ontology_id": "cafe",
  "display_name": "Cafe",
  "version": "2.0.0",
  "core_compat": ">=4.0.0,<5.0.0",
  "status": "active",
  "core_canon_version": "v3",
  "adapter_id": "cafe",
  "entrypoints": {
    "source_root": "source",
    "runtime_bundle": "runtime/published/2.0.0/ontology.json",
    "engine_mount_root": "runtime/engine_mount",
    "reference_root": "runtime/reference",
    "standards_root": "runtime/standards",
    "kb_root": "runtime/kb"
  }
}
```

Every active pack must now carry an `ontology_manifest.json` under [ontology_packs](../../ontology_packs), and missing or invalid manifests are a real blocker for binding and new execution.

## 9. Source vs Runtime Artifact Law

These are different and must stay different.

### 9.1 Source ontology assets

These are authoring-time assets:

- `source/01_ontology`
- `source/03_tools`
- `source/05_data`
- `source/standards`
- `source/reference`
- `source/kb`

### 9.2 Runtime ontology artifacts

These are validated runtime assets:

- `runtime/published/<version>/ontology.json`
- `runtime/engine_mount`
- `runtime/reference`
- `runtime/standards`
- `runtime/kb`

Core must mount runtime artifacts.
Core must not parse raw CSV authoring files on every request.

## 10. Minimum Ontology Pack Contract

The minimum mountable ontology contract is locked.

### 10.1 Required source assets

In `source/01_ontology/`:

- `domains.csv`
- `modules.csv`
- `signals.csv`
- `failure_modes.csv`
- `response_patterns.csv`
- `signal_to_fm_map.csv`
- `fm_to_rp_map.csv`
- `rp_to_block_map.csv`
- `rp_to_module_map.csv`
- `module_dependencies.csv`

In `source/03_tools/`:

- one or more tool JSON files referenced by blocks or response patterns

Optional but versionable:

- `source/05_data/`
- `source/standards/`
- `source/reference/`
- `source/kb/`

### 10.2 Required semantic concepts

Every pack must supply:

- signals
- failure modes
- response patterns
- blocks
- tools
- mappings
- dependencies
- human-readable display labels and descriptions

### 10.3 Required runtime outputs

Every pack must build:

- a published bundle
- an engine mount root
- indexed reference content if reference exists
- indexed standards content if standards exist
- indexed KB content if KB exists

## 11. Core Canon Law

The shared canon is not the same thing as product core.

The current `core.json` lineage under [ontology/core/published](../../ontology/core/published) should become shared semantic infrastructure, for example:

- `ontology_shared/core_canon/published`

That shared canon is:

- outside the app product core
- outside any individual pack
- versioned independently

## 12. Engine Mount Law

The engine must never guess its ontology from repo-relative donor folders.

The engine must consume an `OntologyMount`.

Conceptual contract:

```python
OntologyMount(
    ontology_id="cafe",
    version="2.0.0",
    display_name="Cafe",
    manifest_digest="...",
    core_canon_version="v3",
    adapter_id="cafe",
    runtime_bundle_path="...",
    engine_mount_root="...",
    reference_root="...",
    standards_root="...",
    kb_root="...",
    status="active"
)
```

Current blockers:

- [apps/api/app/services/assessment_runtime.py](../../apps/api/app/services/assessment_runtime.py)
- [apps/api/app/services/legacy_bridge.py](../../apps/api/app/services/legacy_bridge.py)
- [packages/engine_runtime/ois_engine/resources.py](../../packages/engine_runtime/ois_engine/resources.py)

## 13. Historical Truth Law

Historical artifacts must never be reinterpreted under the currently mounted ontology by accident.

Therefore:

- old assessments keep the ontology identity they were created under
- old engine runs keep the ontology identity they executed under
- old plans keep the ontology identity they were materialized under
- report, history, and reference views must resolve display labels from the stored artifact identity, not current venue binding

Current blocker:

- [apps/api/app/services/engine_history.py](../../apps/api/app/services/engine_history.py) still resolves signal names from the default bundle

## 14. Invalid-Pack Behavior

This is locked.

If a pack is already bound to a venue and later fails validation:

- historical artifacts still render
- new assessment executions are blocked
- new engine runs are blocked
- active historical plans remain readable
- managers see a clear configuration error
- silent fallback to another pack is forbidden
- auto-rebinding is forbidden

Only an explicit rebind operation may change a venue's mounted pack.

If a venue already has an active plan, rebinding rules must enforce a transition boundary before new runs are allowed.

## 15. Pack Validation Levels

Pack validation is locked into three levels.

### 15.1 Structural validation

Checks:

- manifest exists
- required files exist
- schemas are valid
- IDs are unique
- referenced files exist

### 15.2 Semantic validation

Checks:

- no orphan modules
- no orphan signals
- no orphan mappings
- no failure mode without meaningful inbound mapping unless explicitly allowed
- no response pattern without a valid failure-mode path
- no block referenced but missing
- no impossible dependency cycles unless explicitly allowed
- display names and descriptions are present

### 15.3 Runtime validation

Checks:

- pack can mount
- assessment preview works
- engine run works
- report generation works
- reference content loads
- standards load if present
- KB content loads if present

Without runtime validation, a pack is not considered mountable.

## 16. What Core Must Never Hardcode From Cafe

The following must not survive in core runtime code:

- `restaurant` or `cafe` as runtime defaults
- Cafe signal IDs
- Cafe keyword heuristics
- Cafe failure mode IDs
- Cafe response pattern IDs
- Cafe block IDs
- Cafe tool paths
- Cafe standards copy
- Cafe reference copy
- Cafe KB copy
- Cafe report language
- Cafe demo venue naming
- Cafe or restaurant readiness strings

Concrete current offenders include:

- [apps/api/app/services/intake.py](../../apps/api/app/services/intake.py)
- [apps/api/app/services/engine.py](../../apps/api/app/services/engine.py)
- [apps/api/app/services/bootstrap.py](../../apps/api/app/services/bootstrap.py)
- [apps/api/app/api/routers/bootstrap.py](../../apps/api/app/api/routers/bootstrap.py)
- [apps/api/app/api/routers/ontology.py](../../apps/api/app/api/routers/ontology.py)
- [apps/api/app/services/ai_runtime.py](../../apps/api/app/services/ai_runtime.py)
- [apps/web/src/lib/api.ts](../../apps/web/src/lib/api.ts)
- [apps/web/src/App.tsx](../../apps/web/src/App.tsx)
- [apps/web/src/features/views/KnowledgeBaseView.tsx](../../apps/web/src/features/views/KnowledgeBaseView.tsx)

## 17. Target Repo Shape

The target runtime shape is:

```text
VOIS/
  apps/
    api/
    web/
  packages/
    core_contracts/
    engine_runtime/
      ois_engine/
    ontology_runtime/
  ontology_shared/
    core_canon/
  ontology_packs/
    cafe/
    dental-template/
  scripts/
  docs/
```

## 18. Execution Order Law

This order is mandatory.

1. Add ontology identity fields and binding model
2. Build mount registry and resolver
3. Convert runtime consumers to use resolver
4. Remove hardcoded Cafe or restaurant defaults from core
5. Build Cafe as a self-contained ontology pack
6. Introduce dental-template as a structurally valid second pack
7. Move engine package to the new runtime home
8. Archive legacy donor material only after runtime paths are clean

The following rule is absolute:

Do not move Cafe files physically until the resolver exists and runtime consumers no longer depend on `restaurant` defaults.

## 19. What Must Not Be Touched Early

Until the seams above are stable, do not rewrite:

- task lifecycle logic
- draft vs active plan semantics
- help-request semantics
- role shells
- task mutation rules
- copilot thread/message infrastructure

The split is about runtime meaning boundaries first, not product redesign.

## 20. First Implementation Slice

The first concrete implementation slice is:

1. Add required identity fields to:
   - [apps/api/app/models/domain.py](../../apps/api/app/models/domain.py)
   - [apps/api/app/schemas/domain.py](../../apps/api/app/schemas/domain.py)
2. Add venue binding persistence and resolution
3. Split [apps/api/app/services/ontology.py](../../apps/api/app/services/ontology.py) into:
   - manifest schema
   - registry
   - resolver
   - validator
4. Implement three validation levels
5. Define invalid-pack runtime behavior
6. Remove live `restaurant` defaults from core runtime consumers

Only after that should Cafe files move into their final pack directory.

## 21. Success Standard

The split is real only when all of these are true:

- a venue is explicitly bound to `cafe`
- a second venue can bind to `dental-template` without core code changes
- assessment, engine run, plan, report, reference, and support surfaces resolve ontology by mount
- history still renders old artifacts correctly after a venue rebind
- no runtime consumer depends on `restaurant` defaults
- Cafe is only one mounted pack, not the identity of the product

## 22. Summary Rule

The simplest governing sentence is:

Core owns operation.
Packs own meaning.
History owns the exact ontology identity it was created under.
