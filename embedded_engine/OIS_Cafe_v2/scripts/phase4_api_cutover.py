from __future__ import annotations

import json
import os
import shutil
import sys
import tempfile
from contextlib import contextmanager
from pathlib import Path
from typing import Any

from alembic import command
from alembic.config import Config


ROOT = Path(__file__).resolve().parent.parent
PHASE0_FIXTURES = ROOT / "docs" / "migration" / "phase0" / "fixtures"
PHASE4_DIR = ROOT / "docs" / "migration" / "phase4"
PLATFORM_API_ROOT = ROOT.parent / "CODEX-VOIS-claude-debug-api-500-error-HACD2" / "apps" / "api"

if str(PLATFORM_API_ROOT) not in sys.path:
    sys.path.insert(0, str(PLATFORM_API_ROOT))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

from fastapi.testclient import TestClient


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def canonical_json(payload: Any) -> str:
    return json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


@contextmanager
def patched_env(**updates: str | None):
    previous = {key: os.environ.get(key) for key in updates}
    try:
        for key, value in updates.items():
            if value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = value
        yield
    finally:
        for key, value in previous.items():
            if value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = value


@contextmanager
def configured_test_environment():
    with tempfile.TemporaryDirectory(prefix="phase4-api-cutover-", ignore_cleanup_errors=True) as temp_dir:
        temp_root = Path(temp_dir)
        ontology_source = PLATFORM_API_ROOT.parents[1] / "ontology"
        ontology_root = temp_root / "ontology"
        shutil.copytree(ontology_source, ontology_root)

        drafts_root = ontology_root / "restaurant" / "workbench" / "drafts"
        if drafts_root.exists():
            for path in drafts_root.iterdir():
                if path.is_dir():
                    shutil.rmtree(path)

        database_path = temp_root / "test.db"
        with patched_env(
            DATABASE_URL=f"sqlite+pysqlite:///{database_path.as_posix()}",
            ONTOLOGY_ROOT=str(ontology_root),
            AUTO_CREATE_SCHEMA="false",
            ENABLE_INPROCESS_SCHEDULER="false",
            ALLOW_BOOTSTRAP_FALLBACK="true",
            ALLOW_LEGACY_HEADER_AUTH="true",
        ):
            from app.core.config import get_settings
            from app.db.session import get_engine, get_session_factory
            from app.services.ontology import get_ontology_repository
            from app.services.ontology_workbench import get_ontology_workbench_service

            alembic_cfg = Config(str(PLATFORM_API_ROOT / "alembic.ini"))
            alembic_cfg.set_main_option("script_location", str(PLATFORM_API_ROOT / "alembic"))
            alembic_cfg.set_main_option("sqlalchemy.url", f"sqlite+pysqlite:///{database_path.as_posix()}")
            command.upgrade(alembic_cfg, "head")

            get_settings.cache_clear()
            get_engine.cache_clear()
            get_session_factory.cache_clear()
            get_ontology_repository.cache_clear()
            get_ontology_workbench_service.cache_clear()
            try:
                yield
            finally:
                get_settings.cache_clear()
                get_engine.cache_clear()
                get_session_factory.cache_clear()
                get_ontology_repository.cache_clear()
                get_ontology_workbench_service.cache_clear()


def load_fixture(fixture_dir: Path) -> dict[str, Any]:
    ai_snapshot_path = fixture_dir / "ai_extraction_snapshot.json"
    return {
        "fixture_id": fixture_dir.name,
        "fixture_dir": fixture_dir,
        "fixture_input": read_json(fixture_dir / "fixture_input.json"),
        "manifest": read_json(fixture_dir / "manifest.json"),
        "ai_snapshot": read_json(ai_snapshot_path) if ai_snapshot_path.exists() else None,
    }


def selected_signal_ids(fixture_input: dict[str, Any]) -> list[str]:
    return [
        signal_id
        for signal_id, state in (fixture_input.get("signals") or {}).items()
        if not isinstance(state, dict) or state.get("active", True)
    ]


