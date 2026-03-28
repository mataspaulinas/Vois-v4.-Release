"""Pocket shell endpoints — employee-scoped data access."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user, require_venue_access
from app.db.session import get_db
from app.models.domain import (
    Escalation,
    Evidence,
    FollowUp,
    OperationalPlan,
    PlanTask,
    ProgressEntry,
    Role,
    TaskStatus,
    User,
    Venue,
    VenueStatus,
    utc_now,
)
from app.schemas.domain import HelpRequestCreateRequest, HelpRequestRead, HelpRequestUpdateRequest
from app.services.ai_runtime import AIRuntimePolicyError
from app.services.help_requests import create_help_request, get_help_request, list_help_requests, update_help_request
from app.services.plans import _active_plan_model_for_venue

router = APIRouter()


# ─── Schemas ───


class MyShiftTask(BaseModel):
    id: str
    title: str
    status: str
    order_index: int
    effort_hours: float
    rationale: str
    notes: str | None = None
    sub_actions: list[dict] = []
    deliverables: list[dict] = []


class MyShiftResponse(BaseModel):
    venue_name: str
    venue_id: str
    employee_name: str
    tasks: list[MyShiftTask]
    open_follow_ups: int
    overdue_follow_ups: int


class StandardItem(BaseModel):
    block_id: str
    title: str
    rationale: str
    sub_actions: list[dict] = []
    deliverables: list[dict] = []


class FrictionReportRequest(BaseModel):
    venue_id: str
    summary: str
    detail: str | None = None
    anonymous: bool = False


class FrictionReportResponse(BaseModel):
    id: str
    summary: str
    created_at: datetime


class ShiftDiaryEntry(BaseModel):
    id: str
    summary: str
    detail: str | None
    created_at: datetime


class ShiftDiaryCreateRequest(BaseModel):
    venue_id: str
    summary: str
    detail: str | None = None


class HelpRequestListQuery(BaseModel):
    venue_id: str
    mine_only: bool = False


# ─── My Shift ───


@router.get("/my-shift", response_model=MyShiftResponse)
def get_my_shift(
    venue_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MyShiftResponse:
    """Get the employee's current shift view — their tasks, follow-up counts."""
    venue = require_venue_access(db, venue_id=venue_id, user=current_user)

    plan = _active_plan_model_for_venue(db, venue_id)

    tasks: list[MyShiftTask] = []
    if plan:
        # For employees, show in-progress and not-started tasks
        plan_tasks = db.scalars(
            select(PlanTask)
            .where(PlanTask.plan_id == plan.id)
            .where(PlanTask.status.in_([TaskStatus.NOT_STARTED, TaskStatus.IN_PROGRESS, TaskStatus.BLOCKED]))
            .order_by(PlanTask.order_index)
        ).all()
        tasks = [
            MyShiftTask(
                id=t.id,
                title=t.title,
                status=t.status.value,
                order_index=t.order_index,
                effort_hours=t.effort_hours,
                rationale=t.rationale,
                notes=t.notes,
                sub_actions=t.sub_actions or [],
                deliverables=t.deliverables or [],
            )
            for t in plan_tasks
        ]

    # Follow-up counts
    now = utc_now()
    follow_ups = db.scalars(
        select(FollowUp)
        .where(FollowUp.venue_id == venue_id)
        .where(FollowUp.status.in_(["pending", "acknowledged"]))
    ).all()
    open_count = len(follow_ups)
    overdue_count = sum(1 for fu in follow_ups if fu.due_at <= now)

    return MyShiftResponse(
        venue_name=venue.name,
        venue_id=venue.id,
        employee_name=current_user.full_name,
        tasks=tasks,
        open_follow_ups=open_count,
        overdue_follow_ups=overdue_count,
    )


# ─── My Standards ───


