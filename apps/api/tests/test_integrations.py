from datetime import timedelta

from fastapi.testclient import TestClient


def test_integration_event_ingest_duplicate_and_status_update():
    from app.main import create_app

    with TestClient(create_app()) as client:
        bootstrap = client.get("/api/v1/bootstrap").json()
        client.headers.update({"X-OIS-User-Id": bootstrap["current_user"]["id"]})
        venue_id = bootstrap["venues"][0]["id"]

        create = client.post(
            "/api/v1/integrations/events",
            json={
                "venue_id": venue_id,
                "provider": "lightspeed",
                "event_type": "ticket.closed",
                "external_event_id": "evt-001",
                "source_entity_id": "check-44",
                "payload": {"ticket_total": 148.5, "covers": 4},
            },
        )
        assert create.status_code == 201
        created_payload = create.json()
        assert created_payload["status"] == "received"
        assert created_payload["provider"] == "lightspeed"
        assert created_payload["organization_id"] == bootstrap["organization"]["id"]

        duplicate = client.post(
            "/api/v1/integrations/events",
            json={
                "venue_id": venue_id,
                "provider": "lightspeed",
                "event_type": "ticket.closed",
                "external_event_id": "evt-001",
                "payload": {"ticket_total": 148.5},
            },
        )
        assert duplicate.status_code == 200
        assert duplicate.json()["id"] == created_payload["id"]

        listing = client.get("/api/v1/integrations/events")
        assert listing.status_code == 200
        assert listing.json()[0]["id"] == created_payload["id"]

        update = client.patch(
            f"/api/v1/integrations/events/{created_payload['id']}",
            json={
                "status": "processed",
                "normalized_signal_ids": ["sig_demand_spike_unabsorbed"],
                "error_message": None,
            },
        )
        assert update.status_code == 200
        updated_payload = update.json()
        assert updated_payload["status"] == "processed"
        assert updated_payload["normalized_signal_ids"] == ["sig_demand_spike_unabsorbed"]
        assert updated_payload["processed_at"] is not None
        assert updated_payload["attempt_count"] == 1

        summary = client.get("/api/v1/integrations/summary")
        assert summary.status_code == 200
        summary_payload = summary.json()
        assert summary_payload["total_events"] == 1
        assert summary_payload["counts_by_status"][0]["key"] == "processed"


def test_lightspeed_connector_normalizes_and_deduplicates_events():
    from app.main import create_app

    with TestClient(create_app()) as client:
        bootstrap = client.get("/api/v1/bootstrap").json()
        client.headers.update({"X-OIS-User-Id": bootstrap["current_user"]["id"]})
        venue_id = bootstrap["venues"][0]["id"]

        connectors = client.get("/api/v1/integrations/connectors")
        assert connectors.status_code == 200
        connector_payload = connectors.json()
        providers = {item["provider"]: item for item in connector_payload}
        assert providers["lightspeed"]["status"] == "starter"
        assert providers["sumup"]["status"] == "starter"
        assert providers["trivec"]["status"] == "starter"

        create = client.post(
            "/api/v1/integrations/connectors/lightspeed/events",
            json={
                "venue_id": venue_id,
                "event_id": "ls-evt-001",
                "event_type": "pos.device.offline",
                "payload": {
                    "device_id": "printer-7",
                    "printer_offline": True,
                    "workaround_active": True,
                },
            },
        )
        assert create.status_code == 201
        created_payload = create.json()
        assert created_payload["provider"] == "lightspeed"
        assert created_payload["event_type"] == "device.offline"
        assert created_payload["status"] == "normalized"
        assert "sig_tool_or_system_unavailable" in created_payload["normalized_signal_ids"]
        assert "sig_workaround_is_normalized" in created_payload["normalized_signal_ids"]
        assert created_payload["attempt_count"] == 1

        duplicate = client.post(
            "/api/v1/integrations/connectors/lightspeed/events",
            json={
                "venue_id": venue_id,
                "event_id": "ls-evt-001",
                "event_type": "pos.device.offline",
                "payload": {"device_id": "printer-7", "printer_offline": True},
            },
        )
        assert duplicate.status_code == 200
        assert duplicate.json()["id"] == created_payload["id"]

        fail = client.patch(
            f"/api/v1/integrations/events/{created_payload['id']}",
            json={
                "status": "failed",
                "normalized_signal_ids": [],
                "error_message": "Temporary downstream issue",
            },
        )
        assert fail.status_code == 200
        assert fail.json()["next_retry_at"] is not None

        retry = client.post(f"/api/v1/integrations/events/{created_payload['id']}/retry")
        assert retry.status_code == 200
        retry_payload = retry.json()
        assert retry_payload["status"] == "normalized"
        assert retry_payload["attempt_count"] == 2
        assert retry_payload["next_retry_at"] is None

        summary = client.get("/api/v1/integrations/summary")
        assert summary.status_code == 200
        summary_payload = summary.json()
        assert summary_payload["retryable_event_count"] == 0
        assert summary_payload["counts_by_provider"][0]["key"] == "lightspeed"