def build_assessment_payload(fixture: dict[str, Any], *, venue_id: str) -> dict[str, Any]:
    fixture_input = fixture["fixture_input"]
    ai_snapshot = fixture["ai_snapshot"] or {}
    return {
        "venue_id": venue_id,
        "notes": fixture["manifest"]["description"],
        "assessment_type": fixture_input.get("assessment_type", "full_diagnostic"),
        "assessment_date": fixture_input.get("assessment_date"),
        "selected_signal_ids": selected_signal_ids(fixture_input),
        "signal_states": fixture_input.get("signals", {}),
        "raw_input_text": ai_snapshot.get("raw_input_text") or fixture_input.get("raw_input_text"),
        "raw_intake_payload": fixture["ai_snapshot"] or fixture_input,
        "venue_context_json": fixture_input.get("venue_context", {}),
        "management_hours_available": fixture_input.get("management_hours", 8.0),
        "weekly_effort_budget": fixture_input.get("weekly_budget", 8.0),
    }


def build_legacy_input(fixture: dict[str, Any], *, venue_id: str) -> dict[str, Any]:
    fixture_input = fixture["fixture_input"]
    ai_snapshot = fixture["ai_snapshot"] or {}
    return {
        "venue_id": venue_id,
        "assessment_type": fixture_input.get("assessment_type", "full_diagnostic"),
        "assessment_date": fixture_input.get("assessment_date"),
        "selected_signal_ids": selected_signal_ids(fixture_input),
        "signal_states": fixture_input.get("signals", {}),
        "management_hours": fixture_input.get("management_hours", 8.0),
        "weekly_budget": fixture_input.get("weekly_budget", 8.0),
        "raw_input_text": ai_snapshot.get("raw_input_text") or fixture_input.get("raw_input_text"),
        "venue_context": fixture_input.get("venue_context", {}),
    }


def create_fixture_venue(
    client: TestClient,
    *,
    organization_id: str,
    fixture: dict[str, Any],
) -> str:
    venue_context = fixture["fixture_input"].get("venue_context", {})
    venue_type = str(venue_context.get("type", "")).lower()
    vertical = "cafe" if "cafe" in venue_type else "restaurant"
    slug = f"phase4-{fixture['fixture_id'].lower()}"
    response = client.post(
        "/api/v1/venues",
        json={
            "organization_id": organization_id,
            "name": venue_context.get("venue_name") or fixture["manifest"]["label"],
            "slug": slug[:64],
            "vertical": vertical,
            "status": "active",
            "concept": venue_context.get("type"),
            "location": venue_context.get("location"),
            "size_note": str(venue_context.get("team_size")) if venue_context.get("team_size") is not None else None,
            "capacity_profile": venue_context,
        },
    )
    response.raise_for_status()
    return response.json()["id"]


def flatten_action_plan(action_plan: dict[str, Any]) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    for bucket in ("L1_tasks", "L2_tasks", "L3_tasks"):
        items.extend(action_plan.get(bucket, []))
    return items


