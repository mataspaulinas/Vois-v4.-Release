from fastapi.testclient import TestClient


def test_health_and_bootstrap_routes():
    from app.main import create_app

    with TestClient(create_app()) as client:
        health = client.get("/api/v1/health")
        assert health.status_code == 200
        assert health.json() == {"status": "ok"}

        bootstrap = client.get("/api/v1/bootstrap")
        assert bootstrap.status_code == 200
        payload = bootstrap.json()
        client.headers.update({"X-OIS-User-Id": payload["current_user"]["id"]})
        assert payload["organization"]["slug"] == "ois-demo"
        assert len(payload["venues"]) >= 1
        assert len(payload["ontology_mounts"]) >= 1
        assert len(payload["venue_ontology_bindings"]) >= 1

        venue = payload["venues"][0]
        binding = client.get(f"/api/v1/venues/{venue['id']}/ontology-binding")
        assert binding.status_code == 200
        binding_payload = binding.json()
        ontology_id = binding_payload["ontology_id"]
        ontology_version = binding_payload["ontology_version"]

        portfolio = client.get("/api/v1/portfolio/summary")
        assert portfolio.status_code == 200
        portfolio_payload = portfolio.json()
        assert portfolio_payload["organization_id"] == payload["organization"]["id"]
        assert portfolio_payload["totals"]["venues"] >= 1
        assert len(portfolio_payload["venue_pulses"]) >= 1
        assert isinstance(portfolio_payload["portfolio_notes"], list)

        alignment = client.get(f"/api/v1/ontology/alignment?ontology_id={ontology_id}&version={ontology_version}")
        assert alignment.status_code == 200
        alignment_payload = alignment.json()
        assert alignment_payload["adapter_id"]
        assert alignment_payload["core_version"]

        governance = client.get(f"/api/v1/ontology/governance?ontology_id={ontology_id}&version={ontology_version}")
        assert governance.status_code == 200
        governance_payload = governance.json()
        assert governance_payload["adapter_id"]
        assert governance_payload["errors"] == []
        assert "block_contract_gaps" in governance_payload
        assert "tool_contract_gaps" in governance_payload

        bundle = client.get(f"/api/v1/ontology/bundle?ontology_id={ontology_id}&version={ontology_version}")
        assert bundle.status_code == 200
        bundle_payload = bundle.json()
        assert bundle_payload["meta"]["ontology_id"] == ontology_id
        assert bundle_payload["meta"]["version"] == ontology_version
        assert len(bundle_payload["signals"]) >= 1
        assert len(bundle_payload["blocks"]) >= 1

        brief = client.get(f"/api/v1/ontology/authoring-brief?ontology_id={ontology_id}&version={ontology_version}")
        assert brief.status_code == 200
        brief_payload = brief.json()
        assert brief_payload["adapter_id"]
        assert len(brief_payload["service_module_coverage"]) >= 1
        assert len(brief_payload["failure_family_coverage"]) >= 1
        assert len(brief_payload["response_logic_coverage"]) >= 1

        core_canon = client.get("/api/v1/ontology/core-canon?version=v3")
        assert core_canon.status_code == 200
        core_payload = core_canon.json()
        assert core_payload["meta"]["version"] == "v3"
        assert len(core_payload["signal_archetypes"]) >= 1
        assert len(core_payload["signal_failure_hypotheses"]) >= 1
        assert len(core_payload["failure_response_hypotheses"]) >= 1

        intake = client.post(
            "/api/v1/intake/preview",
            json={
                "venue_id": venue["id"],
                "raw_text": "Guests complained about a long wait and there was no pre-shift briefing.",
            },
        )
        assert intake.status_code == 200
        intake_payload = intake.json()
        assert intake_payload["ontology_id"] == ontology_id
        assert intake_payload["ontology_version"] == ontology_version
        assert isinstance(intake_payload["detected_signals"], list)

        ai_intake = client.post(
            "/api/v1/ai-intake",
            json={
                "venue_id": venue["id"],
                "raw_text": (
                    "Guests complained about a 45 minute wait. "
                    "The team of 8 looked confused and there was no pre-shift briefing."
                )
            },
        )
        assert ai_intake.status_code in {200, 503}
        if ai_intake.status_code == 200:
            ai_intake_payload = ai_intake.json()
            assert ai_intake_payload["ontology_id"] == ontology_id
            assert ai_intake_payload["ontology_version"] == ontology_version
            assert isinstance(ai_intake_payload["detected_signals"], list)

        proactive = client.post("/api/v1/copilot/proactive", json={})
        assert proactive.status_code == 410

        selected_signal_ids = [signal["id"] for signal in bundle_payload["signals"][:2]]
        assert len(selected_signal_ids) == 2

        assessment = client.post(
            "/api/v1/assessments",
            json={
                "venue_id": venue["id"],
                "notes": "Guests complained about delays and the shift opened unprepared.",
                "selected_signal_ids": selected_signal_ids,
                "signal_states": {},
                "management_hours_available": 8,
                "weekly_effort_budget": 8,
            },
        )
        assert assessment.status_code == 201
        assessment_payload = assessment.json()

        signal_patch = client.patch(
            f"/api/v1/assessments/{assessment_payload['id']}/signals",
            json={
                "add": [{"signal_id": bundle_payload["signals"][2]["id"], "notes": "Mentioned directly", "confidence": "high"}],
                "remove": [selected_signal_ids[1]],
                "source": "test_suite",
            },
        )
        assert signal_patch.status_code == 200
        signal_patch_payload = signal_patch.json()
        added_signal_id = bundle_payload["signals"][2]["id"]
        assert added_signal_id in signal_patch_payload["selected_signal_ids"]
        assert selected_signal_ids[1] not in signal_patch_payload["selected_signal_ids"]
        assert signal_patch_payload["signal_states"][added_signal_id]["active"] is True
        assert signal_patch_payload["signal_states"].get(selected_signal_ids[1], {}).get("active") in (None, False)

        run = client.post(f"/api/v1/assessments/{assessment_payload['id']}/runs", json={})
        assert run.status_code == 200
        run_payload = run.json()
        assert run_payload["engine_run_id"]
        assert isinstance(run_payload["failure_modes"], list)
        assert isinstance(run_payload["plan_tasks"], list)
        assert "constraint_report" in run_payload
