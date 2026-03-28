#!/usr/bin/env python3
"""
OIS Cafe — Operational Plan HTML Export
Generates a Paradoksas-Light-style branded HTML report of the full system.
"""

import json
import os
from datetime import datetime
from collections import defaultdict

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ONTOLOGY = os.path.join(BASE, "01_ontology")
EXPORT_PATH = os.path.join(ONTOLOGY, "ontology_export.json")
OUTPUT = os.path.join(BASE, "05_data", "sample_outputs")

os.makedirs(OUTPUT, exist_ok=True)

with open(EXPORT_PATH, "r", encoding="utf-8") as f:
    data = json.load(f)

signals = data["signals"]
failure_modes = data["failure_modes"]
response_patterns = data["response_patterns"]
blocks = data["blocks"]
tools = data["tools"]
modules_list = data["modules"]
fm_to_rp = data["fm_to_rp_map"]
sig_to_fm = data["signal_to_fm_map"]
rp_to_block = data["rp_to_block_map"]
module_deps = data["module_dependencies"]

# ── Domain / module lookups ──
DOMAINS = {
    "D01": ("Food Safety & Hygiene", "#c0392b"),
    "D02": ("Customer Experience & Service", "#e67e22"),
    "D03": ("Coffee & Product Quality", "#8e6f47"),
    "D04": ("Team & Talent", "#2980b9"),
    "D05": ("Operations & Workflow", "#27ae60"),
    "D06": ("Supply Chain & Procurement", "#8e44ad"),
    "D07": ("Financial Performance", "#16a085"),
    "D08": ("Marketing & Brand", "#d35400"),
    "D09": ("Physical Environment & Design", "#7f8c8d"),
    "D10": ("Technology & Systems", "#2c3e50"),
    "D11": ("Growth & Strategy", "#f39c12"),
    "D12": ("Culture & Identity", "#e74c3c"),
}

MODULES = {}
for m in modules_list:
    mid = m.get("module_id", "")
    mname = m.get("module_name", "")
    MODULES[mid] = mname

# Group blocks by domain
domain_blocks = defaultdict(list)
for b in blocks:
    d = b.get("domain", "")
    d_key = d.split("_")[0].upper() if "_" in d else d[:3].upper()
    # normalise to D01..D12
    for dk in DOMAINS:
        if dk.lower() in d.lower() or dk in d:
            d_key = dk
            break
    domain_blocks[d_key].append(b)

# Sort blocks within each domain by block_id
for dk in domain_blocks:
    domain_blocks[dk].sort(key=lambda b: b.get("block_id", ""))

# Count tools per block
tools_per_block = defaultdict(int)
for t in tools:
    tid = t.get("tool_id", "")
    bid = "B" + tid.split("-")[0].replace("T", "") if "-" in tid else ""
    tools_per_block[bid] += 1

# Signals per domain
domain_signals = defaultdict(int)
for s in signals:
    d = s.get("domain", "")
    for dk in DOMAINS:
        if dk.lower() in d.lower():
            domain_signals[dk] += 1
            break

# FMs per domain
domain_fms = defaultdict(int)
for fm in failure_modes:
    d = fm.get("domain_id", "")
    for dk in DOMAINS:
        if dk.lower() in d.lower():
            domain_fms[dk] += 1
            break

now = datetime.now().strftime("%Y-%m-%d")


def severity_badge(sev):
    colors = {
        "critical": "#c0392b",
        "high": "#e67e22",
        "medium": "#f39c12",
        "low": "#27ae60",
    }
    c = colors.get(str(sev).lower(), "#95a5a6")
    return f'<span style="background:{c};color:#fff;padding:2px 8px;border-radius:3px;font-size:11px;font-weight:600;text-transform:uppercase">{sev}</span>'


def tool_count_badge(n):
    return f'<span style="background:#8e6f47;color:#fff;padding:1px 7px;border-radius:10px;font-size:11px;margin-left:6px">{n} tools</span>'


def make_bar(pct, color="#8e6f47"):
    filled = int(pct / 10)
    return f'<span style="font-family:monospace;letter-spacing:1px;color:{color}">{"█" * filled}{"░" * (10 - filled)}</span> {pct}%'

