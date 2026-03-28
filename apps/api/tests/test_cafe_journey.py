"""
Phase 2 exit criterion: Full cafe intake → signals → assessment → report → plan → tasks journey.

This test walks the complete cafe vertical cycle through the HTTP API to prove
that every layer (ontology, engine, plan, task editing) works end-to-end.
"""

from fastapi.testclient import TestClient


def test_full_cafe_journey_intake_to_task_completion():
    """
    Complete cafe vertical journey:
      1. Bootstrap + create cafe venue
      2. Load cafe ontology bundle (180 signals, 108 FMs, 55 RPs, 192 blocks)
      3. Save assessment with cafe signals
      4. Run engine → get report with failure modes, response patterns, plan tasks
      5. Retrieve persisted plan and execution summary
      6. Walk task status transitions (not_started → in_progress → completed)
      7. Edit task: add notes, toggle sub-action + deliverable checkboxes
      8. Log progress entry and verify feed
      9. Verify engine run history is retrievable
    """
    from app.main import create_app

    with TestClient(create_app()) as client:
        # ── Step 1: Bootstrap + create cafe venue ──
        bootstrap = client.get("/api/v1/bootstrap")
        assert bootstrap.status_code == 200
        bp = bootstrap.json()
        user_id = bp["current_user"]["id"]
        org_id = bp["organization"]["id"]
        client.headers.update({"X-OIS-User-Id": user_id})

        venue_resp = client.post(
            "/api/v1/venues",
            json={
                "organization_id": org_id,
                "name": "Journey Test Cafe",
                "slug": "journey-test-cafe",
                "vertical": "cafe",
                "ontology_binding": {
                    "ontology_id": "cafe",
                    "ontology_version": "v1",
                },
                "concept": "Third wave specialty cafe with pour-over bar",
                "location": "Integration City",
                "size_note": "20 covers, 4 staff",
            },
        )
        assert venue_resp.status_code == 201, venue_resp.text
        venue = venue_resp.json()
        venue_id = venue["id"]
        assert venue["vertical"] == "cafe"

        # ── Step 2: Load cafe ontology bundle ──
        binding_resp = client.get(f"/api/v1/venues/{venue_id}/ontology-binding")
        assert binding_resp.status_code == 200, binding_resp.text
        binding = binding_resp.json()

        bundle_resp = client.get(
            f"/api/v1/ontology/bundle?ontology_id={binding['ontology_id']}&version={binding['ontology_version']}"
        )
        assert bundle_resp.status_code == 200
        bundle = bundle_resp.json()
        assert bundle["meta"]["ontology_id"] == "cafe"
        assert len(bundle["signals"]) == 180
        assert len(bundle["failure_modes"]) == 108
        assert len(bundle["response_patterns"]) == 55
        assert len(bundle["blocks"]) == 192
        assert len(bundle["pattern_block_map"]) == 430

        # Pick 5 cafe signals from different domains for a realistic assessment
        signals_by_domain: dict[str, list] = {}
        for sig in bundle["signals"]:
            domain = sig.get("domain", "unknown")
            if domain not in signals_by_domain:
                signals_by_domain[domain] = []
            signals_by_domain[domain].append(sig)

        # Take 1 signal from each of up to 5 domains
        selected_signals = []
        for domain_signals in list(signals_by_domain.values())[:5]:
            selected_signals.append(domain_signals[0])
        selected_ids = [s["id"] for s in selected_signals]
        assert len(selected_ids) >= 3, f"Need at least 3 cafe signals, got {len(selected_ids)}"

        # ── Step 3: Save assessment ──
        signal_states = {}
        for sig in selected_signals:
            signal_states[sig["id"]] = {
                "active": True,
                "confidence": "high",
                "notes": f"Observed: {sig['name'][:40]}",
            }

        assessment_resp = client.post(
            "/api/v1/assessments",
            json={
                "venue_id": venue_id,
                "notes": (
                    "Pour-over consistency varies shift to shift. "
                    "Grind calibration is not logged. "
                    "Peak hour queue exceeds 8 minutes. "
                    "Pastry display not refreshed before afternoon. "
                    "New barista training is ad-hoc."
                ),
                "selected_signal_ids": selected_ids,
                "signal_states": signal_states,
                "management_hours_available": 12,
                "weekly_effort_budget": 20,
            },
        )
        assert assessment_resp.status_code == 201, assessment_resp.text
        assessment = assessment_resp.json()
        assessment_id = assessment["id"]
        assert assessment["venue_id"] == venue_id
        assert len(assessment["selected_signal_ids"]) == len(selected_ids)

        # ── Step 4: Run engine ──
        run_resp = client.post(f"/api/v1/assessments/{assessment_id}/runs", json={})
        assert run_resp.status_code == 200, run_resp.text
        run = run_resp.json()
        assert run["assessment_id"] == assessment_id
        assert run["venue_id"] == venue_id
        engine_run_id = run["engine_run_id"]
        plan_id = run["plan_id"]
        activate_plan = client.patch(f"/api/v1/plans/{plan_id}", json={"status": "active"})
        assert activate_plan.status_code == 200

        # Engine must produce meaningful output from cafe ontology
        assert len(run["failure_modes"]) > 0, "Engine should score failure modes from cafe signals"
        assert len(run["response_patterns"]) > 0, "Engine should score response patterns from failure modes"
        assert len(run["plan_tasks"]) > 0, "Engine should generate plan tasks from cafe blocks"
        assert run["report"]["summary"], "Engine should produce a report summary"
        assert run["report"]["diagnostic_spine"], "Engine should produce diagnostic spine"

        # ── Step 5: Retrieve persisted plan + execution summary ──
        plan_resp = client.get(f"/api/v1/plans/latest?venue_id={venue_id}")
        assert plan_resp.status_code == 200
        plan = plan_resp.json()
        assert plan["id"] == plan_id
        assert len(plan["tasks"]) > 0
        tasks = plan["tasks"]
        first_task = tasks[0]

        # Verify structured sub_actions and deliverables
        assert isinstance(first_task["sub_actions"], list)
        assert isinstance(first_task["deliverables"], list)
        if first_task["sub_actions"]:
            assert "text" in first_task["sub_actions"][0], "sub_actions should be objects with 'text'"
            assert "completed" in first_task["sub_actions"][0], "sub_actions should track completion"
        if first_task["deliverables"]:
            assert "name" in first_task["deliverables"][0], "deliverables should be objects with 'name'"
            assert "completed" in first_task["deliverables"][0], "deliverables should track completion"
        assert first_task["notes"] is None, "New task should have null notes"

        exec_resp = client.get(f"/api/v1/plans/latest/execution-summary?venue_id={venue_id}")
        assert exec_resp.status_code == 200
        exec_summary = exec_resp.json()
        assert exec_summary["plan_id"] == plan_id
        assert exec_summary["completion_percentage"] == 0.0

        # ── Step 6: Walk task status transitions ──
        first_task_id = first_task["id"]

        # NOT_STARTED → IN_PROGRESS
        update_resp = client.patch(
            f"/api/v1/plans/tasks/{first_task_id}",
            json={"status": "in_progress"},
        )
        assert update_resp.status_code == 200
        assert update_resp.json()["status"] == "in_progress"

        # IN_PROGRESS → ON_HOLD (new status)
        update_resp = client.patch(
            f"/api/v1/plans/tasks/{first_task_id}",
            json={"status": "on_hold"},
        )
        assert update_resp.status_code == 200
        assert update_resp.json()["status"] == "on_hold"

        # ON_HOLD → IN_PROGRESS
        update_resp = client.patch(
            f"/api/v1/plans/tasks/{first_task_id}",
            json={"status": "in_progress"},
        )
        assert update_resp.status_code == 200

        # IN_PROGRESS → COMPLETED
        update_resp = client.patch(
            f"/api/v1/plans/tasks/{first_task_id}",
            json={"status": "completed"},
        )
        assert update_resp.status_code == 200
        assert update_resp.json()["status"] == "completed"

        # ── Step 7: Edit task notes + checkbox completion ──
        # Add notes
        notes_resp = client.patch(
            f"/api/v1/plans/tasks/{first_task_id}",
            json={"notes": "Completed during morning shift. Barista confirmed understanding."},
        )
        assert notes_resp.status_code == 200
        assert notes_resp.json()["notes"] == "Completed during morning shift. Barista confirmed understanding."

        # Toggle sub-action checkboxes (if any)
        if first_task["sub_actions"]:
            completions = [True] + [False] * (len(first_task["sub_actions"]) - 1)
            checkbox_resp = client.patch(
                f"/api/v1/plans/tasks/{first_task_id}",
                json={"sub_action_completions": completions},
            )
            assert checkbox_resp.status_code == 200
            assert checkbox_resp.json()["sub_actions"][0]["completed"] is True
            if len(first_task["sub_actions"]) > 1:
                assert checkbox_resp.json()["sub_actions"][1]["completed"] is False

        # Toggle deliverable checkboxes (if any)
        if first_task["deliverables"]:
            completions = [True] * len(first_task["deliverables"])
            checkbox_resp = client.patch(
                f"/api/v1/plans/tasks/{first_task_id}",
                json={"deliverable_completions": completions},
            )
            assert checkbox_resp.status_code == 200
            assert checkbox_resp.json()["deliverables"][0]["completed"] is True

        # Verify blocked task cannot be advanced (find one with dependencies)
        blocked_task = next((t for t in tasks if t["dependencies"]), None)
        if blocked_task:
            block_resp = client.patch(
                f"/api/v1/plans/tasks/{blocked_task['id']}",
                json={"status": "completed"},
            )
            assert block_resp.status_code == 400, "Task with unmet dependencies should not advance to completed"

        # ── Step 8: Log progress entry ──
        progress_resp = client.post(
            "/api/v1/progress",
            json={
                "venue_id": venue_id,
                "summary": "First cafe intervention block completed by shift lead.",
                "detail": "Grind calibration checklist now posted at pour-over station.",
                "status": "monitoring",
            },
        )
        assert progress_resp.status_code == 201

        feed_resp = client.get(f"/api/v1/progress?venue_id={venue_id}")
        assert feed_resp.status_code == 200
        feed = feed_resp.json()
        summaries = [e["summary"] for e in feed]
        assert "First cafe intervention block completed by shift lead." in summaries
        # Auto-generated progress from status updates should also be in the feed
        assert any("moved to completed" in s for s in summaries)

        # ── Step 9: Engine run history ──
        history_resp = client.get(f"/api/v1/engine/runs?venue_id={venue_id}")
        assert history_resp.status_code == 200
        history = history_resp.json()
        assert len(history) >= 1
        assert any(r["engine_run_id"] == engine_run_id for r in history)

        # ── Step 10: Assessment history ──
        assessment_list = client.get(f"/api/v1/assessments?venue_id={venue_id}")
        assert assessment_list.status_code == 200
        assessments = assessment_list.json()
        assert len(assessments) >= 1
        assert any(a["id"] == assessment_id for a in assessments)

        # ── Journey complete ──
        # At this point we have walked:
        #   cafe venue → ontology (180 sig, 108 FM, 55 RP, 192 blocks) →
        #   assessment (5 signals from different domains) → engine run →
        #   report (summary + spine) → plan (tasks with sub-actions + deliverables) →
        #   task status transitions (6 states) → task notes → checkbox completion →
        #   progress feed → history
        #
        # This proves the full cafe vertical journey works end-to-end.