def test_sumup_connector_normalizes_and_retries_events():
    from app.main import create_app

    with TestClient(create_app()) as client:
        bootstrap = client.get("/api/v1/bootstrap").json()
        client.headers.update({"X-OIS-User-Id": bootstrap["current_user"]["id"]})
        venue_id = bootstrap["venues"][0]["id"]

        create = client.post(
            "/api/v1/integrations/connectors/sumup/events",
            json={
                "venue_id": venue_id,
                "event_id": "su-evt-001",
                "event_type": "refund.issued",
                "payload": {
                    "refund_id": "refund-11",
                    "refund_count": 2,
                    "refund_rate": 0.08,
                },
            },
        )
        assert create.status_code == 201
        created_payload = create.json()
        assert created_payload["provider"] == "sumup"
        assert created_payload["event_type"] == "refund.created"
        assert created_payload["status"] == "normalized"
        assert "sig_voids_rising" in created_payload["normalized_signal_ids"]
        assert "sig_waste_loss_or_leakage_unexplained" in created_payload["normalized_signal_ids"]

        fail = client.patch(
            f"/api/v1/integrations/events/{created_payload['id']}",
            json={
                "status": "failed",
                "normalized_signal_ids": [],
                "error_message": "Temporary normalization issue",
            },
        )
        assert fail.status_code == 200
        assert fail.json()["next_retry_at"] is not None

        retry = client.post(f"/api/v1/integrations/events/{created_payload['id']}/retry")
        assert retry.status_code == 200
        retry_payload = retry.json()
        assert retry_payload["status"] == "normalized"
        assert retry_payload["attempt_count"] == 2
        assert "sig_waste_loss_or_leakage_unexplained" in retry_payload["normalized_signal_ids"]


def test_trivec_connector_normalizes_and_retries_events():
    from app.main import create_app

    with TestClient(create_app()) as client:
        bootstrap = client.get("/api/v1/bootstrap").json()
        client.headers.update({"X-OIS-User-Id": bootstrap["current_user"]["id"]})
        venue_id = bootstrap["venues"][0]["id"]

        create = client.post(
            "/api/v1/integrations/connectors/trivec/events",
            json={
                "venue_id": venue_id,
                "event_id": "tv-evt-001",
                "event_type": "tap.offline",
                "payload": {
                    "tap_id": "tap-17",
                    "tap_offline": True,
                    "manual_override": True,
                },
            },
        )
        assert create.status_code == 201
        created_payload = create.json()
        assert created_payload["provider"] == "trivec"
        assert created_payload["event_type"] == "beverage.line_offline"
        assert created_payload["status"] == "normalized"
        assert "sig_tool_or_system_unavailable" in created_payload["normalized_signal_ids"]
        assert "sig_equipment_or_asset_breaks_flow" in created_payload["normalized_signal_ids"]
        assert "sig_workaround_has_become_normal" in created_payload["normalized_signal_ids"]

        fail = client.patch(
            f"/api/v1/integrations/events/{created_payload['id']}",
            json={
                "status": "errored",
                "normalized_signal_ids": [],
                "error_message": "Temporary connector issue",
            },
        )
        assert fail.status_code == 200
        assert fail.json()["next_retry_at"] is not None

        retry = client.post(f"/api/v1/integrations/events/{created_payload['id']}/retry")
        assert retry.status_code == 200
        retry_payload = retry.json()
        assert retry_payload["status"] == "normalized"
        assert retry_payload["attempt_count"] == 2
        assert "sig_equipment_or_asset_breaks_flow" in retry_payload["normalized_signal_ids"]


