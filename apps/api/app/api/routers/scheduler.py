"""
Scheduler API — digest and scheduler status endpoints.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user, get_db
from app.models.domain import User
from app.services.scheduler import (
    generate_daily_digest,
    scan_overdue_follow_ups,
)

router = APIRouter(tags=["scheduler"])


@router.get("/digest")
def get_venue_digest(
    venue_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate a daily digest for a specific venue."""
    return generate_daily_digest(db, venue_id)


@router.get("/reminders")
def get_overdue_reminders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all overdue follow-up reminders across the portfolio."""
    return scan_overdue_follow_ups(db)
