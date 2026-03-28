from __future__ import annotations

from datetime import UTC, datetime

from fastapi.encoders import jsonable_encoder
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.domain import (
    Assessment,
    AuditEntry,
    CopilotMessage,
    CopilotThread,
    EngineRun,
    FileAsset,
    IntegrationEvent,
    OperationalPlan,
    Organization,
    PlanTask,
    ProgressEntry,
    User,
    UserSession,
    Venue,
    utc_now,
)
from app.schemas.domain import (
    OrganizationBackupReadinessRead,
    OrganizationDeleteReadinessRead,
    OrganizationExportBundleRead,
    OrganizationExportSummaryRead,
)
from app.services.audit import record_audit_entry


EXPORT_FORMAT_VERSION = "ois-export-v1"


def build_organization_export_summary(db: Session, *, organization: Organization) -> OrganizationExportSummaryRead:
    counts = _organization_entity_counts(db, organization_id=organization.id)
    return OrganizationExportSummaryRead(
        generated_at=utc_now(),
        organization_id=organization.id,
        organization_name=organization.name,
        entity_counts=counts,
        includes_file_content=False,
        export_ready=True,
        notes=[
            "Exports include structured metadata and operational records.",
            "File assets are exported as metadata only; binary content remains in storage.",
        ],
    )


def build_organization_delete_readiness(
    db: Session,
    *,
    organization: Organization,
) -> OrganizationDeleteReadinessRead:
    counts = _organization_entity_counts(db, organization_id=organization.id)
    now = utc_now()
    sessions = list(
        db.scalars(select(UserSession).where(UserSession.organization_id == organization.id).order_by(UserSession.created_at.asc())).all()
    )
    integration_events = list(
        db.scalars(
            select(IntegrationEvent).where(IntegrationEvent.organization_id == organization.id).order_by(IntegrationEvent.created_at.asc())
        ).all()
    )

    active_sessions = [
        session
        for session in sessions
        if session.revoked_at is None and _normalize_datetime(session.expires_at) > now
    ]
    active_integration_events = [
        event
        for event in integration_events
        if _is_delete_blocking_integration_event(event)
    ]

    blocking_conditions: list[str] = []
    if active_sessions:
        blocking_conditions.append(
            f"{len(active_sessions)} active session(s) still exist and should be revoked before a tenant wipe."
        )
    if active_integration_events:
        blocking_conditions.append(
            f"{len(active_integration_events)} integration event(s) are still active, retryable, or unresolved."
        )

    return OrganizationDeleteReadinessRead(
        generated_at=now,
        organization_id=organization.id,
        organization_name=organization.name,
        entity_counts=counts,
        delete_supported=False,
        delete_ready=not blocking_conditions,
        active_session_count=len(active_sessions),
        active_integration_event_count=len(active_integration_events),
        blocking_conditions=blocking_conditions,
        notes=[
            "Automated tenant deletion is not implemented yet; this is a readiness check, not a destructive action.",
            "File binaries still need storage-layer wipe coordination in addition to relational record deletion.",
        ],
    )


