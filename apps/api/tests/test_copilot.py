from fastapi.testclient import TestClient


def _set_actor(client: TestClient, email: str) -> str:
    from sqlalchemy import select

    from app.db.session import get_session_factory
    from app.models.domain import User

    with get_session_factory()() as session:
        user = session.scalar(select(User).where(User.email == email.lower()))
        assert user is not None, f"Missing seeded user for {email}"
        client.headers.update({"X-OIS-User-Id": user.id})
        return user.id


def test_copilot_thread_flow():
    from app.main import create_app

    with TestClient(create_app()) as client:
        bootstrap = client.get("/api/v1/bootstrap")
        assert bootstrap.status_code == 200
        bootstrap_payload = bootstrap.json()
        client.headers.update({"X-OIS-User-Id": bootstrap_payload["current_user"]["id"]})
        venue_id = bootstrap_payload["venues"][0]["id"]
        current_user_id = _set_actor(client, "developer@ois-demo.local")

        threads_response = client.get(f"/api/v1/copilot/threads?venue_id={venue_id}")
        assert threads_response.status_code == 200
        threads_payload = threads_response.json()
        assert any(thread["scope"] == "venue" for thread in threads_payload)
        assert any(thread["message_count"] >= 1 for thread in threads_payload)

        venue_thread = next(thread for thread in threads_payload if thread["scope"] == "venue")
        detail_response = client.get(f"/api/v1/copilot/threads/{venue_thread['id']}")
        assert detail_response.status_code == 200
        detail_payload = detail_response.json()
        assert detail_payload["messages"] != []
        assert detail_payload["messages"][0]["author_role"] == "assistant"

        send_response = client.post(
            f"/api/v1/copilot/threads/{venue_thread['id']}/messages",
            json={
                "content": "What should we focus on next?",
                "created_by": current_user_id,
                "attachments": [
                    {
                        "file_name": "floor-photo.jpg",
                        "content_type": "image/jpeg",
                        "url": "/uploads/floor-photo.jpg",
                    }
                    ],
                },
            )
        assert send_response.status_code == 201
        assistant_message = send_response.json()["messages"][-1]
        assert assistant_message["author_role"] == "assistant"
        assert assistant_message["content"]


def test_venue_copilot_uses_text_attachment_excerpt_as_grounding():
    from app.main import create_app

    with TestClient(create_app()) as client:
        bootstrap = client.get("/api/v1/bootstrap")
        assert bootstrap.status_code == 200
        bootstrap_payload = bootstrap.json()
        client.headers.update({"X-OIS-User-Id": bootstrap_payload["current_user"]["id"]})
        venue_id = bootstrap_payload["venues"][0]["id"]

        assessment = client.post(
            "/api/v1/assessments",
            json={
                "venue_id": venue_id,
                "notes": "Service lagged, the opening reset was missed, and the floor felt uncoordinated.",
                "selected_signal_ids": [
                    "sig_service_delay",
                    "sig_shift_brief_missing",
                    "sig_handoff_requires_reclarification",
                ],
                "signal_states": {},
                "management_hours_available": 8,
                "weekly_effort_budget": 8,
            },
        )
        assert assessment.status_code == 201

        run = client.post(f"/api/v1/assessments/{assessment.json()['id']}/runs", json={})
        assert run.status_code == 200

        current_user_id = _set_actor(client, "developer@ois-demo.local")

        threads_response = client.get(f"/api/v1/copilot/threads?venue_id={venue_id}")
        assert threads_response.status_code == 200
        venue_thread = next(thread for thread in threads_response.json() if thread["scope"] == "venue")

        send_response = client.post(
            f"/api/v1/copilot/threads/{venue_thread['id']}/messages",
            json={
                "content": "Can you read this note and tell me what should happen next?",
                "created_by": current_user_id,
                "attachments": [
                    {
                        "file_name": "ops-note.txt",
                        "content_type": "text/plain",
                        "content_base64": "VGVhbSBza2lwcGVkIHRoZSBwcmUtc2hpZnQgcmVzZXQuIFRoZSBleHBvIGtlcHQgZ2V0dGluZyByZS1jbGFyaWZpZWQu",
                    }
                ],
            },
        )
        assert send_response.status_code == 201
        payload = send_response.json()
        user_message = payload["messages"][-2]
        assistant_message = payload["messages"][-1]

        user_attachment_reference = next(reference for reference in user_message["references"] if reference["type"] == "file_asset")
        assert user_attachment_reference["payload"]["briefing_mode"] == "text_excerpt"
        assert "Team skipped the pre-shift reset" in user_attachment_reference["payload"]["excerpt_preview"]

        assistant_attachment_reference = next(
            reference for reference in assistant_message["references"] if reference["type"] == "attachment"
        )
        assert assistant_attachment_reference["payload"]["briefing_mode"] == "text_excerpt"
        assert "Team skipped the pre-shift reset" in assistant_attachment_reference["payload"]["excerpt_preview"]
        assert "Attachment evidence:" in assistant_message["content"]
        assert "Team skipped the pre-shift reset" in assistant_message["content"]


