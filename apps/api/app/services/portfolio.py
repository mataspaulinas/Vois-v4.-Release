from __future__ import annotations

from collections import Counter
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.domain import Assessment, EngineRun, OperationalPlan, ProgressEntry, Venue
from app.schemas.domain import (
    PortfolioActivityItem,
    PortfolioAttentionBucket,
    PortfolioSummaryResponse,
    PortfolioTotals,
    PortfolioVenuePulse,
)
from app.services.plans import _active_plan_model_for_venue, execution_summary_for_plan


def build_portfolio_summary(db: Session, organization_id: str) -> PortfolioSummaryResponse:
    venues = list(
        db.scalars(
            select(Venue)
            .where(Venue.organization_id == organization_id)
            .order_by(Venue.created_at.asc())
        ).all()
    )

    venue_pulses: list[PortfolioVenuePulse] = []
    totals = PortfolioTotals(venues=len(venues))

    for venue in venues:
        assessments = list(
            db.scalars(
                select(Assessment)
                .where(Assessment.venue_id == venue.id)
                .order_by(Assessment.created_at.desc())
            ).all()
        )
        latest_assessment = assessments[0] if assessments else None

        engine_runs = list(
            db.scalars(
                select(EngineRun)
                .where(EngineRun.venue_id == venue.id)
                .order_by(EngineRun.created_at.desc())
            ).all()
        )
        latest_engine_run = engine_runs[0] if engine_runs else None

        plans = list(
            db.scalars(
                select(OperationalPlan)
                .where(OperationalPlan.venue_id == venue.id)
                .order_by(OperationalPlan.created_at.desc())
            ).all()
        )
        latest_plan = plans[0] if plans else None
        active_plan = _active_plan_model_for_venue(db, venue.id)
        execution_summary = execution_summary_for_plan(db, active_plan) if active_plan is not None else None

        progress_entries = list(
            db.scalars(
                select(ProgressEntry)
                .where(ProgressEntry.venue_id == venue.id)
                .order_by(ProgressEntry.created_at.desc())
            ).all()
        )
        latest_progress_entry = progress_entries[0] if progress_entries else None

        totals.assessments += len(assessments)
        totals.engine_runs += len(engine_runs)
        totals.active_plans += 1 if active_plan is not None else 0
        totals.progress_entries += len(progress_entries)
        totals.ready_tasks += len(execution_summary.next_executable_tasks) if execution_summary else 0
        totals.blocked_tasks += len(execution_summary.blocked_tasks) if execution_summary else 0

        suggested_view, attention_level, next_step_label = _recommend_next_move(
            latest_assessment=latest_assessment,
            latest_engine_run=latest_engine_run,
            latest_plan=active_plan or latest_plan,
            execution_summary=execution_summary,
        )

        latest_activity_at = _latest_timestamp(
            latest_assessment.created_at if latest_assessment else None,
            latest_engine_run.created_at if latest_engine_run else None,
            latest_progress_entry.created_at if latest_progress_entry else None,
            (active_plan or latest_plan).created_at if (active_plan or latest_plan) else None,
        )

        venue_pulses.append(
            PortfolioVenuePulse(
                venue_id=venue.id,
                venue_name=venue.name,
                status=venue.status,
                concept=venue.concept,
                location=venue.location,
                latest_assessment_at=latest_assessment.created_at if latest_assessment else None,
                latest_engine_run_at=latest_engine_run.created_at if latest_engine_run else None,
                latest_plan_title=(active_plan or latest_plan).title if (active_plan or latest_plan) else None,
                plan_load_classification=latest_engine_run.plan_load_classification if latest_engine_run else None,
                latest_signal_count=len(latest_assessment.selected_signal_ids) if latest_assessment else 0,
                latest_plan_task_count=sum(execution_summary.counts_by_status.values()) if execution_summary else 0,
                completion_percentage=execution_summary.completion_percentage if execution_summary else 0.0,
                ready_task_count=len(execution_summary.next_executable_tasks) if execution_summary else 0,
                blocked_task_count=len(execution_summary.blocked_tasks) if execution_summary else 0,
                progress_entry_count=len(progress_entries),
                latest_progress_summary=latest_progress_entry.summary if latest_progress_entry else None,
                latest_activity_at=latest_activity_at,
                suggested_view=suggested_view,
                attention_level=attention_level,
                next_step_label=next_step_label,
            )
        )

    sorted_pulses = sorted(
        venue_pulses,
        key=lambda pulse: (
            _attention_priority(pulse.attention_level),
            pulse.blocked_task_count,
            pulse.ready_task_count,
            pulse.latest_activity_at or datetime.fromtimestamp(0, tz=timezone.utc),
        ),
        reverse=True,
    )

    attention_counts = Counter(pulse.attention_level for pulse in sorted_pulses)
    attention_breakdown = [
        PortfolioAttentionBucket(attention_level=level, count=count)
        for level, count in attention_counts.items()
    ]

    resume_venue = sorted_pulses[0] if sorted_pulses else None
    recent_activity = _recent_activity(db, organization_id)

    return PortfolioSummaryResponse(
        generated_at=datetime.now(timezone.utc),
        organization_id=organization_id,
        resume_venue_id=resume_venue.venue_id if resume_venue else None,
        resume_reason=resume_venue.next_step_label if resume_venue else None,
        totals=totals,
        attention_breakdown=attention_breakdown,
        portfolio_notes=_portfolio_notes(sorted_pulses, totals),
        venue_pulses=sorted_pulses,
        recent_activity=recent_activity,
    )


