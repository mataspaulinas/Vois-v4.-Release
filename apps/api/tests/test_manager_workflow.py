"""
Phase 4 integration test: full manager task workflow.

Proves: view -> work -> evidence -> escalate (exit criterion).
"""

from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient


def _select_signal_ids(client: TestClient, venue_id: str, *, limit: int = 2) -> list[str]:
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
        for signal_id in ["sig_service_delay", "sig_shift_brief_missing", "sig_guest_complaints"]
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


def test_full_manager_task_workflow():
    """
    Walk the complete manager task workflow:
      1. Create venue + assessment + engine run to get plan tasks
      2. View next-actions (manager's daily board)
      3. Move task to in_progress (manager starts working)
      4. Attach evidence to task (proof of work)
      5. Create follow-up timer
      6. Verify follow-ups list
      7. Escalate task to owner
      8. Resolve escalation
      9. Complete task
      10. Verify final state through next-actions
    """
    from app.main import create_app

    with TestClient(create_app()) as client:
        # ── Bootstrap ──
        bootstrap = client.get("/api/v1/bootstrap")
        bp = bootstrap.json()
        user_id = bp["current_user"]["id"]
        venue_id = bp["venues"][0]["id"]
        client.headers.update({"X-OIS-User-Id": user_id})
        selected_signal_ids = _select_signal_ids(client, venue_id)

        # ── Create assessment and run engine ──
        assessment = client.post(
            "/api/v1/assessments",
            json={
                "venue_id": venue_id,
                "notes": "Floor was chaotic during dinner rush. No pre-shift briefing.",
                "selected_signal_ids": selected_signal_ids,
                "signal_states": {},
                "management_hours_available": 10,
                "weekly_effort_budget": 12,
            },
        )
        assert assessment.status_code == 201
        assessment_id = assessment.json()["id"]

        run = client.post(f"/api/v1/assessments/{assessment_id}/runs", json={})
        assert run.status_code == 200
        plan_id = run.json()["plan_id"]
        activate_plan = client.patch(f"/api/v1/plans/{plan_id}", json={"status": "active"})
        assert activate_plan.status_code == 200

        # ── Step 1: View next-actions (manager daily board) ──
        next_actions = client.get(f"/api/v1/execution/next-action?venue_id={venue_id}")
        assert next_actions.status_code == 200
        # May be empty since no follow-ups or escalations yet

        # Get plan tasks
        plan = client.get(f"/api/v1/plans/latest?venue_id={venue_id}")
        assert plan.status_code == 200
        tasks = plan.json()["tasks"]
        assert len(tasks) > 0
        first_task_id = tasks[0]["id"]
        first_task_title = tasks[0]["title"]

        # ── Step 2: Move task to in_progress (manager starts work) ──
        update = client.patch(
            f"/api/v1/plans/tasks/{first_task_id}",
            json={"status": "in_progress"},
        )
        assert update.status_code == 200
        assert update.json()["status"] == "in_progress"

        # ── Step 3: Attach evidence to task (proof of work) ──
        evidence_resp = client.post(
            "/api/v1/execution/evidence",
            json={
                "venue_id": venue_id,
                "task_id": first_task_id,
                "title": "Pre-shift briefing template implemented",
                "description": "New briefing template posted at host stand and shared with team.",
                "evidence_type": "document",
            },
        )
        assert evidence_resp.status_code == 201
        evidence = evidence_resp.json()
        assert evidence["task_id"] == first_task_id
        assert evidence["evidence_type"] == "document"

        # Verify evidence list
        evidence_list = client.get(f"/api/v1/execution/evidence?venue_id={venue_id}&task_id={first_task_id}")
        assert evidence_list.status_code == 200
        assert len(evidence_list.json()) >= 1

        # ── Step 4: Create follow-up timer ──
        future_due = (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
        fu_resp = client.post(
            "/api/v1/execution/followups",
            json={
                "venue_id": venue_id,
                "task_id": first_task_id,
                "assigned_to": user_id,
                "title": "Check if briefing was conducted at next morning shift",
                "due_at": future_due,
                "notes": "Manager set reminder to verify new briefing template is being used.",
            },
        )
        assert fu_resp.status_code == 201
        fu = fu_resp.json()
        assert fu["status"] == "pending"

        # ── Step 5: List follow-ups ──
        fu_list = client.get(f"/api/v1/execution/followups?venue_id={venue_id}")
        assert fu_list.status_code == 200
        assert any(item["id"] == fu["id"] for item in fu_list.json())

        # ── Step 6: Escalate to owner ──
        esc_resp = client.post(
            "/api/v1/execution/escalate",
            json={
                "venue_id": venue_id,
                "task_id": first_task_id,
                "severity": "medium",
                "reason": "Need owner approval for schedule change to support briefing time.",
            },
        )
        assert esc_resp.status_code == 201
        esc = esc_resp.json()
        assert esc["severity"] == "medium"
        assert esc["status"] == "open"

        # ── Step 7: Resolve escalation ──
        resolve_resp = client.patch(
            f"/api/v1/execution/escalations/{esc['id']}/resolve",
            json={"resolution_notes": "Owner approved 15-min pre-shift block. Schedule updated."},
        )
        assert resolve_resp.status_code == 200
        assert resolve_resp.json()["status"] == "resolved"

        # ── Step 8: Complete follow-up ──
        ack_resp = client.patch(
            f"/api/v1/execution/followups/{fu['id']}",
            json={"status": "completed", "notes": "Briefing conducted successfully on morning shift."},
        )
        assert ack_resp.status_code == 200
        assert ack_resp.json()["status"] == "completed"

        # ── Step 9: Complete task ──
        complete = client.patch(
            f"/api/v1/plans/tasks/{first_task_id}",
            json={"status": "completed"},
        )
        assert complete.status_code == 200
        assert complete.json()["status"] == "completed"

        # ── Step 10: Verify final state ──
        final_actions = client.get(f"/api/v1/execution/next-action?venue_id={venue_id}")
        assert final_actions.status_code == 200
        # The completed task and follow-up should no longer appear as actions
        action_ids = [a["entity_id"] for a in final_actions.json()]
        assert first_task_id not in action_ids, "Completed task should not appear in next actions"
        assert fu["id"] not in action_ids, "Completed follow-up should not appear in next actions"

        # Verify progress feed has entries from the workflow
        feed = client.get(f"/api/v1/progress?venue_id={venue_id}")
        assert feed.status_code == 200
        summaries = [e["summary"] for e in feed.json()]
        assert any("in progress" in s.lower() for s in summaries), "Should have in_progress entry"
        assert any("completed" in s.lower() for s in summaries), "Should have completed entry"
        assert any("escalation" in s.lower() for s in summaries), "Should have escalation entry"