def test_integration_events_are_tenant_scoped():
    from app.core.config import get_settings
    from app.db.session import get_session_factory
    from app.main import create_app
    from app.models.domain import IntegrationEvent, Organization, Role, User, Venue, VenueStatus
    from app.services.auth import hash_password

    with TestClient(create_app()) as client:
        bootstrap = client.get("/api/v1/bootstrap").json()
        client.headers.update({"X-OIS-User-Id": bootstrap["current_user"]["id"]})

        session_factory = get_session_factory(get_settings().database_url)
        with session_factory() as session:
            other_org = Organization(
                name="Other Group",
                slug="other-integration-group",
                region="europe",
                data_residency="eu-central",
            )
            session.add(other_org)
            session.flush()
            other_user = User(
                organization_id=other_org.id,
                email="other-integrations@ois-demo.local",
                full_name="Other Integration User",
                role=Role.ORG_ADMIN,
                password_hash=hash_password("other-pass-2026"),
            )
            other_venue = Venue(
                organization_id=other_org.id,
                name="Hidden Venue",
                slug="hidden-integration-venue",
                vertical="restaurant",
                status=VenueStatus.ACTIVE,
                concept="Secret concept",
                location="Elsewhere",
                size_note="40 seats",
                capacity_profile={},
            )
            session.add_all([other_user, other_venue])
            session.flush()
            session.add(
                IntegrationEvent(
                    organization_id=other_org.id,
                    venue_id=other_venue.id,
                    provider="lightspeed",
                    event_type="ticket.closed",
                    external_event_id="evt-hidden",
                    source_entity_id="ticket-hidden",
                    ingest_mode="webhook",
                    status="received",
                    payload={"covers": 9},
                    normalized_signal_ids=[],
                )
            )
            session.commit()

        listing = client.get("/api/v1/integrations/events")
        assert listing.status_code == 200
        event_ids = {item["external_event_id"] for item in listing.json()}
        assert "evt-hidden" not in event_ids


def test_integration_summary_surfaces_overdue_and_provider_pressure():
    from app.core.config import get_settings
    from app.db.session import get_session_factory
    from app.main import create_app
    from app.models.domain import IntegrationEvent, utc_now

    with TestClient(create_app()) as client:
        bootstrap = client.get("/api/v1/bootstrap").json()
        client.headers.update({"X-OIS-User-Id": bootstrap["current_user"]["id"]})
        venue_id = bootstrap["venues"][0]["id"]

        create = client.post(
            "/api/v1/integrations/events",
            json={
                "venue_id": venue_id,
                "provider": "lightspeed",
                "event_type": "ticket.closed",
                "external_event_id": "evt-pressure-001",
                "payload": {"ticket_total": 148.5, "covers": 4},
            },
        )
        assert create.status_code == 201
        event_id = create.json()["id"]

        session_factory = get_session_factory(get_settings().database_url)
        with session_factory() as session:
            event = session.get(IntegrationEvent, event_id)
            assert event is not None
            now = utc_now()
            event.status = "retry_scheduled"
            event.error_message = "Connector still waiting"
            event.last_attempted_at = now - timedelta(hours=1)
            event.next_retry_at = now - timedelta(minutes=10)
            event.created_at = now - timedelta(hours=2)
            session.commit()

        summary = client.get("/api/v1/integrations/summary")
        assert summary.status_code == 200
        summary_payload = summary.json()
        assert summary_payload["retryable_event_count"] == 1
        assert summary_payload["overdue_retry_count"] == 1
        assert summary_payload["stale_event_count"] == 1
        assert summary_payload["provider_pressure"][0]["provider"] == "lightspeed"
        assert summary_payload["provider_pressure"][0]["overdue_retry_count"] == 1
        assert summary_payload["provider_pressure"][0]["stale_event_count"] == 1
