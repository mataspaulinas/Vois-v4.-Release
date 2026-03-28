"""
OIS v3 — Step 2: Failure Mode Engine
Architecture: "Signals are clustered and interpreted as operational patterns: Failure Modes"
Rules:
  - Single critical signal → triggers critical FM immediately
  - Multiple medium signals → threshold to trigger related FM
  - Repeated signals over time → chronic FM flag
Input:  Normalized signal rows from Step 1
Output: { failure_mode_id, score, domain_id, module_id, signal_ids[] }
"""

import csv

from .resources import get_resources


def load_failure_modes():
    """Load Failure Mode Library."""
    fms = {}
    path = get_resources().ontology_dir / "failure_modes.csv"
    with open(path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            fms[row["failure_mode_id"]] = {
                "failure_mode_id": row["failure_mode_id"],
                "title": row["title"],
                "domain_id": row["domain_id"],
                "module_id": row["module_id"],
                "severity": row["severity"],
                "trigger_type": row["trigger_type"],
                "description": row["description"],
            }
    return fms


def load_signal_to_fm_rules():
    """Load Signal → FM mapping rules."""
    rules = []
    path = get_resources().ontology_dir / "signal_to_fm_map.csv"
    with open(path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rules.append({
                "signal_id": row["signal_id"],
                "failure_mode_id": row["failure_mode_id"],
                "weight": float(row["weight"]),
                "rule_type": row["rule_type"],
                "threshold_count": int(row["threshold_count"]) if row.get("threshold_count") else 1,
                "notes": row.get("notes", ""),
            })
    return rules


def detect_failure_modes(normalized_signals, fm_library, rules):
    """
    Architecture spec:
    - Groups signals by domain_id and sub-aspect
    - Applies rule sets:
      - Single critical signal → triggers critical FM immediately
      - Multiple medium signals → threshold to trigger related FM
      - Repeated signals over time → chronic FM flag
    - Outputs list of failure_mode_id objects with scores
    """
    active_signal_ids = {s["signal_id"] for s in normalized_signals}
    signal_lookup = {s["signal_id"]: s for s in normalized_signals}
    
    # Track FM candidates: fm_id → { contributing signals, total weight }
    fm_candidates = {}
    
    for rule in rules:
        if rule["signal_id"] not in active_signal_ids:
            continue
        
        fm_id = rule["failure_mode_id"]
        if fm_id not in fm_candidates:
            fm_candidates[fm_id] = {
                "signal_ids": [],
                "total_weight": 0.0,
                "has_critical_trigger": False,
                "has_chronic_trigger": False,
                "contributing_count": 0,
            }
        
        candidate = fm_candidates[fm_id]
        candidate["signal_ids"].append(rule["signal_id"])
        candidate["total_weight"] += rule["weight"]
        candidate["contributing_count"] += 1
        
        if rule["rule_type"] == "single_critical":
            candidate["has_critical_trigger"] = True
        elif rule["rule_type"] == "chronic":
            candidate["has_chronic_trigger"] = True
    
    # Apply activation rules per architecture
    activated_fms = []
    
    for fm_id, candidate in fm_candidates.items():
        fm_def = fm_library.get(fm_id)
        if not fm_def:
            continue
        
        activated = False
        score = 0.0
        
        # Rule 1: Single critical signal → triggers critical FM immediately
        if candidate["has_critical_trigger"]:
            activated = True
            score = min(candidate["total_weight"], 1.0)
        
        # Rule 2: Multiple medium signals → threshold to trigger related FM
        elif candidate["contributing_count"] >= 2 and candidate["total_weight"] >= 0.8:
            activated = True
            score = min(candidate["total_weight"] / 1.5, 1.0)
        
        # Rule 3: Repeated signals over time → chronic FM flag
        elif candidate["has_chronic_trigger"] and candidate["total_weight"] >= 0.5:
            activated = True
            score = min(candidate["total_weight"], 0.8)
        
        # Rule 4: Single strong contributing signal (weight >= 0.7)
        elif candidate["contributing_count"] >= 1 and candidate["total_weight"] >= 0.7:
            activated = True
            score = min(candidate["total_weight"], 0.85)
        
        if activated:
            activated_fms.append({
                "failure_mode_id": fm_id,
                "score": round(score, 2),
                "domain_id": fm_def["domain_id"],
                "module_id": fm_def["module_id"],
                "signal_ids": list(set(candidate["signal_ids"])),
                # Extra fields for downstream context
                "title": fm_def["title"],
                "severity": fm_def["severity"],
                "description": fm_def["description"],
            })
    
    # Sort by score descending
    activated_fms.sort(key=lambda x: x["score"], reverse=True)
    
    print(f"  Step 2 complete: {len(activated_fms)} failure modes activated from {len(active_signal_ids)} signals")
    return activated_fms


def run(normalized_signals):
    """Main entry point for Step 2."""
    fm_library = load_failure_modes()
    rules = load_signal_to_fm_rules()
    return detect_failure_modes(normalized_signals, fm_library, rules)
