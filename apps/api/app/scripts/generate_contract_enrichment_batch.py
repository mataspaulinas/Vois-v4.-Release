from __future__ import annotations

import argparse
import json
from pathlib import Path

from app.services.ontology import get_ontology_repository


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate a draft ontology batch with auto-inferred block and tool contract enrichments."
    )
    parser.add_argument("--ontology-id", "--vertical", dest="ontology_id", required=True, help="Ontology pack id to enrich")
    parser.add_argument("--version", default=None, help="Published bundle version, defaults to latest")
    parser.add_argument("--adapter-id", default=None, help="Adapter id, defaults to the ontology id")
    parser.add_argument("--adapter-version", default="v1", help="Adapter pack version")
    parser.add_argument(
        "--output-path",
        type=Path,
        default=None,
        help="Where to write the enrichment batch, defaults to ontology/<vertical>/workbench/extraction/<vertical>-contract-enrichment-batch.json",
    )
    args = parser.parse_args()

    repository = get_ontology_repository()
    batch = repository.contract_enrichment_batch(
        vertical=args.ontology_id,
        version=args.version,
        adapter_id=args.adapter_id,
        adapter_version=args.adapter_version,
    )
    output_path = args.output_path or (
        repository.base_path
        / args.ontology_id
        / "workbench"
        / "extraction"
        / f"{args.ontology_id}-contract-enrichment-batch.json"
    )
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(batch.model_dump_json(indent=2), encoding="utf-8")
    print(
        json.dumps(
            {
                "output_path": str(output_path),
                "block_updates": len(batch.blocks),
                "tool_updates": len(batch.tools),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
