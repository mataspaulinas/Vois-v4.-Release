# Phase 8 Platform Hardening Audit

Date audited: 2026-03-27

This file records the evidence-backed Phase 8 hardening audit for the rebuilt CODEX/VOIS platform.

## Evidence run

Backend:

- `python -m pytest -q`
  - result: fail
  - detail: `72 passed`, `1 failed`
  - failing test: `tests/test_persistence.py::test_round_trip_persistence`
  - failure: SQLite schema created through `Base.metadata.create_all(...)` does not include `assessments.assessment_type`, while the current model expects it
- `cmd /c "del ...phase8_migrate_zero.db & set AUTO_CREATE_SCHEMA=0&&set DATABASE_URL=sqlite:///.../phase8_migrate_zero.db&&python -m alembic upgrade head&&python -m alembic current"`
  - result: pass
  - detail: fresh SQLite migration reached `20260327_0031 (head)`
- `cmd /c "set AUTO_CREATE_SCHEMA=0&&set DATABASE_URL=sqlite:///.../phase8_migrate_zero.db&&python -m alembic check"`
  - result: fail
  - detail: post-head drift still detected on:
    - `copilot_threads.scope` type
    - `task_events.status` type
    - `users.venue_id` foreign key
- Local API boot:
  - command path: `python -m uvicorn app.main:app --host 127.0.0.1 --port 8018`
  - env used: SQLite temp DB with `AUTO_CREATE_SCHEMA=true`
  - `GET /api/v1/health`
    - result: pass
    - response: `200 {"status":"ok"}`

Frontend:

- `npm run test`
  - result: pass
  - detail: `4` files, `10` tests passed
- `npm run build`
  - result: pass
  - detail: `tsc -b && vite build` completed successfully
- lint
  - result: not executed
  - detail: no lint script exists in `apps/web/package.json`

Infrastructure:

- `docker compose config`
  - result: pass
  - detail: compose file parses and defines `postgres` plus `redis`

## Hardening findings

### Environment integrity

- Backend runtime and imports are broadly aligned:
  - FastAPI, SQLAlchemy, Alembic, uvicorn, psycopg, pydantic-settings are declared in `apps/api/pyproject.toml`
  - frontend React/Vite/TypeScript stack is declared in `apps/web/package.json`
- Local environment defaults remain mixed:
  - `apps/api/.env` points to PostgreSQL
  - the same file also enables `AUTO_CREATE_SCHEMA=True`
  - this makes local boot more forgiving than production migration discipline
- Redis appears cosmetic today:
  - `compose.yaml` declares a Redis service
  - no intentional Redis client or queue integration was found in `apps/api/app`
  - the actual background work is handled by the in-process `BackgroundScheduler` in `app/services/scheduler.py`
- Health posture is too shallow:
  - `/api/v1/health` returns only `{"status":"ok"}`
  - it does not verify DB connectivity, scheduler state, upload root readiness, or provider posture

### Reliability

- Fresh SQLite migration to head works, so the migration chain itself is not broken from zero.
- Migration state is still not stable enough for closure because `alembic check` fails after head.
- Full backend regression is not green because one persistence test still fails on schema mismatch.
- Core persisted flows have meaningful evidence coverage because the passing backend suite includes:
  - assessment and engine flows
  - manager workflow
  - pocket workflow
  - auth and authz coverage
  - Phase 3/4/6 migration and integration tests
- Local app boot and health endpoint worked after restart against a fresh SQLite DB.
- Silent-corruption risk remains where model metadata and DB shape drift apart:
  - `test_persistence.py` still uses `Base.metadata.create_all(...)` against a model set that no longer matches the expected SQLite table shape

### Access and permissions

- Most mutation and role-sensitive routes depend on `get_current_user`, `get_current_session`, or `require_roles(...)`.
- Authz evidence is real because `tests/test_auth.py` and `tests/test_authz.py` passed in the full backend run.
- Venue scoping for employees is enforced in code and exercised in `tests/test_pocket_workflow.py`.
- Production hardening is still weak in two places:
  - `allow_legacy_header_auth` defaults to `True`
  - `/api/v1/bootstrap` uses `get_optional_current_user` and falls back to the earliest seeded user/org when no authenticated context is present
- That fallback is useful for local bootstrap, but it is not a production-safe default trust boundary.

### Queue and infra realism

- There is no evidence of Redis-backed jobs, Celery, RQ, Dramatiq, or ARQ in the API code.
- Background work is currently a process-local loop started in FastAPI lifespan.
- Scheduler work looks intentional, but it is not operationally hardened:
  - one app instance will run its own scheduler
  - multiple app instances would duplicate scheduler ticks unless an external coordination layer is added
- Because Redis is declared but unused, the current infra stack overstates the platform’s actual job architecture.

## Closure note

Phase 8 should not be treated as closed from this evidence set.

Why it fails closure:

1. Backend boot works, but backend regression is not fully green.
2. Migrations run from zero, but migration/model drift still remains after head.
3. Redis exists in infra but is not intentionally integrated.
4. Production auth posture is still softened by legacy-header auth and unauthenticated bootstrap fallback.
5. Health checks are too shallow for real operational confidence.
