from collections import Counter
from dataclasses import dataclass
from datetime import timezone, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.domain import IntegrationEvent, User, Venue, utc_now
from app.schemas.domain import (
    IntegrationConnectorRead,
    IntegrationEventCreateRequest,
    IntegrationHealthSummaryRead,
    IntegrationEventRead,
    IntegrationProviderPressureRead,
    IntegrationSummaryBucket,
    IntegrationEventStatusUpdateRequest,
    LightspeedConnectorEventRequest,
    SumUpConnectorEventRequest,
    TrivecConnectorEventRequest,
)
from app.services.audit import record_audit_entry


@dataclass(slots=True)
class ConnectorTranslation:
    canonical_event_type: str
    normalized_signal_ids: list[str]
    source_entity_id: str | None
    translation_notes: list[str]


LIGHTSPEED_CONNECTOR = IntegrationConnectorRead(
    provider="lightspeed",
    display_name="Lightspeed Starter Connector",
    status="starter",
    ingest_modes=["webhook", "manual_replay"],
    supported_event_types=[
        "ticket.closed",
        "inventory.count_variance",
        "inventory.item_unavailable",
        "device.offline",
        "shift.open",
    ],
    notes=[
        "Normalizes provider payloads into canonical integration events before the engine sees them.",
        "Uses lightweight signal heuristics for starter ingestion and keeps raw provider payloads auditable.",
    ],
)


SUMUP_CONNECTOR = IntegrationConnectorRead(
    provider="sumup",
    display_name="SumUp Starter Connector",
    status="starter",
    ingest_modes=["webhook", "manual_replay"],
    supported_event_types=[
        "payment.completed",
        "payment.delayed",
        "refund.created",
        "terminal.offline",
    ],
    notes=[
        "Translates payment-flow and terminal signals into canonical integration events before OIS interprets them.",
        "Focuses on payment delay, refund/loss posture, and terminal outage rather than attempting full payment analytics.",
    ],
)


TRIVEC_CONNECTOR = IntegrationConnectorRead(
    provider="trivec",
    display_name="Trivec Starter Connector",
    status="starter",
    ingest_modes=["webhook", "manual_replay"],
    supported_event_types=[
        "tap.offline",
        "pour.variance",
        "stock.depletion",
        "rush.volume_spike",
    ],
    notes=[
        "Translates bar and dispense-surface telemetry into canonical integration events before OIS interprets them.",
        "Focuses on tool outage, dispense variance, stock depletion, and rush absorption rather than full bar analytics.",
    ],
)


def list_connector_definitions() -> list[IntegrationConnectorRead]:
    return [LIGHTSPEED_CONNECTOR, SUMUP_CONNECTOR, TRIVEC_CONNECTOR]


def serialize_integration_event(event: IntegrationEvent) -> IntegrationEventRead:
    return IntegrationEventRead(
        id=event.id,
        organization_id=event.organization_id,
        venue_id=event.venue_id,
        provider=event.provider,
        event_type=event.event_type,
        external_event_id=event.external_event_id,
        source_entity_id=event.source_entity_id,
        ingest_mode=event.ingest_mode,
        status=event.status,
        payload=event.payload or {},
        normalized_signal_ids=event.normalized_signal_ids or [],
        attempt_count=event.attempt_count,
        last_attempted_at=event.last_attempted_at,
        next_retry_at=event.next_retry_at,
        occurred_at=event.occurred_at,
        error_message=event.error_message,
        processed_at=event.processed_at,
        created_at=event.created_at,
    )


def list_integration_events(
    db: Session,
    *,
    organization_id: str,
    venue_id: str | None = None,
    provider: str | None = None,
    status: str | None = None,
    limit: int = 50,
) -> list[IntegrationEventRead]:
    query = select(IntegrationEvent).where(IntegrationEvent.organization_id == organization_id)
    if venue_id is not None:
        query = query.where(IntegrationEvent.venue_id == venue_id)
    if provider is not None:
        query = query.where(IntegrationEvent.provider == provider)
    if status is not None:
        query = query.where(IntegrationEvent.status == status)

    events = list(
        db.scalars(query.order_by(IntegrationEvent.created_at.desc()).limit(limit)).all()
    )
    return [serialize_integration_event(event) for event in events]


