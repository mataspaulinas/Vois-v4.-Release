"""
OIS v3 — Step 5: Plan Generator (Assembly Engine)
Architecture: "Converts all activated items into one coherent, prioritized L1/L2/L3 action plan"
- Merges L1/L2/L3 lists from Activation Engine
- Deduplicates Blocks and Tools
- Orders tasks by: Severity of FM, Cross-domain dependencies, Effort vs impact heuristic
- Outputs structured JSON plan ready for front-end or PDF

Dependency Enforcement (Layer 1 — Module-level):
- Loads module_dependencies.csv (prerequisite, corequisite, reinforcement, temporal_gate)
- Maps each task back to its module via rp_to_module_map.csv
- Evaluates conditions against active signals
- Topologically sorts tasks within each layer: prerequisites before dependents
- Annotates tasks with dependency notes visible in report

Soul Layer Integration:
- Priority Pyramid: Team → Guests → Community → Partners → Outcomes
- Confidence States: CONFIDENT / PROVISIONAL / INSUFFICIENT
- "What's Already Working" analysis included in output

Input:  Raw activation set + metadata from Steps 1-4
Output: { L1_tasks[], L2_tasks[], L3_tasks[], blocks_used[], tools_used[], priority_bands[],
          confidence, strengths[], dependency_notes[] }
"""

import csv
from collections import defaultdict

from .resources import get_resources


# ═══════════════════════════════════════════════════════════
# DEPENDENCY INFRASTRUCTURE
# ═══════════════════════════════════════════════════════════

