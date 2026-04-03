import json

from fastapi.testclient import TestClient


# ─── Anthropic fakes ───


class _FakeAnthropicTextBlock:
    def __init__(self, text: str):
        self.text = text
        self.type = "text"


class _FakeAnthropicResponse:
    def __init__(self, text: str, model: str = "claude-sonnet-4-20250514"):
        self.content = [_FakeAnthropicTextBlock(text)]
        self.model = model
        self.stop_reason = "end_turn"


class _FakeAnthropicMessages:
    def __init__(self, responses: list[_FakeAnthropicResponse]):
        self._responses = responses
        self.calls: list[dict[str, object]] = []

    def create(self, **kwargs):
        self.calls.append(kwargs)
        return self._responses.pop(0)


class _FakeAnthropicClient:
    def __init__(self, responses: list[_FakeAnthropicResponse]):
        self.messages = _FakeAnthropicMessages(responses)


# ─── OpenAI fakes (legacy, kept for backward-compat tests) ───


class _FakeResponse:
    def __init__(self, output_text: str, model: str = "gpt-5.4-mini"):
        self.output_text = output_text
        self.model = model


class _FakeResponses:
    def __init__(self, responses: list[_FakeResponse]):
        self._responses = responses
        self.calls: list[dict[str, object]] = []

    def create(self, **kwargs):
        self.calls.append(kwargs)
        return self._responses.pop(0)


class _FakeClient:
    def __init__(self, responses: list[_FakeResponse]):
        self.responses = _FakeResponses(responses)


# ─── Anthropic provider tests ───


def test_live_anthropic_policy_activates_runtime_service(monkeypatch):
    from app.core.config import get_settings
    from app.services.ai_runtime import AnthropicProvider, get_ai_runtime_service
    from app.services.ontology import get_ontology_repository

    monkeypatch.setenv("AI_PROVIDER", "anthropic")
    monkeypatch.setenv("AI_API_KEY", "test-key")
    get_settings.cache_clear()

    service = get_ai_runtime_service(get_ontology_repository())
    assert isinstance(service.provider, AnthropicProvider)
    assert service.provider.provider_name == "anthropic"
    assert service.provider.model_name == get_settings().ai_model
    get_settings.cache_clear()


def test_anthropic_signal_intake_filters_unknown_signal_ids():
    from app.services.ai_runtime import AnthropicProvider
    from app.services.ontology import get_ontology_repository

    fake_client = _FakeAnthropicClient(
        [
            _FakeAnthropicResponse(
                # Anthropic provider uses prefill='{"' so the response continues from there
                json.dumps(
                    {
                        "detected_signals": [
                            {
                                "signal_id": "sig_demand_spike_unabsorbed",
                                "evidence_snippet": "The rush hit all at once and the floor froze.",
                                "confidence": "high",
                                "score": 0.92,
                                "match_reasons": ["Demand wave exceeded readiness."],
                            },
                            {
                                "signal_id": "sig_made_up_signal",
                                "evidence_snippet": "Hallucinated entry",
                                "confidence": "high",
                                "score": 0.99,
                                "match_reasons": ["Should be removed"],
                            },
                        ],
                        "unmapped_observations": ["Guests were looking around for direction."],
                    }
                )[2:]  # Strip leading '{"' since it's provided as prefill
            )
        ]
    )

    provider = AnthropicProvider(get_ontology_repository(), client=fake_client)
    preview = provider.signal_intake(
        raw_text="The rush hit all at once and the floor froze. Team of 8.",
        ontology_id="restaurant-legacy",
        version="v8",
    )

    assert preview.provider == "anthropic"
    assert preview.model == provider.model_name
    assert preview.prompt_version == "v1"
    assert len(preview.detected_signals) == 1
    assert preview.detected_signals[0].signal_id == "sig_demand_spike_unabsorbed"
    assert preview.detected_signals[0].signal_name == "Demand spike goes unabsorbed"
    assert preview.unmapped_observations == ["Guests were looking around for direction."]
    assert preview.venue_context.team_size_note == "8 people"
    # Verify Anthropic was called with system + messages pattern
    assert fake_client.messages.calls[0]["system"]
    assert fake_client.messages.calls[0]["messages"][0]["role"] == "user"


