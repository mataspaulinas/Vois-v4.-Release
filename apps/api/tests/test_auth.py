from fastapi.testclient import TestClient


def test_session_login_me_and_logout_flow():
    from app.main import create_app

    with TestClient(create_app()) as client:
        login = client.post(
            "/api/v1/auth/login",
            json={"email": "owner@vois.local", "password": "ois-demo-2026"},
        )
        assert login.status_code == 200
        payload = login.json()
        assert payload["session"]["authentication_mode"] == "local_session"
        assert payload["session_token"]

        me = client.get("/api/v1/auth/me", headers={"X-OIS-Session-Token": payload["session_token"]})
        assert me.status_code == 200
        assert me.json()["user"]["email"] == "owner@vois.local"

        logout = client.post("/api/v1/auth/logout", headers={"X-OIS-Session-Token": payload["session_token"]})
        assert logout.status_code == 200
        assert logout.json() == {"revoked": True}

        after_logout = client.get("/api/v1/auth/me", headers={"X-OIS-Session-Token": payload["session_token"]})
        assert after_logout.status_code == 401


def test_session_inventory_and_security_posture():
    from app.main import create_app

    with TestClient(create_app()) as client:
        login = client.post(
            "/api/v1/auth/login",
            json={"email": "owner@vois.local", "password": "ois-demo-2026"},
        )
        assert login.status_code == 200
        session_token = login.json()["session_token"]

        inventory = client.get("/api/v1/auth/sessions", headers={"X-OIS-Session-Token": session_token})
        assert inventory.status_code == 200
        payload = inventory.json()
        assert payload["scope"] == "self"
        assert payload["current_session_id"] is not None
        assert payload["sessions"][0]["is_current"] is True
        assert payload["sessions"][0]["is_active"] is True

        posture = client.get("/api/v1/auth/security-posture", headers={"X-OIS-Session-Token": session_token})
        assert posture.status_code == 200
        posture_payload = posture.json()
        assert posture_payload["authentication_mode"] == "local_session"
        assert posture_payload["ai_provider"] in {"anthropic", "openai", "mock"}
        assert posture_payload["ai_provider_effective"] in {"anthropic", "openai", "blocked", "mock"}
        assert posture_payload["upload_backend"] == "local_disk"


def test_user_can_revoke_another_own_session():
    from app.main import create_app

    with TestClient(create_app()) as client:
        first_login = client.post(
            "/api/v1/auth/login",
            json={"email": "owner@vois.local", "password": "ois-demo-2026"},
        )
        second_login = client.post(
            "/api/v1/auth/login",
            json={"email": "owner@vois.local", "password": "ois-demo-2026"},
        )
        first_token = first_login.json()["session_token"]
        second_token = second_login.json()["session_token"]

        inventory = client.get("/api/v1/auth/sessions", headers={"X-OIS-Session-Token": first_token})
        assert inventory.status_code == 200
        other_session = next(
            session for session in inventory.json()["sessions"] if session["id"] != inventory.json()["current_session_id"]
        )

        revoke = client.delete(
            f"/api/v1/auth/sessions/{other_session['id']}",
            headers={"X-OIS-Session-Token": first_token},
        )
        assert revoke.status_code == 200
        assert revoke.json()["revoked"] is True
        assert revoke.json()["cleared_current_cookie"] is False

        other_me = client.get("/api/v1/auth/me", headers={"X-OIS-Session-Token": second_token})
        assert other_me.status_code == 401


