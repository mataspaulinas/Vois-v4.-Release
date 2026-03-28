from fastapi.testclient import TestClient


def test_plan_and_progress_workspace_flow():
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
                "notes": "Guests complained, service slowed, and there was no pre-shift briefing.",
                "selected_signal_ids": selected_signal_ids,
                "signal_states": {
                    selected_signal_ids[0]: {"active": True, "confidence": "high", "notes": "Observed live."}
                },
                "management_hours_available": 8,
                "weekly_effort_budget": 8
            },
        )
        assessment_id = assessment.json()["id"]

        run_response = client.post(f"/api/v1/assessments/{assessment_id}/runs", json={})
        assert run_response.status_code == 200
        plan_id = run_response.json()["plan_id"]
        activate_plan = client.patch(f"/api/v1/plans/{plan_id}", json={"status": "active"})
        assert activate_plan.status_code == 200

        latest_plan = client.get(f"/api/v1/plans/latest?venue_id={venue_id}")
        assert latest_plan.status_code == 200
        latest_payload = latest_plan.json()
        assert latest_payload["id"] == plan_id
        assert latest_payload["tasks"] != []

        execution_summary = client.get(f"/api/v1/plans/latest/execution-summary?venue_id={venue_id}")
        assert execution_summary.status_code == 200
        summary_payload = execution_summary.json()
        assert summary_payload["next_executable_tasks"] != []

        blocked_task = next((task for task in latest_payload["tasks"] if task["dependencies"]), None)
        if blocked_task is not None:
            blocked_update = client.patch(
                f"/api/v1/plans/tasks/{blocked_task['id']}",
                json={"status": "completed"},
            )
            assert blocked_update.status_code == 400

        first_task_id = latest_payload["tasks"][0]["id"]
        update_task = client.patch(
            f"/api/v1/plans/tasks/{first_task_id}",
            json={"status": "in_progress"},
        )
        assert update_task.status_code == 200
        assert update_task.json()["status"] == "in_progress"

        complete_task = client.patch(
            f"/api/v1/plans/tasks/{first_task_id}",
            json={"status": "completed"},
        )
        assert complete_task.status_code == 200
        assert complete_task.json()["status"] == "completed"

        create_progress = client.post(
            "/api/v1/progress",
            json={
                "venue_id": venue_id,
                "summary": "Started the first intervention block.",
                "detail": "Manager kicked off the workflow mapping session.",
                "status": "monitoring"
            },
        )
        assert create_progress.status_code == 201

        progress_feed = client.get(f"/api/v1/progress?venue_id={venue_id}")
        assert progress_feed.status_code == 200
        summaries = [item["summary"] for item in progress_feed.json()]
        assert "Started the first intervention block." in summaries
        assert any("moved to completed" in summary for summary in summaries)