def test_anthropic_copilot_turn_includes_text_attachment_excerpt(monkeypatch):
    from app.core.config import get_settings

    fake_client = _FakeAnthropicClient(
        [
            _FakeAnthropicResponse("Grounded reply from Anthropic."),
            _FakeAnthropicResponse(json.dumps({"add": [], "remove": []})[2:]),
        ]
    )

    monkeypatch.setenv("AI_PROVIDER", "anthropic")
    monkeypatch.setenv("AI_API_KEY", "test-key")
    monkeypatch.setattr("app.services.ai_runtime._build_anthropic_client", lambda settings: fake_client)
    get_settings.cache_clear()

    from app.main import create_app

    with TestClient(create_app()) as client:
        bootstrap = client.get("/api/v1/bootstrap")
        assert bootstrap.status_code == 200
        payload = bootstrap.json()
        client.headers.update({"X-OIS-User-Id": payload["current_user"]["id"]})
        venue_id = payload["venues"][0]["id"]
        current_user_id = payload["current_user"]["id"]

        assessment = client.post(
            "/api/v1/assessments",
            json={
                "venue_id": venue_id,
                "notes": "Service lagged and the pre-shift reset never really happened.",
                "selected_signal_ids": ["sig_service_delay", "sig_shift_brief_missing"],
                "signal_states": {},
                "management_hours_available": 8,
                "weekly_effort_budget": 8,
            },
        )
        assert assessment.status_code == 201

        run = client.post(f"/api/v1/assessments/{assessment.json()['id']}/runs", json={})
        assert run.status_code == 200

        threads_response = client.get(f"/api/v1/copilot/threads?venue_id={venue_id}")
        assert threads_response.status_code == 200
        venue_thread = next(thread for thread in threads_response.json() if thread["scope"] == "venue")

        send_response = client.post(
            f"/api/v1/copilot/threads/{venue_thread['id']}/messages",
            json={
                "content": "Read the attached note and ground your answer in it.",
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

    assert fake_client.messages.calls
    main_call = next(
        call for call in fake_client.messages.calls if "Grounded scaffold:" in str(call["messages"][0]["content"])
    )
    user_msg = main_call["messages"][0]["content"]
    assert "Grounded scaffold:" in user_msg
    assert "Recent thread history:" in user_msg
    assert "Team skipped the pre-shift reset." in user_msg
    get_settings.cache_clear()


def test_anthropic_copilot_turn_uses_local_image_input(monkeypatch):
    from app.core.config import get_settings

    fake_client = _FakeAnthropicClient(
        [
            _FakeAnthropicResponse("Grounded visual reply from Anthropic."),
            _FakeAnthropicResponse(json.dumps({"add": [], "remove": []})[2:]),
        ]
    )

    monkeypatch.setenv("AI_PROVIDER", "anthropic")
    monkeypatch.setenv("AI_API_KEY", "test-key")
    monkeypatch.setattr("app.services.ai_runtime._build_anthropic_client", lambda settings: fake_client)
    get_settings.cache_clear()

    from app.main import create_app

    with TestClient(create_app()) as client:
        bootstrap = client.get("/api/v1/bootstrap")
        assert bootstrap.status_code == 200
        payload = bootstrap.json()
        client.headers.update({"X-OIS-User-Id": payload["current_user"]["id"]})
        venue_id = payload["venues"][0]["id"]
        current_user_id = payload["current_user"]["id"]

        threads_response = client.get(f"/api/v1/copilot/threads?venue_id={venue_id}")
        assert threads_response.status_code == 200
        venue_thread = next(thread for thread in threads_response.json() if thread["scope"] == "venue")

        send_response = client.post(
            f"/api/v1/copilot/threads/{venue_thread['id']}/messages",
            json={
                "content": "Look at the attached station image and ground your answer in it.",
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

    assert fake_client.messages.calls
    # With image attachment, input should be a list of content blocks
    first_call = fake_client.messages.calls[0]
    user_content = first_call["messages"][0]["content"]
    assert isinstance(user_content, list)
    assert any(item["type"] == "image" for item in user_content)
    assert any(
        item["type"] == "image"
        and (
            (item["source"].get("type") == "base64" and item["source"].get("media_type") == "image/png")
            or str(item["source"].get("url") or "").startswith("data:image/png;base64,")
        )
        for item in user_content
    )
    get_settings.cache_clear()


def test_anthropic_copilot_turn_prioritizes_current_assessment_scaffold_over_stale_thread_history(monkeypatch):
    from app.core.config import get_settings

    fake_client = _FakeAnthropicClient(
        [
            _FakeAnthropicResponse("First reply before assessment exists."),
            _FakeAnthropicResponse("Second reply after assessment exists."),
            _FakeAnthropicResponse(json.dumps({"add": [], "remove": []})[2:]),
            _FakeAnthropicResponse(json.dumps({"add": [], "remove": []})[2:]),
        ]
    )

    monkeypatch.setenv("AI_PROVIDER", "anthropic")
    monkeypatch.setenv("AI_API_KEY", "test-key")
    monkeypatch.setattr("app.services.ai_runtime._build_anthropic_client", lambda settings: fake_client)
    get_settings.cache_clear()

    from app.main import create_app

    with TestClient(create_app()) as client:
        bootstrap = client.get("/api/v1/bootstrap")
        assert bootstrap.status_code == 200
        payload = bootstrap.json()
        client.headers.update({"X-OIS-User-Id": payload["current_user"]["id"]})
        venue_id = payload["venues"][0]["id"]
        current_user_id = payload["current_user"]["id"]

        threads_response = client.get(f"/api/v1/copilot/threads?venue_id={venue_id}")
        assert threads_response.status_code == 200
        venue_thread = next(thread for thread in threads_response.json() if thread["scope"] == "venue")

        first_response = client.post(
            f"/api/v1/copilot/threads/{venue_thread['id']}/messages",
            json={
                "content": "Can you derive the values from my assessment input?",
                "created_by": current_user_id,
            },
        )
        assert first_response.status_code == 201

        assessment = client.post(
            "/api/v1/assessments",
            json={
                "venue_id": venue_id,
                "notes": "The team should feel warm, caring, quality-first, and curious about improving the guest experience.",
                "selected_signal_ids": ["sig_service_delay"],
                "signal_states": {},
                "management_hours_available": 8,
                "weekly_effort_budget": 8,
            },
        )
        assert assessment.status_code == 201

        second_response = client.post(
            f"/api/v1/copilot/threads/{venue_thread['id']}/messages",
            json={
                "content": "Can you derive those values that are already known from my input in the assessment?",
                "created_by": current_user_id,
            },
        )
        assert second_response.status_code == 201

    assert len(fake_client.messages.calls) >= 2
    second_call = fake_client.messages.calls[1]
    assert "If recent thread history conflicts with the current grounded scaffold" in second_call["system"]
    second_user_msg = second_call["messages"][0]["content"]
    assert "Saved assessment input exists for this venue." in second_user_msg
    assert "Assessment evidence:" in second_user_msg
    assert "quality-first" in second_user_msg
    get_settings.cache_clear()