def _recent_activity(db: Session, organization_id: str) -> list[PortfolioActivityItem]:
    venues = {
        venue.id: venue.name
        for venue in db.scalars(select(Venue).where(Venue.organization_id == organization_id)).all()
    }
    if not venues:
        return []

    progress_entries = list(
        db.scalars(
            select(ProgressEntry)
            .where(ProgressEntry.venue_id.in_(list(venues.keys())))
            .order_by(ProgressEntry.created_at.desc())
        ).all()
    )

    return [
        PortfolioActivityItem(
            venue_id=entry.venue_id,
            venue_name=venues.get(entry.venue_id, "Unknown venue"),
            summary=entry.summary,
            status=entry.status.value,
            created_at=entry.created_at,
        )
        for entry in progress_entries[:8]
    ]


def _recommend_next_move(*, latest_assessment, latest_engine_run, latest_plan, execution_summary):
    if latest_assessment is None:
        return ("assessment", "high", "Capture a fresh assessment before anything else.")
    if latest_engine_run is None:
        return ("assessment", "high", "A saved assessment exists. Run the engine and generate the report.")
    if latest_plan is None:
        return ("report", "high", "The diagnostic exists, but execution has not been materialized yet.")
    if execution_summary and execution_summary.blocked_tasks:
        return ("plan", "high", f"Clear {len(execution_summary.blocked_tasks)} blocked task dependencies.")
    if execution_summary and execution_summary.next_executable_tasks:
        return ("plan", "active", f"Move {len(execution_summary.next_executable_tasks)} ready tasks forward.")
    return ("history", "steady", "Review progress quality and begin the next assessment cycle.")


def _attention_priority(level: str) -> int:
    if level == "high":
        return 3
    if level == "active":
        return 2
    return 1


def _portfolio_notes(venue_pulses: list[PortfolioVenuePulse], totals: PortfolioTotals) -> list[str]:
    notes: list[str] = []
    high_attention = [pulse for pulse in venue_pulses if pulse.attention_level == "high"]
    active_execution = [pulse for pulse in venue_pulses if pulse.attention_level == "active"]

    if high_attention:
        notes.append(f"{len(high_attention)} venue(s) need structural attention before more execution noise is added.")
    if totals.ready_tasks:
        notes.append(f"{totals.ready_tasks} ready task(s) are available across the portfolio right now.")
    if totals.blocked_tasks:
        notes.append(f"{totals.blocked_tasks} blocked task(s) are waiting on dependency clearance.")
    if active_execution:
        notes.append(f"{len(active_execution)} venue(s) are in active execution mode rather than fresh diagnosis.")
    if not notes:
        notes.append("The portfolio is quiet enough to review quality, not just chase movement.")
    return notes


def _latest_timestamp(*timestamps: datetime | None) -> datetime | None:
    present = [timestamp for timestamp in timestamps if timestamp is not None]
    if not present:
        return None
    return max(present)
