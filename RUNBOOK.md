# Runbook

## Purpose

This runbook defines the standard way to boot, verify, and operate `VOIS v4.release`.

Related governing documents:

- [Contributor Constitution](CONTRIBUTOR_CONSTITUTION.md)
- [OIS Core / Ontology Constitution](docs/architecture/OIS_CORE_ONTOLOGY_CONSTITUTION.md)
- [Real Authorization Matrix](docs/architecture/REAL_AUTHORIZATION_MATRIX.md)

## Prerequisites

- Python 3.13+
- Node.js + npm
- PostgreSQL

## Environment

Backend environment template:

- `apps/api/.env.example`

Frontend environment template:

- `apps/web/.env.example`

Create a local runtime env file from that template before starting the backend.

## Secret handling

- keep `.env.example` files in version control; keep real `.env` files local-only
- do not commit Firebase Admin service-account JSON files or copied credential JSON payloads
- prefer `FIREBASE_ADMIN_CREDENTIALS_JSON` or a local ignored credentials path over checked-in files
- do not commit local SQLite runtime databases, temp launch logs, cache directories, or build/install residue
- before first push, review `git status` and `git status --ignored` to confirm no secret or local-only files are about to travel

## Authentication setup

VOIS now expects Firebase Authentication for normal sign-in.

Required posture for hosted or realistic local testing:

- `AUTH_PROVIDER=firebase`
- `ALLOW_LOCAL_PASSWORD_AUTH=false`
- `ALLOW_LEGACY_HEADER_AUTH=false`
- `ALLOW_BOOTSTRAP_FALLBACK=false`

Backend Firebase config lives in:

- `apps/api/.env.example`

Frontend Firebase web config lives in:

- `apps/web/.env.example`

To provision the four launch accounts and set role claims:

```powershell
cd .\apps\api
python -m app.scripts.sync_firebase_launch_accounts
```

The script reads:

- `SEED_OWNER_EMAIL`
- `SEED_MANAGER_EMAIL`
- `SEED_BARISTA_EMAIL`
- `SEED_DEVELOPER_EMAIL`
- optional creation passwords:
  - `FIREBASE_OWNER_PASSWORD`
  - `FIREBASE_MANAGER_PASSWORD`
  - `FIREBASE_BARISTA_PASSWORD`
  - `FIREBASE_DEVELOPER_PASSWORD`

## Backend startup

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -e .\apps\api[dev]
cd .\apps\api
alembic upgrade head
uvicorn app.main:app --reload
```

## Frontend startup

```powershell
cd .\apps\web
npm install
npm run dev
```

## Infrastructure

```powershell
docker compose up -d
```

## Health checks

Liveness:

- `GET /api/v1/health`

Readiness:

- `GET /api/v1/health/ready`

## Test commands

Backend:

```powershell
cd .\apps\api
python -m pytest -q
```

Frontend:

```powershell
cd .\apps\web
npm run test
npm run build
```

## Minimal smoke flow

1. boot backend
2. boot frontend
3. sign in with a real Firebase launch account
4. open a venue
5. create assessment
6. run diagnostic
7. verify draft plan appears
8. activate plan
9. update one task
10. open Pocket Help and submit one help request

## Reset notes

Use migrations as the schema authority. Do not rely on ad-hoc `create_all` bootstrapping for integration or persistence verification.

## Release rule

This folder is only release-ready when the relocation drill succeeds from this root alone.