def build_organization_backup_readiness(
    db: Session,
    *,
    organization: Organization,
) -> OrganizationBackupReadinessRead:
    settings = get_settings()
    counts = _organization_entity_counts(db, organization_id=organization.id)
    integration_events = list(
        db.scalars(
            select(IntegrationEvent).where(IntegrationEvent.organization_id == organization.id).order_by(IntegrationEvent.created_at.asc())
        ).all()
    )

    retryable_integration_events = [
        event
        for event in integration_events
        if _is_delete_blocking_integration_event(event)
    ]

    file_asset_count = counts.get("file_assets", 0)
    file_binary_backup_ready = file_asset_count == 0 and settings.upload_backend != "local_disk"
    snapshot_export_ready = True
    restore_supported = False

    blocking_conditions = [
        "Automated backup scheduling and restore flows are not implemented yet."
    ]
    if file_asset_count:
        blocking_conditions.append(
            f"{file_asset_count} file asset(s) exist and still depend on storage-backend backup beyond the structured export bundle."
        )
    if retryable_integration_events:
        blocking_conditions.append(
            f"{len(retryable_integration_events)} integration event(s) are still retryable or unresolved, so a recovery snapshot may capture unstable ingest state."
        )
    if settings.upload_backend == "local_disk":
        blocking_conditions.append(
            "The current upload backend is local_disk, so binary file recovery still depends on host-level filesystem backup."
        )

    return OrganizationBackupReadinessRead(
        generated_at=utc_now(),
        organization_id=organization.id,
        organization_name=organization.name,
        entity_counts=counts,
        automated_backup_supported=False,
        backup_ready=False,
        snapshot_export_ready=snapshot_export_ready,
        restore_supported=restore_supported,
        file_binary_backup_ready=file_binary_backup_ready,
        file_asset_count=file_asset_count,
        retryable_integration_event_count=len(retryable_integration_events),
        upload_backend=settings.upload_backend,
        blocking_conditions=blocking_conditions,
        notes=[
            "Structured export gives a governed snapshot of tenant state, but it is not yet an automated backup schedule.",
            "Recovery remains incomplete until relational restore and binary-file recovery are both implemented and tested.",
        ],
    )


def build_organization_export_bundle(
    db: Session,
    *,
    organization: Organization,
    actor_user_id: str | None = None,
) -> OrganizationExportBundleRead:
    venues = list(db.scalars(select(Venue).where(Venue.organization_id == organization.id).order_by(Venue.created_at.asc())).all())
    users = list(db.scalars(select(User).where(User.organization_id == organization.id).order_by(User.created_at.asc())).all())
    user_sessions = list(
        db.scalars(select(UserSession).where(UserSession.organization_id == organization.id).order_by(UserSession.created_at.asc())).all()
    )
    venue_ids = [venue.id for venue in venues]
    user_ids = [user.id for user in users]

    assessments = list(
        db.scalars(select(Assessment).where(Assessment.venue_id.in_(venue_ids)).order_by(Assessment.created_at.asc())).all()
    ) if venue_ids else []
    engine_runs = list(
        db.scalars(select(EngineRun).where(EngineRun.venue_id.in_(venue_ids)).order_by(EngineRun.created_at.asc())).all()
    ) if venue_ids else []
    plans = list(
        db.scalars(select(OperationalPlan).where(OperationalPlan.venue_id.in_(venue_ids)).order_by(OperationalPlan.created_at.asc())).all()
    ) if venue_ids else []
    plan_ids = [plan.id for plan in plans]
    tasks = list(
        db.scalars(select(PlanTask).where(PlanTask.plan_id.in_(plan_ids)).order_by(PlanTask.order_index.asc())).all()
    ) if plan_ids else []
    progress_entries = list(
        db.scalars(select(ProgressEntry).where(ProgressEntry.venue_id.in_(venue_ids)).order_by(ProgressEntry.created_at.asc())).all()
    ) if venue_ids else []
    threads = list(
        db.scalars(select(CopilotThread).where(CopilotThread.organization_id == organization.id).order_by(CopilotThread.created_at.asc())).all()
    )
    thread_ids = [thread.id for thread in threads]
    messages = list(
        db.scalars(select(CopilotMessage).where(CopilotMessage.thread_id.in_(thread_ids)).order_by(CopilotMessage.created_at.asc())).all()
    ) if thread_ids else []
    file_assets = list(
        db.scalars(select(FileAsset).where(FileAsset.organization_id == organization.id).order_by(FileAsset.created_at.asc())).all()
    )
    integration_events = list(
        db.scalars(select(IntegrationEvent).where(IntegrationEvent.organization_id == organization.id).order_by(IntegrationEvent.created_at.asc())).all()
    )
    audit_entries = list(
        db.scalars(select(AuditEntry).where(AuditEntry.organization_id == organization.id).order_by(AuditEntry.created_at.asc())).all()
    )

    counts = _organization_entity_counts(db, organization_id=organization.id)
    data = {
        "organization": jsonable_encoder(organization),
        "users": jsonable_encoder(users),
        "user_sessions": jsonable_encoder(user_sessions),
        "venues": jsonable_encoder(venues),
        "assessments": jsonable_encoder(assessments),
        "engine_runs": jsonable_encoder(engine_runs),
        "operational_plans": jsonable_encoder(plans),
        "plan_tasks": jsonable_encoder(tasks),
        "progress_entries": jsonable_encoder(progress_entries),
        "copilot_threads": jsonable_encoder(threads),
        "copilot_messages": jsonable_encoder(messages),
        "file_assets": jsonable_encoder(file_assets),
        "integration_events": jsonable_encoder(integration_events),
        "audit_entries": jsonable_encoder(audit_entries),
    }

    record_audit_entry(
        db,
        organization_id=organization.id,
        actor_user_id=actor_user_id,
        entity_type="organization_export",
        entity_id=organization.id,
        action="generated",
        payload={
            "format_version": EXPORT_FORMAT_VERSION,
            "entity_counts": counts,
        },
    )

    return OrganizationExportBundleRead(
        generated_at=utc_now(),
        organization_id=organization.id,
        organization_slug=organization.slug,
        format_version=EXPORT_FORMAT_VERSION,
        entity_counts=counts,
        data=data,
    )