def get_integration_event(db: Session, *, event_id: str) -> IntegrationEvent:
    event = db.get(IntegrationEvent, event_id)
    if event is None:
        raise LookupError("Integration event not found")
    return event


def build_integration_health_summary(
    db: Session,
    *,
    organization_id: str,
    venue_id: str | None = None,
) -> IntegrationHealthSummaryRead:
    query = select(IntegrationEvent).where(IntegrationEvent.organization_id == organization_id)
    if venue_id is not None:
        query = query.where(IntegrationEvent.venue_id == venue_id)

    events = list(db.scalars(query.order_by(IntegrationEvent.created_at.desc())).all())
    now = utc_now()
    status_counts = Counter(event.status for event in events)
    provider_counts = Counter(event.provider for event in events)
    retryable_events = [event for event in events if _is_retryable_event(event)]
    overdue_retry_events = [event for event in events if _is_overdue_retry(event, now=now)]
    stale_events = [event for event in events if _is_stale_event(event, now=now)]
    latest_failures = [
        serialize_integration_event(event)
        for event in events
        if _is_failure_like(event)
    ][:5]
    provider_pressure = _provider_pressure(events, now=now)

    return IntegrationHealthSummaryRead(
        generated_at=now,
        organization_id=organization_id,
        venue_id=venue_id,
        total_events=len(events),
        retryable_event_count=len(retryable_events),
        overdue_retry_count=len(overdue_retry_events),
        stale_event_count=len(stale_events),
        counts_by_status=[
            IntegrationSummaryBucket(key=key, count=count)
            for key, count in status_counts.most_common()
        ],
        counts_by_provider=[
            IntegrationSummaryBucket(key=key, count=count)
            for key, count in provider_counts.most_common()
        ],
        provider_pressure=provider_pressure,
        latest_failure_events=latest_failures,
    )


def ingest_integration_event(
    db: Session,
    *,
    venue: Venue,
    current_user: User,
    payload: IntegrationEventCreateRequest,
) -> tuple[IntegrationEventRead, bool]:
    existing = None
    if payload.external_event_id:
        existing = db.scalar(
            select(IntegrationEvent).where(
                IntegrationEvent.organization_id == venue.organization_id,
                IntegrationEvent.venue_id == venue.id,
                IntegrationEvent.provider == payload.provider,
                IntegrationEvent.external_event_id == payload.external_event_id,
            )
        )

    if existing is not None:
        record_audit_entry(
            db,
            organization_id=venue.organization_id,
            actor_user_id=current_user.id,
            entity_type="integration_event",
            entity_id=existing.id,
            action="duplicate_ignored",
            payload={
                "provider": existing.provider,
                "event_type": existing.event_type,
                "external_event_id": existing.external_event_id,
            },
        )
        return serialize_integration_event(existing), False

    event = IntegrationEvent(
        organization_id=venue.organization_id,
        venue_id=venue.id,
        provider=payload.provider,
        event_type=payload.event_type,
        external_event_id=payload.external_event_id,
        source_entity_id=payload.source_entity_id,
        ingest_mode=payload.ingest_mode,
        status="received",
        payload=payload.payload,
        attempt_count=1,
        last_attempted_at=utc_now(),
        occurred_at=payload.occurred_at,
    )
    db.add(event)
    db.flush()

    record_audit_entry(
        db,
        organization_id=venue.organization_id,
        actor_user_id=current_user.id,
        entity_type="integration_event",
        entity_id=event.id,
        action="ingested",
        payload={
            "provider": event.provider,
            "event_type": event.event_type,
            "external_event_id": event.external_event_id,
            "ingest_mode": event.ingest_mode,
        },
    )
    return serialize_integration_event(event), True