def test_tenant_scoped_reads_hide_other_organization_data():
    from app.core.config import get_settings
    from app.db.session import get_session_factory
    from app.main import create_app
    from app.models.domain import Organization, Role, User, Venue, VenueStatus
    from app.services.auth import hash_password

    with TestClient(create_app()) as client:
        bootstrap = client.get("/api/v1/bootstrap").json()
        client.headers.update({"X-OIS-User-Id": bootstrap["current_user"]["id"]})
        primary_org_id = bootstrap["organization"]["id"]

        session_factory = get_session_factory(get_settings().database_url)
        with session_factory() as session:
            other_org = Organization(
                name="Other Group",
                slug="other-group",
                region="europe",
                data_residency="eu-central",
            )
            session.add(other_org)
            session.flush()
            other_user = User(
                organization_id=other_org.id,
                email="other@ois-demo.local",
                full_name="Other User",
                role=Role.ORG_ADMIN,
                password_hash=hash_password("other-pass-2026"),
            )
            other_venue = Venue(
                organization_id=other_org.id,
                name="Hidden Venue",
                slug="hidden-venue",
                status=VenueStatus.ACTIVE,
                concept="Secret concept",
                location="Elsewhere",
                size_note="40 seats",
                capacity_profile={},
            )
            session.add_all([other_user, other_venue])
            session.commit()
            session.refresh(other_venue)

        venue_list = client.get("/api/v1/venues")
        assert venue_list.status_code == 200
        venue_ids = {item["id"] for item in venue_list.json()}
        assert other_venue.id not in venue_ids

        hidden_detail = client.get(f"/api/v1/venues/{other_venue.id}")
        assert hidden_detail.status_code == 404

        portfolio = client.get("/api/v1/portfolio/summary")
        assert portfolio.status_code == 200
        assert portfolio.json()["organization_id"] == primary_org_id

        other_audit = client.get(f"/api/v1/audit?organization_id={other_org.id}")
        assert other_audit.status_code == 404


def test_security_posture_reports_mock_fallback_for_unconfigured_live_request(monkeypatch):
    from app.core.config import get_settings
    from app.main import create_app

    monkeypatch.setenv("AI_PROVIDER", "openai")
    monkeypatch.setenv("AI_API_KEY", "")
    monkeypatch.setenv("AI_MOCK_FALLBACK_ENABLED", "true")
    get_settings.cache_clear()

    with TestClient(create_app()) as client:
        bootstrap = client.get("/api/v1/bootstrap").json()
        client.headers.update({"X-OIS-User-Id": bootstrap["current_user"]["id"]})
        posture = client.get("/api/v1/auth/security-posture")
        assert posture.status_code == 200
        payload = posture.json()
        assert payload["ai_provider"] == "openai"
        assert payload["ai_provider_effective"] == "mock"
        assert payload["ai_mode"] == "mock_fallback"
        assert payload["ai_configured"] is False
        assert payload["ai_live_activation_ready"] is False
        assert payload["ai_mock_fallback_active"] is True
        assert "AI_API_KEY" in payload["ai_missing_configuration"]


def test_ai_routes_block_when_mock_fallback_is_disabled(monkeypatch):
    from app.core.config import get_settings
    from app.main import create_app

    monkeypatch.setenv("AI_PROVIDER", "openai")
    monkeypatch.setenv("AI_API_KEY", "")
    monkeypatch.setenv("AI_MOCK_FALLBACK_ENABLED", "false")
    get_settings.cache_clear()

    with TestClient(create_app()) as client:
        bootstrap = client.get("/api/v1/bootstrap").json()
        client.headers.update({"X-OIS-User-Id": bootstrap["current_user"]["id"]})
        venue_id = bootstrap["venues"][0]["id"]

        ai_intake = client.post(
            "/api/v1/ai-intake",
            json={
                "venue_id": venue_id,
                "raw_text": "Guests complained about a long wait and the floor looked lost.",
            },
        )
        assert ai_intake.status_code == 503
        assert "Live AI is not configured" in ai_intake.json()["detail"]


def test_security_posture_reports_live_anthropic_when_configured(monkeypatch):
    from app.core.config import get_settings
    from app.main import create_app

    monkeypatch.setenv("AI_PROVIDER", "anthropic")
    monkeypatch.setenv("AI_API_KEY", "test-key")
    monkeypatch.setenv("AI_MOCK_FALLBACK_ENABLED", "true")
    get_settings.cache_clear()

    with TestClient(create_app()) as client:
        bootstrap = client.get("/api/v1/bootstrap").json()
        client.headers.update({"X-OIS-User-Id": bootstrap["current_user"]["id"]})
        posture = client.get("/api/v1/auth/security-posture")
        assert posture.status_code == 200
        payload = posture.json()
        assert payload["ai_provider"] == "anthropic"
        assert payload["ai_provider_effective"] == "anthropic"
        assert payload["ai_mode"] == "live"
        assert payload["ai_configured"] is True
        assert payload["ai_live_activation_ready"] is True
        assert payload["ai_live_provider_supported"] is True
        assert payload["ai_mock_fallback_active"] is False