# ── Build HTML ──
html_parts = []

def w(s):
    html_parts.append(s)

w("""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>OIS Cafe — Operational Plan</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,600;1,400&display=swap');

  :root {
    --bg: #faf8f5;
    --card: #ffffff;
    --border: #e8e2d9;
    --text: #2c2416;
    --text-muted: #8a7e6f;
    --accent: #8e6f47;
    --accent-light: #c4a97d;
    --accent-bg: #f5f0e8;
    --red: #c0392b;
    --orange: #e67e22;
    --green: #27ae60;
    --blue: #2980b9;
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'Inter', -apple-system, sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.65;
    font-size: 14px;
  }

  .page {
    max-width: 1100px;
    margin: 0 auto;
    padding: 40px 48px;
  }

  /* ── Header ── */
  .header {
    border-bottom: 3px solid var(--accent);
    padding-bottom: 32px;
    margin-bottom: 40px;
  }
  .header h1 {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 38px;
    font-weight: 600;
    color: var(--accent);
    letter-spacing: -0.5px;
  }
  .header .subtitle {
    font-size: 15px;
    color: var(--text-muted);
    margin-top: 4px;
  }
  .header .meta {
    display: flex;
    gap: 24px;
    margin-top: 12px;
    font-size: 13px;
    color: var(--text-muted);
  }
  .header .meta span {
    background: var(--accent-bg);
    padding: 4px 12px;
    border-radius: 4px;
  }

  /* ── Executive Insight ── */
  .insight-box {
    background: linear-gradient(135deg, #3d2e1a 0%, #5c4430 100%);
    color: #f5f0e8;
    padding: 28px 32px;
    border-radius: 8px;
    margin-bottom: 40px;
    line-height: 1.75;
  }
  .insight-box .label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: var(--accent-light);
    margin-bottom: 10px;
  }
  .insight-box p {
    font-size: 14.5px;
    font-style: italic;
    font-family: 'Playfair Display', Georgia, serif;
  }

  /* ── Metrics ── */
  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 16px;
    margin-bottom: 40px;
  }
  .metric-card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 20px;
    text-align: center;
  }
  .metric-card .value {
    font-size: 32px;
    font-weight: 700;
    color: var(--accent);
    font-family: 'Playfair Display', Georgia, serif;
  }
  .metric-card .label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: var(--text-muted);
    margin-top: 4px;
  }

  /* ── Sections ── */
  h2 {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 24px;
    font-weight: 600;
    color: var(--text);
    border-bottom: 2px solid var(--border);
    padding-bottom: 8px;
    margin: 48px 0 20px 0;
  }
  h3 {
    font-size: 17px;
    font-weight: 600;
    color: var(--accent);
    margin: 28px 0 12px 0;
  }
  h4 {
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
    margin: 16px 0 6px 0;
  }

  /* ── Tables ── */
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 12px 0 24px 0;
    font-size: 13px;
  }
  th {
    background: var(--accent-bg);
    padding: 10px 14px;
    text-align: left;
    font-weight: 600;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--text-muted);
    border-bottom: 2px solid var(--border);
  }
  td {
    padding: 10px 14px;
    border-bottom: 1px solid var(--border);
    vertical-align: top;
  }
  tr:hover { background: var(--accent-bg); }

  /* ── Domain section ── */
  .domain-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 48px 0 8px 0;
    padding: 14px 20px;
    border-radius: 8px;
    border-left: 5px solid var(--accent);
    background: var(--card);
  }
  .domain-header .domain-id {
    font-size: 13px;
    font-weight: 700;
    color: #fff;
    padding: 3px 10px;
    border-radius: 4px;
    min-width: 40px;
    text-align: center;
  }
  .domain-header h3 {
    margin: 0;
    font-size: 19px;
    color: var(--text);
  }
  .domain-header .domain-stats {
    margin-left: auto;
    font-size: 12px;
    color: var(--text-muted);
  }

  /* ── Block card ── */
  .block-card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 16px 20px;
    margin-bottom: 10px;
    transition: box-shadow 0.15s;
  }
  .block-card:hover {
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  }
  .block-card .block-head {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 6px;
  }
  .block-card .block-id {
    font-family: monospace;
    font-size: 12px;
    font-weight: 700;
    color: var(--accent);
    background: var(--accent-bg);
    padding: 2px 8px;
    border-radius: 3px;
  }
  .block-card .block-name {
    font-weight: 600;
    font-size: 14px;
  }
  .block-card .block-purpose {
    font-size: 13px;
    color: var(--text-muted);
    margin-bottom: 8px;
    line-height: 1.55;
  }
  .block-card .block-meta {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    font-size: 11px;
  }
  .block-card .block-meta .tag {
    background: var(--accent-bg);
    padding: 2px 8px;
    border-radius: 3px;
    color: var(--text-muted);
  }

  /* ── Collapsible detail ── */
  details { margin-bottom: 4px; }
  details summary {
    cursor: pointer;
    font-size: 12px;
    color: var(--accent);
    font-weight: 500;
    padding: 4px 0;
  }
  details summary:hover { text-decoration: underline; }
  details .detail-content {
    padding: 12px 16px;
    background: var(--accent-bg);
    border-radius: 4px;
    margin-top: 6px;
    font-size: 13px;
    line-height: 1.7;
  }
  details .detail-content h5 {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--accent);
    margin: 12px 0 4px 0;
  }
  details .detail-content h5:first-child { margin-top: 0; }
  details .detail-content ul {
    margin: 4px 0 8px 18px;
    font-size: 12.5px;
  }

  /* ── Footer ── */
  .footer {
    margin-top: 60px;
    padding-top: 20px;
    border-top: 2px solid var(--border);
    text-align: center;
    font-size: 12px;
    color: var(--text-muted);
  }
  .footer .brand {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 18px;
    color: var(--accent);
    margin-bottom: 4px;
  }

  /* ── Priority Pyramid ── */
  .pyramid {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    margin: 20px 0 32px 0;
  }
  .pyramid .level {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 38px;
    border-radius: 4px;
    color: #fff;
    font-weight: 600;
    font-size: 13px;
    letter-spacing: 0.5px;
  }

  /* ── Print ── */
  @media print {
    body { background: #fff; font-size: 11px; }
    .page { padding: 20px; }
    .block-card { break-inside: avoid; }
    .domain-header { break-before: page; }
    details { display: block; }
    details[open] summary { display: none; }
  }
</style>
</head>
<body>
<div class="page">
""")

