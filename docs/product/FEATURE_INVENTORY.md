# Feature Inventory

## 1. Platform shell

### Global shell

- sticky application header
- collapsible sidebar
- mobile-aware shell layout
- hash-based route persistence
- theme and skin persistence
- welcome/resume overlay

### Top-level views

- portfolio
- venue
- reference
- knowledge base
- settings
- manager shell
- pocket shell
- owner shell

## 2. Venue workspace

### Overview

- venue pulse
- execution summary
- recent movement
- handoff into assessment, plan, and report

### Assessment

- draft-first intake
- signal-state editing
- AI-assisted intake
- saved assessment history
- review state for newly generated draft plans
- explicit activation path when an active plan already exists

### History

- assessment timeline
- comparison between snapshots
- signal addition/reduction comparison
- report/run selection from history

### Plan

- grouped plan view
- active-vs-historical labeling
- dependency summary embedded in the page
- blocked task visibility
- upstream/downstream task links
- execution mutation guarded to active plans only

### Report

- failure-mode and response-pattern display
- report history
- persisted diagnostic spine
- AI-enhanced narrative
- grounding references
- trust surface for normalized-signal count, snapshots, report markdown, and AI trace

## 3. Manager shell

### Today

- active execution truth
- next executable work
- blocked work visibility
- support view into live operational state

### Workspace

- venue execution workspace
- active plan summary
- supporting operational context

### Plan

- active-plan structure
- historical selection support
- dependency context embedded in-page

### Evidence

- supporting evidence/trust context

### Team

- execution-adjacent people/team support

### Escalations

- escalation lane visibility

### Copilot

- venue-grounded Copilot access from manager context

## 4. Owner shell

### Command

- owner default home
- ranked attention surface
- portfolio-style strategic pulse

### Delegations

- delegation tracking support

### People

- people-intelligence support

### Copilot

- owner-context Copilot access

## 5. Pocket shell

### My Shift

- employee default home
- shift-oriented work context
- current-task awareness

### Standards

- standards lookup
- procedural guidance support

### Help

- create help request
- list open/recent help requests
- open linked help-request thread
- mark help request closed
- passive tips content that no longer pretends to be the workflow itself

### Report

- report-something lane

### Log

- personal log / diary lane

## 6. Copilot

### Threading

- persisted thread list
- persisted thread detail
- grounded conversation state
- linked help-request threads

### Message features

- references
- file attachments
- attachment-aware display in drawer
- signal-suggestion application flow for assessment review

### Context behavior

- venue-aware selection
- portfolio-aware selection
- support-lane integration

## 7. Help, knowledge, and reference

### Knowledge Base

- doctrine/operating-posture content
- ontology/evaluation posture support

### Reference

- signals
- blocks
- tools
- linked reference drill-down

### Help

- operational help-request lane exists
- product-help top-level destination still open

## 8. Engine and diagnostic surfaces

- extracted engine bridge
- persisted engine-run history
- normalized-signal persistence
- failure-mode persistence
- response-pattern persistence
- activation persistence
- plan snapshot persistence
- report markdown persistence
- AI trace persistence

## 9. Persistence-backed operational features

- assessments
- plans
- plan tasks
- task dependencies
- task comments
- task events
- progress entries
- follow-ups
- escalations
- deliverable proofs
- notification events
- help requests
- copilot threads/messages
- file assets

## 10. Platform and administration

- health endpoint
- readiness endpoint
- auth login/logout/session status
- migration-backed boot
- PostgreSQL compose service
- in-process scheduler gate
- upload-root support

## 11. Remaining open feature-quality items

- Pocket task drill-in should become task-native
- product Help should become a distinct top-level guidance destination
- Copilot should become more deeply role-aware
- clean-room relocation and bootstrap proof still need to be certified from this release root