def test_auth_entry_config_and_discover_route_are_sanitized():
    from app.main import create_app

    with TestClient(create_app()) as client:
        config_response = client.get("/api/v1/auth/entry-config")
        assert config_response.status_code == 200
        config_payload = config_response.json()
        assert config_payload["environment_mode"] == "local"
        assert config_payload["local_auth_available"] is True
        assert "password" not in config_payload["enabled_providers"]

        discover_response = client.post("/api/v1/auth/discover", json={"email": "owner@vois.local"})
        assert discover_response.status_code == 200
        discover_payload = discover_response.json()
        assert discover_payload["route"] == "password"
        assert discover_payload["password_mode"] == "local"
        assert discover_payload["workspace_hint"] == "OIS Demo Group"


def test_local_password_reset_round_trip():
    from app.main import create_app

    with TestClient(create_app()) as client:
        forgot = client.post("/api/v1/auth/password/forgot", json={"email": "owner@vois.local"})
        assert forgot.status_code == 200
        forgot_payload = forgot.json()
        assert forgot_payload["delivery_mode"] == "local_reset_link"
        assert forgot_payload["reset_url"]

        token = forgot_payload["reset_url"].split("token=", 1)[1]
        reset = client.post(
            "/api/v1/auth/password/reset",
            json={"token": token, "new_password": "vois-owner-reset-2026"},
        )
        assert reset.status_code == 200
        assert reset.json()["reset"] is True

        login = client.post(
            "/api/v1/auth/login",
            json={"email": "owner@vois.local", "password": "vois-owner-reset-2026"},
        )
        assert login.status_code == 200


def test_invite_preview_and_acceptance_round_trip():
    from app.main import create_app

    with TestClient(create_app()) as client:
        owner_login = client.post(
            "/api/v1/auth/login",
            json={"email": "owner@vois.local", "password": "ois-demo-2026"},
        )
        assert owner_login.status_code == 200
        owner_token = owner_login.json()["session_token"]

        bootstrap = client.get("/api/v1/bootstrap", headers={"X-OIS-Session-Token": owner_token})
        assert bootstrap.status_code == 200
        bootstrap_payload = bootstrap.json()
        organization_id = bootstrap_payload["organization"]["id"]
        venue_id = bootstrap_payload["venues"][0]["id"]

        provision = client.post(
            f"/api/v1/organizations/{organization_id}/members",
            json={
                "email": "invite-manager@vois.local",
                "full_name": "Invite Manager",
                "role": "manager",
                "venue_ids": [venue_id],
            },
            headers={"X-OIS-Session-Token": owner_token},
        )
        assert provision.status_code == 201
        provision_payload = provision.json()
        invite_url = provision_payload["login_packet"]["invite_url"]
        temporary_password = provision_payload["login_packet"]["temporary_password"]
        assert invite_url
        invite_token = invite_url.rsplit("/", 1)[-1]

        preview = client.get(f"/api/v1/invites/{invite_token}")
        assert preview.status_code == 200
        preview_payload = preview.json()
        assert preview_payload["token_status"] == "pending"
        assert preview_payload["email"] == "invite-manager@vois.local"
        assert preview_payload["role"] == "manager"
        assert venue_id
        assert preview_payload["venue_names"]

        member_login = client.post(
            "/api/v1/auth/login",
            json={"email": "invite-manager@vois.local", "password": temporary_password},
        )
        assert member_login.status_code == 200
        member_token = member_login.json()["session_token"]

        accept = client.post(
            f"/api/v1/invites/{invite_token}/accept",
            headers={"X-OIS-Session-Token": member_token},
        )
        assert accept.status_code == 200
        accept_payload = accept.json()
        assert accept_payload["accepted"] is True
        assert accept_payload["organization_id"] == organization_id
        assert accept_payload["role"] == "manager"
        assert accept_payload["venue_ids"] == [venue_id]

        accepted_preview = client.get(f"/api/v1/invites/{invite_token}")
        assert accepted_preview.status_code == 200
        assert accepted_preview.json()["token_status"] == "accepted"
