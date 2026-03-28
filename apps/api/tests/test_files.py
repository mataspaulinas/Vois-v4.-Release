import base64

from fastapi.testclient import TestClient


def test_file_registration_and_local_content_download():
    from app.main import create_app

    with TestClient(create_app()) as client:
        bootstrap = client.get("/api/v1/bootstrap")
        assert bootstrap.status_code == 200
        payload = bootstrap.json()
        client.headers.update({"X-OIS-User-Id": payload["current_user"]["id"]})
        venue_id = payload["venues"][0]["id"]

        content = b"hello from OIS"
        register = client.post(
            "/api/v1/files/register",
            json={
                "venue_id": venue_id,
                "file_name": "ops-note.txt",
                "content_type": "text/plain",
                "content_base64": base64.b64encode(content).decode("utf-8"),
            },
        )
        assert register.status_code == 201
        file_asset = register.json()
        assert file_asset["storage_backend"] == "local"
        assert file_asset["ingest_mode"] == "uploaded_content"
        assert file_asset["content_url"].endswith(f"/api/v1/files/{file_asset['id']}/content")
        assert file_asset["size_bytes"] == len(content)

        listing = client.get(f"/api/v1/files?venue_id={venue_id}")
        assert listing.status_code == 200
        assert any(item["id"] == file_asset["id"] for item in listing.json())

        detail = client.get(f"/api/v1/files/{file_asset['id']}")
        assert detail.status_code == 200
        assert detail.json()["sha256"]

        analysis = client.get(f"/api/v1/files/{file_asset['id']}/analysis")
        assert analysis.status_code == 200
        analysis_payload = analysis.json()
        assert analysis_payload["status"] == "ready"
        assert analysis_payload["analysis_kind"] == "text"
        assert "hello from OIS" in analysis_payload["extracted_text"]
        assert analysis_payload["chunks"]
        assert "hello from OIS" in analysis_payload["chunks"][0]["content"]

        download = client.get(f"/api/v1/files/{file_asset['id']}/content")
        assert download.status_code == 200
        assert download.content == content