def test_venue_copilot_recalls_relevant_file_memory_across_messages():
    from app.main import create_app

    with TestClient(create_app()) as client:
        bootstrap = client.get("/api/v1/bootstrap")
        assert bootstrap.status_code == 200
        bootstrap_payload = bootstrap.json()
        client.headers.update({"X-OIS-User-Id": bootstrap_payload["current_user"]["id"]})
        venue_id = bootstrap_payload["venues"][0]["id"]
        current_user_id = _set_actor(client, "developer@ois-demo.local")

        threads_response = client.get(f"/api/v1/copilot/threads?venue_id={venue_id}")
        assert threads_response.status_code == 200
        venue_thread = next(thread for thread in threads_response.json() if thread["scope"] == "venue")

        upload_response = client.post(
            f"/api/v1/copilot/threads/{venue_thread['id']}/messages",
            json={
                "content": "Store this SOP so we can reuse it later.",
                "created_by": current_user_id,
                "attachments": [
                    {
                        "file_name": "opening-reset-sop.txt",
                        "content_type": "text/plain",
                        "content_base64": (
                            "T3BlbmluZyByZXNldCBTT1A6IFByZS1zaGlmdCByZXNldCBiZWdpbnMgYXQgMDk6NDAuIFN0YXRpb24gY2FyZHMgbXVzdCBi"
                            "ZSBjaGVja2VkIGJlZm9yZSB0aGUgZmlyc3QgY3VzdG9tZXIuIFNpbmthbmQgcHJvZHVjdCB0ZW1wZXJhdHVyZXMgbXVzdCBi"
                            "ZSBsb2dnZWQgYmVmb3JlIG9wZW4u"
                        ),
                    }
                ],
            },
        )
        assert upload_response.status_code == 201
        upload_payload = upload_response.json()
        uploaded_user_message = upload_payload["messages"][-2]
        uploaded_file_reference = next(
            reference for reference in uploaded_user_message["references"] if reference["type"] == "file_asset"
        )

        analysis_response = client.get(f"/api/v1/files/{uploaded_file_reference['id']}/analysis")
        assert analysis_response.status_code == 200
        assert analysis_response.json()["status"] == "ready"

        recall_response = client.post(
            f"/api/v1/copilot/threads/{venue_thread['id']}/messages",
            json={
                "content": "What does the opening reset SOP say about pre-shift reset timing and station cards?",
                "created_by": current_user_id,
            },
        )
        assert recall_response.status_code == 201
        assistant_message = recall_response.json()["messages"][-1]

        memory_reference = next(reference for reference in assistant_message["references"] if reference["type"] == "file_memory")
        assert memory_reference["label"] == "opening-reset-sop.txt"
        assert memory_reference["payload"]["analysis_kind"] == "text"
        assert "Pre-shift reset begins at 09:40" in memory_reference["payload"]["memory_excerpt"]
        assert "Recalled file memory:" in assistant_message["content"]
        assert "opening-reset-sop.txt" in assistant_message["content"]
        assert "Pre-shift reset begins at 09:40" in assistant_message["content"]


