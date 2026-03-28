from __future__ import annotations

import json
import os
import shutil
import sys
import tempfile
from contextlib import contextmanager
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
PHASE5_DIR = ROOT / "docs" / "migration" / "phase5"
PLATFORM_ROOT = ROOT.parent / "CODEX-VOIS-claude-debug-api-500-error-HACD2"
PLATFORM_API_ROOT = PLATFORM_ROOT / "apps" / "api"

if str(PLATFORM_API_ROOT) not in sys.path:
    sys.path.insert(0, str(PLATFORM_API_ROOT))

from fastapi.testclient import TestClient


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
    with tempfile.TemporaryDirectory(prefix="phase5-closure-audit-", ignore_cleanup_errors=True) as temp_dir:
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
        ):
            from app.core.config import get_settings
            from app.db.session import get_engine, get_session_factory
            from app.services.ontology import get_ontology_repository
            from app.services.ontology_workbench import get_ontology_workbench_service

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


def create_assessment(client: TestClient, *, venue_id: str, notes: str, signals: list[str]) -> str:
    response = client.post(
        "/api/v1/assessments",
        json={
            "venue_id": venue_id,
            "notes": notes,
            "selected_signal_ids": signals,
            "signal_states": {signal_id: {"active": True, "confidence": "high"} for signal_id in signals},
            "management_hours_available": 8,
            "weekly_effort_budget": 10,
        },
    )
    response.raise_for_status()
    return response.json()["id"]


def run_assessment(client: TestClient, assessment_id: str) -> dict:
    response = client.post(f"/api/v1/assessments/{assessment_id}/runs", json={})
    response.raise_for_status()
    return response.json()


def fetch_latest_plan(client: TestClient, venue_id: str) -> dict:
    response = client.get(f"/api/v1/plans/latest?venue_id={venue_id}")
    response.raise_for_status()
    return response.json()


def fetch_latest_execution_summary(client: TestClient, venue_id: str) -> dict:
    response = client.get(f"/api/v1/plans/latest/execution-summary?venue_id={venue_id}")
    response.raise_for_status()
    return response.json()


def fetch_plan(client: TestClient, plan_id: str) -> dict:
    response = client.get(f"/api/v1/plans/{plan_id}")
    response.raise_for_status()
    return response.json()


def fetch_audit_entries(client: TestClient, organization_id: str) -> list[dict]:
    response = client.get(f"/api/v1/audit?organization_id={organization_id}")
    response.raise_for_status()
    return response.json()


def fetch_progress_entries(client: TestClient, venue_id: str) -> list[dict]:
    response = client.get(f"/api/v1/progress?venue_id={venue_id}")
    response.raise_for_status()
    return response.json()


def update_plan_status(client: TestClient, plan_id: str, status: str) -> dict:
    response = client.patch(f"/api/v1/plans/{plan_id}", json={"status": status})
    response.raise_for_status()
    return response.json()


def update_task_status(client: TestClient, task_id: str, status: str) -> dict:
    response = client.patch(f"/api/v1/plans/tasks/{task_id}", json={"status": status})
    response.raise_for_status()
    return response.json()


def update_task_notes(client: TestClient, task_id: str, notes: str) -> dict:
    response = client.patch(f"/api/v1/plans/tasks/{task_id}", json={"notes": notes})
    response.raise_for_status()
    return response.json()


def create_venue(client: TestClient, *, organization_id: str, name: str, slug: str) -> str:
    response = client.post(
        "/api/v1/venues",
        json={
            "organization_id": organization_id,
            "name": name,
            "slug": slug,
            "vertical": "restaurant",
            "status": "active",
        },
    )
    response.raise_for_status()
    return response.json()["id"]