def translate_lightspeed_event(payload: LightspeedConnectorEventRequest) -> ConnectorTranslation:
    raw_payload = payload.payload or {}
    event_type = payload.event_type.strip().lower()
    normalized_signal_ids: set[str] = set()
    translation_notes: list[str] = []

    canonical_event_type = _canonical_lightspeed_event_type(event_type)
    source_entity_id = payload.source_entity_id or _resolve_lightspeed_source_entity_id(
        canonical_event_type,
        raw_payload,
    )

    if canonical_event_type == "ticket.closed":
        if _metric_at_least(raw_payload, 20, "delay_minutes", "wait_minutes", "promised_delay_minutes"):
            normalized_signal_ids.add("sig_promised_time_missed")
        if _metric_at_least(raw_payload, 8, "queue_growth", "rush_size", "ticket_backlog"):
            normalized_signal_ids.add("sig_demand_spike_unabsorbed")
        if _metric_at_least(raw_payload, 6, "unexpected_walk_ins", "walk_in_surge", "covers_delta"):
            normalized_signal_ids.add("sig_last_minute_volume_shift")
        if _metric_at_least(raw_payload, 8, "ticket_backlog", "open_ticket_count") or _metric_at_least(
            raw_payload,
            20,
            "open_ticket_minutes",
        ):
            normalized_signal_ids.add("sig_ticket_bottleneck")
        if _metric_at_least(raw_payload, 3, "void_count") or _metric_at_least(raw_payload, 0.05, "void_rate"):
            normalized_signal_ids.add("sig_voids_rising")

    if canonical_event_type in {"inventory.item_unavailable", "ticket.closed"} and _metric_at_least(
        raw_payload,
        1,
        "86_count",
        "item_unavailable_count",
    ):
        normalized_signal_ids.add("sig_86_surprise")

    if canonical_event_type == "inventory.count_variance" or _metric_at_least(
        raw_payload,
        1,
        "count_variance",
        "variance_units",
    ):
        normalized_signal_ids.add("sig_count_variance")

    if _metric_at_least(raw_payload, 1, "waste_count", "waste_amount", "waste_events"):
        normalized_signal_ids.add("sig_waste_spike")

    if canonical_event_type == "device.offline" or _truthy(
        raw_payload,
        "offline",
        "device_offline",
        "pos_offline",
        "printer_offline",
        "system_unavailable",
    ):
        normalized_signal_ids.add("sig_tool_or_system_unavailable")

    if _truthy(raw_payload, "workaround_active", "manual_mode", "fallback_process_active"):
        normalized_signal_ids.add("sig_workaround_is_normalized")

    if canonical_event_type == "shift.open" and _truthy(
        raw_payload,
        "required_inputs_missing",
        "preflight_failed",
        "setup_missing",
    ):
        normalized_signal_ids.add("sig_required_inputs_missing_at_start")

    if normalized_signal_ids:
        translation_notes.append("Starter Lightspeed heuristics matched one or more OIS signals.")
    else:
        translation_notes.append("No starter Lightspeed normalization rule matched this payload yet.")

    return ConnectorTranslation(
        canonical_event_type=canonical_event_type,
        normalized_signal_ids=sorted(normalized_signal_ids),
        source_entity_id=source_entity_id,
        translation_notes=translation_notes,
    )


def ingest_lightspeed_event(
    db: Session,
    *,
    venue: Venue,
    current_user: User,
    payload: LightspeedConnectorEventRequest,
) -> tuple[IntegrationEventRead, bool]:
    translation = translate_lightspeed_event(payload)
    event, created = ingest_integration_event(
        db,
        venue=venue,
        current_user=current_user,
        payload=IntegrationEventCreateRequest(
            venue_id=venue.id,
            provider="lightspeed",
            event_type=translation.canonical_event_type,
            external_event_id=payload.event_id,
            source_entity_id=translation.source_entity_id,
            ingest_mode="lightspeed_webhook",
            payload={
                "raw_event_type": payload.event_type,
                "location_id": payload.location_id,
                "translation_notes": translation.translation_notes,
                "raw_payload": payload.payload,
            },
            occurred_at=payload.occurred_at,
        ),
    )
    if not created:
        return event, False

    persisted = get_integration_event(db, event_id=event.id)
    updated = update_integration_event_status(
        db,
        event=persisted,
        current_user=current_user,
        payload=IntegrationEventStatusUpdateRequest(
            status="normalized",
            normalized_signal_ids=translation.normalized_signal_ids,
            error_message=None,
        ),
    )
    return updated, True


