from fastapi.testclient import TestClient


def test_portfolio_director_can_view_export_summary():
    from app.main import create_app

    with TestClient(create_app()) as client:
        login = client.post(
            "/api/v1/auth/login",
            json={"email": "owner@ois-demo.local", "password": "ois-demo-2026"},
        )
        assert login.status_code == 200
        token = login.json()["session_token"]

        summary = client.get(
            "/api/v1/organization/export-summary",
            headers={"X-OIS-Session-Token": token},
        )
        assert summary.status_code == 200
        payload = summary.json()
        assert payload["organization_id"]
        assert payload["export_ready"] is True
        assert payload["includes_file_content"] is False
        assert "venues" in payload["entity_counts"]

        delete_readiness = client.get(
            "/api/v1/organization/delete-readiness",
            headers={"X-OIS-Session-Token": token},
        )
        assert delete_readiness.status_code == 200
        delete_payload = delete_readiness.json()
        assert delete_payload["organization_id"] == payload["organization_id"]
        assert delete_payload["delete_supported"] is False
        assert delete_payload["active_session_count"] >= 1
        assert len(delete_payload["blocking_conditions"]) >= 1

        backup_readiness = client.get(
            "/api/v1/organization/backup-readiness",
            headers={"X-OIS-Session-Token": token},
        )
        assert backup_readiness.status_code == 200
        backup_payload = backup_readiness.json()
        assert backup_payload["organization_id"] == payload["organization_id"]
        assert backup_payload["automated_backup_supported"] is False
        assert backup_payload["snapshot_export_ready"] is True
        assert backup_payload["restore_supported"] is False
        assert backup_payload["upload_backend"] == "local_disk"
        assert len(backup_payload["blocking_conditions"]) >= 1


def test_org_admin_can_generate_export_bundle_and_viewer_cannot():
    from app.core.config import get_settings
    from app.db.session import get_session_factory
    from app.main import create_app
    from app.models.domain import Role, User
    from app.services.auth import hash_password

    with TestClient(create_app()) as client:
        bootstrap = client.get("/api/v1/bootstrap").json()
        organization_id = bootstrap["organization"]["id"]

        session_factory = get_session_factory(get_settings().database_url)
        with session_factory() as session:
            org_admin = User(
                organization_id=organization_id,
                email="org-export@ois-demo.local",
                full_name="Org Export Admin",
                role=Role.ORG_ADMIN,
                password_hash=hash_password("org-export-pass-2026"),
            )
            viewer = User(
                organization_id=organization_id,
                email="viewer-export@ois-demo.local",
                full_name="Viewer Export",
                role=Role.VIEWER,
                password_hash=hash_password("viewer-export-pass-2026"),
            )
            session.add_all([org_admin, viewer])
            session.commit()

        admin_login = client.post(
            "/api/v1/auth/login",
            json={"email": "org-export@ois-demo.local", "password": "org-export-pass-2026"},
        )
        assert admin_login.status_code == 200
        admin_token = admin_login.json()["session_token"]

        export = client.post(
            "/api/v1/organization/export",
            headers={"X-OIS-Session-Token": admin_token},
        )
        assert export.status_code == 200
        payload = export.json()
        assert payload["organization_id"] == organization_id
        assert payload["format_version"] == "ois-export-v1"
        assert "organization" in payload["data"]
        assert "venues" in payload["data"]
        assert payload["entity_counts"]["users"] >= 2

        viewer_login = client.post(
            "/api/v1/auth/login",
            json={"email": "viewer-export@ois-demo.local", "password": "viewer-export-pass-2026"},
        )
        assert viewer_login.status_code == 200
        viewer_token = viewer_login.json()["session_token"]

        viewer_export = client.post(
            "/api/v1/organization/export",
            headers={"X-OIS-Session-Token": viewer_token},
        )
        assert viewer_export.status_code == 403
