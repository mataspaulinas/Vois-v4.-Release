"""
OIS v3 — Step 6: Report Generator (Assessment-Type-Aware)

Five distinct report formats based on assessment type:
- Full Diagnostic: comprehensive analysis, top 3 threads, prioritised action plan
- Follow-up: comparative — what changed since last assessment
- Incident: root cause trace, cascade analysis, prevention
- Pre-opening Gate: pass/fail readiness checklist
- Weekly Pulse: dashboard — 30-second read

Soul Layer:
- Voice: Calm directness. Warm precision. Honest simplicity.
- Never uses: "best practices", "leverage", "optimize", "synergy", "robust framework"
- Always uses: structure, rhythm, clarity, calm, care, progress, honest
"""

import os
import json
from datetime import datetime
from collections import defaultdict

from .resources import get_resources

_ENGINE_DEFAULTS = {
    "ai_model": "claude-sonnet-4-6",
    "ai_temperature": 0.4,
    "ai_max_tokens": 200,
    "report_detail_level": "standard",
    "max_actions_per_layer": 5,
}

def _load_engine_settings():
    """Load engine settings from settings.json, merged with defaults."""
    result = dict(_ENGINE_DEFAULTS)
    try:
        settings_file = get_resources().settings_file
        if settings_file.exists():
            with open(settings_file, "r") as f:
                result.update(json.load(f))
    except Exception:
        pass
    return result

DOMAIN_NAMES = {
    "D01": "Food Safety & Hygiene", "D02": "Customer Experience & Service",
    "D03": "Coffee & Product Quality", "D04": "Team & Talent",
    "D05": "Operations & Workflow", "D06": "Supply Chain & Procurement",
    "D07": "Financial Performance", "D08": "Marketing & Brand",
    "D09": "Physical Environment & Design", "D10": "Technology & Systems",
    "D11": "Growth & Strategy", "D12": "Culture & Identity",
}


def load_block(block_id):
    path = get_resources().blocks_dir / f"{block_id}.json"
    if path.exists():
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return None
    return None


def sev_icon(severity):
    return {"critical": "🔴", "high": "🟠", "medium": "🟡", "low": "🟢"}.get(severity, "⚪")


def sev_rank(severity):
    return {"critical": 0, "high": 1, "medium": 2, "low": 3}.get(severity, 4)


def group_findings(activated_fms, normalized_signals):
    groups = defaultdict(lambda: {"fms": [], "signals": set()})
    for fm in activated_fms:
        domain = fm.get("domain_id", "unknown")
        groups[domain]["fms"].append(fm)
        for sid in fm.get("signal_ids", []):
            groups[domain]["signals"].add(sid)

    threads = []
    for domain_id, data in groups.items():
        fms = data["fms"]
        signal_names = []
        for sid in sorted(data["signals"]):
            sig = next((s for s in normalized_signals if s["signal_id"] == sid), None)
            if sig:
                signal_names.append(f"{sig['signal_name'].replace('_', ' ').title()} ({sid})")

        fm_titles = list(dict.fromkeys(fm["title"] for fm in fms))
        max_severity = "critical" if any(fm["severity"] == "critical" for fm in fms) else \
                       "high" if any(fm["severity"] == "high" for fm in fms) else "medium"

        threads.append({
            "key": domain_id, "domain_name": DOMAIN_NAMES.get(domain_id, domain_id),
            "count": len(fms), "severity": max_severity,
            "max_score": max(fm["score"] for fm in fms),
            "signals": sorted(data["signals"]), "signal_names": signal_names[:8],
            "fm_titles": fm_titles,
        })
    threads.sort(key=lambda t: (sev_rank(t["severity"]), -t["count"]))
    return threads


def get_top_actions(action_plan, max_per_layer=None):
    settings = _load_engine_settings()
    if max_per_layer is None:
        max_per_layer = int(settings.get("max_actions_per_layer", 5))
    detail = settings.get("report_detail_level", "standard")
    multiplier = {"concise": 0.6, "standard": 1.0, "detailed": 1.5}.get(detail, 1.0)
    effective_max = max(1, round(max_per_layer * multiplier))
    result = {"L1": [], "L2": [], "L3": []}
    for layer_key, layer_name in [("L1_tasks", "L1"), ("L2_tasks", "L2"), ("L3_tasks", "L3")]:
        tasks = action_plan.get(layer_key, [])
        prio_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
        tasks.sort(key=lambda t: prio_order.get(t.get("priority", "medium"), 2))
        for task in tasks[:effective_max]:
            bdata = load_block(task["item_id"])
            name = bdata.get("name", task["item_id"]) if bdata else task["item_id"]
            result[layer_name].append({"id": task["item_id"], "name": name, "priority": task.get("priority", "medium"), "rp_name": task.get("rp_name", "")})
    return result


