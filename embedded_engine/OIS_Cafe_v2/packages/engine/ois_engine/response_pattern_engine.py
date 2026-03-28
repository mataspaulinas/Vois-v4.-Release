"""
OIS v3 — Step 3: Response Pattern Engine
Architecture: "Each Failure Mode activates 1–3 Response Patterns (RP_001–RP_050) that define L1/L2/L3 actions"
Input:  List of failure_mode_id with scores (from Step 2)
Output: List of pattern_id with associated severity/priority
"""

import csv

from .resources import get_resources


def load_response_patterns():
    """Load Response Pattern Library."""
    rps = {}
    path = get_resources().ontology_dir / "response_patterns.csv"
    with open(path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rps[row["response_pattern_id"]] = {
                "response_pattern_id": row["response_pattern_id"],
                "rp_name": row["rp_name"],
                "domain": row["domain"],
                "severity_range": row["severity_range"],
                "l1_focus": row["l1_focus"],
                "l2_focus": row["l2_focus"],
                "l3_focus": row["l3_focus"],
                "description": row["description"],
            }
    return rps


def load_fm_to_rp_map():
    """Load FM → RP mapping rules."""
    rules = []
    path = get_resources().ontology_dir / "fm_to_rp_map.csv"
    with open(path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rules.append({
                "failure_mode_id": row["failure_mode_id"],
                "response_pattern_id": row["response_pattern_id"],
                "priority": row["priority"],
                "notes": row.get("notes", ""),
            })
    return rules


def activate_response_patterns(activated_fms, rp_library, fm_to_rp_rules):
    """
    Architecture spec:
    - Reads active failure_mode_id list
    - Looks up pattern_ids from mapping table
    - Aggregates all Response Patterns relevant for current snapshot
    """
    active_fm_ids = {fm["failure_mode_id"] for fm in activated_fms}
    fm_lookup = {fm["failure_mode_id"]: fm for fm in activated_fms}
    
    # Collect RP activations with accumulated severity
    rp_activations = {}  # rp_id → { priority_score, triggering_fms, ... }
    
    for rule in fm_to_rp_rules:
        if rule["failure_mode_id"] not in active_fm_ids:
            continue
        
        rp_id = rule["response_pattern_id"]
        fm = fm_lookup[rule["failure_mode_id"]]
        
        if rp_id not in rp_activations:
            rp_def = rp_library.get(rp_id)
            if not rp_def:
                continue
            rp_activations[rp_id] = {
                "response_pattern_id": rp_id,
                "rp_name": rp_def["rp_name"],
                "domain": rp_def["domain"],
                "severity": rp_def["severity_range"],
                "priority_score": 0.0,
                "triggering_fms": [],
                "l1_focus": rp_def["l1_focus"],
                "l2_focus": rp_def["l2_focus"],
                "l3_focus": rp_def["l3_focus"],
                "description": rp_def["description"],
            }
        
        activation = rp_activations[rp_id]
        
        # Primary FMs contribute more to priority than secondary
        weight = 1.0 if rule["priority"] == "primary" else 0.5
        activation["priority_score"] += fm["score"] * weight
        activation["triggering_fms"].append({
            "failure_mode_id": rule["failure_mode_id"],
            "fm_title": fm["title"],
            "fm_score": fm["score"],
            "link_priority": rule["priority"],
        })
    
    # Convert to list and sort by priority score
    result = list(rp_activations.values())
    result.sort(key=lambda x: x["priority_score"], reverse=True)
    
    print(f"  Step 3 complete: {len(result)} response patterns activated from {len(active_fm_ids)} failure modes")
    return result


def run(activated_fms):
    """Main entry point for Step 3."""
    rp_library = load_response_patterns()
    fm_to_rp_rules = load_fm_to_rp_map()
    return activate_response_patterns(activated_fms, rp_library, fm_to_rp_rules)