def _organization_entity_counts(db: Session, *, organization_id: str) -> dict[str, int]:
    venue_ids = list(
        db.scalars(select(Venue.id).where(Venue.organization_id == organization_id))
    )
    plan_ids = list(
        db.scalars(select(OperationalPlan.id).where(OperationalPlan.venue_id.in_(venue_ids)))
    ) if venue_ids else []
    thread_ids = list(
        db.scalars(select(CopilotThread.id).where(CopilotThread.organization_id == organization_id))
    )
    return {
        "users": len(list(db.scalars(select(User.id).where(User.organization_id == organization_id)))),
        "user_sessions": len(list(db.scalars(select(UserSession.id).where(UserSession.organization_id == organization_id)))),
        "venues": len(venue_ids),
        "assessments": len(list(db.scalars(select(Assessment.id).where(Assessment.venue_id.in_(venue_ids))))) if venue_ids else 0,
        "engine_runs": len(list(db.scalars(select(EngineRun.id).where(EngineRun.venue_id.in_(venue_ids))))) if venue_ids else 0,
        "operational_plans": len(plan_ids),
        "plan_tasks": len(list(db.scalars(select(PlanTask.id).where(PlanTask.plan_id.in_(plan_ids))))) if plan_ids else 0,
        "progress_entries": len(list(db.scalars(select(ProgressEntry.id).where(ProgressEntry.venue_id.in_(venue_ids))))) if venue_ids else 0,
        "copilot_threads": len(thread_ids),
        "copilot_messages": len(list(db.scalars(select(CopilotMessage.id).where(CopilotMessage.thread_id.in_(thread_ids))))) if thread_ids else 0,
        "file_assets": len(list(db.scalars(select(FileAsset.id).where(FileAsset.organization_id == organization_id)))),
        "integration_events": len(list(db.scalars(select(IntegrationEvent.id).where(IntegrationEvent.organization_id == organization_id)))),
        "audit_entries": len(list(db.scalars(select(AuditEntry.id).where(AuditEntry.organization_id == organization_id)))),
    }


def _is_delete_blocking_integration_event(event: IntegrationEvent) -> bool:
    status = event.status.lower()
    if status in {"normalized", "completed", "ignored"} and not event.next_retry_at and not event.error_message:
        return False
    return status in {"received", "failed", "errored", "retry_scheduled", "processing"} or bool(event.next_retry_at) or bool(
        event.error_message
    )


def _normalize_datetime(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)
