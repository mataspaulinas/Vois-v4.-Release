import argparse
import csv
import hashlib
import io
import json
import re
import shutil
import sys
from copy import deepcopy
from contextlib import redirect_stdout
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


SCRIPT_DIR = Path(__file__).resolve().parent
LEGACY_ROOT = SCRIPT_DIR.parent
ENGINE_DIR = LEGACY_ROOT / "04_engine"
APP_FILE = LEGACY_ROOT / "06_app" / "app.py"
STATIC_DIR = LEGACY_ROOT / "06_app" / "static"
BASELINE_ROOT = LEGACY_ROOT / "docs" / "migration" / "phase0"
FIXTURES_ROOT = BASELINE_ROOT / "fixtures"
VENUES_DIR = LEGACY_ROOT / "05_data" / "venues"
KB_DIR = LEGACY_ROOT / "06_app" / "kb_articles"
HELP_DIR = LEGACY_ROOT / "06_app" / "help"
ONTOLOGY_SIGNALS = LEGACY_ROOT / "01_ontology" / "signals.csv"

if str(ENGINE_DIR) not in sys.path:
    sys.path.insert(0, str(ENGINE_DIR))

import block_activation_engine  # type: ignore
import constraint_engine  # type: ignore
import failure_mode_engine  # type: ignore
import plan_generator  # type: ignore
import report_generator  # type: ignore
import response_pattern_engine  # type: ignore
import signal_normalization  # type: ignore


@dataclass(frozen=True)
class FixtureSpec:
    fixture_id: str
    category: str
    label: str
    description: str
    kind: str
    venue_slug: str | None = None
    assessment_file: str | None = None


FIXTURE_SPECS = [
    FixtureSpec(
        fixture_id="F001_normal_followup_warsaw",
        category="normal venue",
        label="Warsaw follow-up steady state",
        description="Minimal follow-up case with one active signal and an improving active venue.",
        kind="assessment_snapshot",
        venue_slug="kavos_namai_warsaw",
        assessment_file="2026-03-05_004.json",
    ),
    FixtureSpec(
        fixture_id="F002_degraded_pegasas",
        category="degraded venue",
        label="Pegasas degraded storefront",
        description="High-friction venue with broad operational degradation and rich AI intake text.",
        kind="assessment_snapshot",
        venue_slug="kavinė_pegasas",
        assessment_file="2026-03-21_001.json",
    ),
    FixtureSpec(
        fixture_id="F003_conflicting_capacity_vs_cost",
        category="conflicting signals case",
        label="Capacity vs cost conflict",
        description="Composite fixture combining service overload, staffing calibration drift, and payroll pressure.",
        kind="manual_composite",
    ),
    FixtureSpec(
        fixture_id="F004_existing_active_plan_kaunas",
        category="existing active plan case",
        label="Kaunas active plan",
        description="Stable venue with an active plan, progress feed, signal history, and persisted chat threads.",
        kind="assessment_snapshot",
        venue_slug="kavos_namai_kaunas",
        assessment_file="2026-03-02_005.json",
    ),
    FixtureSpec(
        fixture_id="F005_ambiguous_ai_preopening_muzos2",
        category="partial/ambiguous AI extraction case",
        label="Muzos 2 pre-opening ambiguity",
        description="Large AI-derived narrative with many medium-confidence signals and unmapped observations.",
        kind="assessment_snapshot",
        venue_slug="muzos_2",
        assessment_file="2026-03-25_001.json",
    ),
    FixtureSpec(
        fixture_id="F006_complex_klaipeda_multi_surface",
        category="richer operational complexity",
        label="Klaipeda complex multi-surface case",
        description="Operationally active venue with broader signal mix plus plan, progress, chat, and signal history surfaces.",
        kind="assessment_snapshot",
        venue_slug="kavos_namai_klaipeda",
        assessment_file="2026-03-21_001.json",
    ),
]


def utc_now_iso() -> str:
    return datetime.now(UTC).isoformat().replace("+00:00", "Z")


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def read_json(path: Path) -> Any:
    return json.loads(read_text(path))


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    digest.update(path.read_bytes())
    return digest.hexdigest()


def slugify(value: str) -> str:
    return value.lower().replace(" ", "_").replace("'", "").replace('"', "")


