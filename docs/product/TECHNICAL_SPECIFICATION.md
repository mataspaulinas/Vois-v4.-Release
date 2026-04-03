# Technical Specification

## 1. Product identity

- Product name: `VOIS v4.release`
- Product root: repository root
- Product type: web platform with embedded diagnostic engine
- Primary delivery mode: local/dev or server-hosted web application

## 2. System architecture

VOIS v4.release is a four-layer system:

1. platform layer
   - FastAPI backend plus React frontend
2. canonical truth layer
   - SQLAlchemy domain model plus Alembic migrations
3. ontology runtime layer
   - mounted ontology packs under `ontology_packs` plus shared canon under `ontology_shared`
4. intelligence layer
   - engine runtime under `packages/engine_runtime/ois_engine`

The governing split document for separating universal core from mountable ontology packs is:

- [OIS Core / Ontology Constitution](../architecture/OIS_CORE_ONTOLOGY_CONSTITUTION.md)

The runtime path is:

1. user creates or updates assessment input
2. backend persists assessment truth
3. backend resolves the venue ontology binding into an `OntologyMount`
4. backend calls the engine through the bridge service using the mounted ontology artifacts
5. engine returns normalized signals, failure modes, response patterns, activations, plan output, and report markdown
6. backend persists engine-run snapshots and creates a draft operational plan
7. frontend presents review and approval workflow
8. active plan becomes execution truth after explicit activation

## 3. Backend stack

- language: Python `>=3.13`
- framework: FastAPI
- validation: Pydantic 2, pydantic-settings
- ORM: SQLAlchemy 2
- migrations: Alembic
- app server: Uvicorn
- DB driver: `psycopg[binary]`
- optional AI SDKs present in backend deps:
  - `anthropic`
  - OpenAI runtime support is implemented through import-time readiness policy in the app

Primary backend package root:
- `apps/api/app`

Primary backend entrypoint:
- `apps/api/app/main.py`

Primary backend config:
- `apps/api/app/core/config.py`

## 4. Frontend stack

- React 18
- TypeScript 5
- Vite 7
- Vitest

Primary frontend root:
- `apps/web/src`

The frontend is a shell-driven workspace with:

- venue views
- manager shell
- pocket shell
- owner shell
- persistent Copilot drawer
- reference and knowledge-base surfaces

## 5. Persistence model

Canonical persistence exists for:

- organizations
- users
- venues
- assessments
- engine runs
- operational plans
- plan tasks
- task dependencies
- task events
- task comments
- progress entries
- follow-ups
- escalations
- deliverable proofs
- evidence rows
- notification events
- copilot threads
- copilot messages
- file assets
- help requests

Snapshot artifacts retained in persistence include:

- raw intake
- normalized signals
- diagnostic snapshot
- plan snapshot
- report markdown
- AI trace

This is intentional: VOIS v4.release preserves engine truth as snapshots rather than flattening everything into only relational columns.

## 6. Engine integration

The authoritative engine lives under:

- `packages/engine_runtime/ois_engine`

Supporting mounted runtime resources live under the selected ontology pack, for example:

- `ontology_packs/cafe/runtime/engine_mount/01_ontology`
- `ontology_packs/cafe/runtime/engine_mount/03_tools`
- `ontology_packs/cafe/runtime/engine_mount/05_data`

Engine bridge service:

- `apps/api/app/services/legacy_bridge.py`

Current bridge behavior:

- normalizes backend assessment input into engine-compatible input
- imports the extracted engine package directly
- runs the engine with an explicit ontology pack engine-mount root
- returns normalized pipeline data and report markdown

## 7. Configuration and environment

Important settings live in:

- `apps/api/app/core/config.py`

Key runtime settings:

- `DATABASE_URL`
- `AUTO_CREATE_SCHEMA`
- `AI_PROVIDER`
- `AI_MODEL`
- `AI_API_KEY`
- `AI_MOCK_FALLBACK_ENABLED`
- `ALLOW_LEGACY_HEADER_AUTH`
- `ALLOW_BOOTSTRAP_FALLBACK`
- `ENABLE_INPROCESS_SCHEDULER`

