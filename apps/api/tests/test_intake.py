from app.services.intake import IntakeService
from app.services.ontology import get_ontology_repository


def test_intake_preview_detects_signals_from_raw_observations():
    service = IntakeService(get_ontology_repository())
    preview = service.preview(
        raw_text=(
            "Guests complained about a long wait for service. "
            "Staff looked confused about table ownership. "
            "There was no pre-shift briefing."
        ),
        ontology_id="restaurant-legacy",
        version="v8",
    )

    signal_ids = {item.signal_id for item in preview.detected_signals}
    assert "sig_guest_complaints" in signal_ids
    assert "sig_service_delay" in signal_ids
    assert "sig_staff_confusion" in signal_ids
    assert "sig_shift_brief_missing" in signal_ids


def test_intake_preview_returns_unmapped_observations_when_no_signal_matches():
    service = IntakeService(get_ontology_repository())
    preview = service.preview(
        raw_text="Customers loved the music but the venue felt unusually cold near the entrance.",
        ontology_id="restaurant-legacy",
        version="v8",
    )

    assert preview.detected_signals == []
    assert preview.unmapped_observations != []