def translate_sumup_event(payload: SumUpConnectorEventRequest) -> ConnectorTranslation:
    raw_payload = payload.payload or {}
    event_type = payload.event_type.strip().lower()
    normalized_signal_ids: set[str] = set()
    translation_notes: list[str] = []

    canonical_event_type = _canonical_sumup_event_type(event_type)
    source_entity_id = payload.source_entity_id or _resolve_sumup_source_entity_id(
        canonical_event_type,
        payload.terminal_id,
        raw_payload,
    )

    if canonical_event_type in {"payment.completed", "payment.delayed"} and _metric_at_least(
        raw_payload,
        10,
        "delay_minutes",
        "payment_delay_minutes",
        "checkout_delay_minutes",
    ):
        normalized_signal_ids.add("sig_service_or_job_cycle_delay")

    if canonical_event_type == "payment.delayed" and _metric_at_least(
        raw_payload,
        4,
        "queue_growth",
        "pending_payment_count",
        "checkout_queue_size",
    ):
        normalized_signal_ids.add("sig_work_intake_not_prioritized")

    if canonical_event_type == "refund.created" or _metric_at_least(raw_payload, 1, "refund_count", "void_count"):
        normalized_signal_ids.add("sig_voids_rising")

    if canonical_event_type == "refund.created" and (
        _metric_at_least(raw_payload, 1, "unexplained_loss_count", "loss_events")
        or _metric_at_least(raw_payload, 0.03, "refund_rate", "loss_rate")
    ):
        normalized_signal_ids.add("sig_waste_loss_or_leakage_unexplained")

    if canonical_event_type == "terminal.offline" or _truthy(
        raw_payload,
        "offline",
        "terminal_offline",
        "reader_unavailable",
        "device_offline",
    ):
        normalized_signal_ids.add("sig_tool_or_system_unavailable")
        normalized_signal_ids.add("sig_equipment_or_asset_breaks_flow")

    if _truthy(raw_payload, "manual_mode", "fallback_process_active", "workaround_active"):
        normalized_signal_ids.add("sig_workaround_has_become_normal")

    if normalized_signal_ids:
        translation_notes.append("Starter SumUp heuristics matched one or more OIS signals.")
    else:
        translation_notes.append("No starter SumUp normalization rule matched this payload yet.")

    return ConnectorTranslation(
        canonical_event_type=canonical_event_type,
        normalized_signal_ids=sorted(normalized_signal_ids),
        source_entity_id=source_entity_id,
        translation_notes=translation_notes,
    )


def ingest_sumup_event(
    db: Session,
    *,
    venue: Venue,
    current_user: User,
    payload: SumUpConnectorEventRequest,
) -> tuple[IntegrationEventRead, bool]:
    translation = translate_sumup_event(payload)
    event, created = ingest_integration_event(
        db,
        venue=venue,
        current_user=current_user,
        payload=IntegrationEventCreateRequest(
            venue_id=venue.id,
            provider="sumup",
            event_type=translation.canonical_event_type,
            external_event_id=payload.event_id,
            source_entity_id=translation.source_entity_id,
            ingest_mode="sumup_webhook",
            payload={
                "raw_event_type": payload.event_type,
                "terminal_id": payload.terminal_id,
                "translation_notes": translation.translation_notes,
                "raw_payload": payload.payload,
            },
            occurred_at=payload.occurred_at,
        ),
    )
    if not created:
        return event, False

    persisted = get_integration_event(db, event_id=event.id)
    updated = update_integration_event_status(
        db,
        event=persisted,
        current_user=current_user,
        payload=IntegrationEventStatusUpdateRequest(
            status="normalized",
            normalized_signal_ids=translation.normalized_signal_ids,
            error_message=None,
        ),
    )
    return updated, True


