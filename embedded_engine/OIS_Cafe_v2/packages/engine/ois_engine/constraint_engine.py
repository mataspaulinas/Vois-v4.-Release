"""
OIS v3 — Constraint Engine (Step 4.5)
Sits between Block Activation (Step 4) and Plan Generator (Step 5).

Purpose: Prevent the engine from producing plans that overwhelm venues.
The circuit breaker the architecture was missing.

Inputs:
    - activation_set: dict with l1_tools[], l2_blocks[], l2_tools[], l3_blocks[], l3_tools[]
    - activation_context: list of RP context dicts
    - venue_context: dict with team_size, type, etc.
    - normalized_signals: dict of active signals

Outputs:
    - constrained_set: same structure as activation_set, but trimmed
    - constraint_report: dict with plan load, cuts, evidence warnings
"""

import csv

from .resources import get_resources

# ─── Capacity Rules ───
# max concurrent items by team size: (max_l1, max_l2, max_l3, max_total)
CAPACITY_TABLE = {
    (1, 3):   (3, 5, 3, 8),       # Micro team
    (4, 7):   (5, 8, 5, 14),      # Small team
    (8, 15):  (7, 12, 8, 22),     # Medium team
    (16, 30): (10, 16, 10, 30),   # Large team
    (31, 99): (14, 20, 14, 40),   # Enterprise
}
DEFAULT_CAPACITY = (5, 8, 5, 14)

WEEKLY_CHANGE_BUDGET = {
    (1, 3): 2, (4, 7): 3, (8, 15): 4, (16, 30): 5, (31, 99): 7,
}
DEFAULT_WEEKLY_BUDGET = 3

SEVERITY_RANK = {"critical": 0, "high": 1, "medium": 2, "low": 3}


def get_capacity(team_size):
    if not team_size or team_size < 1:
        return DEFAULT_CAPACITY
    for (lo, hi), cap in CAPACITY_TABLE.items():
        if lo <= team_size <= hi:
            return cap
    return DEFAULT_CAPACITY


def get_weekly_budget(team_size):
    if not team_size or team_size < 1:
        return DEFAULT_WEEKLY_BUDGET
    for (lo, hi), budget in WEEKLY_CHANGE_BUDGET.items():
        if lo <= team_size <= hi:
            return budget
    return DEFAULT_WEEKLY_BUDGET


def classify_plan_load(item_count, max_total):
    if max_total == 0:
        return "TRIAGE"
    ratio = item_count / max_total
    if ratio <= 0.4:
        return "LIGHT"
    elif ratio <= 0.7:
        return "MEDIUM"
    elif ratio <= 0.9:
        return "HEAVY"
    else:
        return "TRIAGE"


def count_items(activation_set):
    """Count total items in an activation set."""
    return (len(activation_set.get("l1_blocks", [])) +
            len(activation_set.get("l1_tools", [])) +
            len(activation_set.get("l2_blocks", [])) +
            len(activation_set.get("l2_tools", [])) +
            len(activation_set.get("l3_blocks", [])) +
            len(activation_set.get("l3_tools", [])))


def trim_list(items, max_count):
    """Trim a list of items, keeping highest-priority first.
    Items have 'rp_priority' = accumulated RP priority_score (higher = more important)."""
    if len(items) <= max_count:
        return items, []
    sorted_items = sorted(items, key=lambda x: x.get("rp_priority", 0), reverse=True)
    return sorted_items[:max_count], sorted_items[max_count:]


def check_evidence_discipline(normalized_signals):
    """Check signal evidence quality. Returns warnings for signals missing notes."""
    # Robust Input Normalization
    iterable = []
    if isinstance(normalized_signals, dict):
        iterable = normalized_signals.items()
    elif isinstance(normalized_signals, list):
        for s in normalized_signals:
            if isinstance(s, dict):
                sid = s.get("signal_id") or s.get("id")
                if sid:
                    iterable.append((sid, s))
    else:
        # Unexpected type, return safe default
        return {
            "level": "error",
            "message": f"Invalid signals type: {type(normalized_signals)}",
            "signals_without_evidence": [],
            "evidence_ratio": 0.0,
        }

    warnings = []
    total = 0
    missing = 0

    for sig_id, sig_data in iterable:
        # Filter inactive signals if 'active' flag is present (default True for normalized lists)
        if not sig_data.get("active", True):
            continue
            
        total += 1
        notes = str(sig_data.get("notes") or "").strip()
        confidence = str(sig_data.get("confidence") or "").strip()
        
        if not notes and not confidence:
            missing += 1
            warnings.append(sig_id)

    ratio = (total - missing) / total if total > 0 else 1.0

    if ratio < 0.5 and total > 3:
        return {
            "level": "warning",
            "message": (f"{missing} of {total} active signals have no evidence notes. "
                       f"Consider adding field notes to improve diagnostic confidence."),
            "signals_without_evidence": warnings,
            "evidence_ratio": round(ratio, 2),
        }
    elif missing > 0:
        return {
            "level": "info",
            "message": f"{missing} signal(s) without evidence notes: {', '.join(warnings[:5])}",
            "signals_without_evidence": warnings,
            "evidence_ratio": round(ratio, 2),
        }
    return {
        "level": "ok",
        "message": "All signals have evidence notes",
        "signals_without_evidence": [],
        "evidence_ratio": 1.0,
    }