def load_signal_lookup() -> dict[str, dict[str, str]]:
    with ONTOLOGY_SIGNALS.open("r", encoding="utf-8") as handle:
        rows = csv.DictReader(handle)
        return {row["signal_id"]: row for row in rows}


def count_activation_items(payload: dict[str, list[dict[str, Any]]]) -> int:
    return sum(len(items) for items in payload.values())


def summarize_normalized_signal_ids(payload: Any, limit: int = 10) -> list[str]:
    if isinstance(payload, dict):
        return list(payload.keys())[:limit]
    if isinstance(payload, list):
        ids: list[str] = []
        for item in payload:
            if isinstance(item, dict):
                signal_id = str(item.get("signal_id") or item.get("id") or item.get("signal") or "")
                if signal_id:
                    ids.append(signal_id)
        return ids[:limit]
    return []


def make_engine_input_from_assessment(venue_slug: str, assessment: dict[str, Any]) -> dict[str, Any]:
    venue_context = deepcopy(assessment.get("venue_context", {}))
    venue_context.setdefault("venue_name", venue_context.get("venue_name") or venue_slug)
    return {
        "venue_id": venue_slug,
        "assessment_type": assessment.get("assessment_type", "full_diagnostic"),
        "assessment_date": str(assessment.get("timestamp", ""))[:10] or "2026-03-01",
        "signals": deepcopy(assessment.get("signals", {})),
        "venue_context": venue_context,
        "triage_enabled": False,
        "triage_intensity": "balanced",
        "raw_input_text": assessment.get("raw_input_text", ""),
        "extraction_summary": deepcopy(assessment.get("extraction_summary", {})),
        "confidence_distribution": deepcopy(assessment.get("confidence_distribution", {})),
        "unmapped_observations": deepcopy(assessment.get("unmapped_observations", [])),
    }


def build_conflicting_fixture_input(signal_lookup: dict[str, dict[str, str]]) -> dict[str, Any]:
    def signal_payload(signal_id: str, confidence: str, notes: str, value: Any = None) -> dict[str, Any]:
        row = signal_lookup[signal_id]
        payload = {
            "active": True,
            "confidence": confidence,
            "notes": notes,
            "value": value,
            "signal_name": row.get("signal_name", ""),
            "domain": row.get("domain_name", ""),
        }
        return payload

    return {
        "venue_id": "phase0_conflicting_capacity_cost",
        "assessment_type": "full_diagnostic",
        "assessment_date": "2026-03-27",
        "triage_enabled": False,
        "triage_intensity": "balanced",
        "venue_context": {
            "venue_name": "Phase 0 Conflict Cafe",
            "type": "independent_cafe",
            "stage": "active",
            "team_size": 11,
            "location": "Vilnius",
            "capacity_profile": {
                "leadership_strength": "medium",
                "volatility": "high",
            },
        },
        "signals": {
            "S019": signal_payload(
                "S019",
                "high",
                "Observed queue times above 8 minutes on weekday morning peaks for the last two weeks.",
                8,
            ),
            "S071": signal_payload(
                "S071",
                "medium",
                "Morning team is opening without a daily huddle and issues are being discovered live on the floor.",
            ),
            "S083": signal_payload(
                "S083",
                "high",
                "Peak staffing pattern is not calibrated: two baristas are idle mid-afternoon but the morning queue still collapses.",
            ),
            "S099": signal_payload(
                "S099",
                "medium",
                "Revenue per trading hour has fallen over the last three weekly comparisons despite peak queues remaining unresolved.",
                9,
            ),
            "S104": signal_payload(
                "S104",
                "high",
                "Payroll is running above target while the shift shape still fails to cover peak demand cleanly.",
                39,
            ),
        },
        "raw_input_text": (
            "Morning demand is breaking the floor, payroll is still above target, and the rota is solving neither. "
            "The owner keeps adding labor hours reactively, but queues remain long during 7-10am while afternoons are quiet."
        ),
        "extraction_summary": {
            "mode": "manual_composite",
            "reason": "Phase 0 representative conflict between throughput pressure and labor-cost pressure.",
        },
        "confidence_distribution": {"high": 3, "medium": 2, "low": 0},
        "unmapped_observations": [],
    }