def translate_trivec_event(payload: TrivecConnectorEventRequest) -> ConnectorTranslation:
    raw_payload = payload.payload or {}
    event_type = payload.event_type.strip().lower()
    normalized_signal_ids: set[str] = set()
    translation_notes: list[str] = []

    canonical_event_type = _canonical_trivec_event_type(event_type)
    source_entity_id = payload.source_entity_id or _resolve_trivec_source_entity_id(
        canonical_event_type,
        payload.terminal_id,
        raw_payload,
    )

    if canonical_event_type == "beverage.line_offline" or _truthy(
        raw_payload,
        "offline",
        "line_offline",
        "tap_offline",
        "device_offline",
    ):
        normalized_signal_ids.add("sig_tool_or_system_unavailable")
        normalized_signal_ids.add("sig_equipment_or_asset_breaks_flow")

    if canonical_event_type == "beverage.dispense_variance" or _metric_at_least(
        raw_payload,
        1,
        "variance_units",
        "pour_variance",
        "dispense_variance",
        "loss_units",
    ):
        normalized_signal_ids.add("sig_waste_loss_or_leakage_unexplained")
        normalized_signal_ids.add("sig_stock_or_input_inaccuracy")

    if canonical_event_type == "inventory.item_unavailable" or _metric_at_least(
        raw_payload,
        1,
        "stockout_count",
        "depleted_lines",
        "item_unavailable_count",
    ):
        normalized_signal_ids.add("sig_86_surprise")
        normalized_signal_ids.add("sig_stock_or_input_inaccuracy")

    if canonical_event_type == "rush.volume_spike":
        normalized_signal_ids.add("sig_demand_spike_unabsorbed")
        if _metric_at_least(raw_payload, 4, "unexpected_group_count", "walk_in_surge", "volume_delta"):
            normalized_signal_ids.add("sig_last_minute_volume_shift")
        if _metric_at_least(raw_payload, 10, "queue_minutes", "delay_minutes", "service_delay_minutes"):
            normalized_signal_ids.add("sig_service_or_job_cycle_delay")

    if _truthy(raw_payload, "manual_override", "fallback_process_active", "workaround_active"):
        normalized_signal_ids.add("sig_workaround_has_become_normal")

    if normalized_signal_ids:
        translation_notes.append("Starter Trivec heuristics matched one or more OIS signals.")
    else:
        translation_notes.append("No starter Trivec normalization rule matched this payload yet.")

    return ConnectorTranslation(
        canonical_event_type=canonical_event_type,
        normalized_signal_ids=sorted(normalized_signal_ids),
        source_entity_id=source_entity_id,
        translation_notes=translation_notes,
    )


def ingest_trivec_event(
    db: Session,
    *,
    venue: Venue,
    current_user: User,
    payload: TrivecConnectorEventRequest,
) -> tuple[IntegrationEventRead, bool]:
    translation = translate_trivec_event(payload)
    event, created = ingest_integration_event(
        db,
        venue=venue,
        current_user=current_user,
        payload=IntegrationEventCreateRequest(
            venue_id=venue.id,
            provider="trivec",
            event_type=translation.canonical_event_type,
            external_event_id=payload.event_id,
            source_entity_id=translation.source_entity_id,
            ingest_mode="trivec_webhook",
            payload={
                "raw_event_type": payload.event_type,
                "terminal_id": payload.terminal_id,
                "translation_notes": translation.translation_notes,
                "raw_payload": payload.payload,
            },
            occurred_at=payload.occurred_at,
        ),
    )
    if not created:
        return event, False

    persisted = get_integration_event(db, event_id=event.id)
    updated = update_integration_event_status(
        db,
        event=persisted,
        current_user=current_user,
        payload=IntegrationEventStatusUpdateRequest(
            status="normalized",
            normalized_signal_ids=translation.normalized_signal_ids,
            error_message=None,
        ),
    )
    return updated, True


