# Capability Inventory

## Operational core

### Assessment capture

The platform can:

- create venue-scoped assessments
- store assessment drafts
- reopen historical assessments
- persist selected signal IDs and signal-state details
- support evidence-first intake
- support AI-assisted intake and reviewed signal mutation

### Diagnostic execution

The platform can:

- call the embedded extracted engine through the API
- normalize signals
- activate failure modes
- activate response patterns
- derive raw and constrained block activations
- generate a structured action plan
- generate markdown report output
- persist engine-run artifacts and history

### Planning and execution

The platform can:

- create draft operational plans from engine output
- activate plans explicitly
- archive prior active plans on replacement
- persist tasks, dependencies, comments, events, and progress
- derive execution summaries such as next executable and blocked tasks
- preserve active-plan truth separately from latest-generated truth

## Persistence and audit

The platform can:

- persist canonical operational entities
- retain snapshot artifacts for engine truth
- keep audit records for operational mutations
- preserve report history and linked plan history
- retain file metadata for uploads and Copilot attachments

## Role-native workflows

### Manager

Manager capabilities include:

- Today workspace
- active execution workspace
- plan review and plan activation
- dependency-aware plan inspection
- escalations view
- evidence and team support views

### Owner

Owner capabilities include:

- command view
- delegation tracking
- people-intelligence support
- strategic oversight without becoming a task-level manager by default

### Pocket

Pocket capabilities include:

- My Shift
- standards lookup
- help request submission
- report-something flow
- personal log / diary flow

## Support intelligence

The platform can:

- persist Copilot threads and messages
- ground Copilot turns with references and attachments
- maintain linked help-request threads
- present report history
- present assessment history and comparison
- expose ontology-backed Knowledge Base and Reference surfaces

## Trust and evidence

The platform can:

- store normalized signals for engine runs
- store diagnostic snapshots
- store plan snapshots
- store report markdown
- store AI trace metadata
- render parts of that trust surface in Report and Copilot views

## Files and integrations

The platform can:

- register file assets
- list and inspect uploaded file metadata
- expose local content download for stored files
- ingest and normalize integration events
- maintain connector health and retry posture

## Administration and platform controls

The platform can:

- authenticate users with session-backed auth
- expose session posture and session controls
- expose health and readiness routes
- run migration-backed schema bootstrap
- use PostgreSQL as default operational DB
- use SQLite for dev/test support

## Current capability limits

This inventory is broad, but not every area is fully closure-certified. The main capability limits are:

- engine fidelity is still being judged against Phase 0 goldens
- Copilot support is stronger than before but not fully role-native
- product Help is not yet a distinct top-level usage-guidance destination
- Pocket task drill-in is still lighter than the ideal role depth
