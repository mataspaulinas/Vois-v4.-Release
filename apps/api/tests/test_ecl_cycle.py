"""
Phase 3 integration test: full assign → follow-up → escalate cycle.

Exit criterion: Follow-up timer: assign task -> timer starts -> expires -> escalation generated.
"""

from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient


def _select_signal_ids(client: TestClient, venue_id: str, *, limit: int = 3) -> list[str]:
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
        if len(selected_signal_ids) == limit:
            break
    assert len(selected_signal_ids) == limit
    return selected_signal_ids


def test_full_follow_up_to_escalation_cycle():
    """
    Walk the complete ECL cycle:
      1. Create venue + assessment + engine run to get plan tasks
      2. Move task to in_progress
      3. Create a follow-up with a past due_at (simulating expiry)
      4. GET /next-action triggers overdue check → auto-escalation
      5. Verify escalation was created
      6. Resolve escalation
      7. Upload evidence linked to task
      8. Verify evidence list
    """
    from app.main import create_app

    with TestClient(create_app()) as client:
        # ── Setup: Bootstrap + venue + engine run ──
        bootstrap = client.get("/api/v1/bootstrap")
        bp = bootstrap.json()
        user_id = bp["current_user"]["id"]
        org_id = bp["organization"]["id"]
        venue_id = bp["venues"][0]["id"]
        client.headers.update({"X-OIS-User-Id": user_id})
        selected_signal_ids = _select_signal_ids(client, venue_id)

        # Create assessment and run engine to get plan tasks
        assessment = client.post(
            "/api/v1/assessments",
            json={
                "venue_id": venue_id,
                "notes": "Service delay and no pre-shift briefing.",
                "selected_signal_ids": selected_signal_ids,
                "signal_states": {
                    selected_signal_ids[0]: {
                        "active": True,
                        "confidence": "high",
                        "notes": "Observed.",
                    }
                },
                "management_hours_available": 8,
                "weekly_effort_budget": 8,
            },
        )
        assessment_id = assessment.json()["id"]

        run = client.post(f"/api/v1/assessments/{assessment_id}/runs", json={})
        assert run.status_code == 200
        plan_id = run.json()["plan_id"]
        activate_plan = client.patch(f"/api/v1/plans/{plan_id}", json={"status": "active"})
        assert activate_plan.status_code == 200

        plan = client.get(f"/api/v1/plans/latest?venue_id={venue_id}")
        assert plan.status_code == 200
        tasks = plan.json()["tasks"]
        assert len(tasks) > 0
        first_task_id = tasks[0]["id"]

        # ── Step 1: Move task to in_progress ──
        update = client.patch(
            f"/api/v1/plans/tasks/{first_task_id}",
            json={"status": "in_progress"},
        )
        assert update.status_code == 200

        # ── Step 2: Create follow-up with past due_at (simulates timer expiry) ──
        past_due = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
        follow_up_resp = client.post(
            "/api/v1/execution/followups",
            json={
                "venue_id": venue_id,
                "task_id": first_task_id,
                "assigned_to": user_id,
                "title": "Check progress on first intervention block",
                "due_at": past_due,
                "notes": "Follow-up timer started on task assignment.",
            },
        )
        assert follow_up_resp.status_code == 201, follow_up_resp.text
        follow_up = follow_up_resp.json()
        follow_up_id = follow_up["id"]
        assert follow_up["status"] == "pending"
        assert follow_up["task_id"] == first_task_id

        # ── Step 3: List follow-ups (should show as overdue) ──
        list_resp = client.get(f"/api/v1/execution/followups?venue_id={venue_id}&overdue_only=true")
        assert list_resp.status_code == 200
        overdue_list = list_resp.json()
        assert any(fu["id"] == follow_up_id for fu in overdue_list)
        assert any(fu["is_overdue"] for fu in overdue_list)

        # ── Step 4: GET /next-action triggers overdue check → auto-escalation ──
        next_actions = client.get(f"/api/v1/execution/next-action?venue_id={venue_id}")
        assert next_actions.status_code == 200
        actions = next_actions.json()
        # Should have at least one overdue follow-up or escalation action
        assert len(actions) > 0

        # ── Step 5: Verify escalation was auto-created ──
        escalations_resp = client.get(f"/api/v1/execution/escalations?venue_id={venue_id}")
        assert escalations_resp.status_code == 200
        escalations = escalations_resp.json()
        assert len(escalations) >= 1, "Overdue follow-up should have triggered auto-escalation"
        auto_escalation = escalations[0]
        assert auto_escalation["follow_up_id"] == follow_up_id
        assert auto_escalation["status"] == "open"
        assert "overdue" in auto_escalation["reason"].lower()

        # Verify the follow-up was marked as escalated
        updated_fus = client.get(f"/api/v1/execution/followups?venue_id={venue_id}")
        fu_data = next(fu for fu in updated_fus.json() if fu["id"] == follow_up_id)
        assert fu_data["status"] == "escalated"

        # ── Step 6: Resolve escalation ──
        resolve_resp = client.patch(
            f"/api/v1/execution/escalations/{auto_escalation['id']}/resolve",
            json={"resolution_notes": "Manager confirmed task completion during evening shift."},
        )
        assert resolve_resp.status_code == 200
        assert resolve_resp.json()["status"] == "resolved"
        assert resolve_resp.json()["resolution_notes"] == "Manager confirmed task completion during evening shift."

        # ── Step 7: Upload evidence linked to task ──
        evidence_resp = client.post(
            "/api/v1/execution/evidence",
            json={
                "venue_id": venue_id,
                "task_id": first_task_id,
                "title": "Photo of updated pre-shift checklist",
                "description": "Taken at morning shift handover.",
                "evidence_type": "photo",
            },
        )
        assert evidence_resp.status_code == 201
        evidence = evidence_resp.json()
        assert evidence["task_id"] == first_task_id
        assert evidence["evidence_type"] == "photo"

        # ── Step 8: Verify evidence list ──
        evidence_list = client.get(f"/api/v1/execution/evidence?venue_id={venue_id}&task_id={first_task_id}")
        assert evidence_list.status_code == 200
        assert len(evidence_list.json()) >= 1
        assert any(e["id"] == evidence["id"] for e in evidence_list.json())

        # ── Step 9: Create manual escalation ──
        manual_esc = client.post(
            "/api/v1/execution/escalate",
            json={
                "venue_id": venue_id,
                "task_id": first_task_id,
                "severity": "high",
                "reason": "Repeated failure to maintain pre-shift briefing despite intervention.",
            },
        )
        assert manual_esc.status_code == 201
        assert manual_esc.json()["severity"] == "high"

        # ── Step 10: Verify progress feed has escalation entries ──
        feed = client.get(f"/api/v1/progress?venue_id={venue_id}")
        assert feed.status_code == 200
        summaries = [e["summary"] for e in feed.json()]
        assert any("escalation" in s.lower() for s in summaries), (
            f"Progress feed should contain escalation entries. Got: {summaries}"
        )

        # ── Cycle complete ──
        # Proved: task assignment → follow-up creation → timer expiry (simulated) →
        # auto-escalation → resolution → evidence upload → manual escalation →
        # progress feed audit trail


