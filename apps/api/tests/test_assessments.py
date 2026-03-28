from fastapi.testclient import TestClient


def test_assessment_create_list_and_run_flow():
    from app.main import create_app

    with TestClient(create_app()) as client:
        bootstrap = client.get("/api/v1/bootstrap")
        bootstrap_payload = bootstrap.json()
        client.headers.update({"X-OIS-User-Id": bootstrap_payload["current_user"]["id"]})
        venue_id = bootstrap_payload["venues"][0]["id"]
        binding_response = client.get(f"/api/v1/venues/{venue_id}/ontology-binding")
        assert binding_response.status_code == 200
        binding_payload = binding_response.json()
        bundle_response = client.get(
            f"/api/v1/ontology/bundle?ontology_id={binding_payload['ontology_id']}&version={binding_payload['ontology_version']}"
        )
        assert bundle_response.status_code == 200
        bundle_payload = bundle_response.json()

        preferred_signal_ids = [
            signal_id
            for signal_id in ["sig_service_delay", "sig_shift_brief_missing", "sig_guest_complaints"]
            if any(signal["id"] == signal_id for signal in bundle_payload["signals"])
        ]
        selected_signal_ids = list(dict.fromkeys(preferred_signal_ids))
        for signal in bundle_payload["signals"]:
            if signal["id"] not in selected_signal_ids:
                selected_signal_ids.append(signal["id"])
            if len(selected_signal_ids) == 3:
                break
        assert len(selected_signal_ids) == 3

        create_response = client.post(
            "/api/v1/assessments",
            json={
                "venue_id": venue_id,
                "notes": "Guests complained about a long wait and there was no pre-shift briefing.",
                "selected_signal_ids": selected_signal_ids,
                "signal_states": {
                    selected_signal_ids[0]: {
                        "active": True,
                        "confidence": "high",
                        "notes": "Guests complained repeatedly."
                    }
                },
                "management_hours_available": 8,
                "weekly_effort_budget": 8
            },
        )
        assert create_response.status_code == 201
        assessment_id = create_response.json()["id"]

        list_response = client.get(f"/api/v1/assessments?venue_id={venue_id}")
        assert list_response.status_code == 200
        payload = list_response.json()
        assert payload[0]["id"] == assessment_id
        assert payload[0]["selected_signal_count"] == 3

        detail_response = client.get(f"/api/v1/assessments/{assessment_id}")
        assert detail_response.status_code == 200
        detail_payload = detail_response.json()
        assert detail_payload["id"] == assessment_id
        assert detail_payload["notes"].startswith("Guests complained")

        run_response = client.post(f"/api/v1/assessments/{assessment_id}/runs", json={})
        assert run_response.status_code == 200
        run_payload = run_response.json()
        assert run_payload["assessment_id"] == assessment_id
        assert run_payload["failure_modes"] != []
        assert run_payload["plan_tasks"] != []
