# Phase 0 Workflow Inventory

This file lists the legacy workflows that must survive migration. It is intentionally behavior-first and maps each workflow to the current monolith surfaces.

## Workflow 1 - Authentication Bootstrap And Session Access

- Entrypoints: `/api/auth/setup`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/status`
- Legacy behavior: passphrase bootstrap writes `.env`; authenticated sessions gate almost every `/api/*` route
- Persisted state: `.env`, Flask session cookie

## Workflow 2 - Portfolio Home And Venue Opening

- Entrypoints: `/`, `/api/projects`, `/api/projects/stats`, `/api/project/<slug>`
- Frontend modules: `06_app/static/app.js`, `06_app/static/app-home.js`, `06_app/static/app-shell.js`, `06_app/static/sidebar-v2.js`
- Legacy behavior: load portfolio stats, recent activity, venue cards, then open a venue shell
- Persisted state: `05_data/venues/<slug>/project.json`

## Workflow 3 - Venue Or Project Lifecycle

- Entrypoints: `/api/brands`, `/api/brand/create`, `/api/project/create`, `/api/project/<slug>/update`, `/api/project/<slug>/archive`, `/api/project/<slug>/unarchive`, `/api/project/<slug>/delete`
- Frontend modules: `06_app/static/app.js`, `06_app/static/app-shell.js`
- Legacy behavior: create/update/archive/restore/delete project records, including brand linkage and metadata
- Persisted state: `05_data/venues/<slug>/project.json`, `05_data/system/brands.json`, `05_data/.trash/*`

## Workflow 4 - Assessment Intake

- Entrypoints: `/api/profiles`, `/api/profile/<filename>`, `/api/profile/save`, `/api/project/<slug>/assessment`, `/api/project/<slug>/assessments`, `/api/project/<slug>/assessment/<filename>`
- Frontend modules: `06_app/static/app.js`
- Legacy behavior: start from saved profiles or live intake, save snapshots, reopen prior assessments
- Persisted state: `05_data/sample_inputs/*.json`, `05_data/venues/<slug>/assessments/*.json`, `05_data/venues/<slug>/signal_history.json`

## Workflow 5 - AI Intake Or Signal Extraction

- Entrypoint: `/api/ai-intake`
- Frontend modules: `06_app/static/app.js`
- Legacy behavior: raw narrative text is sent to Anthropic-backed extraction, validated against the legacy signal library, and returned with confidence distribution plus unmapped observations
- Persisted state: typically captured indirectly inside saved assessment snapshots rather than a dedicated AI store

## Workflow 6 - Engine Run, Report Generation, And Plan Seeding

- Entrypoints: `/api/run`, `/api/report/<filename>`
- Legacy modules: `04_engine/signal_normalization.py`, `failure_mode_engine.py`, `response_pattern_engine.py`, `block_activation_engine.py`, `constraint_engine.py`, `plan_generator.py`, `report_generator.py`
- Legacy behavior: full pipeline run, markdown report generation, and optional operational-plan auto-build if the venue exists
- Persisted state: `05_data/sample_outputs/*.md`, `05_data/venues/<slug>/operational_plan.json`, `05_data/system/audit_events.json`

## Workflow 7 - Plan Review And Task Mutation

- Entrypoints: `/api/project/<slug>/plan`, `/api/project/<slug>/plan/task/<task_id>/status`, `/api/project/<slug>/plan/task/<task_id>/action/<action_id>/toggle`, `/api/project/<slug>/plan/task/<task_id>/comment`, `/api/project/<slug>/plan/task/<task_id>/deliverable/<int:idx>/toggle`, `/api/project/<slug>/plan/task/<task_id>/assign`, `/api/project/<slug>/plan/task/<task_id>/due-date`, `/api/project/<slug>/plan/review/request`, `/api/project/<slug>/plan/review/decision`, `/api/project/<slug>/plan/add-block`
- Frontend modules: `06_app/static/app.js`, `06_app/static/app-shell.js`
- Legacy behavior: task-state mutation, comments, assignment, due dates, review request/approval, and plan augmentation
- Persisted state: `05_data/venues/<slug>/operational_plan.json`, `05_data/system/audit_events.json`, `05_data/system/notifications.json`

## Workflow 8 - Progress, Timeline, And Escalation-Like Communication

- Entrypoints: `/api/project/<slug>/progress`, `/api/project/<slug>/timeline`, `/api/notifications`, `/api/notifications/<notification_id>/status`, `/api/notifications/proactive`
- Frontend modules: `06_app/static/app-shell.js`, `06_app/static/app-home.js`
- Legacy behavior: notes and updates are added to a timeline feed, while notifications expose follow-up and review pressure
- Persisted state: `05_data/venues/<slug>/progress/entries.json`, `05_data/system/notifications.json`, `05_data/system/audit_events.json`

## Workflow 9 - Copilot Threads, Messages, And Uploads

- Entrypoints: `/api/chat/threads`, `/api/chat/thread/<thread_id>`, `/api/chat/thread/<thread_id>/message`, `/api/chat/upload`, `/api/chat/uploads/<...>`, `/api/chat`, `/api/copilot/proactive`, `/api/briefing/welcome`
- Frontend modules: `06_app/static/app.js`, `06_app/static/app-shell.js`
- Legacy behavior: venue-scoped chat threads, archived threads, message append, file upload, proactive assistant prompts, and generalized copilot turn handling
- Persisted state: `05_data/venues/<slug>/chat_history/_index.json`, `05_data/venues/<slug>/chat_history/t_*.json`, `05_data/chat/`, `05_data/system/audit_events.json`

## Workflow 10 - Knowledge Base, Ontology, Help, Search, And SigMap

- Entrypoints: `/api/kb/articles`, `/api/kb/categories`, `/api/kb/domains`, `/api/help/*`, `/api/ontology/*`, `/api/tools`, `/api/search`, `/api/sigmap/*`
- Frontend modules: `06_app/static/app-kb.js`, `06_app/static/app-sigmap.js`, `06_app/static/help-system.js`
- Legacy behavior: browse helper content, inspect ontology relationships, search the corpus, and review signal-map views
- Persisted state: `06_app/kb_articles/*.json`, `06_app/help/*.json`, `06_app/help/manual/*.md`, `01_ontology/*.csv`, `01_ontology/blocks/*.json`, `03_tools/*.json`

## Role-Specific Critical Paths

Distinct owner/manager/pocket shells do not exist in this legacy monolith the way they do in the later trunks. The closest role behaviors are:

- owner or portfolio behavior: project creation, portfolio stats, review request/decision, notifications
- manager behavior: plan task mutation, progress logging, report review, chat/copilot
- pocket behavior: not present as a dedicated mobile shell in this legacy app