def test_follow_up_acknowledge_and_complete():
    """Test follow-up lifecycle: pending → acknowledged → completed."""
    from app.main import create_app

    with TestClient(create_app()) as client:
        bootstrap = client.get("/api/v1/bootstrap")
        bp = bootstrap.json()
        user_id = bp["current_user"]["id"]
        venue_id = bp["venues"][0]["id"]
        client.headers.update({"X-OIS-User-Id": user_id})
        selected_signal_ids = _select_signal_ids(client, venue_id, limit=1)

        # Setup: get a task
        assessment = client.post(
            "/api/v1/assessments",
            json={
                "venue_id": venue_id,
                "notes": "Service delay observed.",
                "selected_signal_ids": selected_signal_ids,
                "signal_states": {},
                "management_hours_available": 8,
                "weekly_effort_budget": 8,
            },
        )
        run = client.post(f"/api/v1/assessments/{assessment.json()['id']}/runs", json={})
        plan_id = run.json()["plan_id"]
        activate_plan = client.patch(f"/api/v1/plans/{plan_id}", json={"status": "active"})
        assert activate_plan.status_code == 200
        task_id = client.get(f"/api/v1/plans/latest?venue_id={venue_id}").json()["tasks"][0]["id"]

        # Create follow-up with future due
        future = (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
        fu = client.post(
            "/api/v1/execution/followups",
            json={
                "venue_id": venue_id,
                "task_id": task_id,
                "title": "Check if delay resolved",
                "due_at": future,
            },
        )
        assert fu.status_code == 201
        fu_id = fu.json()["id"]

        # Acknowledge
        ack = client.patch(
            f"/api/v1/execution/followups/{fu_id}",
            json={"status": "acknowledged"},
        )
        assert ack.status_code == 200
        assert ack.json()["status"] == "acknowledged"
        assert ack.json()["acknowledged_at"] is not None

        # Complete
        complete = client.patch(
            f"/api/v1/execution/followups/{fu_id}",
            json={"status": "completed", "notes": "Delay resolved after staffing adjustment."},
        )
        assert complete.status_code == 200
        assert complete.json()["status"] == "completed"
        assert complete.json()["completed_at"] is not None
        assert complete.json()["notes"] == "Delay resolved after staffing adjustment."
