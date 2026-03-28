# Phase 0 Route And Action Inventory

The detailed machine export lives in `docs/migration/phase0/route_inventory.json` and `docs/migration/phase0/frontend_fetch_inventory.json`.

## Backend Route Surface

- Total Flask routes inventoried: `104`
- Source file: `06_app/app.py`
- Main route groups:
  - auth
  - projects and project
  - run and report
  - chat and copilot
  - kb and help
  - ontology, tools, and signal lookup
  - notifications and workspace
  - settings, templates, search, and sigmap

Critical route groups for migration parity:

- Authentication:
  - `/api/auth/setup`
  - `/api/auth/login`
  - `/api/auth/logout`
  - `/api/auth/status`
- Project and portfolio:
  - `/api/projects`
  - `/api/projects/stats`
  - `/api/project/<slug>`
  - `/api/project/create`
  - `/api/project/<slug>/update`
- Assessment and engine:
  - `/api/ai-intake`
  - `/api/project/<slug>/assessment`
  - `/api/project/<slug>/assessments`
  - `/api/run`
  - `/api/report/<filename>`
- Plan and execution:
  - `/api/project/<slug>/plan`
  - `/api/project/<slug>/plan/task/<task_id>/status`
  - `/api/project/<slug>/plan/task/<task_id>/comment`
  - `/api/project/<slug>/plan/review/request`
  - `/api/project/<slug>/plan/review/decision`
- Progress and notifications:
  - `/api/project/<slug>/progress`
  - `/api/project/<slug>/timeline`
  - `/api/notifications`
  - `/api/notifications/<notification_id>/status`
- Copilot and uploads:
  - `/api/chat/threads`
  - `/api/chat/thread/<thread_id>/message`
  - `/api/chat/upload`
  - `/api/chat`
  - `/api/copilot/proactive`
- Knowledge surfaces:
  - `/api/kb/articles`
  - `/api/help/index`
  - `/api/ontology/full`
  - `/api/tools`
  - `/api/sigmap/trace`

## Frontend Entry Files And Major Modules

Legacy UI shell entry files:

- `06_app/templates/index.html`
- `06_app/static/app.js`
- `06_app/static/app-shell.js`
- `06_app/static/app-home.js`
- `06_app/static/app-portfolio.js`
- `06_app/static/app-kb.js`
- `06_app/static/app-sigmap.js`
- `06_app/static/app-foundation.js`
- `06_app/static/app-chrome.js`
- `06_app/static/help-system.js`
- `06_app/static/sidebar-v2.js`

Frontend action characteristics:

- `app.js` owns most venue-opening, intake, engine-run, report, plan, and task mutation actions
- `app-shell.js` owns workspace users, notifications, and topbar venue switching
- `app-kb.js` owns KB and reference browsing
- `app-sigmap.js` owns signal-map and trace views
- `help-system.js` owns tours/manual/help overlays

Seven static JS files currently issue direct `fetch(...)` calls and are inventoried in `frontend_fetch_inventory.json`.

## Persistence Points

Detailed machine export: `docs/migration/phase0/persistence_surfaces.json`

Critical persisted state surfaces:

- `05_data/venues/<slug>/project.json`
- `05_data/venues/<slug>/assessments/*.json`
- `05_data/venues/<slug>/operational_plan.json`
- `05_data/venues/<slug>/progress/entries.json`
- `05_data/venues/<slug>/chat_history/_index.json`
- `05_data/venues/<slug>/chat_history/t_*.json`
- `05_data/venues/<slug>/signal_history.json`
- `05_data/system/users.json`
- `05_data/system/audit_events.json`
- `05_data/system/notifications.json`
- `05_data/system/brands.json`
- `.env`

## Fixture Coverage Mapping

The Phase 0 fixtures cover these route/action areas:

- project read surfaces: all assessment-backed fixtures
- plan read surfaces: Warsaw, Kaunas, Muzos 2, and Klaipeda
- progress/timeline state: Warsaw and Kaunas via copied progress feeds
- chat persistence: Warsaw, Kaunas, Muzos 2, and Klaipeda via copied thread snapshots
- AI extraction snapshotting: Pegasas and Muzos 2
- engine parity surfaces: all six fixtures

Known gap:

- Route inventory exists, but Phase 0 does not yet replay every mutation route as an automated end-to-end baseline. The current package is strongest on engine/report parity and persisted-state snapshots, weaker on full route-by-route replay.