# ── HEADER ──
w(f"""
<div class="header">
  <h1>OIS Cafe — Operational Plan</h1>
  <div class="subtitle">Complete Operational Intelligence System for UK Cafes & Coffee Shops</div>
  <div class="meta">
    <span><strong>Generated:</strong> {now}</span>
    <span><strong>Version:</strong> v1.0 — Gold Enrichment</span>
    <span><strong>Architecture:</strong> 2-in-1 (Standalone + Chain)</span>
  </div>
</div>
""")

# ── EXECUTIVE INSIGHT ──
w("""
<div class="insight-box">
  <div class="label">The Real Story</div>
  <p>
    This system maps the entire operational surface of a UK cafe — from the moment the espresso machine
    is switched on at dawn to the final cash reconciliation at close. It covers the 12 domains that determine
    whether a cafe thrives or merely survives: food safety compliance that keeps the EHO rating at 5,
    coffee craft that justifies a premium price, team culture that stops the revolving door of barista turnover,
    and the financial discipline that turns a passion project into a sustainable business. Every block is
    written for the reality of UK cafe operations — SFBB diaries, Natasha's Law labelling, ACAS-compliant
    employment practices, and the relentless economics of a 25% food cost target. The system serves
    both the independent owner pulling their own shots and the multi-site operator benchmarking across
    locations. It is not a manual — it is an investigative framework that diagnoses what's actually happening
    and prescribes action at three layers: immediate fixes, system building, and culture embedding.
  </p>
</div>
""")

# ── AT A GLANCE ──
w("""<h2>At a Glance</h2>
<div class="metrics-grid">
""")
metrics = [
    (len(signals), "Signals"),
    (len(failure_modes), "Failure Modes"),
    (len(response_patterns), "Response Patterns"),
    (len(blocks), "Blocks"),
    (len(tools), "Tools"),
    (len(DOMAINS), "Domains"),
    (len(modules_list), "Modules"),
    (len(sig_to_fm), "Signal Mappings"),
]
for val, label in metrics:
    w(f"""  <div class="metric-card">
    <div class="value">{val:,}</div>
    <div class="label">{label}</div>
  </div>
""")
w("</div>")