def test_venue_copilot_marks_local_image_attachment_as_vision_ready():
    from app.main import create_app

    with TestClient(create_app()) as client:
        bootstrap = client.get("/api/v1/bootstrap")
        assert bootstrap.status_code == 200
        bootstrap_payload = bootstrap.json()
        client.headers.update({"X-OIS-User-Id": bootstrap_payload["current_user"]["id"]})
        venue_id = bootstrap_payload["venues"][0]["id"]
        current_user_id = _set_actor(client, "developer@ois-demo.local")

        threads_response = client.get(f"/api/v1/copilot/threads?venue_id={venue_id}")
        assert threads_response.status_code == 200
        venue_thread = next(thread for thread in threads_response.json() if thread["scope"] == "venue")

        send_response = client.post(
            f"/api/v1/copilot/threads/{venue_thread['id']}/messages",
            json={
                "content": "Look at this station photo and tell me what matters most.",
                "created_by": current_user_id,
                "attachments": [
                    {
                        "file_name": "station-photo.png",
                        "content_type": "image/png",
                        "content_base64": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/a1sAAAAASUVORK5CYII=",
                    }
                ],
            },
        )
        assert send_response.status_code == 201
        payload = send_response.json()
        user_message = payload["messages"][-2]
        assistant_message = payload["messages"][-1]

        user_attachment_reference = next(reference for reference in user_message["references"] if reference["type"] == "file_asset")
        assert user_attachment_reference["payload"]["briefing_mode"] == "image_input"
        assert user_attachment_reference["payload"]["vision_ready"] is True

        assistant_attachment_reference = next(
            reference for reference in assistant_message["references"] if reference["type"] == "attachment"
        )
        assert assistant_attachment_reference["payload"]["briefing_mode"] == "image_input"
        assert assistant_attachment_reference["payload"]["vision_ready"] is True
        assert "visual review" in assistant_message["content"].lower()


def test_venue_copilot_uses_leverage_and_execution_context():
    from app.main import create_app

    with TestClient(create_app()) as client:
        bootstrap = client.get("/api/v1/bootstrap")
        assert bootstrap.status_code == 200
        bootstrap_payload = bootstrap.json()
        client.headers.update({"X-OIS-User-Id": bootstrap_payload["current_user"]["id"]})
        venue_id = bootstrap_payload["venues"][0]["id"]
        binding_response = client.get(f"/api/v1/venues/{venue_id}/ontology-binding")
        assert binding_response.status_code == 200
        binding = binding_response.json()
        bundle_response = client.get(
            f"/api/v1/ontology/bundle?ontology_id={binding['ontology_id']}&version={binding['ontology_version']}"
        )
        assert bundle_response.status_code == 200
        bundle = bundle_response.json()
        preferred_signal_ids = [
            signal_id
            for signal_id in ["sig_guest_complaints", "sig_service_delay", "sig_shift_brief_missing"]
            if any(signal["id"] == signal_id for signal in bundle["signals"])
        ]
        selected_signal_ids = list(dict.fromkeys(preferred_signal_ids))
        for signal in bundle["signals"]:
            if signal["id"] not in selected_signal_ids:
                selected_signal_ids.append(signal["id"])
            if len(selected_signal_ids) == 3:
                break
        assert len(selected_signal_ids) == 3

        assessment = client.post(
            "/api/v1/assessments",
            json={
                "venue_id": venue_id,
                "notes": "Guests complained about delays, the shift opened cold, and the team looked confused.",
                "selected_signal_ids": selected_signal_ids,
                "signal_states": {},
                "management_hours_available": 8,
                "weekly_effort_budget": 8,
            },
        )
        assert assessment.status_code == 201
        assessment_payload = assessment.json()

        run = client.post(f"/api/v1/assessments/{assessment_payload['id']}/runs", json={})
        assert run.status_code == 200
        plan_id = run.json()["plan_id"]
        activate_plan = client.patch(f"/api/v1/plans/{plan_id}", json={"status": "active"})
        assert activate_plan.status_code == 200

        progress = client.post(
            "/api/v1/progress",
            json={
                "venue_id": venue_id,
                "summary": "Manager started the pre-shift reset and cleared the first task.",
                "detail": "Kickoff happened on time and team roles were clarified.",
                "status": "active",
            },
        )
        assert progress.status_code == 201

        _set_actor(client, "developer@ois-demo.local")
        threads_response = client.get(f"/api/v1/copilot/threads?venue_id={venue_id}")
        assert threads_response.status_code == 200
        venue_thread = next(thread for thread in threads_response.json() if thread["scope"] == "venue")

        send_response = client.post(
            f"/api/v1/copilot/threads/{venue_thread['id']}/messages",
            json={"content": "What should we focus on next in sequence?"},
        )
        assert send_response.status_code == 201
        assistant_message = send_response.json()["messages"][-1]
        assert "Best next move:" in assistant_message["content"]
        assert "Leverage point:" in assistant_message["content"]
        assert "Latest logged movement:" in assistant_message["content"]
        assert any(reference["type"] == "engine_run" for reference in assistant_message["references"])
        assert any(reference["type"] == "block" for reference in assistant_message["references"])


