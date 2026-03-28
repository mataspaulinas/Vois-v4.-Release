# Changelog

## 2026-03-27

### Release candidate hardening pass

- created `VOIS v4.release` as a stripped product candidate derived from `VOIS v4.web`
- removed local residue from the release copy:
  - `.env`
  - cache directories
  - `__pycache__`
  - `.pyc`
  - frontend `dist`
- removed donor and legacy shadows from the release copy:
  - `OIS_Restaurant`
  - `apps/api/app/libs/ois_legacy_engine`
- moved the canonical runtime engine to `packages/engine_runtime/ois_engine`
- retained `embedded_engine/OIS_Cafe_v2` only as archived migration evidence and reference material
- added release-facing files:
  - `RUNBOOK.md`
  - `apps/api/.env.example`
  - `CHANGELOG.md`