Current intended posture:

- PostgreSQL is the default operational database
- SQLite is supported for dev/test
- auth fallbacks are disabled by default for non-dev use
- in-process scheduler is disabled by default unless explicitly enabled
- Firebase is the default identity provider for normal sign-in

Additional auth settings:

- `AUTH_PROVIDER`
- `ALLOW_LOCAL_PASSWORD_AUTH`
- `AUTH_AUTO_PROVISION_USERS`
  Compatibility/dev-only. Normal runtime remains empty-by-default.
- `SEED_OWNER_EMAIL`
- `SEED_MANAGER_EMAIL`
- `SEED_BARISTA_EMAIL`
- `SEED_DEVELOPER_EMAIL`
  Used by explicit launch-account tooling or dev-only seed/import paths, not by normal boot.
- `FIREBASE_PROJECT_ID`
- `FIREBASE_WEB_API_KEY`
- `FIREBASE_AUTH_DOMAIN`
- `FIREBASE_STORAGE_BUCKET`
- `FIREBASE_MESSAGING_SENDER_ID`
- `FIREBASE_APP_ID`
- `FIREBASE_ADMIN_CREDENTIALS_PATH`
- `FIREBASE_ADMIN_CREDENTIALS_JSON`
- `FIREBASE_ROLE_CLAIM_KEY`

## 8. Health and readiness

Health routes exist for:

- liveness
- readiness

Readiness is intended to cover:

- DB connectivity
- schema/migration posture
- upload-root posture
- scheduler posture
- auth-provider configuration posture

## 9. API surface groups

Router groups include:

- `health`
- `auth`
- `ai`
- `audit`
- `bootstrap`
- `files`
- `integrations`
- `organization`
- `portfolio`
- `venues`
- `assessments`
- `plans`
- `progress`
- `copilot`
- `intake`
- `ontology`
- `engine`
- `execution`
- `pocket`
- `people`
- `scheduler`
- `notifications`

## 10. Workflow model

The primary workflow model is:

1. assessment-first
2. engine-run snapshot creation
3. draft plan creation
4. review before activation
5. active plan as sole execution truth

Important semantics:

- `draft` is review-only
- `active` is execution truth
- `archived` is superseded history
- `latest` is not the same thing as `active`

## 11. Role model

Launch auth roles:

- `owner`
- `manager`
- `barista`
- `developer`

Default homes:

- owner -> `command`
- manager -> `today`
- barista -> `shift`
- developer -> `settings`

Backend authorization is enforced in FastAPI using Firebase-authenticated identity plus backend role checks. The frontend only adapts shells after backend-authenticated identity is known.

Support surfaces:

- Plan contains dependency context
- Graph is intentionally folded into Plan rather than existing as a separate manager route

## 12. Support intelligence model

Support intelligence is composed of:

- Copilot
- Knowledge Base
- Reference
- Pocket Help requests
- report history
- assessment history

Current trust posture:

- report and copilot surfaces expose persisted references and more trust metadata than earlier versions
- some role-awareness and product-help separation work remains open

## 13. Packaging and portability

This product root is independent for runtime engine access and carries the canonical engine runtime plus mounted ontology packs inside the product itself.

Portability strategy:

- backend source in `apps/api`
- frontend source in `apps/web`
- canonical engine runtime under `packages/engine_runtime/ois_engine`
- mounted ontology packs under `ontology_packs`

This means the product folder can be backed up, copied, or restored as one unit, provided the target machine has the required runtime software installed.

## 14. Current release-validation items

These are the main remaining validation and refinement items at the time this spec was written:

- fresh-machine relocation/bootstrap proof still needs to be completed from this release root
- Pocket task drill-in is still not fully task-native
- product-help guidance is not yet a separate top-level destination
- Copilot is not yet deeply role-aware in backend scope semantics