# ═══════════════════════════════════════════════════
# REPORT TYPE 1: FULL DIAGNOSTIC (~800 words)
# ═══════════════════════════════════════════════════

def render_full_diagnostic(action_plan, activated_fms, activated_rps, normalized_signals, venue_context, ai_insight=None):
    venue_name = venue_context.get("venue_name", "Venue")
    assessment_date = venue_context.get("assessment_date", datetime.now().strftime("%Y-%m-%d"))
    threads = group_findings(activated_fms, normalized_signals)
    top_threads = threads[:3]
    remaining = threads[3:]
    actions = get_top_actions(action_plan, max_per_layer=5)
    L = []
    L.append(f"# {venue_name} — Diagnostic Report")
    L.append(f"")
    if ai_insight:
        L.append(f"> {ai_insight}")
        L.append(f"")
    critical = sum(1 for fm in activated_fms if fm["severity"] == "critical")
    high = sum(1 for fm in activated_fms if fm["severity"] == "high")
    domains_hit = len(set(fm["domain_id"] for fm in activated_fms))
    L.append(f"**{assessment_date}** · {len(normalized_signals)} signals · {len(activated_fms)} issues · {domains_hit} domains")
    if critical:
        L.append(f"**{critical} critical** · {high} high")
    elif high:
        L.append(f"**{high} high-priority issues**")
    L.append(f"")
    L.append(f"## What Matters Most")
    L.append(f"")
    for i, thread in enumerate(top_threads, 1):
        L.append(f"### {i}. {sev_icon(thread['severity'])} {thread['domain_name']}")
        L.append(f"")
        for ft in thread["fm_titles"][:3]:
            L.append(f"- {ft}")
        L.append(f"")
        if thread["severity"] == "critical":
            L.append(f"**Impact:** Immediate risk. Address this week.")
        elif thread["severity"] == "high":
            L.append(f"**Impact:** Erodes quality and team confidence if left.")
        else:
            L.append(f"**Impact:** Creates friction that compounds over time.")
        L.append(f"")
        if thread["signal_names"]:
            L.append(f"*Evidence: {', '.join(thread['signal_names'][:4])}*")
            L.append(f"")
    L.append(f"---")
    L.append(f"")
    L.append(f"## Action Plan")
    L.append(f"")
    if actions["L1"]:
        L.append(f"### This Week")
        L.append(f"")
        for a in actions["L1"]:
            L.append(f"- **{a['id']}** {a['name']} ({a['priority'].upper()})")
        L.append(f"")
    if actions["L2"]:
        L.append(f"### This Month")
        L.append(f"")
        for a in actions["L2"]:
            L.append(f"- **{a['id']}** {a['name']}")
        L.append(f"")
    if actions["L3"]:
        L.append(f"### This Quarter")
        L.append(f"")
        for a in actions["L3"]:
            L.append(f"- **{a['id']}** {a['name']}")
        L.append(f"")
    if remaining:
        L.append(f"---")
        L.append(f"")
        L.append(f"## Also Noted")
        L.append(f"")
        L.append(f"| Domain | Issues | Severity |")
        L.append(f"|--------|--------|----------|")
        for t in remaining:
            L.append(f"| {t['domain_name']} | {t['count']} | {t['severity'].upper()} |")
        L.append(f"")
    L.append(f"---")
    L.append(f"")
    L.append(f"## Verify Next Visit")
    L.append(f"")
    for thread in top_threads:
        L.append(f"- [ ] {thread['domain_name']}: primary issue addressed?")
    L.append(f"- [ ] Any new concerns not in this report?")
    L.append(f"")
    L.append(f"---")
    L.append(f"*Full Diagnostic · {assessment_date} · OIS 3.6*")
    return "\n".join(L)


# ═══════════════════════════════════════════════════
# REPORT TYPE 2: FOLLOW-UP (~500 words)
# ═══════════════════════════════════════════════════

