"""Shift handover AI — generates end-of-shift summary for incoming staff."""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..dependencies import get_db, get_current_user

router = APIRouter(prefix="/api/v1", tags=["shift-handover"])


class ShiftHandoverResponse(BaseModel):
    summary: str
    completed_tasks: int
    remaining_tasks: int
    issues_reported: int
    help_requests: int
    highlights: list[str]
    handover_notes: str


@router.post("/shift-handover")
async def generate_shift_handover(
    venue_id: str = Query(...),
    db: Session = Depends(get_db),
):
    """Generate a shift handover summary from today's activity."""
    from ...models.domain import PlanTask, ShiftDiaryEntry, HelpRequest, FrictionReport
    from datetime import datetime, timedelta

    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    # Count completed tasks today
    completed_today = db.query(PlanTask).filter(
        PlanTask.venue_id == venue_id,
        PlanTask.status == "completed",
        PlanTask.updated_at >= today_start,
    ).count() if hasattr(PlanTask, 'venue_id') else 0

    # Count remaining tasks
    remaining = db.query(PlanTask).filter(
        PlanTask.venue_id == venue_id,
        PlanTask.status.in_(["not_started", "in_progress"]),
    ).count() if hasattr(PlanTask, 'venue_id') else 0

    # Get diary entries today
    diary_entries = []
    try:
        diary_entries = db.query(ShiftDiaryEntry).filter(
            ShiftDiaryEntry.venue_id == venue_id,
            ShiftDiaryEntry.created_at >= today_start,
        ).all()
    except Exception:
        pass

    # Count help requests and friction reports
    help_count = 0
    friction_count = 0
    try:
        help_count = db.query(HelpRequest).filter(
            HelpRequest.venue_id == venue_id,
            HelpRequest.created_at >= today_start,
        ).count()
    except Exception:
        pass
    try:
        friction_count = db.query(FrictionReport).filter(
            FrictionReport.venue_id == venue_id,
            FrictionReport.created_at >= today_start,
        ).count()
    except Exception:
        pass

    highlights = []
    if completed_today > 0:
        highlights.append(f"Completed {completed_today} task{'s' if completed_today > 1 else ''} today")
    if remaining > 0:
        highlights.append(f"{remaining} task{'s' if remaining > 1 else ''} still in progress or pending")
    if help_count > 0:
        highlights.append(f"{help_count} help request{'s' if help_count > 1 else ''} submitted")
    if friction_count > 0:
        highlights.append(f"{friction_count} issue{'s' if friction_count > 1 else ''} reported")
    if diary_entries:
        highlights.append(f"{len(diary_entries)} shift log entr{'ies' if len(diary_entries) > 1 else 'y'} recorded")

    if not highlights:
        highlights.append("Quiet shift — no major activity recorded")

    handover_notes = "Incoming shift: " + ". ".join(highlights) + "."
    if remaining > 0:
        handover_notes += f" Check the {remaining} remaining task{'s' if remaining > 1 else ''} and prioritise accordingly."

    return ShiftHandoverResponse(
        summary=f"Shift summary for today",
        completed_tasks=completed_today,
        remaining_tasks=remaining,
        issues_reported=friction_count,
        help_requests=help_count,
        highlights=highlights,
        handover_notes=handover_notes,
    )