def update_integration_event_status(
    db: Session,
    *,
    event: IntegrationEvent,
    current_user: User,
    payload: IntegrationEventStatusUpdateRequest,
) -> IntegrationEventRead:
    now = utc_now()
    normalized_status = payload.status.lower()
    event.status = payload.status
    event.normalized_signal_ids = payload.normalized_signal_ids
    event.error_message = payload.error_message
    event.processed_at = now if normalized_status not in {"received", "retry_scheduled"} else None
    if normalized_status in {"failed", "errored"}:
        event.next_retry_at = now + timedelta(minutes=15)
        event.last_attempted_at = now
    elif normalized_status == "retry_scheduled":
        event.next_retry_at = event.next_retry_at or (now + timedelta(minutes=15))
    else:
        event.next_retry_at = None
        if normalized_status != "received":
            event.last_attempted_at = now

    record_audit_entry(
        db,
        organization_id=event.organization_id,
        actor_user_id=current_user.id,
        entity_type="integration_event",
        entity_id=event.id,
        action="status_updated",
        payload={
            "status": event.status,
            "normalized_signal_ids": event.normalized_signal_ids,
            "error_message": event.error_message,
        },
    )
    return serialize_integration_event(event)


def retry_integration_event(
    db: Session,
    *,
    event: IntegrationEvent,
    current_user: User,
) -> IntegrationEventRead:
    event.attempt_count += 1
    event.last_attempted_at = utc_now()
    event.next_retry_at = None
    event.error_message = None

    if event.provider == "lightspeed":
        raw_event_type = str((event.payload or {}).get("raw_event_type") or event.event_type)
        raw_payload = (event.payload or {}).get("raw_payload")
        if isinstance(raw_payload, dict):
            translation = translate_lightspeed_event(
                LightspeedConnectorEventRequest(
                    venue_id=event.venue_id,
                    event_id=event.external_event_id or event.id,
                    event_type=raw_event_type,
                    occurred_at=event.occurred_at,
                    location_id=(event.payload or {}).get("location_id"),
                    source_entity_id=event.source_entity_id,
                    payload=raw_payload,
                )
            )
            event.event_type = translation.canonical_event_type
            event.source_entity_id = translation.source_entity_id or event.source_entity_id
            event.normalized_signal_ids = translation.normalized_signal_ids
            event.status = "normalized"
            event.processed_at = utc_now()
            event.payload = {
                **(event.payload or {}),
                "translation_notes": translation.translation_notes,
                "raw_event_type": raw_event_type,
                "raw_payload": raw_payload,
            }
        else:
            event.status = "received"
            event.processed_at = None
    elif event.provider == "sumup":
        raw_event_type = str((event.payload or {}).get("raw_event_type") or event.event_type)
        raw_payload = (event.payload or {}).get("raw_payload")
        if isinstance(raw_payload, dict):
            translation = translate_sumup_event(
                SumUpConnectorEventRequest(
                    venue_id=event.venue_id,
                    event_id=event.external_event_id or event.id,
                    event_type=raw_event_type,
                    occurred_at=event.occurred_at,
                    terminal_id=(event.payload or {}).get("terminal_id"),
                    source_entity_id=event.source_entity_id,
                    payload=raw_payload,
                )
            )
            event.event_type = translation.canonical_event_type
            event.source_entity_id = translation.source_entity_id or event.source_entity_id
            event.normalized_signal_ids = translation.normalized_signal_ids
            event.status = "normalized"
            event.processed_at = utc_now()
            event.payload = {
                **(event.payload or {}),
                "translation_notes": translation.translation_notes,
                "raw_event_type": raw_event_type,
                "raw_payload": raw_payload,
            }
        else:
            event.status = "received"
            event.processed_at = None
    elif event.provider == "trivec":
        raw_event_type = str((event.payload or {}).get("raw_event_type") or event.event_type)
        raw_payload = (event.payload or {}).get("raw_payload")
        if isinstance(raw_payload, dict):
            translation = translate_trivec_event(
                TrivecConnectorEventRequest(
                    venue_id=event.venue_id,
                    event_id=event.external_event_id or event.id,
                    event_type=raw_event_type,
                    occurred_at=event.occurred_at,
                    terminal_id=(event.payload or {}).get("terminal_id"),
                    source_entity_id=event.source_entity_id,
                    payload=raw_payload,
                )
            )
            event.event_type = translation.canonical_event_type
            event.source_entity_id = translation.source_entity_id or event.source_entity_id
            event.normalized_signal_ids = translation.normalized_signal_ids
            event.status = "normalized"
            event.processed_at = utc_now()
            event.payload = {
                **(event.payload or {}),
                "translation_notes": translation.translation_notes,
                "raw_event_type": raw_event_type,
                "raw_payload": raw_payload,
            }
        else:
            event.status = "received"
            event.processed_at = None
    else:
        event.status = "received"
        event.processed_at = None

    record_audit_entry(
        db,
        organization_id=event.organization_id,
        actor_user_id=current_user.id,
        entity_type="integration_event",
        entity_id=event.id,
        action="retried",
        payload={
            "provider": event.provider,
            "status": event.status,
            "attempt_count": event.attempt_count,
        },
    )
    return serialize_integration_event(event)


