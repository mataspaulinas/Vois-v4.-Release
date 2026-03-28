from fastapi.testclient import TestClient


def test_persisted_engine_run_history():
    from app.main import create_app

    with TestClient(create_app()) as client:
        bootstrap = client.get("/api/v1/bootstrap")
        bootstrap_payload = bootstrap.json()
        client.headers.update({"X-OIS-User-Id": bootstrap_payload["current_user"]["id"]})
        venue_id = bootstrap_payload["venues"][0]["id"]
        binding = client.get(f"/api/v1/venues/{venue_id}/ontology-binding")
        assert binding.status_code == 200
        binding_payload = binding.json()
        bundle = client.get(
            f"/api/v1/ontology/bundle?ontology_id={binding_payload['ontology_id']}&version={binding_payload['ontology_version']}"
        )
        assert bundle.status_code == 200
        bundle_payload = bundle.json()
        preferred_signal_ids = [
            signal_id
            for signal_id in ["sig_guest_complaints", "sig_service_delay", "sig_shift_brief_missing"]
            if any(signal["id"] == signal_id for signal in bundle_payload["signals"])
        ]
        selected_signal_ids = list(dict.fromkeys(preferred_signal_ids))
        for signal in bundle_payload["signals"]:
            if signal["id"] not in selected_signal_ids:
                selected_signal_ids.append(signal["id"])
            if len(selected_signal_ids) == 3:
                break
        assert len(selected_signal_ids) == 3

        assessment = client.post(
            "/api/v1/assessments",
            json={
                "venue_id": venue_id,
                "notes": "Guests complained about delays and there was no pre-shift briefing.",
                "selected_signal_ids": selected_signal_ids,
                "signal_states": {},
                "management_hours_available": 8,
                "weekly_effort_budget": 8,
            },
        )
        assessment_id = assessment.json()["id"]

        run = client.post(f"/api/v1/assessments/{assessment_id}/runs", json={})
        assert run.status_code == 200

        latest = client.get(f"/api/v1/engine/runs/latest?venue_id={venue_id}")
        assert latest.status_code == 200
        latest_payload = latest.json()
        assert latest_payload["summary"] != ""
        assert latest_payload["active_signal_names"] != []
        assert latest_payload["plan_task_count"] >= 1

        history = client.get(f"/api/v1/engine/runs?venue_id={venue_id}")
        assert history.status_code == 200
        history_payload = history.json()
        assert history_payload != []
        assert history_payload[0]["engine_run_id"] == latest_payload["engine_run_id"]
