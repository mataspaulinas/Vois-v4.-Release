# Portability and Deployment

## Portability statement

`VOIS v4.release` is packaged as a self-contained source-product root.

Runtime-critical components included inside this directory:

- platform backend
- platform frontend
- engine runtime package
- ontology runtime package
- mounted ontology packs
- shared core canon
- embedded extracted engine compatibility archive

The backend does not need an external sibling `OIS_Cafe_v2` checkout to resolve either the engine path or the mounted ontology packs.

## Runtime assumptions

The folder is independent from the old workspace, but it still assumes the host machine provides:

- Python
- Node.js / npm
- PostgreSQL if using the default operational database

## Engine and ontology paths

Primary runtime locations:

- `packages/engine_runtime/ois_engine`
- `ontology_packs`
- `ontology_shared/core_canon`

The bundled bridge resolves the engine in this order:

1. `EXTRACTED_ENGINE_ROOT` env override
2. local runtime package import
3. local embedded engine compatibility path

Normal product use should rely on step 2. Step 3 exists only as a compatibility fallback during the split.

## Suggested backup shape

For backup/archive purposes, preserve this whole folder:

- repository root

Do not split out `packages`, `ontology_packs`, `ontology_shared`, or `embedded_engine`, because the backend runtime expects those roots to remain together inside the product root.

## Suggested deployment approach

### Backend

1. create Python environment
2. install `apps/api`
3. set env vars
4. run `alembic upgrade head`
5. launch `uvicorn`

### Frontend

1. install `apps/web` dependencies
2. run `npm run build` for static build output or `npm run dev` for local development

### Database

Use PostgreSQL for real deployment. SQLite remains useful for test/dev workflows but should not be treated as the primary production store.

## Non-portable exclusions

These are intentionally not bundled as runtime dependencies:

- `.venv`
- `node_modules`
- local temporary sqlite files
- Codex runtime folders

That keeps the product root portable without shipping machine-specific state.
