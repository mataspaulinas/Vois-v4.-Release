from fastapi.testclient import TestClient
from sqlalchemy import select

from app.schemas.ontology import (
    DraftStatus,
    OntologyEntityType,
    PublishOntologyVersionRequest,
    WorkbenchDraftUpsert,
)
from app.db.session import get_session_factory
from app.models.domain import User
from app.services.ontology import get_ontology_repository
from app.services.ontology_workbench import get_ontology_workbench_service


def test_workbench_publish_promotes_reviewed_drafts():
    workbench = get_ontology_workbench_service()
    repository = get_ontology_repository()
    baseline = repository.summary(vertical="restaurant", version="v1")

    workbench.upsert_draft(
        OntologyEntityType.SIGNALS,
        WorkbenchDraftUpsert(
            id="sig_pre_shift_board",
            name="Pre-shift board missing",
            description="The team does not have a visible board for daily priorities and service alerts.",
            owner="recovery-team",
            source_ref="archive-note",
            status=DraftStatus.REVIEW,
            domain="leadership_rhythm",
            module="communication_cadence",
            indicator_type="leading",
        ),
        vertical="restaurant",
    )

    result = workbench.publish_version(
        PublishOntologyVersionRequest(version="v2", owner="recovery-team"),
        vertical="restaurant",
    )

    updated_summary = repository.summary(vertical="restaurant", version="v2")
    assert result.promoted["signals"] == 1
    assert updated_summary.counts["signals"] == baseline.counts["signals"] + 1


def test_workbench_api_creates_reviews_and_publishes_tool_draft():
    from app.main import create_app

    with TestClient(create_app()) as client:
        with get_session_factory()() as db:
            developer_id = db.scalar(select(User.id).where(User.email == "developer@vois.local"))
        client.headers.update({"X-OIS-User-Id": developer_id})
        create_response = client.post(
            "/api/v1/ontology/workbench/tools/drafts?ontology_id=restaurant",
            json={
                "id": "tool_daily_flash_note",
                "name": "Daily flash note",
                "description": "Simple team note template for priority callouts and service risks.",
                "owner": "recovery-team",
                "source_ref": "archive-note",
                "category": "communication"
            },
        )
        assert create_response.status_code == 201
        assert create_response.json()["entity"]["status"] == "draft"

        review_response = client.patch(
            "/api/v1/ontology/workbench/tools/drafts/tool_daily_flash_note/status?ontology_id=restaurant",
            json={"status": "review"},
        )
        assert review_response.status_code == 200
        assert review_response.json()["entity"]["status"] == "review"

        publish_response = client.post(
            "/api/v1/ontology/workbench/publish?ontology_id=restaurant",
            json={"version": "v3", "owner": "recovery-team"},
        )
        assert publish_response.status_code == 200
        assert publish_response.json()["promoted"]["tools"] == 1

        summary_response = client.get("/api/v1/ontology/summary?ontology_id=restaurant&version=v3")
        assert summary_response.status_code == 200
        assert summary_response.json()["counts"]["tools"] >= 9


def test_workbench_api_creates_and_reviews_map_draft():
    from app.main import create_app

    with TestClient(create_app()) as client:
        with get_session_factory()() as db:
            developer_id = db.scalar(select(User.id).where(User.email == "developer@vois.local"))
        client.headers.update({"X-OIS-User-Id": developer_id})
        create_response = client.post(
            "/api/v1/ontology/workbench/maps/signal_failure_map/drafts?ontology_id=restaurant",
            json={
                "source_id": "sig_service_delay",
                "target_id": "fm_controls_gap",
                "weight": 0.3,
                "owner": "recovery-team",
                "source_ref": "archive-note"
            },
        )
        assert create_response.status_code == 201
        payload = create_response.json()
        assert payload["draft_key"] == "sig_service_delay__fm_controls_gap"
        assert payload["mapping"]["status"] == "draft"

        review_response = client.patch(
            "/api/v1/ontology/workbench/maps/signal_failure_map/drafts/sig_service_delay__fm_controls_gap/status?ontology_id=restaurant",
            json={"status": "review"},
        )
        assert review_response.status_code == 200
        assert review_response.json()["mapping"]["status"] == "review"

        list_response = client.get("/api/v1/ontology/workbench/maps/signal_failure_map/drafts?ontology_id=restaurant")
        assert list_response.status_code == 200
        assert len(list_response.json()) == 1


def test_workbench_governance_preview_reflects_draft_enrichment():
    workbench = get_ontology_workbench_service()
    repository = get_ontology_repository()

    workbench.import_batch(repository.contract_enrichment_batch(vertical="restaurant"), vertical="restaurant")
    preview = workbench.governance_preview(vertical="restaurant")

    assert preview.bundle_version.endswith("+workbench")
    assert preview.block_contract_gaps["missing_service_module_links"] == []
    assert preview.block_contract_gaps["missing_failure_family_links"] == []
    assert preview.tool_contract_gaps["missing_block_links"] == []
