"""
Generate the Cafe ontology JSON bundle from cleaned CSV source files.

Reads:
  - signals_cleaned.csv        (180 signals)
  - failure_modes_cleaned.csv  (108 FMs)
  - domains_cleaned.csv        (14 domains)
  - response_patterns.csv      (55 RPs)
  - signal_to_fm_map_cleaned.csv (365 mappings)
  - fm_to_rp_map.csv           (108 FM->RP)
  - rp_to_block_map.csv        (165 RP->block)
  - rp_to_module_map.csv       (55 RP->module)
  - modules.csv                (16 modules)
  - embedded_engine/OIS_Cafe_v2/01_ontology/blocks/B*.json (block definitions, via gen_blocks.py)

Writes:
  - published/v1/ontology.json
"""

import csv
import json
import re
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from gen_blocks import load_blocks

# ── Paths ──────────────────────────────────────────────────────────────
BASE = Path(__file__).resolve().parent
CLEANED = BASE.parent.parent / "docs" / "audits" / "cafe" / "cleaned"
SNAPSHOT = BASE.parent.parent / "docs" / "audits" / "cafe" / "_snapshot"
OUT = BASE / "published" / "v1" / "ontology.json"

TIMESTAMP = "2026-03-17T00:00:00Z"
OWNER = "cafe-ontology-audit"
SOURCE_REF = "cafe-ontology-v1-audit"


# ── Helpers ────────────────────────────────────────────────────────────