def compare_api_to_direct_legacy(
    run_payload: dict[str, Any],
    detail_payload: dict[str, Any],
    legacy_payload: dict[str, Any],
) -> list[str]:
    diffs: list[str] = []
    legacy_pipeline = legacy_payload["pipeline_data"]
    comparisons = {
        "normalized_signals": detail_payload["normalized_signals"],
        "failure_modes": detail_payload["diagnostic_snapshot"]["failure_modes"],
        "response_patterns": detail_payload["diagnostic_snapshot"]["response_patterns"],
        "activation_set_raw": detail_payload["diagnostic_snapshot"]["activation_set_raw"],
        "activation_context": detail_payload["diagnostic_snapshot"]["activation_context"],
        "activation_set_constrained": detail_payload["diagnostic_snapshot"]["activation_set_constrained"],
        "constraint_report": detail_payload["diagnostic_snapshot"]["constraint_report"],
        "action_plan": detail_payload["plan_snapshot"],
        "report_markdown": detail_payload["report_markdown"],
        "report_type": detail_payload["report_type"],
    }
    expected = {
        "normalized_signals": legacy_pipeline["normalized_signals"],
        "failure_modes": legacy_pipeline["failure_modes"],
        "response_patterns": legacy_pipeline["response_patterns"],
        "activation_set_raw": legacy_pipeline["activation_set_raw"],
        "activation_context": legacy_pipeline["activation_context"],
        "activation_set_constrained": legacy_pipeline["activation_set_constrained"],
        "constraint_report": legacy_pipeline["constraint_report"],
        "action_plan": legacy_pipeline["action_plan"],
        "report_markdown": legacy_payload["report_markdown"],
        "report_type": legacy_pipeline.get("report_type", "legacy_markdown"),
    }
    for key, payload in comparisons.items():
        if canonical_json(payload) != canonical_json(expected[key]):
            diffs.append(key)

    api_blocks = flatten_action_plan(detail_payload["plan_snapshot"])
    legacy_blocks = flatten_action_plan(legacy_pipeline["action_plan"])
    if [item["item_id"] for item in api_blocks] != [item["item_id"] for item in legacy_blocks]:
        diffs.append("plan_block_ids")
    if [item["title"] for item in api_blocks] != [item["title"] for item in legacy_blocks]:
        diffs.append("plan_block_titles")
    if [item["id"] for item in run_payload["failure_modes"]] != [
        item["failure_mode_id"] for item in legacy_pipeline["failure_modes"]
    ]:
        diffs.append("run_failure_mode_ids")
    if [item["id"] for item in run_payload["response_patterns"]] != [
        item["response_pattern_id"] for item in legacy_pipeline["response_patterns"]
    ]:
        diffs.append("run_response_pattern_ids")
    if [item["block_id"] for item in run_payload["plan_tasks"]] != [item["item_id"] for item in legacy_blocks]:
        diffs.append("run_plan_task_block_ids")
    return diffs


def compare_api_to_goldens(detail_payload: dict[str, Any], fixture_dir: Path) -> list[str]:
    expected_by_file = {
        "golden_normalized_signals.json": detail_payload["normalized_signals"],
        "golden_failure_modes.json": detail_payload["diagnostic_snapshot"]["failure_modes"],
        "golden_response_patterns.json": detail_payload["diagnostic_snapshot"]["response_patterns"],
        "golden_activation_set_raw.json": detail_payload["diagnostic_snapshot"]["activation_set_raw"],
        "golden_activation_context.json": detail_payload["diagnostic_snapshot"]["activation_context"],
        "golden_activation_set_constrained.json": detail_payload["diagnostic_snapshot"]["activation_set_constrained"],
        "golden_constraint_report.json": detail_payload["diagnostic_snapshot"]["constraint_report"],
        "golden_action_plan.json": detail_payload["plan_snapshot"],
    }
    diffs: list[str] = []
    for filename, payload in expected_by_file.items():
        if canonical_json(read_json(fixture_dir / filename)) != canonical_json(payload):
            diffs.append(filename)
    if (fixture_dir / "golden_report.md").read_text(encoding="utf-8") != (detail_payload["report_markdown"] or ""):
        diffs.append("golden_report.md")
    return diffs


