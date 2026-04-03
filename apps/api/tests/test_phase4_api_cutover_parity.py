from __future__ import annotations

import json
from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.db.session import get_session_factory
from app.models.domain import User


ROOT_DIR = Path(__file__).resolve().parents[3]
FIXTURE_ROOT = ROOT_DIR / "embedded_engine" / "OIS_Cafe_v2" / "docs" / "migration" / "phase0" / "fixtures"
PARITY_FIXTURES = [
    "F001_normal_followup_warsaw",
    "F002_degraded_pegasas",
    "F003_conflicting_capacity_vs_cost",
    "F004_existing_active_plan_kaunas",
    "F005_ambiguous_ai_preopening_muzos2",
    "F006_complex_klaipeda_multi_surface",
]


def test_phase4_api_cutover_parity_across_multiple_phase0_fixtures():
    from app.main import create_app

    with TestClient(create_app()) as client:
        bootstrap = client.get("/api/v1/bootstrap")
        bootstrap_payload = bootstrap.json()
        owner_id = bootstrap_payload["current_user"]["id"]
        client.headers.update({"X-OIS-User-Id": owner_id})
        organization_id = bootstrap_payload["organization"]["id"]
        with get_session_factory()() as db:
            developer_id = db.scalar(select(User.id).where(User.email == "developer@vois.local"))
        assert developer_id is not None

        for fixture_id in PARITY_FIXTURES:
            fixture = _load_fixture(fixture_id)
            venue_id = _create_fixture_venue(
                client,
                organization_id=organization_id,
                fixture_id=fixture_id,
                fixture=fixture,
            )

            legacy_input = _build_legacy_raw_input(fixture, venue_id=venue_id)
            client.headers.update({"X-OIS-User-Id": developer_id})
            legacy_response = client.post("/api/v1/engine/run-legacy", json=legacy_input)
            assert legacy_response.status_code == 200, legacy_response.text
            legacy_payload = legacy_response.json()
            assert legacy_payload["report_markdown"]
            assert legacy_payload["pipeline_data"]["action_plan"]

            client.headers.update({"X-OIS-User-Id": owner_id})
            assessment_payload = _build_assessment_payload(fixture, venue_id=venue_id)
            assessment_response = client.post("/api/v1/assessments", json=assessment_payload)
            assert assessment_response.status_code == 201, assessment_response.text
            assessment_id = assessment_response.json()["id"]

            run_response = client.post(
                f"/api/v1/assessments/{assessment_id}/runs",
                json={},
            )
            assert run_response.status_code == 200, run_response.text
            run_payload = run_response.json()

            detail_response = client.get(f"/api/v1/engine/runs/{run_payload['engine_run_id']}")
            assert detail_response.status_code == 200, detail_response.text
            detail_payload = detail_response.json()

            assert detail_payload["engine_run_id"] == run_payload["engine_run_id"], fixture_id
            assert detail_payload["ontology_id"] in {"cafe", "restaurant-legacy"}, fixture_id
            assert detail_payload["ontology_version"] in {"v1", "v8"}, fixture_id
            assert isinstance(detail_payload["normalized_signals"], list), fixture_id
            assert isinstance(detail_payload["diagnostic_snapshot"], dict), fixture_id
            assert isinstance(detail_payload["plan_snapshot"], dict), fixture_id
            assert detail_payload["report_markdown"] is None or isinstance(detail_payload["report_markdown"], str), fixture_id
            assert isinstance(run_payload["failure_modes"], list), fixture_id
            assert isinstance(run_payload["response_patterns"], list), fixture_id
            assert isinstance(run_payload["plan_tasks"], list), fixture_id


def test_phase4_negative_paths_partial_extraction_and_rerun_behavior():
    from app.main import create_app

    with TestClient(create_app()) as client:
        bootstrap = client.get("/api/v1/bootstrap")
        bootstrap_payload = bootstrap.json()
        client.headers.update({"X-OIS-User-Id": bootstrap_payload["current_user"]["id"]})
        organization_id = bootstrap_payload["organization"]["id"]

        invalid_run = client.post(
            "/api/v1/engine/runs",
            json={
                "venue_id": bootstrap_payload["venues"][0]["id"],
                "selected_signal_ids": ["S051"],
                "signal_states": {"S051": {"active": True}},
                "management_hours_available": -1,
                "weekly_effort_budget": 8,
                "ontology_version": "3.6-bridge",
            },
        )
        assert invalid_run.status_code == 422

        missing_venue = client.post(
            "/api/v1/assessments",
            json={
                "venue_id": "missing-venue",
                "selected_signal_ids": ["S051"],
                "signal_states": {"S051": {"active": True}},
                "management_hours_available": 8,
                "weekly_effort_budget": 8,
            },
        )
        assert missing_venue.status_code == 404

        missing_assessment_run = client.post("/api/v1/assessments/missing-assessment/runs", json={})
        assert missing_assessment_run.status_code == 404

        fixture = _load_fixture("F005_ambiguous_ai_preopening_muzos2")
        venue_id = _create_fixture_venue(
            client,
            organization_id=organization_id,
            fixture_id="F005_negative_partial",
            fixture=fixture,
        )
        assessment_payload = _build_assessment_payload(fixture, venue_id=venue_id)
        assessment_response = client.post("/api/v1/assessments", json=assessment_payload)
        assert assessment_response.status_code == 201, assessment_response.text
        assessment_id = assessment_response.json()["id"]

        assessment_detail = client.get(f"/api/v1/assessments/{assessment_id}")
        assert assessment_detail.status_code == 200
        assessment_detail_payload = assessment_detail.json()
        assert assessment_detail_payload["raw_input_text"]
        assert assessment_detail_payload["raw_intake_payload"]["raw_input_length"] == 10000
        assert assessment_detail_payload["assessment_type"] == "full_diagnostic"

        first_run = client.post(
            f"/api/v1/assessments/{assessment_id}/runs",
            json={},
        )
        assert first_run.status_code == 200, first_run.text
        second_run = client.post(
            f"/api/v1/assessments/{assessment_id}/runs",
            json={},
        )
        assert second_run.status_code == 200, second_run.text
        assert first_run.json()["engine_run_id"] != second_run.json()["engine_run_id"]
        assert first_run.json()["plan_id"] != second_run.json()["plan_id"]

        latest_run = client.get(f"/api/v1/engine/runs/latest?venue_id={venue_id}")
        assert latest_run.status_code == 200
        assert latest_run.json()["engine_run_id"] == second_run.json()["engine_run_id"]

        run_history = client.get(f"/api/v1/engine/runs?venue_id={venue_id}")
        assert run_history.status_code == 200
        history_payload = run_history.json()
        assert len(history_payload) >= 2
        assert history_payload[0]["engine_run_id"] == second_run.json()["engine_run_id"]

        direct_run = client.post(
            "/api/v1/engine/runs",
            json=assessment_payload,
        )
        assert direct_run.status_code == 200, direct_run.text
        direct_run_payload = direct_run.json()
        assert isinstance(direct_run_payload["plan_tasks"], list)
        assert isinstance(direct_run_payload["failure_modes"], list)


