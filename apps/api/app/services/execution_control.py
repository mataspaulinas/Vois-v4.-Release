"""
Execution Control Layer (ECL) — Phase 3 core service.

Handles follow-ups, escalations, evidence, and next-action resolution.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.domain import (
    Escalation,
    EscalationSeverity,
    EscalationStatus,
    Evidence,
    FollowUp,
    FollowUpStatus,
    OperationalPlan,
    PlanStatus,
    PlanTask,
    ProgressEntryType,
    ProgressEntry,
    TaskEventType,
    TaskStatus,
    Venue,
    VenueStatus,
)
from app.schemas.domain import (
    EscalationRead,
    EvidenceRead,
    FollowUpRead,
    NextActionItem,
)
from app.services.audit import record_audit_entry
from app.services.task_history import record_task_event


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


# ─── Follow-ups ───


def create_follow_up(
    db: Session,
    *,
    venue_id: str,
    task_id: str,
    assigned_to: str | None,
    created_by: str | None,
    title: str,
    due_at: datetime,
    notes: str | None = None,
) -> FollowUpRead:
    from uuid import uuid4 as _uuid4

    follow_up_id = str(_uuid4())
    follow_up = FollowUp(
        id=follow_up_id,
        venue_id=venue_id,
        task_id=task_id,
        assigned_to=assigned_to,
        created_by=created_by,
        title=title,
        due_at=due_at,
        notes=notes,
    )
    db.add(follow_up)
    record_task_event(
        db,
        task_id=task_id,
        event_type=TaskEventType.FOLLOW_UP_CREATED,
        actor_user_id=created_by,
        note=title,
        payload={"due_at": due_at.isoformat()},
    )
    record_audit_entry(
        db,
        organization_id=_venue_org_id(db, venue_id),
        actor_user_id=created_by,
        entity_type="follow_up",
        entity_id=follow_up_id,
        action="created",
        payload={"task_id": task_id, "due_at": due_at.isoformat()},
    )
    db.commit()
    db.refresh(follow_up)
    return _serialize_follow_up(follow_up)


def list_follow_ups(db: Session, venue_id: str, *, overdue_only: bool = False) -> list[FollowUpRead]:
    now = _utc_now()
    query = (
        select(FollowUp)
        .where(FollowUp.venue_id == venue_id)
        .order_by(FollowUp.due_at.asc())
    )
    if overdue_only:
        query = query.where(
            FollowUp.status.in_([FollowUpStatus.PENDING, FollowUpStatus.ACKNOWLEDGED]),
            FollowUp.due_at < now,
        )
    follow_ups = list(db.scalars(query).all())

    # Mark overdue items in-memory for response
    results = []
    for fu in follow_ups:
        read = _serialize_follow_up(fu)
        due = fu.due_at.replace(tzinfo=timezone.utc) if fu.due_at.tzinfo is None else fu.due_at
        if fu.status in {FollowUpStatus.PENDING, FollowUpStatus.ACKNOWLEDGED} and due < now:
            read.is_overdue = True
        results.append(read)
    return results


def update_follow_up(
    db: Session,
    follow_up_id: str,
    *,
    status: FollowUpStatus | None = None,
    notes: str | None = None,
    actor_user_id: str | None = None,
) -> FollowUpRead:
    fu = db.get(FollowUp, follow_up_id)
    if fu is None:
        raise LookupError("Follow-up not found")

    now = _utc_now()

    if status is not None and status != fu.status:
        fu.status = status
        if status == FollowUpStatus.ACKNOWLEDGED:
            fu.acknowledged_at = now
        elif status == FollowUpStatus.COMPLETED:
            fu.completed_at = now
        elif status == FollowUpStatus.ESCALATED:
            fu.escalated_at = now

    if notes is not None:
        fu.notes = notes

    record_audit_entry(
        db,
        organization_id=_venue_org_id(db, fu.venue_id),
        actor_user_id=actor_user_id,
        entity_type="follow_up",
        entity_id=fu.id,
        action="updated",
        payload={"status": fu.status.value},
    )
    db.commit()
    db.refresh(fu)
    return _serialize_follow_up(fu)


def check_and_escalate_overdue(db: Session, venue_id: str, *, actor_user_id: str | None = None) -> list[EscalationRead]:
    """Check for overdue follow-ups and auto-generate escalations."""
    now = _utc_now()
    overdue = list(
        db.scalars(
            select(FollowUp)
            .where(
                FollowUp.venue_id == venue_id,
                FollowUp.status.in_([FollowUpStatus.PENDING, FollowUpStatus.ACKNOWLEDGED]),
                FollowUp.due_at < now,
            )
        ).all()
    )

    new_escalations = []
    for fu in overdue:
        # Check if already escalated
        existing = db.scalar(
            select(Escalation).where(
                Escalation.follow_up_id == fu.id,
                Escalation.status != EscalationStatus.RESOLVED,
            )
        )
        if existing:
            continue

        fu.status = FollowUpStatus.ESCALATED
        fu.escalated_at = now

        from uuid import uuid4 as _uuid4

        esc_id = str(_uuid4())
        escalation = Escalation(
            id=esc_id,
            venue_id=venue_id,
            follow_up_id=fu.id,
            task_id=fu.task_id,
            created_by=actor_user_id,
            severity=EscalationSeverity.MEDIUM,
            reason=f"Follow-up '{fu.title}' overdue since {fu.due_at.isoformat()}.",
        )
        db.add(escalation)

        db.add(
            ProgressEntry(
                venue_id=venue_id,
                entry_type=ProgressEntryType.RISK,
                summary=f"Escalation: follow-up '{fu.title}' overdue.",
                detail=f"Auto-escalated. Was due at {fu.due_at.isoformat()}.",
                status=VenueStatus.CRITICAL,
            )
        )
        record_task_event(
            db,
            task_id=fu.task_id,
            event_type=TaskEventType.ESCALATED,
            actor_user_id=actor_user_id,
            note=escalation.reason,
            payload={"follow_up_id": fu.id, "auto_generated": True},
        )

        record_audit_entry(
            db,
            organization_id=_venue_org_id(db, venue_id),
            actor_user_id=actor_user_id,
            entity_type="escalation",
            entity_id=esc_id,
            action="auto_created",
            payload={"follow_up_id": fu.id, "reason": escalation.reason},
        )
        new_escalations.append(escalation)

    if new_escalations:
        db.commit()
        for esc in new_escalations:
            db.refresh(esc)

    return [_serialize_escalation(e) for e in new_escalations]


# ─── Escalations ───


def create_escalation(
    db: Session,
    *,
    venue_id: str,
    follow_up_id: str | None,
    task_id: str | None,
    created_by: str | None,
    escalated_to: str | None,
    severity: EscalationSeverity,
    reason: str,
) -> EscalationRead:
    from uuid import uuid4 as _uuid4

    esc_id = str(_uuid4())
    escalation = Escalation(
        id=esc_id,
        venue_id=venue_id,
        follow_up_id=follow_up_id,
        task_id=task_id,
        created_by=created_by,
        escalated_to=escalated_to,
        severity=severity,
        reason=reason,
    )
    db.add(escalation)

    # If linked to a follow-up, mark it escalated
    if follow_up_id:
        fu = db.get(FollowUp, follow_up_id)
        if fu and fu.status != FollowUpStatus.ESCALATED:
            fu.status = FollowUpStatus.ESCALATED
            fu.escalated_at = _utc_now()

    db.add(
        ProgressEntry(
            venue_id=venue_id,
            entry_type=ProgressEntryType.RISK,
            summary=f"Escalation raised: {reason[:80]}",
            detail=f"Severity: {severity.value}. Follow-up: {follow_up_id or 'none'}. Task: {task_id or 'none'}.",
            status=VenueStatus.CRITICAL,
        )
    )
    if task_id is not None:
        record_task_event(
            db,
            task_id=task_id,
            event_type=TaskEventType.ESCALATED,
            actor_user_id=created_by,
            note=reason,
            payload={"follow_up_id": follow_up_id, "severity": severity.value},
        )
    record_audit_entry(
        db,
        organization_id=_venue_org_id(db, venue_id),
        actor_user_id=created_by,
        entity_type="escalation",
        entity_id=esc_id,
        action="created",
        payload={"severity": severity.value, "follow_up_id": follow_up_id, "task_id": task_id},
    )
    db.commit()
    db.refresh(escalation)
    return _serialize_escalation(escalation)


def list_escalations(db: Session, venue_id: str) -> list[EscalationRead]:
    escalations = list(
        db.scalars(
            select(Escalation)
            .where(Escalation.venue_id == venue_id)
            .order_by(Escalation.created_at.desc())
        ).all()
    )
    return [_serialize_escalation(e) for e in escalations]


def resolve_escalation(
    db: Session, escalation_id: str, *, resolution_notes: str, actor_user_id: str | None = None
) -> EscalationRead:
    esc = db.get(Escalation, escalation_id)
    if esc is None:
        raise LookupError("Escalation not found")

    esc.status = EscalationStatus.RESOLVED
    esc.resolved_at = _utc_now()
    esc.resolution_notes = resolution_notes

    record_audit_entry(
        db,
        organization_id=_venue_org_id(db, esc.venue_id),
        actor_user_id=actor_user_id,
        entity_type="escalation",
        entity_id=esc.id,
        action="resolved",
        payload={"resolution_notes": resolution_notes},
    )
    db.commit()
    db.refresh(esc)
    return _serialize_escalation(esc)


# ─── Evidence ───


def create_evidence(
    db: Session,
    *,
    venue_id: str,
    task_id: str | None,
    follow_up_id: str | None,
    created_by: str | None,
    title: str,
    description: str | None,
    evidence_type: str,
    file_asset_id: str | None,
) -> EvidenceRead:
    from uuid import uuid4 as _uuid4

    ev_id = str(_uuid4())
    ev = Evidence(
        id=ev_id,
        venue_id=venue_id,
        task_id=task_id,
        follow_up_id=follow_up_id,
        created_by=created_by,
        title=title,
        description=description,
        evidence_type=evidence_type,
        file_asset_id=file_asset_id,
    )
    db.add(ev)
    record_audit_entry(
        db,
        organization_id=_venue_org_id(db, venue_id),
        actor_user_id=created_by,
        entity_type="evidence",
        entity_id=ev_id,
        action="created",
        payload={"task_id": task_id, "evidence_type": evidence_type},
    )
    if task_id is not None:
        record_task_event(
            db,
            task_id=task_id,
            event_type=TaskEventType.DELIVERABLE_CHECKED,
            actor_user_id=created_by,
            note=title,
            payload={"evidence_id": ev_id, "evidence_type": evidence_type},
        )
    db.commit()
    db.refresh(ev)
    return _serialize_evidence(ev)


def list_evidence(db: Session, venue_id: str, *, task_id: str | None = None) -> list[EvidenceRead]:
    query = select(Evidence).where(Evidence.venue_id == venue_id)
    if task_id:
        query = query.where(Evidence.task_id == task_id)
    query = query.order_by(Evidence.created_at.desc())
    return [_serialize_evidence(e) for e in db.scalars(query).all()]


# ─── Next-action resolver ───


def resolve_next_actions(
    db: Session,
    venue_id: str,
    *,
    role: str | None = None,
    limit: int = 10,
) -> list[NextActionItem]:
    """
    Role-aware prioritized action list. Combines:
    1. Overdue follow-ups (highest priority)
    2. Open escalations
    3. Ready-to-execute tasks (not_started with no blocking deps)
    4. In-progress tasks
    """
    now = _utc_now()
    actions: list[NextActionItem] = []

    # 1. Overdue follow-ups
    overdue_fus = list(
        db.scalars(
            select(FollowUp)
            .where(
                FollowUp.venue_id == venue_id,
                FollowUp.status.in_([FollowUpStatus.PENDING, FollowUpStatus.ACKNOWLEDGED]),
                FollowUp.due_at < now,
            )
            .order_by(FollowUp.due_at.asc())
            .limit(limit)
        ).all()
    )
    for fu in overdue_fus:
        actions.append(NextActionItem(
            action_type="overdue_follow_up",
            entity_id=fu.id,
            title=fu.title,
            priority=1,
            context=f"Overdue since {fu.due_at.isoformat()}",
            due_at=fu.due_at,
            venue_id=venue_id,
        ))

    # 2. Open escalations
    open_escalations = list(
        db.scalars(
            select(Escalation)
            .where(
                Escalation.venue_id == venue_id,
                Escalation.status == EscalationStatus.OPEN,
            )
            .order_by(Escalation.created_at.asc())
            .limit(limit)
        ).all()
    )
    for esc in open_escalations:
        actions.append(NextActionItem(
            action_type="open_escalation",
            entity_id=esc.id,
            title=f"Escalation: {esc.reason[:60]}",
            priority=2,
            context=f"Severity: {esc.severity.value}",
            venue_id=venue_id,
        ))

    # 3. Pending follow-ups (not overdue)
    pending_fus = list(
        db.scalars(
            select(FollowUp)
            .where(
                FollowUp.venue_id == venue_id,
                FollowUp.status == FollowUpStatus.PENDING,
                FollowUp.due_at >= now,
            )
            .order_by(FollowUp.due_at.asc())
            .limit(limit)
        ).all()
    )
    for fu in pending_fus:
        actions.append(NextActionItem(
            action_type="pending_follow_up",
            entity_id=fu.id,
            title=fu.title,
            priority=3,
            context=f"Due at {fu.due_at.isoformat()}",
            due_at=fu.due_at,
            venue_id=venue_id,
        ))

    # 4. In-progress tasks
    in_progress = list(
        db.scalars(
            select(PlanTask)
            .join(OperationalPlan, OperationalPlan.id == PlanTask.plan_id)
            .where(
                OperationalPlan.venue_id == venue_id,
                OperationalPlan.status == PlanStatus.ACTIVE,
                PlanTask.status == TaskStatus.IN_PROGRESS,
            )
            .order_by(PlanTask.order_index.asc())
            .limit(limit)
        ).all()
    )
    for task in in_progress:
        actions.append(NextActionItem(
            action_type="in_progress_task",
            entity_id=task.id,
            title=task.title,
            priority=4,
            context="Currently in progress",
            venue_id=venue_id,
        ))

    # Sort by priority, then by due_at
    actions.sort(key=lambda a: (a.priority, a.due_at or now))
    return actions[:limit]


# ─── Helpers ───


def _venue_org_id(db: Session, venue_id: str) -> str | None:
    venue = db.get(Venue, venue_id)
    return venue.organization_id if venue else None


def _serialize_follow_up(fu: FollowUp) -> FollowUpRead:
    return FollowUpRead(
        id=fu.id,
        venue_id=fu.venue_id,
        task_id=fu.task_id,
        assigned_to=fu.assigned_to,
        created_by=fu.created_by,
        title=fu.title,
        status=fu.status,
        due_at=fu.due_at,
        acknowledged_at=fu.acknowledged_at,
        completed_at=fu.completed_at,
        escalated_at=fu.escalated_at,
        notes=fu.notes,
        created_at=fu.created_at,
    )


def _serialize_escalation(esc: Escalation) -> EscalationRead:
    return EscalationRead(
        id=esc.id,
        venue_id=esc.venue_id,
        follow_up_id=esc.follow_up_id,
        task_id=esc.task_id,
        created_by=esc.created_by,
        escalated_to=esc.escalated_to,
        severity=esc.severity,
        status=esc.status,
        reason=esc.reason,
        resolved_at=esc.resolved_at,
        resolution_notes=esc.resolution_notes,
        created_at=esc.created_at,
    )


def _serialize_evidence(ev: Evidence) -> EvidenceRead:
    return EvidenceRead(
        id=ev.id,
        venue_id=ev.venue_id,
        task_id=ev.task_id,
        follow_up_id=ev.follow_up_id,
        created_by=ev.created_by,
        title=ev.title,
        description=ev.description,
        evidence_type=ev.evidence_type,
        file_asset_id=ev.file_asset_id,
        created_at=ev.created_at,
    )