@router.get("/my-standards", response_model=list[StandardItem])
def get_my_standards(
    venue_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[StandardItem]:
    """Get block content as plain procedures for the employee."""
    require_venue_access(db, venue_id=venue_id, user=current_user)

    plan = _active_plan_model_for_venue(db, venue_id)
    if not plan:
        return []

    tasks = db.scalars(
        select(PlanTask)
        .where(PlanTask.plan_id == plan.id)
        .order_by(PlanTask.order_index)
    ).all()

    return [
        StandardItem(
            block_id=t.block_id,
            title=t.title,
            rationale=t.rationale,
            sub_actions=t.sub_actions or [],
            deliverables=t.deliverables or [],
        )
        for t in tasks
    ]


# ─── Report Something (friction logging) ───


@router.post("/report", response_model=FrictionReportResponse, status_code=status.HTTP_201_CREATED)
def report_friction(
    payload: FrictionReportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FrictionReportResponse:
    """Log a friction report or issue — optionally anonymous."""
    require_venue_access(db, venue_id=payload.venue_id, user=current_user)

    entry = ProgressEntry(
        venue_id=payload.venue_id,
        created_by=None if payload.anonymous else current_user.id,
        summary=f"[Friction report] {payload.summary}",
        detail=payload.detail,
        status=VenueStatus.ACTIVE,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)

    return FrictionReportResponse(
        id=entry.id,
        summary=entry.summary,
        created_at=entry.created_at,
    )


# ─── Shift Diary ───


@router.get("/diary", response_model=list[ShiftDiaryEntry])
def get_shift_diary(
    venue_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ShiftDiaryEntry]:
    """Get the employee's shift diary entries."""
    require_venue_access(db, venue_id=venue_id, user=current_user)

    entries = db.scalars(
        select(ProgressEntry)
        .where(ProgressEntry.venue_id == venue_id)
        .where(ProgressEntry.created_by == current_user.id)
        .order_by(ProgressEntry.created_at.desc())
        .limit(50)
    ).all()

    return [
        ShiftDiaryEntry(
            id=e.id,
            summary=e.summary,
            detail=e.detail,
            created_at=e.created_at,
        )
        for e in entries
    ]


@router.post("/diary", response_model=ShiftDiaryEntry, status_code=status.HTTP_201_CREATED)
def create_shift_diary_entry(
    payload: ShiftDiaryCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ShiftDiaryEntry:
    """Add a shift diary entry."""
    require_venue_access(db, venue_id=payload.venue_id, user=current_user)

    entry = ProgressEntry(
        venue_id=payload.venue_id,
        created_by=current_user.id,
        summary=payload.summary,
        detail=payload.detail,
        status=VenueStatus.ACTIVE,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)

    return ShiftDiaryEntry(
        id=entry.id,
        summary=entry.summary,
        detail=entry.detail,
        created_at=entry.created_at,
    )


@router.get("/help-requests", response_model=list[HelpRequestRead])
def get_help_requests(
    venue_id: str,
    mine_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[HelpRequestRead]:
    require_venue_access(db, venue_id=venue_id, user=current_user)
    return list_help_requests(db, venue_id=venue_id, current_user=current_user, mine_only=mine_only)


@router.get("/help-requests/{help_request_id}", response_model=HelpRequestRead)
def get_help_request_detail(
    help_request_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> HelpRequestRead:
    try:
        item = get_help_request(db, help_request_id=help_request_id, current_user=current_user)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    require_venue_access(db, venue_id=item.venue_id, user=current_user)
    return item


@router.post("/help-requests", response_model=HelpRequestRead, status_code=status.HTTP_201_CREATED)
def post_help_request(
    payload: HelpRequestCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> HelpRequestRead:
    require_venue_access(db, venue_id=payload.venue_id, user=current_user)
    try:
        return create_help_request(db, payload=payload, current_user=current_user)
    except AIRuntimePolicyError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.patch("/help-requests/{help_request_id}", response_model=HelpRequestRead)
def patch_help_request(
    help_request_id: str,
    payload: HelpRequestUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> HelpRequestRead:
    try:
        existing = get_help_request(db, help_request_id=help_request_id, current_user=current_user)
        require_venue_access(db, venue_id=existing.venue_id, user=current_user)
        item = update_help_request(db, help_request_id=help_request_id, payload=payload, current_user=current_user)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return item