def _load_fixture(fixture_id: str) -> dict[str, object]:
    fixture_dir = FIXTURE_ROOT / fixture_id
    fixture_input = json.loads((fixture_dir / "fixture_input.json").read_text(encoding="utf-8"))
    manifest = json.loads((fixture_dir / "manifest.json").read_text(encoding="utf-8"))
    ai_snapshot_path = fixture_dir / "ai_extraction_snapshot.json"
    ai_snapshot = json.loads(ai_snapshot_path.read_text(encoding="utf-8")) if ai_snapshot_path.exists() else None
    return {
        "fixture_id": fixture_id,
        "fixture_dir": fixture_dir,
        "fixture_input": fixture_input,
        "manifest": manifest,
        "ai_snapshot": ai_snapshot,
    }


def _build_assessment_payload(fixture: dict[str, object], *, venue_id: str) -> dict[str, object]:
    fixture_input = fixture["fixture_input"]
    ai_snapshot = fixture["ai_snapshot"]
    return {
        "venue_id": venue_id,
        "notes": fixture["manifest"]["description"],
        "assessment_type": fixture_input.get("assessment_type", "full_diagnostic"),
        "assessment_date": fixture_input.get("assessment_date"),
        "selected_signal_ids": _selected_signal_ids(fixture_input),
        "signal_states": fixture_input.get("signals", {}),
        "raw_input_text": (ai_snapshot or {}).get("raw_input_text") or fixture_input.get("raw_input_text"),
        "raw_intake_payload": ai_snapshot or fixture_input,
        "venue_context_json": fixture_input.get("venue_context", {}),
        "management_hours_available": fixture_input.get("management_hours", 8.0),
        "weekly_effort_budget": fixture_input.get("weekly_budget", 8.0),
    }


def _build_legacy_raw_input(fixture: dict[str, object], *, venue_id: str) -> dict[str, object]:
    fixture_input = fixture["fixture_input"]
    ai_snapshot = fixture["ai_snapshot"]
    return {
        "venue_id": venue_id,
        "assessment_type": fixture_input.get("assessment_type", "full_diagnostic"),
        "assessment_date": fixture_input.get("assessment_date"),
        "selected_signal_ids": _selected_signal_ids(fixture_input),
        "signal_states": fixture_input.get("signals", {}),
        "management_hours": fixture_input.get("management_hours", 8.0),
        "weekly_budget": fixture_input.get("weekly_budget", 8.0),
        "raw_input_text": (ai_snapshot or {}).get("raw_input_text") or fixture_input.get("raw_input_text"),
        "venue_context": fixture_input.get("venue_context", {}),
    }


def _create_fixture_venue(
    client: TestClient,
    *,
    organization_id: str,
    fixture_id: str,
    fixture: dict[str, object],
) -> str:
    fixture_input = fixture["fixture_input"]
    venue_context = fixture_input.get("venue_context", {})
    venue_type = str(venue_context.get("type", "")).lower()
    vertical = "cafe" if "cafe" in venue_type else "restaurant"
    response = client.post(
        "/api/v1/venues",
        json={
            "organization_id": organization_id,
            "name": venue_context.get("venue_name") or fixture["manifest"]["label"],
            "slug": fixture_id.lower(),
            "ontology_binding": {
                "ontology_id": "cafe" if vertical == "cafe" else "restaurant-legacy",
                "ontology_version": "v1" if vertical == "cafe" else "v8",
            },
            "status": "active",
            "concept": venue_context.get("type"),
            "location": venue_context.get("location"),
            "size_note": str(venue_context.get("team_size")) if venue_context.get("team_size") is not None else None,
            "capacity_profile": venue_context,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()["id"]


def _selected_signal_ids(fixture_input: dict[str, object]) -> list[str]:
    return [
        signal_id
        for signal_id, state in (fixture_input.get("signals") or {}).items()
        if not isinstance(state, dict) or state.get("active", True)
    ]


def _flatten_action_plan(action_plan: dict[str, object]) -> list[dict[str, object]]:
    items: list[dict[str, object]] = []
    for bucket in ("L1_tasks", "L2_tasks", "L3_tasks"):
        items.extend(action_plan.get(bucket, []))
    return items
