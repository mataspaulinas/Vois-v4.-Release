from __future__ import annotations

import argparse
import json
from pathlib import Path

from app.schemas.ontology import RecoveryImportBatch
from app.services.ontology_workbench import get_ontology_workbench_service


def main() -> None:
    parser = argparse.ArgumentParser(description="Import an ontology recovery batch into the workbench.")
    parser.add_argument("batch_path", type=Path, help="Path to the recovery batch JSON file")
    parser.add_argument("--ontology-id", "--vertical", dest="ontology_id", default=None, help="Ontology id override, defaults to the batch value")
    args = parser.parse_args()

    batch = RecoveryImportBatch.model_validate_json(args.batch_path.read_text(encoding="utf-8"))
    result = get_ontology_workbench_service().import_batch(batch, vertical=args.ontology_id)
    print(json.dumps(result.model_dump(), indent=2))


if __name__ == "__main__":
    main()