def render_follow_up(action_plan, activated_fms, activated_rps, normalized_signals, venue_context, ai_insight=None):
    venue_name = venue_context.get("venue_name", "Venue")
    assessment_date = venue_context.get("assessment_date", datetime.now().strftime("%Y-%m-%d"))
    improved, unchanged, worsened, new_signals = [], [], [], []
    for sig in normalized_signals:
        trend = sig.get("trend", "")
        if trend == "improved": improved.append(sig)
        elif trend == "worsened": worsened.append(sig)
        elif trend == "unchanged": unchanged.append(sig)
        else: new_signals.append(sig)
    L = []
    L.append(f"# {venue_name} — Follow-up Report")
    L.append(f"")
    total_prev = len(improved) + len(unchanged) + len(worsened)
    if total_prev > 0:
        L.append(f"> {len(improved)} of {total_prev} previous issues improved. {len(new_signals)} new concern{'s' if len(new_signals) != 1 else ''}.")
    elif ai_insight:
        L.append(f"> {ai_insight}")
    L.append(f"")
    L.append(f"**{assessment_date}** · Follow-up")
    L.append(f"")
    L.append(f"## Signal Movement")
    L.append(f"")
    L.append(f"| Signal | Status | Notes |")
    L.append(f"|--------|--------|-------|")
    for sig in improved:
        L.append(f"| {sig['signal_name'].replace('_',' ').title()} | ↑ Improved | {sig.get('notes', '')[:60]} |")
    for sig in worsened:
        L.append(f"| {sig['signal_name'].replace('_',' ').title()} | ↓ Worsened | {sig.get('notes', '')[:60]} |")
    for sig in unchanged:
        L.append(f"| {sig['signal_name'].replace('_',' ').title()} | → Unchanged | {sig.get('notes', '')[:60]} |")
    L.append(f"")
    if improved:
        L.append(f"## What Improved ✓")
        L.append(f"")
        for sig in improved:
            L.append(f"- **{sig['signal_name'].replace('_',' ').title()}** — {sig.get('notes', '')[:100]}")
        L.append(f"")
    if unchanged:
        L.append(f"## What's Stuck")
        L.append(f"")
        for sig in unchanged:
            L.append(f"- **{sig['signal_name'].replace('_',' ').title()}** — {sig.get('notes', '')[:80]}")
        L.append(f"")
    if new_signals:
        L.append(f"## New Concerns")
        L.append(f"")
        for sig in new_signals:
            L.append(f"- {sev_icon(sig.get('severity','medium'))} **{sig['signal_name'].replace('_',' ').title()}** — {sig.get('notes', '')[:100]}")
        L.append(f"")
    actions = get_top_actions(action_plan, max_per_layer=3)
    if actions["L1"] or actions["L2"]:
        L.append(f"## Updated Actions")
        L.append(f"")
        for a in actions["L1"][:3]:
            L.append(f"- **{a['id']}** {a['name']} — this week")
        for a in actions["L2"][:3]:
            L.append(f"- **{a['id']}** {a['name']} — this month")
        L.append(f"")
    L.append(f"---")
    L.append(f"*Follow-up · {assessment_date} · OIS 3.6*")
    return "\n".join(L)


# ═══════════════════════════════════════════════════
# REPORT TYPE 3: INCIDENT (~400 words)
# ═══════════════════════════════════════════════════

def render_incident(action_plan, activated_fms, activated_rps, normalized_signals, venue_context, ai_insight=None):
    venue_name = venue_context.get("venue_name", "Venue")
    assessment_date = venue_context.get("assessment_date", datetime.now().strftime("%Y-%m-%d"))
    threads = group_findings(activated_fms, normalized_signals)
    L = []
    L.append(f"# {venue_name} — Incident Report")
    L.append(f"")
    L.append(f"**{assessment_date}** · Incident response")
    L.append(f"")
    if ai_insight:
        L.append(f"> {ai_insight}")
        L.append(f"")
    L.append(f"## Root Cause Analysis")
    L.append(f"")
    cascade_fms = sorted(activated_fms, key=lambda f: sev_rank(f["severity"]))[:5]
    for i, fm in enumerate(cascade_fms, 1):
        prefix = "→" if i > 1 else "⚡"
        L.append(f"**{prefix} {fm['title']}** ({fm['severity'].upper()})")
        L.append(f"  {fm['description'][:150]}")
        sigs = ", ".join(fm.get("signal_ids", [])[:3])
        if sigs:
            L.append(f"  *Evidence: {sigs}*")
        L.append(f"")
    if threads:
        primary = threads[0]
        L.append(f"## Systemic Vulnerability")
        L.append(f"")
        L.append(f"This incident reveals a gap in **{primary['domain_name']}**. {primary['count']} related failure modes suggest this isn't isolated.")
        L.append(f"")
    actions = get_top_actions(action_plan, max_per_layer=3)
    L.append(f"## Prevention")
    L.append(f"")
    for a in actions["L1"][:3]:
        L.append(f"- **{a['id']}** {a['name']} — immediate")
    for a in actions["L2"][:2]:
        L.append(f"- **{a['id']}** {a['name']} — structural fix")
    L.append(f"")
    L.append(f"---")
    L.append(f"*Incident Report · {assessment_date} · OIS 3.6*")
    return "\n".join(L)