# ── PRIORITY PYRAMID ──
w("""<h2>Priority Pyramid</h2>
<p style="font-size:13px;color:var(--text-muted);margin-bottom:12px">
  The order in which operational issues are addressed. Fix the foundation before optimising the roof.
</p>
<div class="pyramid">
  <div class="level" style="width:180px;background:#c0392b">1. Team</div>
  <div class="level" style="width:260px;background:#e67e22">2. Customers</div>
  <div class="level" style="width:340px;background:#8e6f47">3. Product Excellence</div>
  <div class="level" style="width:420px;background:#2980b9">4. Community & Brand</div>
  <div class="level" style="width:500px;background:#27ae60">5. Performance & Growth</div>
</div>
""")

# ── DOMAIN COVERAGE ──
w("""<h2>Domain Coverage</h2>
<table>
  <thead>
    <tr><th>Domain</th><th>Signals</th><th>Blocks</th><th>Tools</th><th>Coverage</th></tr>
  </thead>
  <tbody>
""")

total_tools_by_domain = defaultdict(int)
for dk in sorted(DOMAINS.keys()):
    for b in domain_blocks.get(dk, []):
        bid = b.get("block_id", "")
        total_tools_by_domain[dk] += tools_per_block.get(bid, 0)

for dk in sorted(DOMAINS.keys()):
    dname, dcolor = DOMAINS[dk]
    n_sig = domain_signals.get(dk, 0)
    n_blk = len(domain_blocks.get(dk, []))
    n_tool = total_tools_by_domain.get(dk, 0)
    pct = min(100, int((n_blk / 210) * 100 * (210/20)))  # normalise to domain weight
    pct = min(100, int(n_sig / 210 * 100 * 12))  # rough coverage
    pct = min(100, max(10, int(n_blk * 5)))  # simplified: blocks × 5, capped at 100
    bar = make_bar(pct, dcolor)
    w(f"""    <tr>
      <td><span style="color:{dcolor};font-weight:600">{dk}</span> {dname}</td>
      <td style="text-align:center">{n_sig}</td>
      <td style="text-align:center">{n_blk}</td>
      <td style="text-align:center">{n_tool}</td>
      <td>{bar}</td>
    </tr>
""")

w("  </tbody></table>")

# ── 3-LAYER MODEL ──
w("""<h2>Three-Layer Execution Model</h2>
<table>
  <thead>
    <tr><th>Layer</th><th>Timeframe</th><th>Focus</th><th>Description</th></tr>
  </thead>
  <tbody>
    <tr>
      <td><span style="background:#c0392b;color:#fff;padding:2px 10px;border-radius:3px;font-weight:700">L1</span></td>
      <td>0–2 weeks</td>
      <td><strong>Immediate Actions</strong></td>
      <td>Stop the bleeding. Daily habits, quick wins, critical compliance gaps. Every block's L1 can be started on Day 1 with no budget.</td>
    </tr>
    <tr>
      <td><span style="background:#e67e22;color:#fff;padding:2px 10px;border-radius:3px;font-weight:700">L2</span></td>
      <td>2–8 weeks</td>
      <td><strong>System Building</strong></td>
      <td>Build the infrastructure. SOPs, training programmes, tracking systems, escalation pathways. This is where the cafe moves from reactive to proactive.</td>
    </tr>
    <tr>
      <td><span style="background:#27ae60;color:#fff;padding:2px 10px;border-radius:3px;font-weight:700">L3</span></td>
      <td>8+ weeks</td>
      <td><strong>Culture & Excellence</strong></td>
      <td>Embed permanently. Dashboards, peer observation, governance meetings, annual reviews. The system runs itself.</td>
    </tr>
  </tbody>
</table>
""")

