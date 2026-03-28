from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path


def load_csv_rows(path: Path) -> list[dict[str, str]]:
    if not path.exists() or path.stat().st_size == 0:
        return []
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def split_ids(value: str | None) -> list[str]:
    if not value:
        return []
    return [item.strip() for item in value.split(",") if item.strip()]


def main() -> None:
    parser = argparse.ArgumentParser(description="Profile the recovered legacy OIS archive.")
    parser.add_argument(
        "archive_root",
        nargs="?",
        default=r"C:\Users\matas\Documents\CODEX VOIS\EXAMPLE FROM ARCHIVES",
        help="Path to the legacy archive root",
    )
    args = parser.parse_args()

    archive_root = Path(args.archive_root)
    ontology_root = archive_root / "01_ontology"
    engine_root = archive_root / "04_engine"

    signals = load_csv_rows(ontology_root / "signals.csv")
    failure_modes = load_csv_rows(ontology_root / "failure_modes.csv")
    response_patterns = load_csv_rows(ontology_root / "response_patterns.csv")
    signal_to_fm = load_csv_rows(ontology_root / "signal_to_fm_map.csv")
    signal_to_fm_v2 = load_csv_rows(ontology_root / "signal_to_fm_map_v2.csv")
    fm_to_rp = load_csv_rows(engine_root / "fm_to_rp_map.csv")
    rp_to_block = load_csv_rows(engine_root / "rp_to_block_map.csv")
    pattern_activation_map = load_csv_rows(engine_root / "pattern_activation_map.csv")
    module_dependencies = load_csv_rows(engine_root / "module_dependencies.csv")
    capacity_rules = load_csv_rows(engine_root / "capacity_rules.csv")

    signal_ids = {row["signal_id"] for row in signals}
    failure_mode_ids = {row["failure_mode_id"] for row in failure_modes}
    response_pattern_ids = {row["rp_id"] for row in response_patterns}

    derived_fm_to_rp_edges = []
    for row in response_patterns:
        for failure_mode_id in split_ids(row.get("fm_ids")):
            derived_fm_to_rp_edges.append((failure_mode_id, row["rp_id"]))

    profile = {
        "archive_root": str(archive_root),
        "row_counts": {
            "signals": len(signals),
            "failure_modes": len(failure_modes),
            "response_patterns": len(response_patterns),
            "signal_to_fm_map": len(signal_to_fm),
            "signal_to_fm_map_v2": len(signal_to_fm_v2),
            "fm_to_rp_map": len(fm_to_rp),
            "derived_fm_to_rp_edges": len(derived_fm_to_rp_edges),
            "rp_to_block_map": len(rp_to_block),
            "pattern_activation_map": len(pattern_activation_map),
            "module_dependencies": len(module_dependencies),
            "capacity_rules": len(capacity_rules),
        },
        "integrity": {
            "signal_to_fm_missing_signal_refs": sorted(
                {row["signal_id"] for row in signal_to_fm if row.get("signal_id") not in signal_ids}
            ),
            "signal_to_fm_missing_failure_mode_refs": sorted(
                {row["failure_mode_id"] for row in signal_to_fm if row.get("failure_mode_id") not in failure_mode_ids}
            ),
            "response_patterns_missing_failure_mode_refs": sorted(
                {
                    failure_mode_id
                    for failure_mode_id, _ in derived_fm_to_rp_edges
                    if failure_mode_id not in failure_mode_ids
                }
            ),
            "rp_to_block_missing_response_pattern_refs": sorted(
                {row["rp_id"] for row in rp_to_block if row.get("rp_id") not in response_pattern_ids}
            ),
        },
        "zero_length_files": [
            str(path)
            for path in [
                engine_root / "block_conditions.csv",
                engine_root / "block_sequence_rules.json",
            ]
            if path.exists() and path.stat().st_size == 0
        ],
        "missing_expected_files": [
            str(path)
            for path in [
                engine_root / "blocks_master_index.csv",
                engine_root / "block_families_v2.md",
            ]
            if not path.exists()
        ],
    }

    print(json.dumps(profile, indent=2))


if __name__ == "__main__":
    main()
