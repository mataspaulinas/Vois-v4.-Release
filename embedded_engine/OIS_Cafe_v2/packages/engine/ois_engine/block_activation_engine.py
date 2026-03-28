"""
OIS v3 — Step 4: Block & Tool Activation Engine
Architecture: "For each Response Pattern, the system activates the exact Blocks (Bxxx) and Tools (Txxx) needed at L1/L2/L3"
Input:  List of pattern_id with severity/priority (from Step 3)
Output: Raw activation set: { l1_tools[], l2_blocks[], l2_tools[], l3_blocks[], l3_tools[] }
"""

import csv

from .resources import get_resources


def load_rp_to_block_map():
    """Load Pattern → Activation Mapping."""
    mapping = {}  # rp_id → { L1: {blocks, tools}, L2: {...}, L3: {...} }
    path = get_resources().ontology_dir / "rp_to_block_map.csv"
    with open(path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rp_id = row["response_pattern_id"]
            layer = row["layer"]
            
            if rp_id not in mapping:
                mapping[rp_id] = {}
            
            block_ids = [b.strip() for b in row.get("block_ids", "").split(",") if b.strip()]
            tool_ids = [t.strip() for t in row.get("tool_ids", "").split(",") if t.strip()]
            
            mapping[rp_id][layer] = {
                "block_ids": block_ids,
                "tool_ids": tool_ids,
                "notes": row.get("notes", ""),
            }
    return mapping


def load_block_metadata():
    """Load block metadata from JSON files if available."""
    blocks = {}
    blocks_dir = get_resources().blocks_dir
    if blocks_dir.exists():
        import json
        for f in blocks_dir.glob("B*.json"):
            try:
                with open(f, "r", encoding="utf-8") as fh:
                    data = json.load(fh)
                    bid = data.get("block_id", f.stem)
                    blocks[bid] = data
            except (json.JSONDecodeError, IOError):
                pass
    return blocks


def activate_blocks(activated_rps, rp_to_block_map, block_metadata=None):
    """
    For each Response Pattern, activate Blocks and Tools at L1/L2/L3.

    A block can appear at multiple layers (L1 for quick fix, L2 for system build,
    L3 for ongoing rhythm) — deduplication is per (block_id, layer).

    Output:
    { l1_blocks[], l1_tools[], l2_blocks[], l2_tools[], l3_blocks[], l3_tools[] }
    """
    activation_set = {
        "l1_blocks": [],
        "l1_tools": [],
        "l2_blocks": [],
        "l2_tools": [],
        "l3_blocks": [],
        "l3_tools": [],
    }

    activation_context = []
    seen_block_layers = set()   # (block_id, layer) — same block can appear at different layers
    seen_tool_layers = set()    # (tool_id, layer)

    for rp in activated_rps:
        rp_id = rp["response_pattern_id"]
        rp_mapping = rp_to_block_map.get(rp_id, {})

        rp_context = {
            "response_pattern_id": rp_id,
            "rp_name": rp["rp_name"],
            "priority_score": rp["priority_score"],
            "activated_items": {"L1": [], "L2": [], "L3": []},
        }

        for layer in ["L1", "L2", "L3"]:
            layer_data = rp_mapping.get(layer, {"block_ids": [], "tool_ids": []})

            for block_id in layer_data["block_ids"]:
                key = (block_id, layer)
                if key not in seen_block_layers:
                    seen_block_layers.add(key)

                    meta = {}
                    if block_metadata and block_id in block_metadata:
                        meta = block_metadata[block_id]

                    block_entry = {
                        "block_id": block_id,
                        "title": meta.get("name", block_id),
                        "source_rp": rp_id,
                        "layer": layer,
                        "rp_priority": rp["priority_score"],
                        "description": meta.get("purpose", ""),
                        "domain": meta.get("domain", ""),
                        "module": meta.get("module", ""),
                    }

                    if layer == "L1":
                        activation_set["l1_blocks"].append(block_entry)
                    elif layer == "L2":
                        activation_set["l2_blocks"].append(block_entry)
                    elif layer == "L3":
                        activation_set["l3_blocks"].append(block_entry)

                    rp_context["activated_items"][layer].append(block_id)

            for tool_id in layer_data["tool_ids"]:
                key = (tool_id, layer)
                if key not in seen_tool_layers:
                    seen_tool_layers.add(key)

                    tool_entry = {
                        "tool_id": tool_id,
                        "source_rp": rp_id,
                        "layer": layer,
                        "rp_priority": rp["priority_score"],
                    }

                    if layer == "L1":
                        activation_set["l1_tools"].append(tool_entry)
                    elif layer == "L2":
                        activation_set["l2_tools"].append(tool_entry)
                    elif layer == "L3":
                        activation_set["l3_tools"].append(tool_entry)

                    rp_context["activated_items"][layer].append(tool_id)

        activation_context.append(rp_context)

    l1 = len(activation_set["l1_blocks"]) + len(activation_set["l1_tools"])
    l2 = len(activation_set["l2_blocks"]) + len(activation_set["l2_tools"])
    l3 = len(activation_set["l3_blocks"]) + len(activation_set["l3_tools"])
    total = l1 + l2 + l3

    print(f"  Step 4 complete: {total} items activated "
          f"(L1: {len(activation_set['l1_blocks'])} blocks + {len(activation_set['l1_tools'])} tools, "
          f"L2: {len(activation_set['l2_blocks'])} blocks + {len(activation_set['l2_tools'])} tools, "
          f"L3: {len(activation_set['l3_blocks'])} blocks + {len(activation_set['l3_tools'])} tools)")

    return activation_set, activation_context


def run(activated_rps):
    """Main entry point for Step 4."""
    rp_to_block_map = load_rp_to_block_map()
    block_metadata = load_block_metadata()
    return activate_blocks(activated_rps, rp_to_block_map, block_metadata)