def main() -> int:
    PHASE5_DIR.mkdir(parents=True, exist_ok=True)

    with configured_test_environment():
        from app.main import create_app

        with TestClient(create_app()) as client:
            bootstrap = client.get("/api/v1/bootstrap")
            bootstrap.raise_for_status()
            bootstrap_payload = bootstrap.json()
            client.headers.update({"X-OIS-User-Id": bootstrap_payload["current_user"]["id"]})

            organization_id = bootstrap_payload["organization"]["id"]
            venue_id = bootstrap_payload["venues"][0]["id"]
            second_venue_id = create_venue(
                client,
                organization_id=organization_id,
                name="Phase 5 Secondary Venue",
                slug="phase5-secondary",
            )

            flow_a: dict[str, object] = {}
            assessment_a = create_assessment(
                client,
                venue_id=venue_id,
                notes="Flow A assessment",
                signals=["sig_service_delay", "sig_shift_brief_missing"],
            )
            run_a = run_assessment(client, assessment_a)
            latest_plan_a = fetch_latest_plan(client, venue_id)
            latest_summary_a = fetch_latest_execution_summary(client, venue_id)
            draft_task_id = latest_plan_a["tasks"][0]["id"]

            flow_a["plan_status_after_run"] = latest_plan_a["status"]
            flow_a["draft_ready_task_count_before_activation"] = len(latest_summary_a["next_executable_tasks"])
            flow_a["draft_task_mutation_before_activation"] = update_task_notes(
                client,
                draft_task_id,
                "Draft plan note before approval.",
            )["notes"]

            audit_before_activation = fetch_audit_entries(client, organization_id)
            progress_before_activation = fetch_progress_entries(client, venue_id)
            activated_plan = update_plan_status(client, latest_plan_a["id"], "active")
            first_activation_audit = fetch_audit_entries(client, organization_id)
            first_activation_progress = fetch_progress_entries(client, venue_id)
            update_task_status(client, draft_task_id, "in_progress")
            updated_plan_a = fetch_plan(client, latest_plan_a["id"])
            flow_a["activated_status"] = activated_plan["status"]
            flow_a["task_status_after_activation"] = next(
                task["status"] for task in updated_plan_a["tasks"] if task["id"] == draft_task_id
            )
            flow_a["task_note_persisted_after_refresh"] = next(
                task["notes"] for task in updated_plan_a["tasks"] if task["id"] == draft_task_id
            )
            flow_a["activation_audit_delta"] = len(first_activation_audit) - len(audit_before_activation)
            flow_a["activation_progress_delta"] = len(first_activation_progress) - len(progress_before_activation)

            flow_b: dict[str, object] = {}
            audit_before_second_activation = fetch_audit_entries(client, organization_id)
            progress_before_second_activation = fetch_progress_entries(client, venue_id)
            second_activation = update_plan_status(client, latest_plan_a["id"], "active")
            audit_after_second_activation = fetch_audit_entries(client, organization_id)
            progress_after_second_activation = fetch_progress_entries(client, venue_id)
            flow_b["second_activation_status"] = second_activation["status"]
            flow_b["second_activation_audit_delta"] = len(audit_after_second_activation) - len(audit_before_second_activation)
            flow_b["second_activation_progress_delta"] = len(progress_after_second_activation) - len(progress_before_second_activation)

            flow_c: dict[str, object] = {}
            assessment_b = create_assessment(
                client,
                venue_id=venue_id,
                notes="Flow C rerun assessment",
                signals=["sig_guest_complaints", "sig_service_delay", "sig_shift_brief_missing"],
            )
            run_b = run_assessment(client, assessment_b)
            latest_plan_c = fetch_latest_plan(client, venue_id)
            latest_summary_c = fetch_latest_execution_summary(client, venue_id)
            original_plan_c = fetch_plan(client, latest_plan_a["id"])
            flow_c["original_active_plan_id"] = latest_plan_a["id"]
            flow_c["rerun_plan_id"] = run_b["plan_id"]
            flow_c["rerun_plan_status"] = latest_plan_c["status"]
            flow_c["original_plan_status_after_rerun"] = original_plan_c["status"]
            flow_c["latest_plan_endpoint_id_after_rerun"] = latest_plan_c["id"]
            flow_c["latest_execution_summary_plan_id_after_rerun"] = latest_summary_c["plan_id"]

            flow_d: dict[str, object] = {}
            draft_rerun_task_id = latest_plan_c["tasks"][0]["id"]
            draft_status_update = update_task_status(client, draft_rerun_task_id, "in_progress")
            draft_notes_update = update_task_notes(client, draft_rerun_task_id, "Draft task mutated after rerun.")
            draft_plan_after_mutation = fetch_plan(client, latest_plan_c["id"])
            flow_d["draft_plan_status"] = latest_plan_c["status"]
            flow_d["draft_status_update_result"] = draft_status_update["status"]
            flow_d["draft_notes_update_result"] = next(
                task["notes"] for task in draft_plan_after_mutation["tasks"] if task["id"] == draft_rerun_task_id
            )

            cross_venue: dict[str, object] = {}
            secondary_assessment = create_assessment(
                client,
                venue_id=second_venue_id,
                notes="Cross-venue control assessment",
                signals=["sig_guest_complaints"],
            )
            run_assessment(client, secondary_assessment)
            secondary_next_actions = client.get(f"/api/v1/execution/next-action?venue_id={second_venue_id}")
            secondary_next_actions.raise_for_status()
            leaked_task_ids = [
                item["entity_id"]
                for item in secondary_next_actions.json()
                if item["action_type"] == "in_progress_task"
            ]
            cross_venue["secondary_venue_in_progress_actions"] = leaked_task_ids

            summary = {
                "phase": 5,
                "title": "Enforce V1 Workflow Discipline in CODEX UI",
                "flow_a": flow_a,
                "flow_b": flow_b,
                "flow_c": flow_c,
                "flow_d": flow_d,
                "cross_venue_next_action_check": cross_venue,
                "observations": {
                    "new_plan_default_status_is_draft": latest_plan_a["status"] == "draft",
                    "draft_plan_has_executable_summary_before_activation": len(latest_summary_a["next_executable_tasks"]) > 0,
                    "duplicate_activation_is_idempotent": (
                        flow_b["second_activation_audit_delta"] == 0 and flow_b["second_activation_progress_delta"] == 0
                    ),
                    "rerun_latest_endpoint_switches_to_draft": latest_plan_c["id"] == run_b["plan_id"],
                    "draft_task_mutation_allowed": draft_status_update["status"] == "in_progress",
                    "cross_venue_next_action_leak": bool(leaked_task_ids),
                },
            }

    (PHASE5_DIR / "summary.json").write_text(
        json.dumps(summary, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    print(json.dumps(summary, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
