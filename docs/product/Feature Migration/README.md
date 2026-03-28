# Feature Migration

Status: active planning set  
Scope: disciplined feature recovery from `OIS_Cafe_v2` into current `VOIS v4.release`

## Purpose

This folder exists to recover high-value product depth from the café-era app line without reviving its legacy architecture.

The governing rule is simple:

- treat `OIS_Cafe_v2` as a donor of product richness
- treat current `VOIS v4.release` as the architectural authority

If a migration idea conflicts with the current role model, auth posture, active/draft truth, venue ontology binding, or the Core / Ontology split, current VOIS wins.

## Read this first

- [Feature Migration Strategy](FEATURE_MIGRATION_STRATEGY.md)

That document is the authoritative curated plan for this folder.

## Current VOIS assumptions

The strategy in this folder assumes the product now operates as:

- empty-by-default on normal boot
- first-owner claim and setup inside the product
- Firebase-backed role-authenticated access for `owner`, `manager`, `barista`, and `developer`
- role-native shells rather than one shared developer frame
- explicit venue ontology binding and mounted ontology packs
- active-plan truth separate from draft/generated truth
- fail-closed AI posture for real roles when live AI is unavailable

These assumptions are already reflected elsewhere in the repo, including:

- [README.md](../../README.md)
- [Technical Specification](../TECHNICAL_SPECIFICATION.md)
- [OIS Core / Ontology Constitution](../../architecture/OIS_CORE_ONTOLOGY_CONSTITUTION.md)
- [Real Authorization Matrix](../../architecture/REAL_AUTHORIZATION_MATRIX.md)

## What the raw notes are

The numbered `.txt` files are working-source notes and donor-analysis captures.

They are useful as evidence, but they are not the governing plan.

Use them like this:

- `0.txt`
  - broad donor inventory and page-by-page mapping of `OIS_Cafe_v2`
- `1.txt`
  - companion raw capture material
- `2.txt`
  - migration matrix for portfolio, venue shell, overview, assessment, and signals review
- `3.txt`
  - migration matrix for copilot, report, plan, history, and signal-map surfaces
- `4.txt`
  - migration matrix for libraries, KB, help, settings, and activity surfaces
- `5 .txt`
  - execution-prompt pack for disciplined migration waves
- `6.txt`
  - gap map from donor app to current VOIS

## How to use this folder

1. Read [Feature Migration Strategy](FEATURE_MIGRATION_STRATEGY.md).
2. Use the numbered notes only as donor evidence and supporting detail.
3. Execute migration work in waves, not as random feature grabbing.
4. After each wave, produce a closure report with an honest verdict.

## Summary rule

Recover the richness.
Do not recover the old architecture.