def read_csv(path):
    """Read a CSV file and return list of dicts."""
    with open(path, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        return list(reader)


def to_snake(text):
    """Convert human-readable text to snake_case."""
    text = text.strip()
    text = re.sub(r"[''']", "", text)  # remove apostrophes
    text = re.sub(r"[^a-zA-Z0-9]+", "_", text)  # non-alnum -> underscore
    text = re.sub(r"_+", "_", text)  # collapse
    text = text.strip("_").lower()
    return text


def to_human(snake_name):
    """Convert snake_case signal_name to human-readable Title Case."""
    return snake_name.replace("_", " ").strip().capitalize()
    # Capitalize first word only for readability (sentence case)


def abbreviate_snake(text, max_len=40):
    """Create abbreviated snake_case from title text, max ~max_len chars."""
    snake = to_snake(text)
    if len(snake) <= max_len:
        return snake
    # Truncate at word boundary
    parts = snake.split("_")
    result = []
    length = 0
    for p in parts:
        if length + len(p) + (1 if result else 0) > max_len:
            break
        result.append(p)
        length += len(p) + (1 if len(result) > 1 else 0)
    return "_".join(result) if result else snake[:max_len]


# ── Load CSVs ──────────────────────────────────────────────────────────

print("Loading CSVs...")
signals_raw = read_csv(CLEANED / "signals_cleaned.csv")
fms_raw = read_csv(CLEANED / "failure_modes_cleaned.csv")
domains_raw = read_csv(CLEANED / "domains_cleaned.csv")
rps_raw = read_csv(SNAPSHOT / "response_patterns.csv")
sig_fm_map_raw = read_csv(CLEANED / "signal_to_fm_map_cleaned.csv")
fm_rp_map_raw = read_csv(SNAPSHOT / "fm_to_rp_map.csv")
rp_block_map_raw = read_csv(SNAPSHOT / "rp_to_block_map.csv")
rp_module_map_raw = read_csv(SNAPSHOT / "rp_to_module_map.csv")
modules_raw = read_csv(SNAPSHOT / "modules.csv")

# ── Build lookup tables ────────────────────────────────────────────────

# domain_id -> snake_case domain name
domain_lookup = {}
for d in domains_raw:
    domain_lookup[d["domain_id"]] = to_snake(d["domain_name"])

# module_id -> module_name
module_lookup = {}
for m in modules_raw:
    module_lookup[m["module_id"]] = m["module_name"]

# RP -> module mapping
rp_to_module = {}
for row in rp_module_map_raw:
    rp_to_module[row["response_pattern_id"]] = row["module_id"]

# Build semantic ID lookups (original ID -> semantic ID)
signal_id_map = {}   # S001 -> sig_fridge_temperature_records_absent
fm_id_map = {}       # FM001 -> fm_temperature_monitoring_cold_chain
rp_id_map = {}       # RP001 -> rp_temperature_monitoring_cold_chain

# Also need reverse: to find domain for FM via domain_id
fm_domain_map = {}   # FM001 -> domain snake_case

# ── Build Signals ──────────────────────────────────────────────────────

print("Building signals...")
signals = []
for row in signals_raw:
    sid = row["signal_id"]
    signal_name = row["signal_name"]
    semantic_id = f"sig_{signal_name}"
    signal_id_map[sid] = semantic_id

    sig_type = row.get("type", "qualitative")
    indicator = "leading" if sig_type == "quantitative" else "lagging"

    source = row.get("source", "intake")
    source_types = [source] if source else ["intake"]

    # Map category to domain snake_case
    domain = to_snake(row.get("category", ""))

    signals.append({
        "id": semantic_id,
        "name": to_human(signal_name),
        "description": row.get("description", ""),
        "status": "published",
        "owner": OWNER,
        "source_ref": SOURCE_REF,
        "updated_at": TIMESTAMP,
        "domain": domain,
        "module": "",
        "indicator_type": indicator,
        "evidence_types": [],
        "source_types": source_types,
        "temporal_behavior": None,
        "likely_co_signals": [],
        "adapter_aliases": [sid]
    })

# ── Build Failure Modes ───────────────────────────────────────────────

print("Building failure modes...")
failure_modes = []
for row in fms_raw:
    fmid = row["failure_mode_id"]
    title = row["title"]
    semantic_id = f"fm_{abbreviate_snake(title)}"
    fm_id_map[fmid] = semantic_id

    domain_id = row.get("domain_id", "")
    domain = domain_lookup.get(domain_id, "")
    fm_domain_map[fmid] = domain

    failure_modes.append({
        "id": semantic_id,
        "name": title,
        "description": row.get("description", ""),
        "status": "published",
        "owner": OWNER,
        "source_ref": SOURCE_REF,
        "updated_at": TIMESTAMP,
        "domain": domain,
        "severity": row.get("severity", "medium"),
        "adapter_aliases": [fmid]
    })

# ── Build Response Patterns ───────────────────────────────────────────

print("Building response patterns...")
response_patterns = []
for row in rps_raw:
    rpid = row["response_pattern_id"]
    rp_name = row["rp_name"]
    semantic_id = f"rp_{abbreviate_snake(rp_name)}"
    rp_id_map[rpid] = semantic_id

    domain_id = row.get("domain", "")
    domain = domain_lookup.get(domain_id, "")

    response_patterns.append({
        "id": semantic_id,
        "name": f"{rp_name} Response",
        "description": row.get("description", ""),
        "status": "published",
        "owner": OWNER,
        "source_ref": SOURCE_REF,
        "updated_at": TIMESTAMP,
        "focus": " ".join(filter(None, [
            row.get("l1_focus", ""),
            row.get("l2_focus", ""),
            row.get("l3_focus", ""),
        ])).strip(),
        "domain": domain,
        "severity_range": row.get("severity_range", ""),
        "adapter_aliases": [rpid]
    })

# ── Build signal_failure_map ──────────────────────────────────────────

print("Building signal_failure_map...")
signal_failure_map = []
for row in sig_fm_map_raw:
    sid = row["signal_id"]
    fmid = row["failure_mode_id"]
    weight = float(row.get("weight", 0.5))

    sig_semantic = signal_id_map.get(sid)
    fm_semantic = fm_id_map.get(fmid)

    if sig_semantic and fm_semantic:
        signal_failure_map.append({
            "signal_id": sig_semantic,
            "failure_mode_id": fm_semantic,
            "weight": weight
        })
    else:
        if not sig_semantic:
            print(f"  WARNING: signal {sid} not found in signals")
        if not fm_semantic:
            print(f"  WARNING: FM {fmid} not found in failure_modes")

# ── Build failure_pattern_map ─────────────────────────────────────────

print("Building failure_pattern_map...")
failure_pattern_map = []
for row in fm_rp_map_raw:
    fmid = row["failure_mode_id"]
    rpid = row["response_pattern_id"]

    fm_semantic = fm_id_map.get(fmid)
    rp_semantic = rp_id_map.get(rpid)

    if fm_semantic and rp_semantic:
        failure_pattern_map.append({
            "failure_mode_id": fm_semantic,
            "response_pattern_id": rp_semantic,
            "weight": 1.0,
        })
    else:
        if not fm_semantic:
            print(f"  WARNING: FM {fmid} not found")
        if not rp_semantic:
            print(f"  WARNING: RP {rpid} not found")

# ── Load Blocks from Restaurant block library ─────────────────────────

print("Loading cafe blocks from Restaurant block library...")
# Collect all block IDs referenced by the rp_to_block_map
all_block_ids: set[str] = set()
for row in rp_block_map_raw:
    ids = [b.strip() for b in row.get("block_ids", "").split(",") if b.strip()]
    all_block_ids.update(ids)

blocks, b_id_to_semantic = load_blocks(sorted(all_block_ids))
print(f"  Loaded {len(blocks)} blocks ({len(all_block_ids) - len(blocks)} missing source files)")

# Build tools list (flat, deduplicated)
tools: list[dict] = []

# ── Build pattern_block_map ───────────────────────────────────────────

print("Building pattern_block_map...")
pattern_block_map = []
for row in rp_block_map_raw:
    rpid = row["response_pattern_id"]
    layer = row.get("layer", "")
    block_ids_str = row.get("block_ids", "")

    rp_semantic = rp_id_map.get(rpid)
    if not rp_semantic:
        print(f"  WARNING: RP {rpid} not found for block map")
        continue

    # block_ids is a comma-separated list
    raw_block_ids = [b.strip() for b in block_ids_str.split(",") if b.strip()]
    for bid in raw_block_ids:
        blk_semantic = b_id_to_semantic.get(bid)
        if not blk_semantic:
            # Block file was missing — skip silently (already reported above)
            continue
        pattern_block_map.append({
            "response_pattern_id": rp_semantic,
            "block_id": blk_semantic,
            "weight": 1.0,
        })

# ── Assemble ontology ─────────────────────────────────────────────────

ontology = {
    "meta": {
        "version": "v1",
        "vertical": "cafe",
        "owner": OWNER,
        "released_at": TIMESTAMP,
        "recovery_sources": ["ois-restaurant-block-library-v3"],
    },
    "signals": signals,
    "failure_modes": failure_modes,
    "response_patterns": response_patterns,
    "blocks": blocks,
    "tools": tools,
    "signal_failure_map": signal_failure_map,
    "failure_pattern_map": failure_pattern_map,
    "pattern_block_map": pattern_block_map,
}

# ── Write output ───────────────────────────────────────────────────────

OUT.parent.mkdir(parents=True, exist_ok=True)
with open(OUT, "w", encoding="utf-8") as f:
    json.dump(ontology, f, indent=2, ensure_ascii=False)

# ── Summary ────────────────────────────────────────────────────────────

print(f"\nOntology written to: {OUT}")
print(f"  Signals:            {len(signals)}")
print(f"  Failure Modes:      {len(failure_modes)}")
print(f"  Response Patterns:  {len(response_patterns)}")
print(f"  Signal-FM Map:      {len(signal_failure_map)}")
print(f"  FM-RP Map:          {len(failure_pattern_map)}")
print(f"  Blocks:             {len(blocks)}")
print(f"  RP-Block Map:       {len(pattern_block_map)}")

# Check for duplicate semantic IDs
sig_ids = [s["id"] for s in signals]
fm_ids = [f["id"] for f in failure_modes]
rp_ids = [r["id"] for r in response_patterns]

sig_dupes = len(sig_ids) - len(set(sig_ids))
fm_dupes = len(fm_ids) - len(set(fm_ids))
rp_dupes = len(rp_ids) - len(set(rp_ids))

if sig_dupes:
    print(f"  WARNING: {sig_dupes} duplicate signal IDs")
    from collections import Counter
    for sid, cnt in Counter(sig_ids).most_common():
        if cnt > 1:
            print(f"    {sid}: {cnt}")
if fm_dupes:
    print(f"  WARNING: {fm_dupes} duplicate FM IDs")
    from collections import Counter
    for fid, cnt in Counter(fm_ids).most_common():
        if cnt > 1:
            print(f"    {fid}: {cnt}")
if rp_dupes:
    print(f"  WARNING: {rp_dupes} duplicate RP IDs")
    from collections import Counter
    for rid, cnt in Counter(rp_ids).most_common():
        if cnt > 1:
            print(f"    {rid}: {cnt}")

if not (sig_dupes or fm_dupes or rp_dupes):
    print("  No duplicate IDs found.")

print("\nDone.")