def _canonical_lightspeed_event_type(event_type: str) -> str:
    event_type_map = {
        "sale.completed": "ticket.closed",
        "ticket.closed": "ticket.closed",
        "check.closed": "ticket.closed",
        "inventory.variance": "inventory.count_variance",
        "inventory.count_variance": "inventory.count_variance",
        "inventory.item_out": "inventory.item_unavailable",
        "inventory.item_unavailable": "inventory.item_unavailable",
        "device.offline": "device.offline",
        "pos.device.offline": "device.offline",
        "printer.offline": "device.offline",
        "shift.open": "shift.open",
        "operations.shift.open": "shift.open",
    }
    return event_type_map.get(event_type, event_type)


def _canonical_sumup_event_type(event_type: str) -> str:
    event_type_map = {
        "payment.successful": "payment.completed",
        "payment.completed": "payment.completed",
        "payment.delayed": "payment.delayed",
        "checkout.slow": "payment.delayed",
        "refund.created": "refund.created",
        "refund.issued": "refund.created",
        "terminal.offline": "terminal.offline",
        "reader.offline": "terminal.offline",
    }
    return event_type_map.get(event_type, event_type)


def _canonical_trivec_event_type(event_type: str) -> str:
    event_type_map = {
        "tap.offline": "beverage.line_offline",
        "line.offline": "beverage.line_offline",
        "device.offline": "beverage.line_offline",
        "pour.variance": "beverage.dispense_variance",
        "dispense.variance": "beverage.dispense_variance",
        "stock.depletion": "inventory.item_unavailable",
        "item.unavailable": "inventory.item_unavailable",
        "rush.volume_spike": "rush.volume_spike",
        "volume.spike": "rush.volume_spike",
    }
    return event_type_map.get(event_type, event_type)


def _resolve_lightspeed_source_entity_id(canonical_event_type: str, payload: dict[str, object]) -> str | None:
    if canonical_event_type == "ticket.closed":
        return _string_value(payload, "ticket_id", "check_id", "sale_id")
    if canonical_event_type in {"inventory.count_variance", "inventory.item_unavailable"}:
        return _string_value(payload, "item_id", "sku", "inventory_record_id")
    if canonical_event_type == "device.offline":
        return _string_value(payload, "device_id", "printer_id", "station_id")
    return _string_value(payload, "event_entity_id")


def _resolve_sumup_source_entity_id(
    canonical_event_type: str,
    terminal_id: str | None,
    payload: dict[str, object],
) -> str | None:
    if canonical_event_type in {"payment.completed", "payment.delayed"}:
        return _string_value(payload, "transaction_id", "payment_id", "checkout_id")
    if canonical_event_type == "refund.created":
        return _string_value(payload, "refund_id", "transaction_id", "payment_id")
    if canonical_event_type == "terminal.offline":
        return terminal_id or _string_value(payload, "terminal_id", "reader_id", "device_id")
    return _string_value(payload, "event_entity_id")