# ═══════════════════════════════════════════════════
# REPORT TYPE 4: PRE-OPENING GATE (~500 words)
# ═══════════════════════════════════════════════════

def render_preopening_gate(action_plan, activated_fms, activated_rps, normalized_signals, venue_context, ai_insight=None):
    venue_name = venue_context.get("venue_name", "Venue")
    assessment_date = venue_context.get("assessment_date", datetime.now().strftime("%Y-%m-%d"))
    blockers = [fm for fm in activated_fms if fm["severity"] in ("critical", "high")]
    warnings = [fm for fm in activated_fms if fm["severity"] == "medium"]
    blocker_count = len(blockers)
    if blocker_count == 0: score, verdict = 90, "READY"
    elif blocker_count <= 2: score, verdict = 65, "CONDITIONAL"
    else: score, verdict = max(20, 80 - blocker_count * 12), "NOT READY"
    verdict_icon = "✅" if verdict == "READY" else "⚠️" if verdict == "CONDITIONAL" else "🚫"
    L = []
    L.append(f"# {venue_name} — Pre-Opening Gate")
    L.append(f"")
    L.append(f"## {verdict_icon} {verdict}")
    L.append(f"")
    L.append(f"**Readiness: {score}/100** · {assessment_date}")
    L.append(f"")
    if ai_insight:
        L.append(f"> {ai_insight}")
        L.append(f"")
    if blockers:
        L.append(f"## Blockers — Must Resolve")
        L.append(f"")
        for fm in blockers:
            L.append(f"- 🔴 **{fm['title']}** — {fm['description'][:120]}")
        L.append(f"")
    if warnings:
        L.append(f"## Warnings")
        L.append(f"")
        for fm in warnings:
            L.append(f"- 🟠 **{fm['title']}** — {fm['description'][:120]}")
        L.append(f"")
    all_domains = set(DOMAIN_NAMES.keys())
    affected = set(fm["domain_id"] for fm in activated_fms)
    clear = all_domains - affected
    if clear:
        L.append(f"## Ready ✓")
        L.append(f"")
        for d in sorted(clear):
            L.append(f"- ✅ {DOMAIN_NAMES.get(d, d)}")
        L.append(f"")
    actions = get_top_actions(action_plan, max_per_layer=5)
    if blockers or actions["L1"]:
        L.append(f"## Opening Checklist")
        L.append(f"")
        for fm in blockers[:5]:
            L.append(f"- [ ] Resolve: {fm['title']}")
        for a in actions["L1"][:3]:
            L.append(f"- [ ] Complete: {a['name']}")
        L.append(f"- [ ] Re-assess after fixes")
        L.append(f"")
    L.append(f"---")
    L.append(f"*Pre-Opening Gate · {assessment_date} · OIS 3.6*")
    return "\n".join(L)


# ═══════════════════════════════════════════════════
# REPORT TYPE 5: WEEKLY PULSE (~200 words)
# ═══════════════════════════════════════════════════