# ── VENUE TYPES ──
w("""<h2>Venue Types Supported</h2>
<div class="metrics-grid" style="grid-template-columns: repeat(4, 1fr)">
""")
venue_types = [
    ("Independent Cafe", "The single-site owner-operator. The heart of the UK high street."),
    ("Specialty Coffee", "Third-wave, single-origin focused. Craft is the brand."),
    ("Chain Cafe", "Multi-site company-owned. Consistency at scale."),
    ("Franchise Cafe", "Franchised brand. Compliance + local autonomy."),
    ("Drive-Through", "Speed-first format. Queue management is everything."),
    ("Kiosk", "Compact footprint. Stripped-back efficiency."),
    ("Coffee Van", "Mobile operation. Events, markets, offices."),
    ("Bakery Cafe", "Food-forward. Pastries, bread, kitchen complexity."),
]
for vname, vdesc in venue_types:
    w(f"""  <div class="metric-card" style="text-align:left;padding:16px">
    <div style="font-weight:600;font-size:14px;color:var(--accent)">{vname}</div>
    <div style="font-size:12px;color:var(--text-muted);margin-top:4px">{vdesc}</div>
  </div>
""")
w("</div>")

# ── FULL BLOCK LIBRARY BY DOMAIN ──
w("""<h2>Complete Block Library</h2>
<p style="font-size:13px;color:var(--text-muted);margin-bottom:8px">
  210 operational blocks organised by domain. Each block contains 3–5 implementation tools,
  L1/L2/L3 execution guidance, KPIs, failure modes, and dependencies.
  Click any block to expand full detail.
</p>
""")

for dk in sorted(DOMAINS.keys()):
    dname, dcolor = DOMAINS[dk]
    blks = domain_blocks.get(dk, [])
    if not blks:
        continue
    n_tools_d = sum(tools_per_block.get(b.get("block_id",""), 0) for b in blks)

    w(f"""
<div class="domain-header" style="border-left-color:{dcolor}">
  <span class="domain-id" style="background:{dcolor}">{dk}</span>
  <h3 style="font-family:'Playfair Display',Georgia,serif">{dname}</h3>
  <span class="domain-stats">{len(blks)} blocks · {n_tools_d} tools</span>
</div>
""")

    for b in blks:
        bid = b.get("block_id", "")
        bname = b.get("name", "")
        purpose = b.get("purpose", "")
        module = b.get("module", "")
        state = b.get("state", "stub")
        n_t = tools_per_block.get(bid, 0)
        deps = b.get("dependencies", [])
        kpis = b.get("kpis", [])
        fmodes = b.get("failure_modes", [])
        app_logic = b.get("application_logic", {})
        exec_fw = b.get("execution_framework", {})
        tool_defs = b.get("tool_definitions", {}).get("tools", [])
        meta = b.get("meta", {})
        tags = meta.get("tags", [])
        why = b.get("why_this_matters", "")
        applicability = b.get("applicability", {})
        venue_types_b = applicability.get("venue_types", [])

        # State badge
        state_badge = ""
        if state == "enriched":
            state_badge = '<span style="background:#27ae60;color:#fff;padding:1px 6px;border-radius:3px;font-size:10px;margin-left:6px">ENRICHED</span>'

        # Restricted applicability?
        restricted = ""
        if len(venue_types_b) < 8 and len(venue_types_b) > 0:
            restricted = f'<span style="background:#e74c3c;color:#fff;padding:1px 6px;border-radius:3px;font-size:10px;margin-left:6px">{", ".join(venue_types_b)}</span>'

        w(f"""
<div class="block-card">
  <div class="block-head">
    <span class="block-id">{bid}</span>
    <span class="block-name">{bname}</span>
    {tool_count_badge(n_t) if n_t else ""}
    {state_badge}
    {restricted}
  </div>
  <div class="block-purpose">{purpose[:300]}{"..." if len(purpose) > 300 else ""}</div>
  <div class="block-meta">
    <span class="tag">{module}</span>
    {"".join(f'<span class="tag">{t}</span>' for t in tags[:4])}
  </div>
""")

        # Collapsible detail
        if state == "enriched":
            w('  <details><summary>View full detail</summary><div class="detail-content">')

            if why:
                w(f'<h5>Why This Matters</h5><p style="font-size:12.5px">{why[:600]}{"..." if len(why) > 600 else ""}</p>')

            # L1/L2/L3
            for layer, label in [("L1", "L1 — Immediate"), ("L2", "L2 — System Build"), ("L3", "L3 — Culture")]:
                text = app_logic.get(layer, "")
                if text:
                    w(f'<h5>{label}</h5><p style="font-size:12px">{text[:400]}{"..." if len(text) > 400 else ""}</p>')

            # Tools
            if tool_defs:
                w('<h5>Tools</h5><ul>')
                for td in tool_defs:
                    w(f'<li><strong>{td.get("tool_id","")}</strong> {td.get("tool_name","")} <em>({td.get("format","")} — {td.get("level","")})</em></li>')
                w('</ul>')

            # KPIs
            if kpis:
                w('<h5>KPIs</h5><ul>')
                for kpi in kpis:
                    w(f'<li>{kpi}</li>')
                w('</ul>')

            # Dependencies
            if deps:
                w(f'<h5>Dependencies</h5><p style="font-size:12px">{", ".join(deps)}</p>')

            w('  </div></details>')

        w("</div>")  # block-card