def run_fixture(client: TestClient, *, organization_id: str, fixture_dir: Path) -> dict[str, Any]:
    fixture = load_fixture(fixture_dir)
    venue_id = create_fixture_venue(client, organization_id=organization_id, fixture=fixture)

    legacy_response = client.post("/api/v1/engine/run-legacy", json=build_legacy_input(fixture, venue_id=venue_id))
    legacy_response.raise_for_status()
    legacy_payload = legacy_response.json()

    assessment_response = client.post("/api/v1/assessments", json=build_assessment_payload(fixture, venue_id=venue_id))
    assessment_response.raise_for_status()
    assessment_id = assessment_response.json()["id"]

    run_response = client.post(
        f"/api/v1/assessments/{assessment_id}/runs",
        json={"ontology_version": "3.6-bridge"},
    )
    run_response.raise_for_status()
    run_payload = run_response.json()

    detail_response = client.get(f"/api/v1/engine/runs/{run_payload['engine_run_id']}")
    detail_response.raise_for_status()
    detail_payload = detail_response.json()
    phase0_diffs = compare_api_to_goldens(detail_payload, fixture_dir)

    return {
        "fixture_id": fixture["fixture_id"],
        "api_vs_direct_legacy_diffs": compare_api_to_direct_legacy(run_payload, detail_payload, legacy_payload),
        "api_vs_phase0_goldens_diffs": phase0_diffs,
        "phase0_diff_classification": "fixed" if not phase0_diffs else "blocking",
        "direct_legacy_report_type": legacy_payload["pipeline_data"].get("report_type", "legacy_markdown"),
        "persisted_report_type": detail_payload["report_type"],
        "plan_task_count": len(flatten_action_plan(detail_payload["plan_snapshot"])),
        "failure_mode_count": len(detail_payload["diagnostic_snapshot"]["failure_modes"]),
        "response_pattern_count": len(detail_payload["diagnostic_snapshot"]["response_patterns"]),
    }


def main() -> int:
    PHASE4_DIR.mkdir(parents=True, exist_ok=True)
    fixture_dirs = sorted(path for path in PHASE0_FIXTURES.iterdir() if path.is_dir())

    with configured_test_environment():
        from app.main import create_app

        with TestClient(create_app()) as client:
            bootstrap_response = client.get("/api/v1/bootstrap")
            bootstrap_response.raise_for_status()
            bootstrap_payload = bootstrap_response.json()
            client.headers.update({"X-OIS-User-Id": bootstrap_payload["current_user"]["id"]})
            organization_id = bootstrap_payload["organization"]["id"]

            fixture_results = [
                run_fixture(client, organization_id=organization_id, fixture_dir=fixture_dir)
                for fixture_dir in fixture_dirs
            ]

    summary = {
        "phase": 4,
        "title": "Legacy Bridge Integration / API Cutover",
        "api_route_path": [
            "POST /api/v1/assessments",
            "POST /api/v1/assessments/{assessment_id}/runs",
            "GET /api/v1/engine/runs/{engine_run_id}",
            "GET /api/v1/engine/runs/latest",
            "GET /api/v1/engine/runs",
            "POST /api/v1/engine/run-legacy",
        ],
        "fixtures": fixture_results,
        "api_vs_direct_legacy_clean": all(not item["api_vs_direct_legacy_diffs"] for item in fixture_results),
        "api_vs_phase0_goldens_clean": all(not item["api_vs_phase0_goldens_diffs"] for item in fixture_results),
    }
    (PHASE4_DIR / "summary.json").write_text(
        json.dumps(summary, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    print("API cutover vs direct legacy route:")
    for item in fixture_results:
        status = "PASS" if not item["api_vs_direct_legacy_diffs"] else "DIFF"
        details = "" if not item["api_vs_direct_legacy_diffs"] else f" ({', '.join(item['api_vs_direct_legacy_diffs'])})"
        print(f" - {item['fixture_id']}: {status}{details}")

    print("API cutover vs Phase 0 goldens:")
    for item in fixture_results:
        status = "PASS" if not item["api_vs_phase0_goldens_diffs"] else "DIFF"
        details = "" if not item["api_vs_phase0_goldens_diffs"] else f" ({', '.join(item['api_vs_phase0_goldens_diffs'])})"
        print(f" - {item['fixture_id']}: {status}{details}")

    return 0 if summary["api_vs_direct_legacy_clean"] and summary["api_vs_phase0_goldens_clean"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