def run_pipeline(raw_input: dict[str, Any]) -> dict[str, Any]:
    buffer = io.StringIO()
    with redirect_stdout(buffer):
        normalized_signals = signal_normalization.run(raw_input)
        activated_failure_modes = failure_mode_engine.run(normalized_signals)
        activated_response_patterns = response_pattern_engine.run(activated_failure_modes)
        activation_set, activation_context = block_activation_engine.run(activated_response_patterns)
        constrained_set, constraint_report = constraint_engine.run(
            activation_set=activation_set,
            activation_context=activation_context,
            venue_context=raw_input.get("venue_context", {}),
            normalized_signals=normalized_signals,
            triage_enabled=raw_input.get("triage_enabled", False),
            triage_intensity=raw_input.get("triage_intensity", "balanced"),
        )
        action_plan = plan_generator.run(
            constrained_set,
            activation_context,
            activated_failure_modes,
            activated_response_patterns,
            normalized_signals,
        )
        report_md, report_type = report_generator.run(
            action_plan,
            activated_failure_modes,
            activated_response_patterns,
            normalized_signals,
            {
                **raw_input.get("venue_context", {}),
                "venue_id": raw_input.get("venue_id", "unknown"),
                "assessment_date": raw_input.get("assessment_date", "2026-03-01"),
                "assessment_type": raw_input.get("assessment_type", "full_diagnostic"),
            },
        )
    return {
        "normalized_signals": normalized_signals,
        "failure_modes": activated_failure_modes,
        "response_patterns": activated_response_patterns,
        "activation_set_raw": activation_set,
        "activation_context": activation_context,
        "activation_set_constrained": constrained_set,
        "constraint_report": constraint_report,
        "action_plan": action_plan,
        "report_md": report_md,
        "report_type": report_type,
        "summary": {
            "signals": len(normalized_signals),
            "failure_modes": len(activated_failure_modes),
            "response_patterns": len(activated_response_patterns),
            "raw_activation_items": count_activation_items(activation_set),
            "constrained_activation_items": count_activation_items(constrained_set),
            "plan_load": constraint_report.get("plan_load", "UNKNOWN"),
            "report_type": report_type,
            "top_signal_ids": summarize_normalized_signal_ids(normalized_signals),
        },
        "console": buffer.getvalue(),
    }


def canonical_json(payload: Any) -> str:
    return json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def extract_routes() -> list[dict[str, Any]]:
    lines = read_text(APP_FILE).splitlines()
    routes: list[dict[str, Any]] = []
    route_pattern = re.compile(r'@app\.route\("([^"]+)"(?:,\s*methods=\[([^\]]+)\])?\)')
    def_pattern = re.compile(r"def\s+([a-zA-Z0-9_]+)\(")
    for index, line in enumerate(lines):
        route_match = route_pattern.search(line)
        if not route_match:
            continue
        path = route_match.group(1)
        methods_raw = route_match.group(2)
        methods = ["GET"] if not methods_raw else [m.strip().strip('"\'') for m in methods_raw.split(",")]
        handler = ""
        for look_ahead in range(index + 1, min(index + 6, len(lines))):
            def_match = def_pattern.search(lines[look_ahead])
            if def_match:
                handler = def_match.group(1)
                break
        category = path.split("/")[2] if path.startswith("/api/") and len(path.split("/")) > 2 else path.strip("/").split("/")[0]
        routes.append(
            {
                "path": path,
                "methods": methods,
                "handler": handler,
                "line_number": index + 1,
                "category": category or "root",
            }
        )
    return routes


def extract_frontend_fetches() -> list[dict[str, Any]]:
    fetch_pattern = re.compile(r"fetch\(([^,\n]+)")
    inventories: list[dict[str, Any]] = []
    for script_path in sorted(STATIC_DIR.glob("*.js")):
        endpoints: list[dict[str, Any]] = []
        for line_number, line in enumerate(read_text(script_path).splitlines(), start=1):
            if "fetch(" not in line:
                continue
            match = fetch_pattern.search(line)
            if match:
                endpoints.append(
                    {
                        "line_number": line_number,
                        "expression": match.group(1).strip(),
                    }
                )
        inventories.append(
            {
                "file": str(script_path.relative_to(LEGACY_ROOT)),
                "fetch_calls": endpoints,
            }
        )
    return inventories