def load_module_dependencies():
    """Load inter-module dependency rules from CSV."""
    deps = []
    path = get_resources().ontology_dir / "module_dependencies.csv"
    with open(path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            deps.append({
                "from_module": row["from_module"],
                "to_module": row["to_module"],
                "type": row["type"],
                "level": row.get("level", "ANY"),
                "weight": float(row["weight"]),
                "min_confidence": float(row.get("min_confidence", 0.7)),
                "condition": row.get("condition_expression", ""),
                "notes": row.get("notes", ""),
            })
    return deps


def load_rp_to_module_map():
    """Load RP → Module mapping so tasks can be traced to modules."""
    mapping = {}
    path = get_resources().ontology_dir / "rp_to_module_map.csv"
    with open(path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            mapping[row["response_pattern_id"]] = row["module_id"]
    return mapping


def evaluate_condition(condition_expr, active_signals):
    """
    Evaluate a dependency condition expression against active signals.
    Conditions like: 'S045==True or S046<0.6'
    Returns True if condition is met (dependency is active), False otherwise.
    If no condition, dependency is always active.
    """
    if not condition_expr or not condition_expr.strip():
        return True

    signal_lookup = {s["signal_id"]: s for s in active_signals}
    active_ids = set(s["signal_id"] for s in active_signals)

    # Parse simple conditions: S045==True, S046<0.6, etc.
    import re
    tokens = re.split(r'\s+(or|and)\s+', condition_expr.strip())

    results = []
    operators = []

    for token in tokens:
        token = token.strip()
        if token in ("or", "and"):
            operators.append(token)
            continue

        # Try to parse: signal_id COMPARATOR value
        match = re.match(r'(S\d+)\s*(==|!=|>=|<=|>|<)\s*(.+)', token)
        if not match:
            # Unknown format — assume condition met (safe default)
            results.append(True)
            continue

        sig_id, comparator, raw_value = match.groups()
        raw_value = raw_value.strip()

        # Check if signal is active
        if sig_id not in active_ids:
            results.append(False)
            continue

        sig = signal_lookup[sig_id]

        # Handle boolean comparisons (==True means "signal is active")
        if raw_value in ("True", "true", "1"):
            results.append(True)  # Signal is active, condition met
            continue
        elif raw_value in ("False", "false", "0"):
            results.append(False)  # Signal active but condition wants inactive
            continue

        # Handle numeric comparisons
        sig_value = sig.get("value")
        if sig_value is None:
            # Signal active but no numeric value — assume condition met
            results.append(True)
            continue

        try:
            threshold = float(raw_value)
            if comparator == ">":
                results.append(sig_value > threshold)
            elif comparator == ">=":
                results.append(sig_value >= threshold)
            elif comparator == "<":
                results.append(sig_value < threshold)
            elif comparator == "<=":
                results.append(sig_value <= threshold)
            elif comparator == "==":
                results.append(sig_value == threshold)
            elif comparator == "!=":
                results.append(sig_value != threshold)
            else:
                results.append(True)
        except ValueError:
            results.append(True)

    # Combine results with operators
    if not results:
        return True

    final = results[0]
    for i, op in enumerate(operators):
        if i + 1 < len(results):
            if op == "or":
                final = final or results[i + 1]
            elif op == "and":
                final = final and results[i + 1]

    return final


def resolve_active_dependencies(module_deps, active_modules, active_signals, layer_filter):
    """
    Given active modules in the plan, resolve which dependencies apply.
    Returns:
      - prerequisite_graph: {module_id: [list of modules that must come before it]}
      - dependency_notes: human-readable notes about enforced ordering
    """
    prereq_graph = defaultdict(set)  # module → set of modules that must precede it
    dep_notes = []

    for dep in module_deps:
        from_mod = dep["from_module"]
        to_mod = dep["to_module"]
        dep_type = dep["type"]
        dep_level = dep["level"]

        # Both modules must be active in the plan
        if from_mod not in active_modules or to_mod not in active_modules:
            continue

        # Check level filter (ANY matches all, or specific level must match)
        if dep_level != "ANY" and dep_level != layer_filter:
            continue

        # Evaluate condition against active signals
        if not evaluate_condition(dep["condition"], active_signals):
            continue

        # Apply dependency based on type
        if dep_type == "prerequisite":
            # from_module must be done before to_module
            prereq_graph[to_mod].add(from_mod)
            dep_notes.append({
                "type": "prerequisite",
                "from": from_mod,
                "to": to_mod,
                "weight": dep["weight"],
                "note": dep["notes"],
                "layer": layer_filter,
            })

        elif dep_type == "temporal_gate":
            # from_module gates to_module (similar to prerequisite but time-based)
            prereq_graph[to_mod].add(from_mod)
            dep_notes.append({
                "type": "temporal_gate",
                "from": from_mod,
                "to": to_mod,
                "weight": dep["weight"],
                "note": dep["notes"],
                "layer": layer_filter,
            })

        elif dep_type == "corequisite":
            # Must run together — no hard ordering but note it
            dep_notes.append({
                "type": "corequisite",
                "from": from_mod,
                "to": to_mod,
                "weight": dep["weight"],
                "note": dep["notes"],
                "layer": layer_filter,
            })

        elif dep_type == "reinforcement":
            # Soft ordering — from helps to, but not blocking
            dep_notes.append({
                "type": "reinforcement",
                "from": from_mod,
                "to": to_mod,
                "weight": dep["weight"],
                "note": dep["notes"],
                "layer": layer_filter,
            })

    return prereq_graph, dep_notes


def topological_sort_tasks(tasks, prereq_graph, rp_to_module, priority_order):
    """
    Sort tasks respecting module-level prerequisites.
    Within same dependency tier, sort by priority.
    Uses Kahn's algorithm for topological ordering.
    """
    if not prereq_graph:
        # No dependencies active — just sort by priority
        tasks.sort(key=lambda x: priority_order.get(x["priority"], 9))
        return tasks

    # Map each task to its module
    task_modules = {}
    module_tasks = defaultdict(list)
    for task in tasks:
        mod = rp_to_module.get(task["source_rp"], "UNKNOWN")
        task_modules[task["task_id"]] = mod
        module_tasks[mod].append(task)

    # Get all modules present in this task list
    present_modules = set(module_tasks.keys())

    # Build in-degree count for present modules only
    in_degree = defaultdict(int)
    adj = defaultdict(set)
    for mod in present_modules:
        if mod not in in_degree:
            in_degree[mod] = 0

    for to_mod, from_mods in prereq_graph.items():
        if to_mod not in present_modules:
            continue
        for from_mod in from_mods:
            if from_mod in present_modules:
                adj[from_mod].add(to_mod)
                in_degree[to_mod] += 1

    # Kahn's algorithm — process modules with no incoming edges first
    queue = sorted(
        [m for m in present_modules if in_degree[m] == 0],
        key=lambda m: min(priority_order.get(t["priority"], 9) for t in module_tasks[m])
    )

    sorted_tasks = []
    visited = set()

    while queue:
        mod = queue.pop(0)
        if mod in visited:
            continue
        visited.add(mod)

        # Add this module's tasks, sorted by priority within module
        mod_tasks = sorted(
            module_tasks[mod],
            key=lambda x: priority_order.get(x["priority"], 9)
        )
        sorted_tasks.extend(mod_tasks)

        # Decrease in-degree for dependents
        for next_mod in sorted(adj[mod]):
            in_degree[next_mod] -= 1
            if in_degree[next_mod] == 0 and next_mod not in visited:
                queue.append(next_mod)
        # Keep queue sorted by priority
        queue.sort(key=lambda m: min(
            priority_order.get(t["priority"], 9) for t in module_tasks[m]
        ) if m in module_tasks and module_tasks[m] else 9)

    # Add any remaining tasks (cycle protection — shouldn't happen but safety net)
    remaining_mods = present_modules - visited
    for mod in remaining_mods:
        mod_tasks = sorted(
            module_tasks[mod],
            key=lambda x: priority_order.get(x["priority"], 9)
        )
        sorted_tasks.extend(mod_tasks)

    return sorted_tasks


# ═══════════════════════════════════════════════════════════
# MAIN PLAN GENERATOR
# ═══════════════════════════════════════════════════════════

def generate_plan(activation_set, activation_context, activated_fms, activated_rps, normalized_signals):
    """
    Architecture spec:
    - Plan Template: L1 Days 1–30, L2 Days 31–60, L3 Days 61–90
    - Dependencies Map: which Blocks depend on which others
    - Effort & Impact Metadata
    - Deduplicates, orders by severity + dependencies + effort/impact

    Soul Layer: Priority Pyramid, confidence states, strengths detection
    Dependency Layer: Module prerequisite enforcement via topological sort
    """

    # ── Load dependency infrastructure ──
    module_deps = load_module_dependencies()
    rp_to_module = load_rp_to_module_map()

    # ── Soul Layer: Assess confidence state ──
    signal_count = len(normalized_signals)
    domain_coverage = len(set(s["domain_id"] for s in normalized_signals))
    has_quant_data = any(s.get("value") is not None for s in normalized_signals)

    if signal_count >= 8 and domain_coverage >= 3 and has_quant_data:
        confidence_state = "CONFIDENT"
        confidence_note = "Sufficient data across multiple domains with quantitative support."
    elif signal_count >= 4 and domain_coverage >= 2:
        confidence_state = "PROVISIONAL"
        confidence_note = ("This plan is based on partial data. Some areas may need "
                          "verification before L2 implementation.")
    else:
        confidence_state = "INSUFFICIENT"
        confidence_note = ("We don't have enough information to give you a fully reliable plan. "
                          "The recommendations below should be treated as directional, not definitive.")

    # ── Soul Layer: Detect what's working (domains NOT in failure) ──
    all_domains = {"D01", "D02", "D03", "D04", "D05", "D06",
                   "D07", "D08", "D09", "D10", "D11", "D12"}
    failing_domains = set(fm["domain_id"] for fm in activated_fms)
    healthy_domains = all_domains - failing_domains

    strengths = []
    domain_labels = {
        "D01": "Compliance and safety", "D02": "Guest experience",
        "D03": "Product quality", "D04": "Team stability",
        "D05": "Operational systems", "D06": "Supply chain resilience",
        "D07": "Financial controls", "D08": "Brand and marketing",
        "D09": "Physical environment", "D10": "Technology adoption",
        "D11": "Strategic clarity", "D12": "Team culture and rhythm",
    }
    for d in sorted(healthy_domains):
        if d in domain_labels:
            strengths.append(domain_labels[d])

    # ── Priority bands based on FM severity ──
    # Soul Layer: Priority Pyramid — team-domain FMs get severity escalation
    TEAM_DOMAINS = {"D04", "D12"}  # Team & Talent, Culture & Identity

    critical_rps = set()
    high_rps = set()
    medium_rps = set()

    for fm in activated_fms:
        effective_severity = fm["severity"]
        if fm["domain_id"] in TEAM_DOMAINS and effective_severity == "high":
            effective_severity = "critical"

        for rp in activated_rps:
            for tfm in rp.get("triggering_fms", []):
                if tfm["failure_mode_id"] == fm["failure_mode_id"]:
                    if effective_severity == "critical":
                        critical_rps.add(rp["response_pattern_id"])
                    elif effective_severity == "high":
                        high_rps.add(rp["response_pattern_id"])
                    else:
                        medium_rps.add(rp["response_pattern_id"])

    # ── Build raw task lists ──
    l1_tasks = []
    for item in activation_set.get("l1_blocks", []):
        rp = next((r for r in activated_rps if r["response_pattern_id"] == item["source_rp"]), None)
        l1_tasks.append({
            "task_id": f"L1_{len(l1_tasks)+1:03d}",
            "item_id": item["block_id"],
            "item_type": "block",
            "title": item.get("title", item["block_id"]),
            "source_rp": item["source_rp"],
            "rp_name": rp["rp_name"] if rp else "",
            "module_id": rp_to_module.get(item["source_rp"], ""),
            "timeline": "Days 1–30",
            "priority": "critical" if item["source_rp"] in critical_rps else "high",
            "description": rp["l1_focus"] if rp else "",
        })

    for item in activation_set.get("l1_tools", []):
        rp = next((r for r in activated_rps if r["response_pattern_id"] == item["source_rp"]), None)
        l1_tasks.append({
            "task_id": f"L1_{len(l1_tasks)+1:03d}",
            "item_id": item.get("tool_id") or item.get("block_id"),
            "item_type": "tool" if "tool_id" in item else "block",
            "title": item.get("title", item.get("tool_id", "Unknown")),
            "source_rp": item["source_rp"],
            "rp_name": rp["rp_name"] if rp else "",
            "module_id": rp_to_module.get(item["source_rp"], ""),
            "timeline": "Days 1–30",
            "priority": "critical" if item["source_rp"] in critical_rps else "high",
            "description": rp["l1_focus"] if rp else "",
        })

    l2_tasks = []
    for item in activation_set.get("l2_blocks", []):
        rp = next((r for r in activated_rps if r["response_pattern_id"] == item["source_rp"]), None)
        l2_tasks.append({
            "task_id": f"L2_{len(l2_tasks)+1:03d}",
            "item_id": item["block_id"],
            "item_type": "block",
            "title": item.get("title", item["block_id"]),
            "source_rp": item["source_rp"],
            "rp_name": rp["rp_name"] if rp else "",
            "module_id": rp_to_module.get(item["source_rp"], ""),
            "timeline": "Days 31–60",
            "priority": "critical" if item["source_rp"] in critical_rps else ("high" if item["source_rp"] in high_rps else "medium"),
            "description": rp["l2_focus"] if rp else "",
        })

    for item in activation_set.get("l2_tools", []):
        rp = next((r for r in activated_rps if r["response_pattern_id"] == item["source_rp"]), None)
        l2_tasks.append({
            "task_id": f"L2_{len(l2_tasks)+1:03d}",
            "item_id": item["tool_id"],
            "item_type": "tool",
            "title": item.get("title", item["tool_id"]),
            "source_rp": item["source_rp"],
            "rp_name": rp["rp_name"] if rp else "",
            "module_id": rp_to_module.get(item["source_rp"], ""),
            "timeline": "Days 31–60",
            "priority": "high",
            "description": rp["l2_focus"] if rp else "",
        })

    l3_tasks = []
    for item in activation_set.get("l3_blocks", []):
        rp = next((r for r in activated_rps if r["response_pattern_id"] == item["source_rp"]), None)
        l3_tasks.append({
            "task_id": f"L3_{len(l3_tasks)+1:03d}",
            "item_id": item["block_id"],
            "item_type": "block",
            "title": item.get("title", item["block_id"]),
            "source_rp": item["source_rp"],
            "rp_name": rp["rp_name"] if rp else "",
            "module_id": rp_to_module.get(item["source_rp"], ""),
            "timeline": "Days 61–90",
            "priority": "standard",
            "description": rp["l3_focus"] if rp else "",
        })

    for item in activation_set.get("l3_tools", []):
        rp = next((r for r in activated_rps if r["response_pattern_id"] == item["source_rp"]), None)
        l3_tasks.append({
            "task_id": f"L3_{len(l3_tasks)+1:03d}",
            "item_id": item["tool_id"],
            "item_type": "tool",
            "title": item.get("title", item["tool_id"]),
            "source_rp": item["source_rp"],
            "rp_name": rp["rp_name"] if rp else "",
            "module_id": rp_to_module.get(item["source_rp"], ""),
            "timeline": "Days 61–90",
            "priority": "standard",
            "description": rp["l3_focus"] if rp else "",
        })

    # ═══════════════════════════════════════════════════════════
    # DEPENDENCY ENFORCEMENT — Module-level topological sorting
    # ═══════════════════════════════════════════════════════════

    priority_order = {"critical": 0, "high": 1, "medium": 2, "standard": 3}

    # Collect all active modules in the plan
    active_modules = set()
    for task in l1_tasks + l2_tasks + l3_tasks:
        mod = task.get("module_id", "")
        if mod:
            active_modules.add(mod)

    # Resolve dependencies per layer and sort
    all_dep_notes = []

    # L1: Resolve with ANY + L1 level dependencies
    prereq_l1, notes_l1 = resolve_active_dependencies(
        module_deps, active_modules, normalized_signals, "L1"
    )
    all_dep_notes.extend(notes_l1)
    l1_tasks = topological_sort_tasks(l1_tasks, prereq_l1, rp_to_module, priority_order)

    # L2: Resolve with ANY + L2 level dependencies
    prereq_l2, notes_l2 = resolve_active_dependencies(
        module_deps, active_modules, normalized_signals, "L2"
    )
    all_dep_notes.extend(notes_l2)
    l2_tasks = topological_sort_tasks(l2_tasks, prereq_l2, rp_to_module, priority_order)

    # L3: Resolve with ANY + L3 level dependencies
    prereq_l3, notes_l3 = resolve_active_dependencies(
        module_deps, active_modules, normalized_signals, "L3"
    )
    all_dep_notes.extend(notes_l3)
    l3_tasks = topological_sort_tasks(l3_tasks, prereq_l3, rp_to_module, priority_order)

    # Re-assign task IDs after dependency sorting
    for i, task in enumerate(l1_tasks):
        task["task_id"] = f"L1_{i+1:03d}"
    for i, task in enumerate(l2_tasks):
        task["task_id"] = f"L2_{i+1:03d}"
    for i, task in enumerate(l3_tasks):
        task["task_id"] = f"L3_{i+1:03d}"

    # Add dependency annotation to tasks
    for task in l1_tasks + l2_tasks + l3_tasks:
        mod = task.get("module_id", "")
        prereqs = set()
        # Check all layers for prerequisites to this module
        for pg in [prereq_l1, prereq_l2, prereq_l3]:
            if mod in pg:
                prereqs.update(pg[mod])
        if prereqs:
            task["depends_on_modules"] = sorted(prereqs)
        else:
            task["depends_on_modules"] = []

    # ═══════════════════════════════════════════════════════════
    # FINAL ASSEMBLY
    # ═══════════════════════════════════════════════════════════

    blocks_used = list(set(
        [t["item_id"] for t in l1_tasks + l2_tasks + l3_tasks if t["item_type"] == "block"]
    ))
    tools_used = list(set(
        [t["item_id"] for t in l1_tasks + l2_tasks + l3_tasks if t["item_type"] == "tool"]
    ))

    priority_bands = [
        {"band": "CRITICAL", "timeline": "Days 1–30", "rp_ids": list(critical_rps)},
        {"band": "HIGH", "timeline": "Days 31–60", "rp_ids": list(high_rps)},
        {"band": "STANDARD", "timeline": "Days 61–90", "rp_ids": list(medium_rps)},
    ]

    # Build human-readable dependency summary for report
    # Use module names instead of IDs, and deduplicate across layers
    mod_names = {}
    mod_name_path = get_resources().ontology_dir / "modules.csv"
    with open(mod_name_path, "r", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            mod_names[row["module_id"]] = row["module_name"]

    # ─── Explainability trace: block → RP → FM → signals ───
    # Build reverse lookup: RP → which FMs triggered it
    rp_fm_map = {}
    for rp in activated_rps:
        rp_id = rp["response_pattern_id"]
        rp_fm_map[rp_id] = rp.get("triggering_fms", [])

    # Build reverse lookup: FM → which signals triggered it
    fm_signal_map = {}
    for fm in activated_fms:
        fm_signal_map[fm["failure_mode_id"]] = fm.get("signal_ids", [])

    # Add trace to each task
    for task in l1_tasks + l2_tasks + l3_tasks:
        rp_id = task.get("source_rp", "")
        triggering_fms = rp_fm_map.get(rp_id, [])
        trace_fms = []
        trace_signals = set()
        for tfm in triggering_fms:
            fm_id = tfm.get("failure_mode_id", "")
            fm_title = tfm.get("fm_title", fm_id)
            sigs = fm_signal_map.get(fm_id, [])
            trace_fms.append({"fm_id": fm_id, "fm_title": fm_title})
            trace_signals.update(sigs)
        task["trace"] = {
            "rp_id": rp_id,
            "rp_name": task.get("rp_name", ""),
            "failure_modes": trace_fms,
            "signal_ids": sorted(trace_signals),
        }

    dep_summary = []
    seen_deps = set()
    for note in all_dep_notes:
        dep_key = (note["from"], note["to"], note["type"])
        if dep_key in seen_deps:
            continue
        seen_deps.add(dep_key)
        from_name = mod_names.get(note["from"], note["from"])
        to_name = mod_names.get(note["to"], note["to"])
        if note["type"] in ("prerequisite", "temporal_gate"):
            dep_summary.append(
                f"**{from_name}** must precede **{to_name}** — {note['note']}"
            )
        elif note["type"] == "corequisite":
            dep_summary.append(
                f"**{from_name}** runs alongside **{to_name}** — {note['note']}"
            )
        elif note["type"] == "reinforcement":
            dep_summary.append(
                f"**{from_name}** reinforces **{to_name}** — {note['note']}"
            )

    action_plan = {
        "L1_tasks": l1_tasks,
        "L2_tasks": l2_tasks,
        "L3_tasks": l3_tasks,
        "blocks_used": sorted(blocks_used),
        "tools_used": sorted(tools_used),
        "priority_bands": priority_bands,
        "confidence": {
            "state": confidence_state,
            "note": confidence_note,
            "signal_count": signal_count,
            "domain_coverage": domain_coverage,
        },
        "strengths": strengths,
        "dependency_notes": dep_summary,
        "summary": {
            "total_tasks": len(l1_tasks) + len(l2_tasks) + len(l3_tasks),
            "total_blocks": len(blocks_used),
            "total_tools": len(tools_used),
            "critical_items": len([t for t in l1_tasks + l2_tasks if t["priority"] == "critical"]),
            "dependencies_enforced": len([n for n in all_dep_notes if n["type"] in ("prerequisite", "temporal_gate")]),
        },
    }

    dep_count = action_plan["summary"]["dependencies_enforced"]
    print(f"  Step 5 complete: Action plan generated — "
          f"L1: {len(l1_tasks)} tasks, L2: {len(l2_tasks)} tasks, L3: {len(l3_tasks)} tasks "
          f"({len(blocks_used)} blocks, {len(tools_used)} tools) "
          f"[{dep_count} dependencies enforced]")

    return action_plan


def run(activation_set, activation_context, activated_fms, activated_rps, normalized_signals):
    """Main entry point for Step 5."""
    return generate_plan(activation_set, activation_context, activated_fms, activated_rps, normalized_signals)
