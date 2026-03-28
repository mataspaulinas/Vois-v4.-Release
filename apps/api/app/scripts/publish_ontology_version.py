from __future__ import annotations

import argparse
import json

from app.schemas.ontology import PublishOntologyVersionRequest
from app.services.ontology_workbench import get_ontology_workbench_service


def main() -> None:
    parser = argparse.ArgumentParser(description="Publish a reviewed ontology workbench into a versioned bundle.")
    parser.add_argument("version", help="New ontology version, for example v2")
    parser.add_argument("--owner", required=True, help="Release owner")
    parser.add_argument("--source-version", default="v1", help="Published ontology version to overlay")
    parser.add_argument("--ontology-id", "--vertical", dest="ontology_id", required=True, help="Ontology pack id to publish")
    parser.add_argument(
        "--recovery-source",
        action="append",
        dest="recovery_sources",
        default=[],
        help="Recovery source to append to ontology metadata; repeat for multiple entries",
    )
    args = parser.parse_args()

    result = get_ontology_workbench_service().publish_version(
        PublishOntologyVersionRequest(
            version=args.version,
            owner=args.owner,
            source_version=args.source_version,
            recovery_sources=args.recovery_sources,
        ),
        vertical=args.ontology_id,
    )
    print(json.dumps(result.model_dump(), indent=2))


if __name__ == "__main__":
    main()