def collect_persistence_surfaces() -> list[dict[str, Any]]:
    return [
        {
            "surface": "project metadata and active signals",
            "path_pattern": "05_data/venues/<slug>/project.json",
            "notes": "Primary venue record including workflow stage, health state, and current_signals.",
        },
        {
            "surface": "assessment snapshots",
            "path_pattern": "05_data/venues/<slug>/assessments/*.json",
            "notes": "Saved AI/manual intake payloads plus report and constraint output when present.",
        },
        {
            "surface": "operational plan state",
            "path_pattern": "05_data/venues/<slug>/operational_plan.json",
            "notes": "Mutable task graph, review state, comments, assignments, due dates, and deliverables.",
        },
        {
            "surface": "progress feed",
            "path_pattern": "05_data/venues/<slug>/progress/entries.json",
            "notes": "Timeline notes, updates, and escalation-like activity.",
        },
        {
            "surface": "copilot/chat threads",
            "path_pattern": "05_data/venues/<slug>/chat_history/*.json",
            "notes": "Thread index and per-thread message history.",
        },
        {
            "surface": "signal lifecycle history",
            "path_pattern": "05_data/venues/<slug>/signal_history.json",
            "notes": "Activation/deactivation log written when assessments replace current_signals.",
        },
        {
            "surface": "workspace users",
            "path_pattern": "05_data/system/users.json",
            "notes": "Static workspace actor catalog used for assignments and audit metadata.",
        },
        {
            "surface": "audit log",
            "path_pattern": "05_data/system/audit_events.json",
            "notes": "System-wide event trail for plan generation, progress, chat, and review actions.",
        },
        {
            "surface": "notifications",
            "path_pattern": "05_data/system/notifications.json",
            "notes": "Notification center state.",
        },
        {
            "surface": "brands",
            "path_pattern": "05_data/system/brands.json",
            "notes": "Brand records referenced by project create/update flows.",
        },
        {
            "surface": "runtime secrets/config",
            "path_pattern": ".env",
            "notes": "Passphrase hash, Anthropic key, and runtime knobs are persisted outside app data.",
        },
    ]


def copy_if_exists(src: Path, dest: Path) -> bool:
    if not src.exists():
        return False
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dest)
    return True


