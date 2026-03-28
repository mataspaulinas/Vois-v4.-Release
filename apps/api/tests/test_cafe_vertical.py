"""
Phase 1 deferred integration test — Cafe venue ontology binding.

Exit criterion: POST /api/v1/venues with an explicit cafe ontology binding
loads the cafe pack correctly and the full intake → engine cycle works.

Deferred from Phase 1, must pass before Phase 2 workflow work begins.
"""

from fastapi.testclient import TestClient


def test_cafe_venue_creation_and_ontology_load():
    """
    Create a cafe venue and verify the cafe ontology bundle loads correctly.
    Covers: venue creation, explicit ontology binding, ontology bundle integrity.
    """
    from app.main import create_app

    with TestClient(create_app()) as client:
        # Bootstrap: get org and user context
        bootstrap = client.get("/api/v1/bootstrap")
        assert bootstrap.status_code == 200
        bootstrap_payload = bootstrap.json()
        user_id = bootstrap_payload["current_user"]["id"]
        organization_id = bootstrap_payload["organization"]["id"]
        client.headers.update({"X-OIS-User-Id": user_id})

        # Create a cafe venue
        create_response = client.post(
            "/api/v1/venues",
            json={
                "organization_id": organization_id,
                "name": "Test Cafe",
                "slug": "test-cafe-integration",
                "ontology_binding": {
                    "ontology_id": "cafe",
                    "ontology_version": "v1",
                },
                "concept": "Specialty coffee and pastries",
                "location": "Test City",
                "size_note": "12 seats",
            },
        )
        assert create_response.status_code == 201, create_response.text
        venue = create_response.json()
        assert "vertical" not in venue
        assert venue["name"] == "Test Cafe"
        venue_id = venue["id"]

        # Verify venue is retrievable
        get_response = client.get(f"/api/v1/venues/{venue_id}")
        assert get_response.status_code == 200
        assert "vertical" not in get_response.json()

        # Load the cafe ontology bundle
        binding_response = client.get(f"/api/v1/venues/{venue_id}/ontology-binding")
        assert binding_response.status_code == 200, binding_response.text
        binding = binding_response.json()

        bundle_response = client.get(
            f"/api/v1/ontology/bundle?ontology_id={binding['ontology_id']}&version={binding['ontology_version']}"
        )
        assert bundle_response.status_code == 200, bundle_response.text
        bundle = bundle_response.json()

        # Verify cafe ontology shape — 180 signals, 108 failure modes, 55 response patterns
        assert bundle["meta"]["ontology_id"] == "cafe", (
            f"Expected ontology_id='cafe' in bundle meta, got: {bundle['meta']}"
        )
        assert len(bundle["signals"]) == 180, (
            f"Expected 180 cafe signals, got {len(bundle['signals'])}"
        )
        assert len(bundle["failure_modes"]) == 108, (
            f"Expected 108 cafe failure modes, got {len(bundle['failure_modes'])}"
        )
        assert len(bundle["response_patterns"]) == 55, (
            f"Expected 55 cafe response patterns, got {len(bundle['response_patterns'])}"
        )

        # Verify ontology audit passes with zero errors for cafe bundle
        governance_response = client.get(
            f"/api/v1/ontology/governance?ontology_id={binding['ontology_id']}&version={binding['ontology_version']}"
        )
        assert governance_response.status_code == 200, governance_response.text
        governance = governance_response.json()
        assert governance["errors"] == [], (
            f"Cafe ontology governance errors: {governance['errors']}"
        )


def test_cafe_venue_assessment_and_engine_cycle():
    """
    Full cafe venue cycle: create venue → save assessment with cafe signals →
    run engine → verify full output including failure modes, response patterns,
    and plan tasks.

    Covers: ontology-bound intake, engine failure mode scoring, response pattern
    scoring, and plan task generation for cafe ontology (192 blocks, 430 RP→block
    mappings).
    """
    from app.main import create_app

    with TestClient(create_app()) as client:
        # Bootstrap
        bootstrap = client.get("/api/v1/bootstrap")
        assert bootstrap.status_code == 200
        bootstrap_payload = bootstrap.json()
        user_id = bootstrap_payload["current_user"]["id"]
        organization_id = bootstrap_payload["organization"]["id"]
        client.headers.update({"X-OIS-User-Id": user_id})

        # Create cafe venue
        venue_response = client.post(
            "/api/v1/venues",
            json={
                "organization_id": organization_id,
                "name": "Cycle Test Cafe",
                "slug": "cycle-test-cafe",
                "ontology_binding": {
                    "ontology_id": "cafe",
                    "ontology_version": "v1",
                },
            },
        )
        assert venue_response.status_code == 201
        venue_id = venue_response.json()["id"]

        # Load the cafe bundle to get valid signal IDs
        binding_response = client.get(f"/api/v1/venues/{venue_id}/ontology-binding")
        assert binding_response.status_code == 200, binding_response.text
        binding = binding_response.json()

        bundle_response = client.get(
            f"/api/v1/ontology/bundle?ontology_id={binding['ontology_id']}&version={binding['ontology_version']}"
        )
        assert bundle_response.status_code == 200
        bundle = bundle_response.json()
        cafe_signal_ids = [s["id"] for s in bundle["signals"][:3]]
        assert len(cafe_signal_ids) == 3, "Need at least 3 cafe signals to run this test"

        # Create assessment with cafe signals
        assessment_response = client.post(
            "/api/v1/assessments",
            json={
                "venue_id": venue_id,
                "notes": "Coffee quality inconsistent. Barista training gaps observed. Queue management unclear during peak hours.",
                "selected_signal_ids": cafe_signal_ids,
                "signal_states": {
                    cafe_signal_ids[0]: {
                        "active": True,
                        "confidence": "high",
                        "notes": "Observed directly during visit.",
                    }
                },
                "management_hours_available": 10,
                "weekly_effort_budget": 10,
            },
        )
        assert assessment_response.status_code == 201, assessment_response.text
        assessment = assessment_response.json()
        assessment_id = assessment["id"]
        assert assessment["venue_id"] == venue_id
        assert len(assessment["selected_signal_ids"]) == 3

        # Run engine on the cafe assessment
        run_response = client.post(
            f"/api/v1/assessments/{assessment_id}/runs", json={}
        )
        assert run_response.status_code == 200, run_response.text
        run = run_response.json()
        assert run["assessment_id"] == assessment_id

        # Failure modes and response patterns are scored via signal_failure_map + failure_pattern_map
        assert isinstance(run["failure_modes"], list)
        assert isinstance(run["response_patterns"], list)
        assert len(run["failure_modes"]) > 0, (
            "Engine should score at least one failure mode from cafe signals via signal_failure_map"
        )
        assert len(run["response_patterns"]) > 0, (
            "Engine should score at least one response pattern from cafe failure modes via failure_pattern_map"
        )

        # Plan tasks are generated from 192 cafe blocks via pattern_block_map
        assert isinstance(run["plan_tasks"], list)
        assert len(run["plan_tasks"]) > 0, (
            "Engine should generate plan tasks for a cafe assessment with active signals "
            "(192 blocks, 430 RP→block mappings available)"
        )
