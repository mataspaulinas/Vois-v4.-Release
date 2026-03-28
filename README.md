# VOIS v4.release

VOIS v4.release is the cleaned release-candidate product root derived from `VOIS v4.web`.

This folder is intended to be:

- the canonical standalone source product candidate
- cleaner than the working workspace
- free of local residue and donor legacy trees
- portable as a product source package

## What is inside

- `apps/api`
  - FastAPI backend, migrations, tests, services, schemas, and models
- `apps/web`
  - React and TypeScript web application
- `packages`
  - engine runtime and ontology runtime packages
- `ontology_packs`
  - mounted ontology packs, including `cafe`, `restaurant-legacy`, and `beauty-template`
- `ontology_shared`
  - shared core canon used across packs
- `embedded_engine/OIS_Cafe_v2`
  - archived migration evidence kept for parity/reference only, not live runtime
- `docs/product`
  - product-facing technical and capability documentation
- `RUNBOOK.md`
  - startup, reset, and release-operating instructions

## What is intentionally not inside

- local `.env`
- cache directories
- `__pycache__`
- `.pyc`
- frontend `dist`
- `OIS_Restaurant`
- `apps/api/app/libs/ois_legacy_engine`

## Independent-runtime note

The backend runtime executes only through:

- `packages/engine_runtime/ois_engine`

Mounted ontology meaning comes from packs under `ontology_packs`. The archived `embedded_engine/OIS_Cafe_v2` tree is retained only as internal migration evidence and test/reference material.

## Main docs

- [Technical Specification](docs/product/TECHNICAL_SPECIFICATION.md)
- [Contributor Constitution](CONTRIBUTOR_CONSTITUTION.md)
- [OIS Core / Ontology Constitution](docs/architecture/OIS_CORE_ONTOLOGY_CONSTITUTION.md)
- [Real Authorization Matrix](docs/architecture/REAL_AUTHORIZATION_MATRIX.md)
- [VOIS Visual Reset Constitution](docs/architecture/VOIS_VISUAL_RESET_CONSTITUTION.md)
- [Capability Inventory](docs/product/CAPABILITY_INVENTORY.md)
- [Feature Inventory](docs/product/FEATURE_INVENTORY.md)
- [Feature Migration Strategy](docs/product/Feature%20Migration/FEATURE_MIGRATION_STRATEGY.md)
- [Portability and Deployment](docs/product/PORTABILITY_AND_DEPLOYMENT.md)
- [Runbook](RUNBOOK.md)

## Authentication

VOIS now expects real Firebase-backed sign-in for normal local and hosted use.

- backend verifies Firebase ID tokens
- backend enforces `owner`, `manager`, `barista`, and `developer`
- frontend adapts shells by role, but is not the security authority
- legacy header auth and bootstrap fallback are disabled by default

Launch-account provisioning is handled by:

- `python -m app.scripts.sync_firebase_launch_accounts`

Supporting auth docs:

- [Real Authorization Matrix](docs/architecture/REAL_AUTHORIZATION_MATRIX.md)
- `apps/api/.env.example`
- `apps/web/.env.example`

## Secret handling

- commit template files such as `apps/api/.env.example` and `apps/web/.env.example`, never real `.env` files
- keep Firebase Admin credentials outside the repo or pass them through ignored local environment configuration
- never commit service-account JSON files, copied credential blobs, local SQLite/test databases, or local runtime logs
- treat release-root launchers and docs as portable artifacts; avoid hard-coded machine paths when editing them

## Status

This is the Phase 9 working product root: a clean release candidate plus the in-progress Core / Ontology separation seam. Its purpose is to serve as the canonical app during ontology binding, mount-resolution, and pack extraction work.