def build_fixture(spec: FixtureSpec, signal_lookup: dict[str, dict[str, str]]) -> dict[str, Any]:
    fixture_dir = FIXTURES_ROOT / spec.fixture_id
    if fixture_dir.exists():
        shutil.rmtree(fixture_dir)
    fixture_dir.mkdir(parents=True, exist_ok=True)

    source_manifest: dict[str, Any] = {
        "fixture_id": spec.fixture_id,
        "category": spec.category,
        "label": spec.label,
        "description": spec.description,
        "kind": spec.kind,
    }

    if spec.kind == "manual_composite":
        raw_input = build_conflicting_fixture_input(signal_lookup)
        source_manifest["source"] = "manual composite of real legacy signal semantics"
        source_manifest["source_paths"] = []
    else:
        assert spec.venue_slug is not None
        assert spec.assessment_file is not None
        venue_dir = VENUES_DIR / spec.venue_slug
        assessment_path = venue_dir / "assessments" / spec.assessment_file
        assessment = read_json(assessment_path)
        raw_input = make_engine_input_from_assessment(spec.venue_slug, assessment)

        source_snapshots_dir = fixture_dir / "source_snapshots"
        copied_paths: list[str] = []
        for relative_path in [
            Path("project.json"),
            Path("operational_plan.json"),
            Path("operational_plan_v1.json"),
            Path("signal_history.json"),
            Path("progress") / "entries.json",
            Path("chat_history") / "_index.json",
        ]:
            src_path = venue_dir / relative_path
            if copy_if_exists(src_path, source_snapshots_dir / relative_path):
                copied_paths.append(str(relative_path).replace("\\", "/"))

        copy_if_exists(assessment_path, source_snapshots_dir / "assessment.json")
        copied_paths.append("assessment.json")

        for thread_file in sorted((venue_dir / "chat_history").glob("t_*.json"))[:5]:
            if copy_if_exists(thread_file, source_snapshots_dir / "chat_history" / thread_file.name):
                copied_paths.append(f"chat_history/{thread_file.name}")

        source_manifest["source"] = {
            "venue_slug": spec.venue_slug,
            "assessment_file": spec.assessment_file,
        }
        source_manifest["source_paths"] = copied_paths

        if assessment.get("raw_input_text"):
            ai_snapshot = {
                "raw_input_text": assessment.get("raw_input_text", ""),
                "raw_input_length": len(assessment.get("raw_input_text", "")),
                "extraction_summary": assessment.get("extraction_summary", {}),
                "confidence_distribution": assessment.get("confidence_distribution", {}),
                "unmapped_observations": assessment.get("unmapped_observations", []),
                "active_signal_ids": [
                    signal_id
                    for signal_id, payload in assessment.get("signals", {}).items()
                    if payload.get("active")
                ],
            }
            write_json(fixture_dir / "ai_extraction_snapshot.json", ai_snapshot)

    write_json(fixture_dir / "fixture_input.json", raw_input)
    pipeline = run_pipeline(raw_input)

    write_json(fixture_dir / "golden_normalized_signals.json", pipeline["normalized_signals"])
    write_json(fixture_dir / "golden_failure_modes.json", pipeline["failure_modes"])
    write_json(fixture_dir / "golden_response_patterns.json", pipeline["response_patterns"])
    write_json(fixture_dir / "golden_activation_set_raw.json", pipeline["activation_set_raw"])
    write_json(fixture_dir / "golden_activation_context.json", pipeline["activation_context"])
    write_json(fixture_dir / "golden_activation_set_constrained.json", pipeline["activation_set_constrained"])
    write_json(fixture_dir / "golden_constraint_report.json", pipeline["constraint_report"])
    write_json(fixture_dir / "golden_action_plan.json", pipeline["action_plan"])
    write_text(fixture_dir / "golden_report.md", pipeline["report_md"])
    write_json(fixture_dir / "golden_summary.json", pipeline["summary"])

    active_signal_ids = [
        signal_id
        for signal_id, payload in raw_input.get("signals", {}).items()
        if payload.get("active")
    ]
    fixture_manifest = {
        **source_manifest,
        "assessment_type": raw_input.get("assessment_type", ""),
        "active_signal_count": len(active_signal_ids),
        "active_signal_ids": active_signal_ids,
        "summary": pipeline["summary"],
        "output_files": [
            "fixture_input.json",
            "golden_normalized_signals.json",
            "golden_failure_modes.json",
            "golden_response_patterns.json",
            "golden_activation_set_raw.json",
            "golden_activation_context.json",
            "golden_activation_set_constrained.json",
            "golden_constraint_report.json",
            "golden_action_plan.json",
            "golden_report.md",
            "golden_summary.json",
        ],
    }
    write_json(fixture_dir / "manifest.json", fixture_manifest)
    return fixture_manifest


