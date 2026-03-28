import json

from app.core.config import get_settings
from app.schemas.ontology import PublishOntologyVersionRequest, RecoveryImportBatch
from app.services.ontology import get_ontology_repository
from app.services.ontology_workbench import get_ontology_workbench_service


def test_recovery_batches_import_and_publish_expanded_restaurant_core():
    workbench = get_ontology_workbench_service()
    repository = get_ontology_repository()
    extraction_root = get_settings().ontology_root / "restaurant" / "workbench" / "extraction"

    batch_names = [
        "restaurant-signals-batch-001.json",
        "restaurant-failure-modes-batch-001.json",
        "restaurant-response-patterns-batch-001.json",
        "restaurant-blocks-batch-001.json",
        "restaurant-tools-batch-001.json",
        "restaurant-signal-failure-map-batch-001.json",
        "restaurant-failure-pattern-map-batch-001.json",
        "restaurant-pattern-block-map-batch-001.json",
    ]

    for batch_name in batch_names:
        payload = json.loads((extraction_root / batch_name).read_text(encoding="utf-8"))
        result = workbench.import_batch(RecoveryImportBatch.model_validate(payload), vertical="restaurant")
        assert result.ontology_id == "restaurant"

    overview = workbench.overview("restaurant")
    assert overview.counts_by_type["signals"] == 12
    assert overview.counts_by_map_type["signal_failure_map"] == 21

    publish_result = workbench.publish_version(
        PublishOntologyVersionRequest(
            version="v2",
            owner="recovery-team",
            source_version="v1",
            recovery_sources=[
                "OIS-Pre-Seed-Business-Case-Full.docx",
                "Operational Intelligence System (OIS) - Complete Feature and Function Deep Dive (2).docx",
                "compass_artifact_wf-e347607e-a3ae-4368-96f6-93ba04857d08_text_markdown.md",
            ],
        ),
        vertical="restaurant",
    )

    assert publish_result.counts == {
        "signals": 20,
        "failure_modes": 14,
        "response_patterns": 11,
        "blocks": 20,
        "tools": 20,
    }
    assert publish_result.promoted_maps["pattern_block_map"] == 16
    assert repository.summary(vertical="restaurant", version="v2").version == "v2"

    cascade = repository.signal_cascade("sig_bar_ticket_delay", "restaurant", version="v2")
    assert any(item.id == "fm_bar_workflow_breakdown" for item in cascade.failure_modes)
    assert any(item.id == "rp_bar_execution_reset" for item in cascade.response_patterns)
    assert any(item.id == "blk_bar_ticket_priority_lane" for item in cascade.blocks)
