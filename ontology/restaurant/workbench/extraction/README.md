# Extraction Workspace

Use this folder to turn the surviving OIS materials into structured draft ontology records.

Recommended subfolders:

- `raw/` for extracted text from documents
- `drafts/` for candidate JSON files before review
- `review-notes/` for validation notes and unresolved gaps
- `templates/` for generated authoring templates and coverage briefs

Nothing in this folder is considered production content until it is promoted into `ontology/restaurant/published`.

Recommended starting point for each new batch:

```powershell
cd .\apps\api
python -m app.scripts.generate_authoring_templates --vertical restaurant
python -m app.scripts.generate_contract_enrichment_batch --vertical restaurant
```

The first command generates a coverage-aware authoring brief plus signal, failure mode, response pattern, block, tool, and recovery-batch templates under `templates/`.

The second command generates a draft enrichment batch from the current published ontology, inferring block core references and reciprocal tool links where that can be done safely from existing maps.
