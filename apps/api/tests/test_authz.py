from fastapi.testclient import TestClient


def test_viewer_cannot_mutate_operational_state():
    from app.core.config import get_settings
    from app.db.session import get_session_factory
    from app.main import create_app
    from app.models.domain import Role, User

    with TestClient(create_app()) as client:
        bootstrap = client.get("/api/v1/bootstrap").json()
        organization_id = bootstrap["organization"]["id"]
        venue_id = bootstrap["venues"][0]["id"]

        session_factory = get_session_factory(get_settings().database_url)
        with session_factory() as session:
            viewer = User(
                organization_id=organization_id,
                email="viewer@ois-demo.local",
                full_name="Read Only",
                role=Role.VIEWER,
            )
            session.add(viewer)
            session.commit()
            session.refresh(viewer)

        response = client.post(
            "/api/v1/progress",
            headers={"X-OIS-User-Id": viewer.id},
            json={
                "venue_id": venue_id,
                "summary": "Viewer should not be able to log this.",
                "detail": "Read-only role attempted a mutation.",
                "status": "active",
            },
        )
        assert response.status_code == 403


def test_org_admin_can_view_organization_sessions_but_viewer_cannot():
    from app.core.config import get_settings
    from app.db.session import get_session_factory
    from app.main import create_app
    from app.models.domain import Role, User
    from app.services.auth import hash_password

    with TestClient(create_app()) as client:
        login = client.post(
            "/api/v1/auth/login",
            json={"email": "owner@vois.local", "password": "ois-demo-2026"},
        )
        assert login.status_code == 200
        org_admin_token = login.json()["session_token"]

        bootstrap = client.get("/api/v1/bootstrap").json()
        organization_id = bootstrap["organization"]["id"]

        session_factory = get_session_factory(get_settings().database_url)
        with session_factory() as session:
            viewer = User(
                organization_id=organization_id,
                email="viewer-authz@ois-demo.local",
                full_name="Viewer Authz",
                role=Role.VIEWER,
                password_hash=hash_password("viewer-pass-2026"),
            )
            session.add(viewer)
            session.commit()
            session.refresh(viewer)

        viewer_login = client.post(
            "/api/v1/auth/login",
            json={"email": "viewer-authz@ois-demo.local", "password": "viewer-pass-2026"},
        )
        assert viewer_login.status_code == 200
        viewer_token = viewer_login.json()["session_token"]

        org_scope = client.get(
            "/api/v1/auth/sessions?scope=organization",
            headers={"X-OIS-Session-Token": org_admin_token},
        )
        assert org_scope.status_code == 200
        session_user_ids = {item["user_id"] for item in org_scope.json()["sessions"]}
        assert viewer.id in session_user_ids

        viewer_org_scope = client.get(
            "/api/v1/auth/sessions?scope=organization",
            headers={"X-OIS-Session-Token": viewer_token},
        )
        assert viewer_org_scope.status_code == 403


def test_viewer_cannot_mutate_integration_events():
    from app.core.config import get_settings
    from app.db.session import get_session_factory
    from app.main import create_app
    from app.models.domain import Role, User
    from app.services.auth import hash_password

    with TestClient(create_app()) as client:
        bootstrap = client.get("/api/v1/bootstrap").json()
        organization_id = bootstrap["organization"]["id"]
        venue_id = bootstrap["venues"][0]["id"]

        session_factory = get_session_factory(get_settings().database_url)
        with session_factory() as session:
            viewer = User(
                organization_id=organization_id,
                email="viewer-integrations@ois-demo.local",
                full_name="Viewer Integrations",
                role=Role.VIEWER,
                password_hash=hash_password("viewer-pass-2026"),
            )
            session.add(viewer)
            session.commit()

        viewer_login = client.post(
            "/api/v1/auth/login",
            json={"email": "viewer-integrations@ois-demo.local", "password": "viewer-pass-2026"},
        )
        assert viewer_login.status_code == 200
        viewer_token = viewer_login.json()["session_token"]

        create = client.post(
            "/api/v1/integrations/events",
            headers={"X-OIS-Session-Token": viewer_token},
            json={
                "venue_id": venue_id,
                "provider": "lightspeed",
                "event_type": "ticket.closed",
                "external_event_id": "viewer-denied",
                "payload": {"covers": 4},
            },
        )
        assert create.status_code == 403