INTENSITY_MULTIPLIER = {
    "focused":  0.5,   # Aggressive trimming — only the most critical items
    "balanced": 1.0,   # Standard capacity limits
    "thorough": 1.5,   # Allow some overload for detailed diagnostics
}


def run(activation_set, activation_context, venue_context, normalized_signals,
        triage_enabled=False, triage_intensity="balanced"):
    """
    Run constraint engine on the activation set.
    Returns (constrained_set, constraint_report).

    Args:
        triage_enabled: If True, trim activation set to team capacity.
        triage_intensity: "focused" (strict), "balanced" (standard), or "thorough" (relaxed).
    """
    team_size = venue_context.get("team_size")
    if isinstance(team_size, str):
        try:
            team_size = int(team_size)
        except ValueError:
            team_size = None

    original_count = count_items(activation_set)
    max_l1, max_l2, max_l3, max_total = get_capacity(team_size)
    weekly_budget = get_weekly_budget(team_size)

    # Apply intensity multiplier to capacity limits
    intensity = triage_intensity if triage_intensity in INTENSITY_MULTIPLIER else "balanced"
    mult = INTENSITY_MULTIPLIER[intensity]
    eff_l1 = max(1, int(max_l1 * mult))
    eff_l2 = max(1, int(max_l2 * mult))
    eff_l3 = max(1, int(max_l3 * mult))
    eff_total = max(1, int(max_total * mult))

    plan_load = classify_plan_load(original_count, eff_total if triage_enabled else max_total)

    mode_label = f"TRIAGE ({intensity.upper()})" if triage_enabled else "PASS-THROUGH"
    print(f"\n{'='*50}")
    print(f"  CONSTRAINT ENGINE (Step 4.5) — {mode_label}")
    print(f"  Team size: {team_size or 'unknown'}")
    print(f"  Items activated: {original_count}")
    if triage_enabled:
        print(f"  Effective capacity: {eff_total} (L1:{eff_l1} L2:{eff_l2} L3:{eff_l3})  [{intensity} ×{mult}]")
    else:
        print(f"  Capacity reference: {max_total} (L1:{max_l1} L2:{max_l2} L3:{max_l3})")
    print(f"  Plan load: {plan_load}")

    # Evidence discipline
    evidence_warnings = check_evidence_discipline(normalized_signals)
    if evidence_warnings["level"] == "warning":
        print(f"  ⚠ Evidence: {evidence_warnings['message']}")

    if not triage_enabled:
        print(f"  → Passing ALL {original_count} items through (triage disabled)")
        print(f"{'='*50}")
        return activation_set, _build_report(
            original_count, original_count, plan_load,
            team_size, max_total, weekly_budget,
            [], evidence_warnings, False, intensity
        )

    # ─── TRIAGE: Trim each layer to effective capacity ───
    deferred = []

    l1_blocks, l1b_cut = trim_list(activation_set.get("l1_blocks", []), eff_l1)
    deferred.extend(l1b_cut)

    l1_tools, l1t_cut = trim_list(activation_set.get("l1_tools", []), eff_l1)
    deferred.extend(l1t_cut)

    l2_blocks, l2b_cut = trim_list(activation_set.get("l2_blocks", []), eff_l2)
    deferred.extend(l2b_cut)

    l2_tools, l2t_cut = trim_list(activation_set.get("l2_tools", []), eff_l2)
    deferred.extend(l2t_cut)

    l3_blocks, l3b_cut = trim_list(activation_set.get("l3_blocks", []), eff_l3)
    deferred.extend(l3b_cut)

    l3_tools, l3t_cut = trim_list(activation_set.get("l3_tools", []), eff_l3)
    deferred.extend(l3t_cut)

    constrained_set = {
        "l1_blocks": l1_blocks,
        "l1_tools": l1_tools,
        "l2_blocks": l2_blocks,
        "l2_tools": l2_tools,
        "l3_blocks": l3_blocks,
        "l3_tools": l3_tools,
    }

    constrained_count = count_items(constrained_set)
    cut_count = original_count - constrained_count
    print(f"  → Trimmed: {original_count} → {constrained_count}  ({cut_count} deferred)")
    print(f"{'='*50}")

    return constrained_set, _build_report(
        original_count, constrained_count, plan_load,
        team_size, eff_total, weekly_budget,
        deferred, evidence_warnings, True, intensity
    )


def _build_report(original, constrained, load, team_size, capacity,
                  weekly_budget, deferred, evidence, triage, intensity="balanced"):
    weeks = max(1, constrained // weekly_budget + (1 if constrained % weekly_budget else 0))
    return {
        "original_count": original,
        "constrained_count": constrained,
        "plan_load": load,
        "team_size": team_size,
        "capacity": capacity,
        "weekly_budget": weekly_budget,
        "weeks_estimated": weeks,
        "deferred_items": deferred,
        "deferred_count": len(deferred),
        "evidence_warnings": evidence,
        "triage_mode": triage,
        "triage_intensity": intensity,
        "triage_message": (
            f"This venue activated {original} items, but a team of "
            f"{team_size or 'unknown size'} can realistically absorb ~{capacity} "
            f"concurrent changes ({intensity} mode). The plan has been trimmed to {constrained} "
            f"highest-priority items. {len(deferred)} items deferred to a future phase."
        ) if triage else None,
    }