def test_portfolio_copilot_names_repeating_system_patterns():
    from app.main import create_app

    with TestClient(create_app()) as client:
        bootstrap = client.get("/api/v1/bootstrap")
        assert bootstrap.status_code == 200
        bootstrap_payload = bootstrap.json()
        client.headers.update({"X-OIS-User-Id": bootstrap_payload["current_user"]["id"]})
        organization_id = bootstrap_payload["organization"]["id"]
        primary_venue_id = bootstrap_payload["venues"][0]["id"]

        created_venue = client.post(
            "/api/v1/venues",
            json={
                "organization_id": organization_id,
                "name": "North Branch",
                "slug": "north-branch",
                "ontology_binding": {
                    "ontology_id": "restaurant-legacy",
                    "ontology_version": "v8",
                },
                "status": "active",
                "concept": "Neighborhood grill",
                "location": "North side",
                "size_note": "80 seats",
                "capacity_profile": {"peak_window": "18:00-21:00"},
            },
        )
        assert created_venue.status_code == 201
        secondary_venue_id = created_venue.json()["id"]

        shared_signal_ids = [
            "sig_guest_complaints",
            "sig_service_delay",
            "sig_shift_brief_missing",
        ]

        for venue_id, notes in [
            (primary_venue_id, "Guests complained about waits and the shift opened without a briefing."),
            (secondary_venue_id, "Wait times climbed, guests complained, and there was no pre-shift briefing."),
        ]:
            assessment = client.post(
                "/api/v1/assessments",
                json={
                    "venue_id": venue_id,
                    "notes": notes,
                    "selected_signal_ids": shared_signal_ids,
                    "signal_states": {},
                    "management_hours_available": 8,
                    "weekly_effort_budget": 8,
                },
            )
            assert assessment.status_code == 201

            run = client.post(f"/api/v1/assessments/{assessment.json()['id']}/runs", json={})
            assert run.status_code == 200

        _set_actor(client, "developer@ois-demo.local")
        threads_response = client.get("/api/v1/copilot/threads")
        assert threads_response.status_code == 200
        global_thread = next(thread for thread in threads_response.json() if thread["scope"] == "global")

        send_response = client.post(
            f"/api/v1/copilot/threads/{global_thread['id']}/messages",
            json={"content": "What patterns are repeating across the portfolio right now?"},
        )
        assert send_response.status_code == 201
        assistant_message = send_response.json()["messages"][-1]
        assert "System pattern:" in assistant_message["content"]
        assert "Best next move:" in assistant_message["content"]
        assert any(reference["type"] == "signal" for reference in assistant_message["references"])
