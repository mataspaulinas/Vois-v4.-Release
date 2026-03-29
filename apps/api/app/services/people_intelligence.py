"""People intelligence service — behavioral analysis from execution data."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.domain import (
    AuthRole,
    Escalation,
    EscalationStatus,
    Evidence,
    FollowUp,
    FollowUpStatus,
    OrganizationMembership,
    OperationalPlan,
    PlanTask,
    ProgressEntry,
    TaskStatus,
    User,
    Venue,
    VenueAccessAssignment,
    utc_now,
)
from app.services.plans import _active_plan_model_for_venue


def get_team_profiles(db: Session, venue_id: str) -> list[dict[str, Any]]:
    """Build team member profiles with execution metrics."""
    venue = db.get(Venue, venue_id)
    if not venue:
        return []

    assigned_user_ids = list(
        db.scalars(
            select(VenueAccessAssignment.user_id).where(
                VenueAccessAssignment.venue_id == venue_id,
                VenueAccessAssignment.is_active == True,
            )
        ).all()
    )
    owner_user_ids = list(
        db.scalars(
            select(OrganizationMembership.user_id).where(
                OrganizationMembership.organization_id == venue.organization_id,
                OrganizationMembership.is_active == True,
                OrganizationMembership.role_claim == AuthRole.OWNER,
            )
        ).all()
    )
    all_user_ids = list(dict.fromkeys([*assigned_user_ids, *owner_user_ids]))
    all_users = list(
        db.scalars(
            select(User)
            .where(User.id.in_(all_user_ids))
            .where(User.is_active == True)
            .order_by(User.created_at.asc())
        ).all()
    ) if all_user_ids else []
    profiles = []

    for user in all_users:
        # Follow-up stats
        follow_ups = db.scalars(
            select(FollowUp)
            .where(FollowUp.venue_id == venue_id)
            .where(FollowUp.assigned_to == user.id)
        ).all()
        now = utc_now()
        overdue_count = sum(1 for fu in follow_ups if fu.status in ("pending", "acknowledged") and fu.due_at and fu.due_at.replace(tzinfo=now.tzinfo) <= now)
        completed_fus = sum(1 for fu in follow_ups if fu.status == "completed")

        # Escalation stats
        escalations_created = db.scalar(
            select(func.count(Escalation.id))
            .where(Escalation.venue_id == venue_id)
            .where(Escalation.created_by == user.id)
        ) or 0

        # Evidence count
        evidence_count = db.scalar(
            select(func.count(Evidence.id))
            .where(Evidence.venue_id == venue_id)
            .where(Evidence.created_by == user.id)
        ) or 0

        # Progress entries (diary + reports)
        diary_count = db.scalar(
            select(func.count(ProgressEntry.id))
            .where(ProgressEntry.venue_id == venue_id)
            .where(ProgressEntry.created_by == user.id)
        ) or 0

        # Friction reports from this user
        friction_count = db.scalar(
            select(func.count(ProgressEntry.id))
            .where(ProgressEntry.venue_id == venue_id)
            .where(ProgressEntry.created_by == user.id)
            .where(ProgressEntry.summary.like("%[Friction report]%"))
        ) or 0

        profiles.append({
            "user_id": user.id,
            "full_name": user.full_name,
            "role": user.role.value,
            "follow_ups_total": len(follow_ups),
            "follow_ups_overdue": overdue_count,
            "follow_ups_completed": completed_fus,
            "escalations_created": escalations_created,
            "evidence_submitted": evidence_count,
            "diary_entries": diary_count,
            "friction_reports": friction_count,
        })

    return profiles


def get_overload_map(db: Session, venue_id: str) -> list[dict[str, Any]]:
    """Identify team members who may be overloaded."""
    profiles = get_team_profiles(db, venue_id)
    overloaded = []

    for profile in profiles:
        risk_score = 0
        risk_factors = []

        if profile["follow_ups_overdue"] >= 3:
            risk_score += 3
            risk_factors.append(f"{profile['follow_ups_overdue']} overdue follow-ups")
        elif profile["follow_ups_overdue"] >= 1:
            risk_score += 1
            risk_factors.append(f"{profile['follow_ups_overdue']} overdue follow-up(s)")

        if profile["escalations_created"] >= 3:
            risk_score += 2
            risk_factors.append(f"{profile['escalations_created']} escalations created")

        if profile["follow_ups_total"] >= 5 and profile["follow_ups_completed"] == 0:
            risk_score += 2
            risk_factors.append("No follow-ups completed despite many assigned")

        if risk_score > 0:
            overloaded.append({
                "user_id": profile["user_id"],
                "full_name": profile["full_name"],
                "role": profile["role"],
                "risk_score": risk_score,
                "risk_level": "high" if risk_score >= 4 else "medium" if risk_score >= 2 else "low",
                "risk_factors": risk_factors,
            })

    overloaded.sort(key=lambda x: x["risk_score"], reverse=True)
    return overloaded


def get_flight_risk_indicators(db: Session, venue_id: str) -> list[dict[str, Any]]:
    """Identify team members showing disengagement patterns (P023)."""
    profiles = get_team_profiles(db, venue_id)
    at_risk = []

    for profile in profiles:
        signals = []
        score = 0

        # Diary silence (P007)
        if profile["diary_entries"] == 0 and profile["role"] == "employee":
            signals.append("No diary entries — possible disengagement")
            score += 1

        # High friction + low completion (P023 composite)
        if profile["friction_reports"] >= 2:
            signals.append(f"{profile['friction_reports']} friction reports filed")
            score += 1

        if profile["follow_ups_overdue"] >= 2 and profile["evidence_submitted"] == 0:
            signals.append("Overdue work with no evidence — reduced effort")
            score += 2

        if score >= 2:
            at_risk.append({
                "user_id": profile["user_id"],
                "full_name": profile["full_name"],
                "role": profile["role"],
                "flight_risk_score": score,
                "risk_level": "high" if score >= 3 else "medium",
                "signals": signals,
            })

    at_risk.sort(key=lambda x: x["flight_risk_score"], reverse=True)
    return at_risk


def get_venue_execution_velocity(db: Session, venue_id: str) -> dict[str, Any]:
    """Calculate execution velocity metrics for a venue."""
    plan = _active_plan_model_for_venue(db, venue_id)

    if not plan:
        return {
            "venue_id": venue_id,
            "has_plan": False,
            "total_tasks": 0,
            "completed_tasks": 0,
            "in_progress_tasks": 0,
            "blocked_tasks": 0,
            "completion_percentage": 0.0,
            "velocity_label": "no plan",
        }

    tasks = db.scalars(
        select(PlanTask).where(PlanTask.plan_id == plan.id)
    ).all()

    total = len(tasks)
    completed = sum(1 for t in tasks if t.status == TaskStatus.COMPLETED)
    in_progress = sum(1 for t in tasks if t.status == TaskStatus.IN_PROGRESS)
    blocked = sum(1 for t in tasks if t.status == TaskStatus.BLOCKED)
    pct = (completed / total * 100) if total > 0 else 0.0

    if pct >= 80:
        label = "strong"
    elif pct >= 50:
        label = "steady"
    elif pct >= 20:
        label = "building"
    elif in_progress > 0:
        label = "starting"
    else:
        label = "stalled"

    return {
        "venue_id": venue_id,
        "has_plan": True,
        "total_tasks": total,
        "completed_tasks": completed,
        "in_progress_tasks": in_progress,
        "blocked_tasks": blocked,
        "completion_percentage": round(pct, 1),
        "velocity_label": label,
    }


def get_active_delegations(db: Session, venue_id: str) -> list[dict[str, Any]]:
    """Get active delegations — tasks assigned through follow-ups with evidence."""
    follow_ups = db.scalars(
        select(FollowUp)
        .where(FollowUp.venue_id == venue_id)
        .where(FollowUp.status.in_(["pending", "acknowledged"]))
        .order_by(FollowUp.due_at)
    ).all()

    now = utc_now()
    delegations = []
    for fu in follow_ups:
        task = db.get(PlanTask, fu.task_id) if fu.task_id else None
        evidence_count = db.scalar(
            select(func.count(Evidence.id))
            .where(Evidence.follow_up_id == fu.id)
        ) or 0

        delegations.append({
            "follow_up_id": fu.id,
            "task_id": fu.task_id,
            "task_title": task.title if task else None,
            "title": fu.title,
            "status": fu.status.value,
            "assigned_to": fu.assigned_to,
            "due_at": fu.due_at.isoformat(),
            "is_overdue": fu.due_at.replace(tzinfo=now.tzinfo) <= now if fu.due_at else False,
            "evidence_count": evidence_count,
        })

    return delegations


def get_attention_items(db: Session, venue_ids: list[str]) -> list[dict[str, Any]]:
    """Get top attention items across venues for the command center."""
    items: list[dict[str, Any]] = []
    now = utc_now()

    for venue_id in venue_ids:
        venue = db.get(Venue, venue_id)
        if not venue:
            continue

        # Critical/high escalations
        critical_escs = db.scalars(
            select(Escalation)
            .where(Escalation.venue_id == venue_id)
            .where(Escalation.status == EscalationStatus.OPEN)
            .where(Escalation.severity.in_(["critical", "high"]))
        ).all()
        for esc in critical_escs:
            items.append({
                "type": "escalation",
                "severity": esc.severity.value,
                "venue_id": venue_id,
                "venue_name": venue.name,
                "entity_id": esc.id,
                "title": f"Open {esc.severity.value} escalation",
                "detail": esc.reason[:120],
                "created_at": esc.created_at.isoformat(),
                "priority": 1 if esc.severity.value == "critical" else 2,
            })

        # Overdue follow-ups (across all)
        overdue_fus = db.scalars(
            select(FollowUp)
            .where(FollowUp.venue_id == venue_id)
            .where(FollowUp.status.in_(["pending", "acknowledged"]))
            .where(FollowUp.due_at <= now)
        ).all()
        if overdue_fus:
            items.append({
                "type": "overdue_cluster",
                "severity": "high" if len(overdue_fus) >= 3 else "medium",
                "venue_id": venue_id,
                "venue_name": venue.name,
                "entity_id": venue_id,
                "title": f"{len(overdue_fus)} overdue follow-up{'s' if len(overdue_fus) > 1 else ''}",
                "detail": f"Oldest: {overdue_fus[0].title}",
                "created_at": overdue_fus[0].due_at.isoformat(),
                "priority": 3,
            })

        # Stalled execution
        velocity = get_venue_execution_velocity(db, venue_id)
        if velocity["has_plan"] and velocity["velocity_label"] == "stalled":
            items.append({
                "type": "stalled_execution",
                "severity": "medium",
                "venue_id": venue_id,
                "venue_name": venue.name,
                "entity_id": venue_id,
                "title": "Execution stalled",
                "detail": f"{velocity['total_tasks']} tasks, none in progress or completed",
                "created_at": now.isoformat(),
                "priority": 4,
            })

    items.sort(key=lambda x: x["priority"])
    return items[:10]  # Top 10, show top 3 prominently


def compute_delegation_health(db: Session, venue_ids: list[str]) -> dict[str, Any]:
    """Compute a 0-100 delegation health score across venues.

    Based on: follow-up completion rate, escalation frequency, overdue rate.
    """
    from app.models.domain import FollowUp, FollowUpStatus, Escalation, EscalationStatus

    total_follow_ups = 0
    completed_follow_ups = 0
    overdue_follow_ups = 0
    total_escalations = 0
    resolved_escalations = 0
    now = utc_now()

    for venue_id in venue_ids:
        fus = list(db.scalars(select(FollowUp).where(FollowUp.venue_id == venue_id)).all())
        total_follow_ups += len(fus)
        completed_follow_ups += sum(1 for f in fus if f.status == FollowUpStatus.COMPLETED)
        overdue_follow_ups += sum(1 for f in fus if f.due_at and f.due_at.replace(tzinfo=now.tzinfo) < now and f.status not in (FollowUpStatus.COMPLETED,))

        escs = list(db.scalars(select(Escalation).where(Escalation.venue_id == venue_id)).all())
        total_escalations += len(escs)
        resolved_escalations += sum(1 for e in escs if e.status == EscalationStatus.RESOLVED)

    # Score components (each 0-100)
    completion_rate = (completed_follow_ups / max(total_follow_ups, 1)) * 100
    overdue_penalty = max(0, 100 - (overdue_follow_ups * 15))  # -15 per overdue
    escalation_resolution = (resolved_escalations / max(total_escalations, 1)) * 100 if total_escalations else 100

    score = int((completion_rate * 0.5) + (overdue_penalty * 0.3) + (escalation_resolution * 0.2))
    score = max(0, min(100, score))

    return {
        "score": score,
        "completion_rate": round(completion_rate, 1),
        "overdue_count": overdue_follow_ups,
        "escalation_resolution_rate": round(escalation_resolution, 1),
        "total_follow_ups": total_follow_ups,
        "total_escalations": total_escalations,
        "label": "strong" if score >= 70 else "moderate" if score >= 40 else "weak",
    }