# ── CHAIN-SPECIFIC SECTION ──
w("""<h2>Chain & Multi-Site Architecture</h2>
<p style="font-size:13px;color:var(--text-muted);margin-bottom:16px">
  The 2-in-1 design means standalone cafes and chains share the same diagnostic engine but with chain-specific
  signals (S197–S204), failure modes (FM102–FM108), and dedicated blocks (B187–B194) that only activate
  for chain_cafe and franchise_cafe venue types. Module M15 handles cross-site consistency, area management,
  franchise compliance, and central procurement.
</p>
<table>
  <thead>
    <tr><th>Component</th><th>Chain-Specific Items</th><th>Purpose</th></tr>
  </thead>
  <tbody>
    <tr><td>Signals</td><td>S197–S204 (8 signals)</td><td>Detect multi-site inconsistency, franchise drift, central supply issues</td></tr>
    <tr><td>Failure Modes</td><td>FM102–FM108 (7 FMs)</td><td>Brand dilution, SOP non-compliance, cross-site knowledge silos</td></tr>
    <tr><td>Response Pattern</td><td>RP055</td><td>Multi-Site & Chain management response</td></tr>
    <tr><td>Blocks</td><td>B187–B194 (8 blocks)</td><td>Mystery shopper, SOP library, benchmarking, opening playbook, area manager, franchise audit, procurement, best practice network</td></tr>
    <tr><td>Module</td><td>M15</td><td>Multi-Site & Chain Management</td></tr>
  </tbody>
</table>
""")

# ── MODULE DEPENDENCIES ──
w("""<h2>Module Dependencies</h2>
<table>
  <thead>
    <tr><th>From</th><th>To</th><th>Type</th><th>Notes</th></tr>
  </thead>
  <tbody>
""")
for dep in module_deps:
    from_m = dep.get("from_module", "")
    to_m = dep.get("to_module", "")
    dtype = dep.get("type", "")
    notes = dep.get("notes", "")
    w(f'    <tr><td>{from_m}</td><td>{to_m}</td><td>{dtype}</td><td style="font-size:12px">{notes}</td></tr>\n')
w("  </tbody></table>")

# ── FOOTER ──
w(f"""
<div class="footer">
  <div class="brand">vOIS</div>
  <p>Operational Intelligence System — Cafe Vertical</p>
  <p>Generated {now} · 210 signals · 108 failure modes · 55 response patterns · 210 blocks · 984 tools</p>
  <p style="margin-top:8px;font-size:11px;color:#bbb">Calm directness. Warm precision. Honest simplicity.</p>
</div>
""")

w("</div></body></html>")

# ── Write output ──
html = "\n".join(html_parts)
out_file = os.path.join(OUTPUT, f"ois_cafe_operational_plan_{now}.html")
with open(out_file, "w", encoding="utf-8") as f:
    f.write(html)

print(f"Written: {out_file}")
print(f"Size: {len(html):,} bytes ({len(html)//1024} KB)")
print(f"Blocks rendered: {sum(len(v) for v in domain_blocks.values())}")
print(f"Tools indexed: {sum(tools_per_block.values())}")