def _resolve_trivec_source_entity_id(
    canonical_event_type: str,
    terminal_id: str | None,
    payload: dict[str, object],
) -> str | None:
    if canonical_event_type == "beverage.line_offline":
        return terminal_id or _string_value(payload, "tap_id", "line_id", "device_id")
    if canonical_event_type == "beverage.dispense_variance":
        return _string_value(payload, "pour_id", "tap_id", "line_id")
    if canonical_event_type == "inventory.item_unavailable":
        return _string_value(payload, "item_id", "sku", "line_id")
    if canonical_event_type == "rush.volume_spike":
        return terminal_id or _string_value(payload, "zone_id", "bar_id", "station_id")
    return _string_value(payload, "event_entity_id")


def _string_value(payload: dict[str, object], *keys: str) -> str | None:
    for key in keys:
        value = payload.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


def _metric_at_least(payload: dict[str, object], threshold: float, *keys: str) -> bool:
    for key in keys:
        value = payload.get(key)
        if isinstance(value, bool):
            continue
        if isinstance(value, (int, float)) and float(value) >= threshold:
            return True
        if isinstance(value, str):
            try:
                if float(value.strip()) >= threshold:
                    return True
            except ValueError:
                continue
    return False


def _truthy(payload: dict[str, object], *keys: str) -> bool:
    truthy_values = {"true", "1", "yes", "y", "on"}
    for key in keys:
        value = payload.get(key)
        if isinstance(value, bool) and value:
            return True
        if isinstance(value, str) and value.strip().lower() in truthy_values:
            return True
    return False


def _is_failure_like(event: IntegrationEvent) -> bool:
    return event.status.lower() in {"failed", "errored", "retry_scheduled"} or bool(event.error_message)


def _is_retryable_event(event: IntegrationEvent) -> bool:
    return _is_failure_like(event)


def _is_overdue_retry(event: IntegrationEvent, *, now) -> bool:
    retry_at = _coerce_utc_datetime(event.next_retry_at)
    return retry_at is not None and retry_at <= now


def _is_stale_event(event: IntegrationEvent, *, now) -> bool:
    if not _needs_attention(event):
        return False
    reference_time = _coerce_utc_datetime(event.last_attempted_at or event.occurred_at or event.created_at)
    if reference_time is None:
        return False
    return reference_time <= now - timedelta(minutes=30)


def _needs_attention(event: IntegrationEvent) -> bool:
    status = event.status.lower()
    return status in {"received", "processing", "failed", "errored", "retry_scheduled"} or bool(event.error_message)


def _provider_pressure(events: list[IntegrationEvent], *, now) -> list[IntegrationProviderPressureRead]:
    grouped: dict[str, list[IntegrationEvent]] = {}
    for event in events:
        grouped.setdefault(event.provider, []).append(event)

    pressure: list[IntegrationProviderPressureRead] = []
    for provider, provider_events in grouped.items():
        latest_event_at = max((event.occurred_at or event.created_at) for event in provider_events)
        entry = IntegrationProviderPressureRead(
            provider=provider,
            total_events=len(provider_events),
            failure_like_count=sum(1 for event in provider_events if _is_failure_like(event)),
            retryable_count=sum(1 for event in provider_events if _is_retryable_event(event)),
            overdue_retry_count=sum(1 for event in provider_events if _is_overdue_retry(event, now=now)),
            stale_event_count=sum(1 for event in provider_events if _is_stale_event(event, now=now)),
            latest_event_at=latest_event_at,
        )
        pressure.append(entry)

    return sorted(
        pressure,
        key=lambda item: (
            item.overdue_retry_count,
            item.stale_event_count,
            item.retryable_count,
            item.failure_like_count,
            item.total_events,
            item.latest_event_at or utc_now(),
        ),
        reverse=True,
    )


def _coerce_utc_datetime(value):
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)
