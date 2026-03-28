"""
OIS v3 — Step 1: Signal Normalization Engine
Architecture: "All raw observations and metrics are captured and converted into standardized Signals"
Input:  Raw audit JSON (venue_id, signals, venue_context)
Output: Normalized signal rows: { signal_id, domain_id, severity, timestamp, source_type, venue_id, notes }
"""

import csv
import json
import os
from datetime import datetime

from .resources import get_resources


def load_signal_library():
    """Load the master signals library from CSV."""
    signals = {}
    path = get_resources().ontology_dir / "signals.csv"
    with open(path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            signals[row["signal_id"]] = {
                "signal_id": row["signal_id"],
                "signal_name": row["signal_name"],
                "category": row["category"],
                "type": row["type"],
                "severity": row["severity"],
                "comparator": row.get("comparator", ""),
                "threshold": row.get("threshold", ""),
                "source": row.get("source", ""),
                "window_days": row.get("window_days", ""),
                "description": row.get("description", ""),
            }
    return signals


def normalize_signals(raw_input, signal_library):
    """
    Architecture spec:
    - Maps free-text answers → signal_id using rule-based classifiers
    - Assigns domain_id, severity, source_type, timestamps
    
    Input: raw audit JSON with structure:
    {
        "venue_id": "...",
        "venue_context": { "type": "service venue", "phase": "operational", ... },
        "assessment_date": "2025-12-01",
        "signals": {
            "S001": { "active": true, "notes": "..." },
            "S006": { "active": true, "value": 0.55 },
            ...
        }
    }
    
    Output: list of normalized signal rows
    """
    venue_id = raw_input.get("venue_id", "unknown")
    assessment_date = raw_input.get("assessment_date", datetime.now().strftime("%Y-%m-%d"))
    raw_signals = raw_input.get("signals", {})

    # Defensive: handle both dict and list formats
    # Dict format (expected): {"S001": {"active": true, ...}, ...}
    # List format (edge case): [{"signal_id": "S001", "active": true, ...}, ...]
    if isinstance(raw_signals, list):
        converted = {}
        for item in raw_signals:
            if isinstance(item, dict) and "signal_id" in item:
                converted[item["signal_id"]] = item
            elif isinstance(item, str):
                converted[item] = {"active": True}
        raw_signals = converted
        print(f"  [NOTE] Signals received as list — converted {len(converted)} items to dict format")

    normalized = []
    
    for signal_id, signal_data in raw_signals.items():
        signal_id_upper = signal_id.upper()
        
        # Look up in library
        lib_entry = signal_library.get(signal_id_upper)
        if not lib_entry:
            print(f"  [WARN] Signal {signal_id} not found in library — skipping")
            continue
        
        # Determine if signal is active
        is_active = False
        
        if isinstance(signal_data, dict):
            # Explicit active flag
            if signal_data.get("active", False):
                is_active = True
            
            # Threshold-based evaluation for measurable signals
            value = signal_data.get("value")
            if value is not None and lib_entry["comparator"] and lib_entry["threshold"]:
                threshold = float(lib_entry["threshold"])
                comparator = lib_entry["comparator"]
                
                if comparator == ">" and value > threshold:
                    is_active = True
                elif comparator == ">=" and value >= threshold:
                    is_active = True
                elif comparator == "<" and value < threshold:
                    is_active = True
                elif comparator == "<=" and value <= threshold:
                    is_active = True
                elif comparator == "==" and value == threshold:
                    is_active = True
        elif isinstance(signal_data, bool):
            is_active = signal_data
        
        if not is_active:
            continue
        
        # Build normalized signal row — exactly as architecture specifies
        notes = ""
        source_type = lib_entry["source"] or "audit"
        if isinstance(signal_data, dict):
            notes = signal_data.get("notes", "")
            source_type = signal_data.get("source_type", source_type)
        
        normalized_row = {
            "signal_id": signal_id_upper,
            "domain_id": lib_entry["category"],
            "severity": lib_entry["severity"],
            "timestamp": assessment_date,
            "source_type": source_type,
            "venue_id": venue_id,
            "notes": notes,
            # Extra fields for downstream processing
            "signal_name": lib_entry["signal_name"],
            "description": lib_entry["description"],
            "value": signal_data.get("value") if isinstance(signal_data, dict) else None,
        }
        
        normalized.append(normalized_row)
    
    print(f"  Step 1 complete: {len(normalized)} active signals normalized from {len(raw_signals)} raw inputs")
    return normalized


def run(raw_input):
    """Main entry point for Step 1."""
    signal_library = load_signal_library()
    return normalize_signals(raw_input, signal_library)


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python signal_normalization.py <input_file.json>")
        sys.exit(1)
    
    with open(sys.argv[1], "r", encoding="utf-8") as f:
        raw = json.load(f)
    
    result = run(raw)
    print(json.dumps(result, indent=2, ensure_ascii=False))
