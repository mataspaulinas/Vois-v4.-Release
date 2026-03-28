"""
Background scheduler for proactive operations.

Handles:
- Overdue follow-up reminders
- Auto-escalation of stale tasks
- Digest generation for daily summaries
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.domain import (
    Escalation,
    EscalationSeverity,
    EscalationStatus,
    FollowUp,
    FollowUpStatus,
    OperationalPlan,
    PlanTask,
    TaskStatus,
    Venue,
)
from app.services.audit import record_audit_entry

logger = logging.getLogger(__name__)


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


# ─── Overdue follow-up reminders ───


def scan_overdue_follow_ups(db: Session) -> list[dict]:
    """Find follow-ups past their due date that are still open."""
    now = _utc_now()
    stmt = (
        select(FollowUp)
        .where(FollowUp.status == FollowUpStatus.PENDING)
        .where(FollowUp.due_at < now)
    )
    overdue = db.scalars(stmt).all()

    reminders = []
    for fu in overdue:
        reminders.append({
            "type": "overdue_reminder",
            "follow_up_id": fu.id,
            "title": fu.title,
            "venue_id": fu.venue_id,
            "assigned_to": fu.assigned_to,
            "due_at": fu.due_at.isoformat() if fu.due_at else None,
            "days_overdue": (now - fu.due_at).days if fu.due_at else 0,
        })

    return reminders


# ─── Auto-escalation ───


def auto_escalate_stale_tasks(
    db: Session,
    *,
    stale_threshold_days: int = 7,
    created_by: str = "system:scheduler",
) -> list[dict]:
    """
    Auto-escalate tasks that have been in_progress for longer than
    the stale threshold without any progress entries.
    """
    now = _utc_now()
    cutoff = now - timedelta(days=stale_threshold_days)

    stmt = (
        select(PlanTask)
        .where(PlanTask.status == TaskStatus.IN_PROGRESS)
        .where(PlanTask.created_at < cutoff)
    )
    stale_tasks = db.scalars(stmt).all()

    escalations_created = []
    for task in stale_tasks:
        existing = db.scalars(
            select(Escalation)
            .where(Escalation.task_id == task.id)
            .where(Escalation.status == EscalationStatus.OPEN)
        ).first()

        if existing:
            continue

        plan = db.get(OperationalPlan, task.plan_id)
        venue_id = plan.venue_id if plan else ""

        escalation = Escalation(
            venue_id=venue_id,
            task_id=task.id,
            severity=EscalationSeverity.MEDIUM,
            status=EscalationStatus.OPEN,
            reason=(
                f"Auto-escalated: {task.title} stale for {stale_threshold_days}+ days. "
                f"Task has been in progress since "
                f"{task.created_at.isoformat() if task.created_at else 'unknown'} "
                f"with no recent movement. Review and unblock or reassign."
            ),
            created_by=created_by,
            created_at=now,
        )
        db.add(escalation)

        record_audit_entry(
            db,
            entity_type="escalation",
            entity_id=escalation.id,
            action="auto_escalated",
            actor=created_by,
            details={"task_id": task.id, "task_title": task.title, "stale_days": stale_threshold_days},
        )

        escalations_created.append({
            "type": "auto_escalation",
            "task_id": task.id,
            "task_title": task.title,
            "venue_id": venue_id,
            "escalation_id": escalation.id,
        })

    db.commit()
    return escalations_created


# ─── Digest generation ───


def generate_daily_digest(db: Session, venue_id: str) -> dict:
    """Generate a daily digest summary for a venue."""
    now = _utc_now()
    yesterday = now - timedelta(days=1)

    venue = db.get(Venue, venue_id)
    if not venue:
        return {"venue_id": venue_id, "error": "Venue not found"}

    overdue_stmt = (
        select(FollowUp)
        .where(FollowUp.venue_id == venue_id)
        .where(FollowUp.status == FollowUpStatus.PENDING)
        .where(FollowUp.due_at < now)
    )
    overdue_count = len(db.scalars(overdue_stmt).all())

    open_escalations_stmt = (
        select(Escalation)
        .where(Escalation.venue_id == venue_id)
        .where(Escalation.status == EscalationStatus.OPEN)
    )
    open_escalation_count = len(db.scalars(open_escalations_stmt).all())

    active_tasks_stmt = (
        select(PlanTask)
        .where(PlanTask.venue_id == venue_id)
        .where(PlanTask.status == TaskStatus.IN_PROGRESS)
    )
    active_task_count = len(db.scalars(active_tasks_stmt).all())

    blocked_tasks_stmt = (
        select(PlanTask)
        .where(PlanTask.venue_id == venue_id)
        .where(PlanTask.status == TaskStatus.BLOCKED)
    )
    blocked_task_count = len(db.scalars(blocked_tasks_stmt).all())

    return {
        "venue_id": venue_id,
        "venue_name": venue.name,
        "generated_at": now.isoformat(),
        "period_start": yesterday.isoformat(),
        "period_end": now.isoformat(),
        "overdue_follow_ups": overdue_count,
        "open_escalations": open_escalation_count,
        "active_tasks": active_task_count,
        "blocked_tasks": blocked_task_count,
        "summary": _compose_digest_summary(
            venue_name=venue.name,
            overdue=overdue_count,
            escalations=open_escalation_count,
            active=active_task_count,
            blocked=blocked_task_count,
        ),
    }


def _compose_digest_summary(
    *,
    venue_name: str,
    overdue: int,
    escalations: int,
    active: int,
    blocked: int,
) -> str:
    parts = [f"{venue_name} daily digest:"]

    if overdue > 0:
        parts.append(f"{overdue} overdue follow-up{'s' if overdue != 1 else ''} need attention.")
    if escalations > 0:
        parts.append(f"{escalations} open escalation{'s' if escalations != 1 else ''}.")
    if blocked > 0:
        parts.append(f"{blocked} task{'s' if blocked != 1 else ''} blocked.")
    if active > 0:
        parts.append(f"{active} task{'s' if active != 1 else ''} in progress.")

    if overdue == 0 and escalations == 0 and blocked == 0:
        parts.append("All clear — no issues requiring attention.")

    return " ".join(parts)


# ─── Scheduler runner ───


class BackgroundScheduler:
    """Simple background scheduler that runs periodic tasks."""

    def __init__(self, get_db_session):
        self._get_db_session = get_db_session
        self._running = False
        self._task = None

    async def start(self, interval_minutes: int = 30):
        """Start the background loop."""
        self._running = True
        self._task = asyncio.create_task(self._loop(interval_minutes))
        logger.info("Background scheduler started (interval=%dm)", interval_minutes)

    async def stop(self):
        """Stop the background loop."""
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("Background scheduler stopped")

    async def _loop(self, interval_minutes: int):
        while self._running:
            try:
                await self._tick()
            except Exception:
                logger.exception("Scheduler tick failed")
            await asyncio.sleep(interval_minutes * 60)

    async def _tick(self):
        db = self._get_db_session()
        try:
            reminders = scan_overdue_follow_ups(db)
            if reminders:
                logger.info("Found %d overdue follow-up reminders", len(reminders))

            escalations = auto_escalate_stale_tasks(db)
            if escalations:
                logger.info("Auto-escalated %d stale tasks", len(escalations))
        finally:
            db.close()