def render_weekly_pulse(action_plan, activated_fms, activated_rps, normalized_signals, venue_context, ai_insight=None):
    venue_name = venue_context.get("venue_name", "Venue")
    assessment_date = venue_context.get("assessment_date", datetime.now().strftime("%Y-%m-%d"))
    critical = sum(1 for fm in activated_fms if fm["severity"] == "critical")
    high = sum(1 for fm in activated_fms if fm["severity"] == "high")
    if critical > 0: trend = "↓ Declining"
    elif high > 2: trend = "→ Needs Attention"
    elif high > 0: trend = "→ Stable"
    elif len(activated_fms) == 0: trend = "↑ Strong"
    else: trend = "→ Stable"
    L = []
    L.append(f"# {venue_name} — Weekly Pulse")
    L.append(f"")
    L.append(f"**{assessment_date}** · {trend}")
    L.append(f"")
    if ai_insight:
        L.append(f"> {ai_insight}")
        L.append(f"")
    L.append(f"| Metric | Value |")
    L.append(f"|--------|-------|")
    L.append(f"| Signals | {len(normalized_signals)} |")
    L.append(f"| Issues | {len(activated_fms)} |")
    if critical: L.append(f"| Critical | {critical} |")
    if high: L.append(f"| High | {high} |")
    L.append(f"| Trend | {trend} |")
    L.append(f"")
    top_fms = sorted(activated_fms, key=lambda f: sev_rank(f["severity"]))[:3]
    if top_fms:
        L.append(f"## Watch")
        L.append(f"")
        for fm in top_fms:
            L.append(f"- {sev_icon(fm['severity'])} {fm['title']}")
        L.append(f"")
    actions = get_top_actions(action_plan, max_per_layer=2)
    if actions["L1"]:
        L.append(f"## This Week")
        L.append(f"")
        for a in actions["L1"][:2]:
            L.append(f"- **{a['id']}** {a['name']}")
        L.append(f"")
    L.append(f"---")
    L.append(f"*Weekly Pulse · {assessment_date} · OIS 3.6*")
    return "\n".join(L)


# ═══════════════════════════════════════════════════
# AI INSIGHT (single fast call — one sentence)
# ═══════════════════════════════════════════════════

def get_ai_insight(activated_fms, normalized_signals, venue_context):
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return None
    try:
        import anthropic
    except ImportError:
        return None

    assessment_type = venue_context.get("assessment_type", "full_diagnostic")
    venue_name = venue_context.get("venue_name", "Venue")
    findings = [f"- {fm['title']} ({fm['severity'].upper()})" for fm in activated_fms[:15]]

    type_prompts = {
        "full_diagnostic": "What is the REAL story behind these findings? One sentence a venue owner needs to hear.",
        "follow_up": "In one sentence, summarise the progress since last assessment.",
        "incident": "In one sentence, what is the root cause chain behind this incident?",
        "preopening_gate": "In one sentence, is this venue ready to open and why or why not?",
        "weekly_pulse": "In one sentence, how was this week?",
    }
    prompt = type_prompts.get(assessment_type, type_prompts["full_diagnostic"])
    ontology_label = (
        venue_context.get("ontology_display_name")
        or venue_context.get("ontology_id")
        or venue_context.get("venue_type")
        or "the active ontology pack"
    )
    system = f"You analyse operational data for {venue_name} using {ontology_label}. Be specific, honest, warm. No jargon."
    user_msg = f"Assessment: {assessment_type}\n\nFindings ({len(activated_fms)}):\n" + "\n".join(findings) + f"\n\n{prompt}"

    try:
        settings = _load_engine_settings()
        client = anthropic.Anthropic(api_key=api_key)
        model = os.environ.get("OIS_CLAUDE_MODEL", settings.get("ai_model", "claude-sonnet-4-6"))
        temperature = float(settings.get("ai_temperature", 0.4))
        max_tokens = int(settings.get("ai_max_tokens", 200))
        response = client.messages.create(model=model, system=system, messages=[{"role": "user", "content": user_msg}], temperature=temperature, max_tokens=max_tokens)
        insight = response.content[0].text.strip().strip('"')
        return insight
    except Exception as e:
        print(f"  [WARN] AI insight failed ({e})")
        return None


# ═══════════════════════════════════════════════════
# MAIN ENTRY POINT
# ═══════════════════════════════════════════════════

REPORT_RENDERERS = {
    "full_diagnostic": render_full_diagnostic,
    "follow_up": render_follow_up,
    "incident": render_incident,
    "preopening_gate": render_preopening_gate,
    "weekly_pulse": render_weekly_pulse,
}


def run(action_plan, activated_fms, activated_rps, normalized_signals, venue_context):
    assessment_type = venue_context.get("assessment_type", "full_diagnostic")
    print(f"  Step 6: Generating {assessment_type.replace('_', ' ')} report...")
    ai_insight = get_ai_insight(activated_fms, normalized_signals, venue_context)
    if ai_insight:
        print(f"  Step 6: AI insight: {ai_insight[:80]}...")
    renderer = REPORT_RENDERERS.get(assessment_type, render_full_diagnostic)
    report_md = renderer(action_plan, activated_fms, activated_rps, normalized_signals, venue_context, ai_insight)
    report_type = "ai" if ai_insight else "template"
    print(f"  Step 6 complete: {assessment_type} report ({len(report_md)} chars, {report_type})")
    return report_md, report_type