def capture() -> None:
    BASELINE_ROOT.mkdir(parents=True, exist_ok=True)
    signal_lookup = load_signal_lookup()
    fixture_manifests = [build_fixture(spec, signal_lookup) for spec in FIXTURE_SPECS]

    routes = extract_routes()
    frontend_fetches = extract_frontend_fetches()
    persistence_surfaces = collect_persistence_surfaces()

    structure_manifest = {
        "generated_at": utc_now_iso(),
        "legacy_root": str(LEGACY_ROOT),
        "baseline_root": str(BASELINE_ROOT),
        "app_entrypoints": [
            "06_app/app.py",
            "04_engine/engine.py",
            "scripts/export_operational_plan_html.py",
        ],
        "engine_modules": [
            "04_engine/signal_normalization.py",
            "04_engine/failure_mode_engine.py",
            "04_engine/response_pattern_engine.py",
            "04_engine/block_activation_engine.py",
            "04_engine/constraint_engine.py",
            "04_engine/plan_generator.py",
            "04_engine/report_generator.py",
        ],
        "ontology_mapping_files": [
            "01_ontology/signals.csv",
            "01_ontology/signal_to_fm_map.csv",
            "01_ontology/failure_modes.csv",
            "01_ontology/fm_to_rp_map.csv",
            "01_ontology/response_patterns.csv",
            "01_ontology/rp_to_block_map.csv",
            "01_ontology/module_dependencies.csv",
            "01_ontology/ontology_export.json",
        ],
        "runtime_data_folders": [
            "05_data/sample_inputs",
            "05_data/sample_outputs",
            "05_data/venues",
            "05_data/chat",
            "05_data/system",
        ],
        "ui_shell_files": [
            "06_app/templates/index.html",
            "06_app/static/app.js",
            "06_app/static/app-shell.js",
            "06_app/static/app-portfolio.js",
            "06_app/static/app-home.js",
            "06_app/static/app-kb.js",
            "06_app/static/app-sigmap.js",
            "06_app/static/app-foundation.js",
            "06_app/static/app-chrome.js",
            "06_app/static/help-system.js",
            "06_app/static/sidebar-v2.js",
        ],
        "helper_content": {
            "kb_articles_count": len(list(KB_DIR.glob("*.json"))),
            "help_manual_count": len(list((HELP_DIR / "manual").glob("*.md"))),
            "help_index_files": [
                "06_app/help/help_index.json",
                "06_app/help/terminology.json",
                "06_app/help/tours.json",
                "06_app/help/changelog.json",
            ],
        },
    }

    write_json(BASELINE_ROOT / "structure_manifest.json", structure_manifest)
    write_json(BASELINE_ROOT / "route_inventory.json", routes)
    write_json(BASELINE_ROOT / "frontend_fetch_inventory.json", frontend_fetches)
    write_json(BASELINE_ROOT / "persistence_surfaces.json", persistence_surfaces)
    write_json(BASELINE_ROOT / "fixture_manifest.json", fixture_manifests)

    summary = {
        "generated_at": utc_now_iso(),
        "fixture_count": len(fixture_manifests),
        "route_count": len(routes),
        "api_categories": sorted({route["category"] for route in routes}),
        "frontend_files_with_fetches": sum(1 for item in frontend_fetches if item["fetch_calls"]),
        "fixtures": [
            {
                "fixture_id": item["fixture_id"],
                "category": item["category"],
                "active_signal_count": item["active_signal_count"],
                "report_type": item["summary"]["report_type"],
                "plan_load": item["summary"]["plan_load"],
            }
            for item in fixture_manifests
        ],
    }
    write_json(BASELINE_ROOT / "capture_summary.json", summary)


def verify_fixture(fixture_dir: Path) -> list[str]:
    mismatches: list[str] = []
    raw_input = read_json(fixture_dir / "fixture_input.json")
    rerun = run_pipeline(raw_input)
    expected_by_file = {
        "golden_normalized_signals.json": rerun["normalized_signals"],
        "golden_failure_modes.json": rerun["failure_modes"],
        "golden_response_patterns.json": rerun["response_patterns"],
        "golden_activation_set_raw.json": rerun["activation_set_raw"],
        "golden_activation_context.json": rerun["activation_context"],
        "golden_activation_set_constrained.json": rerun["activation_set_constrained"],
        "golden_constraint_report.json": rerun["constraint_report"],
        "golden_action_plan.json": rerun["action_plan"],
        "golden_summary.json": rerun["summary"],
    }
    for filename, rerun_payload in expected_by_file.items():
        expected_payload = read_json(fixture_dir / filename)
        if canonical_json(expected_payload) != canonical_json(rerun_payload):
            mismatches.append(f"{fixture_dir.name}/{filename}")
    report_path = fixture_dir / "golden_report.md"
    if read_text(report_path) != rerun["report_md"]:
        mismatches.append(f"{fixture_dir.name}/golden_report.md")
    return mismatches


def verify() -> int:
    if not FIXTURES_ROOT.exists():
        print("No baseline fixtures found. Run capture first.")
        return 1
    mismatches: list[str] = []
    for fixture_dir in sorted(path for path in FIXTURES_ROOT.iterdir() if path.is_dir()):
        mismatches.extend(verify_fixture(fixture_dir))
    write_json(
        BASELINE_ROOT / "verification_summary.json",
        {
            "verified_at": utc_now_iso(),
            "fixture_count": len([path for path in FIXTURES_ROOT.iterdir() if path.is_dir()]),
            "mismatches": mismatches,
            "status": "pass" if not mismatches else "fail",
        },
    )
    if mismatches:
        print("Baseline verification failed:")
        for mismatch in mismatches:
            print(f" - {mismatch}")
        return 1
    print("Baseline verification passed.")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Capture or verify the OIS Cafe v2 Phase 0 baseline package.")
    parser.add_argument("--verify", action="store_true", help="Verify existing golden outputs instead of capturing them.")
    args = parser.parse_args()

    if args.verify:
        return verify()
    capture()
    print(f"Phase 0 baseline captured under {BASELINE_ROOT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
