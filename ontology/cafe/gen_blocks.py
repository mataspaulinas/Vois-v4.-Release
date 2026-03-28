"""
Generate cafe block definitions from embedded OIS block JSON files.

The OIS Restaurant block library (B001-B253) is vertical-agnostic — blocks
tagged with venue_types: ["cafe"] are shared across verticals. The cafe
rp_to_block_map.csv references 210 block IDs; 192 have source JSON files.

This script:
  1. Reads block JSON files from embedded_engine/OIS_Cafe_v2/01_ontology/blocks/
  2. Converts them to CODEX bundle format
  3. Builds a B-ID → semantic ID map
  4. Returns (blocks, b_id_to_semantic) for use by gen_ontology.py

Runs as part of gen_ontology.py — not invoked directly.
"""

import json
import re
from pathlib import Path

BLOCKS_DIR = Path(__file__).resolve().parents[2] / "embedded_engine" / "OIS_Cafe_v2" / "01_ontology" / "blocks"
TIMESTAMP = "2026-03-18T00:00:00Z"
OWNER = "cafe-ontology-v1-blocks"
SOURCE_REF = "ois-restaurant-block-library-v3"


def to_snake(text: str, max_len: int = 50) -> str:
    text = text.strip()
    text = re.sub(r"[''']", "", text)
    text = re.sub(r"[^a-zA-Z0-9]+", "_", text)
    text = re.sub(r"_+", "_", text)
    text = text.strip("_").lower()
    if len(text) > max_len:
        parts = text.split("_")
        result = []
        length = 0
        for p in parts:
            if length + len(p) + (1 if result else 0) > max_len:
                break
            result.append(p)
            length += len(p) + (1 if len(result) > 1 else 0)
        text = "_".join(result) if result else text[:max_len]
    return text


def parse_effort_hours(time_load: dict | None) -> float:
    """Extract total effort hours from the time_load dict."""
    if not time_load:
        return 4.0
    setup = time_load.get("setup_total", "")
    if not setup:
        return 4.0
    # Formats seen: "1.1 hours", "3 hours", "2.5 hours"
    match = re.search(r"(\d+(?:\.\d+)?)", setup)
    if match:
        return round(float(match.group(1)), 1)
    return 4.0


def parse_dependencies(dep_block: dict | None, b_id_to_semantic: dict) -> list[str]:
    """Convert upstream B-IDs to semantic IDs.

    Upstream deps can be either plain strings or dicts {"block_id": "B023", "reason": "..."}.
    """
    if not dep_block:
        return []
    upstream = dep_block.get("upstream", [])
    result = []
    for item in upstream:
        if isinstance(item, dict):
            bid = item.get("block_id", "")
        else:
            bid = str(item)
        semantic = b_id_to_semantic.get(bid)
        if semantic:
            result.append(semantic)
    return result


def extract_description(block: dict) -> str:
    """Pick the best available description field."""
    # Try purpose first, then meta summary, then empty
    purpose = block.get("purpose", "").strip()
    if purpose and len(purpose) > 20:
        return purpose
    meta = block.get("meta", {})
    summary = meta.get("summary_for_humans", "").strip()
    if summary and len(summary) > 20:
        return summary
    return block.get("name", "")


def extract_proof_of_completion(block: dict) -> list[str]:
    """Get proof of completion if available."""
    poc = block.get("proof_of_completion", [])
    if isinstance(poc, list):
        return [str(p) for p in poc if p]
    return []


def extract_entry_conditions(block: dict) -> list[str]:
    """Get activation triggers or use_cases as entry conditions."""
    triggers = block.get("activation_triggers", [])
    if isinstance(triggers, list) and triggers:
        return [str(t) for t in triggers if t]
    applicability = block.get("applicability", {})
    use_cases = applicability.get("use_cases", [])
    if use_cases:
        return [str(u) for u in use_cases[:3]]
    return []


def load_blocks(block_ids: list[str]) -> tuple[list[dict], dict[str, str]]:
    """
    Load and convert block JSON files for the given B-IDs.

    Returns:
        (blocks, b_id_to_semantic) where blocks is the list of CODEX-format
        block dicts and b_id_to_semantic maps "B001" -> "blk_..."
    """
    # First pass: build ID map (need this before resolving dependencies)
    b_id_to_semantic: dict[str, str] = {}
    raw_blocks: dict[str, dict] = {}

    for bid in sorted(block_ids):
        path = BLOCKS_DIR / f"{bid}.json"
        if not path.exists():
            continue
        raw = json.loads(path.read_text(encoding="utf-8"))
        name = raw.get("name", bid)
        semantic_id = f"blk_{to_snake(name)}"
        b_id_to_semantic[bid] = semantic_id
        raw_blocks[bid] = raw

    # Deduplicate semantic IDs (if two blocks have same name after truncation)
    seen_ids: dict[str, int] = {}
    id_mapping: dict[str, str] = {}
    for bid, semantic_id in b_id_to_semantic.items():
        if semantic_id in seen_ids:
            seen_ids[semantic_id] += 1
            new_id = f"{semantic_id}_{seen_ids[semantic_id]}"
            id_mapping[bid] = new_id
        else:
            seen_ids[semantic_id] = 0
            id_mapping[bid] = semantic_id
    b_id_to_semantic = id_mapping

    # Second pass: build CODEX-format block dicts
    blocks: list[dict] = []
    for bid in sorted(b_id_to_semantic.keys()):
        raw = raw_blocks[bid]
        semantic_id = b_id_to_semantic[bid]

        deps = parse_dependencies(raw.get("dependencies"), b_id_to_semantic)
        effort = parse_effort_hours(raw.get("time_load"))
        description = extract_description(raw)
        proof = extract_proof_of_completion(raw)
        entry_conditions = extract_entry_conditions(raw)

        # Tool IDs — omitted in v1; tools not yet generated for cafe ontology.
        # The engine does not use tool_ids for scoring. Tools will be added in v2
        # once the cafe tool library is built from the block tool_definitions fields.
        tool_ids: list[str] = []

        # Response pattern IDs — the raw blocks don't know their cafe RP,
        # this is set by the rp_to_block_map. Leave empty here.
        response_pattern_ids: list[str] = []

        block = {
            "id": semantic_id,
            "name": raw.get("name", ""),
            "description": description,
            "status": "published",
            "owner": OWNER,
            "source_ref": SOURCE_REF,
            "updated_at": TIMESTAMP,
            "effort_hours": effort,
            "dependencies": deps,
            "tool_ids": tool_ids,
            "response_pattern_ids": response_pattern_ids,
            "entry_conditions": entry_conditions,
            "contraindications": [],
            "owner_role": "",
            "expected_time_to_effect_days": 7,
            "proof_of_completion": proof,
            "successor_block_ids": [],
            "service_module_ids": [],
            "failure_family_ids": [],
            "adapter_aliases": [bid],
        }
        blocks.append(block)

    return blocks, b_id_to_semantic


if __name__ == "__main__":
    # Quick smoke test
    test_ids = ["B001", "B002", "B003"]
    blocks, mapping = load_blocks(test_ids)
    for b in blocks:
        print(f"{b['id']} | {b['name']} | {b['effort_hours']}h | deps: {b['dependencies']}")
    print(f"\nID map: {mapping}")
