from fastapi.testclient import TestClient


def test_audit_feed_captures_operational_mutations():
    from app.main import create_app

    with TestClient(create_app()) as client:
        bootstrap = client.get("/api/v1/bootstrap").json()
        client.headers.update({"X-OIS-User-Id": bootstrap["current_user"]["id"]})
        organization_id = bootstrap["organization"]["id"]
        venue_id = bootstrap["venues"][0]["id"]
        user_id = bootstrap["current_user"]["id"]
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

        assessment = client.post(
            "/api/v1/assessments",
            json={
                "venue_id": venue_id,
                "notes": "Guests complained about delays and the manager missed the shift briefing.",
                "selected_signal_ids": selected_signal_ids,
                "signal_states": {},
                "management_hours_available": 8,
                "weekly_effort_budget": 8,
            },
        )
        assessment_id = assessment.json()["id"]
        run = client.post(f"/api/v1/assessments/{assessment_id}/runs", json={})
        run_payload = run.json()
        plan_id = run_payload["plan_id"]
        activate_plan = client.patch(f"/api/v1/plans/{plan_id}", json={"status": "active"})
        assert activate_plan.status_code == 200
        plan = client.get(f"/api/v1/plans/{plan_id}").json()
        if plan["tasks"]:
            first_task_id = plan["tasks"][0]["id"]
            task_update = client.patch(f"/api/v1/plans/tasks/{first_task_id}", json={"status": "in_progress"})
            assert task_update.status_code == 200
        client.post(
            "/api/v1/progress",
            json={
                "venue_id": venue_id,
                "created_by": user_id,
                "summary": "Manager opened the reset block.",
                "detail": "Kickoff discussion completed.",
                "status": "active",
            },
        )
        threads = client.get(f"/api/v1/copilot/threads?venue_id={venue_id}").json()
        venue_thread = next(thread for thread in threads if thread["scope"] == "venue")
        copilot_message = client.post(
            f"/api/v1/copilot/threads/{venue_thread['id']}/messages",
            json={"content": "What is blocked right now?", "created_by": user_id},
        )
        assert copilot_message.status_code in {201, 503}
        proactive = client.post("/api/v1/copilot/proactive", json={"venue_id": venue_id})
        assert proactive.status_code == 410

        audit_feed = client.get(f"/api/v1/audit?organization_id={organization_id}&limit=20")
        assert audit_feed.status_code == 200
        entries = audit_feed.json()
        entity_types = {entry["entity_type"] for entry in entries}
        assert "operational_plan" in entity_types
        assert "progress_entry" in entity_types
        if plan["tasks"]:
            assert "plan_task" in entity_types
