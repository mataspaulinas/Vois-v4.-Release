from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user, require_plan_access, require_roles, require_venue_access
from app.db.session import get_db
from app.models.domain import AuthRole, OperationalPlan, PlanTask
from app.schemas.domain import (
    PlanExecutionSummary,
    PlanRead,
    PlanUpdateRequest,
    TaskCommentCreateRequest,
    TaskCommentRead,
    PlanTaskRead,
    PlanTaskStatusUpdateRequest,
    PlanTaskUpdateRequest,
)
from app.services.plans import (
    DraftPlanMutationError,
    _serialize_task,
    active_execution_summary_for_venue,
    active_plan_for_venue,
    execution_summary_for_plan,
    latest_execution_summary_for_venue,
    latest_plan_for_venue,
    serialize_plan,
    create_task_comment_entry,
    list_task_comments,
    update_plan as update_plan_service,
    update_task,
    update_task_status,
)
from app.services.auth import AuthenticatedActor


router = APIRouter()


@router.get("/latest", response_model=PlanRead)
def get_latest_plan(
    venue_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(get_current_user),
) -> PlanRead:
    require_venue_access(db, venue_id=venue_id, user=current_user)
    plan = latest_plan_for_venue(db, venue_id)
    if plan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No plan found for venue")
    return plan


@router.get("/latest/execution-summary", response_model=PlanExecutionSummary)
def get_latest_execution_summary(
    venue_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(get_current_user),
) -> PlanExecutionSummary:
    require_venue_access(db, venue_id=venue_id, user=current_user)
    summary = latest_execution_summary_for_venue(db, venue_id)
    if summary is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No plan found for venue")
    return summary


@router.get("/active", response_model=PlanRead)
def get_active_plan(
    venue_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(get_current_user),
) -> PlanRead:
    require_venue_access(db, venue_id=venue_id, user=current_user)
    plan = active_plan_for_venue(db, venue_id)
    if plan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No active plan found for venue")
    return plan


@router.get("/active/execution-summary", response_model=PlanExecutionSummary)
def get_active_execution_summary(
    venue_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(get_current_user),
) -> PlanExecutionSummary:
    require_venue_access(db, venue_id=venue_id, user=current_user)
    summary = active_execution_summary_for_venue(db, venue_id)
    if summary is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No active plan found for venue")
    return summary


@router.get("/{plan_id}", response_model=PlanRead)
def get_plan(
    plan_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(get_current_user),
) -> PlanRead:
    plan = require_plan_access(db, plan_id=plan_id, user=current_user)
    return serialize_plan(db, plan)


@router.get("/{plan_id}/execution-summary", response_model=PlanExecutionSummary)
def get_plan_execution_summary(
    plan_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(get_current_user),
) -> PlanExecutionSummary:
    plan = require_plan_access(db, plan_id=plan_id, user=current_user)
    return execution_summary_for_plan(db, plan)


@router.patch("/tasks/{task_id}", response_model=PlanTaskRead)
def update_plan_task(
    task_id: str,
    payload: PlanTaskUpdateRequest,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(
        require_roles(AuthRole.OWNER, AuthRole.MANAGER, AuthRole.BARISTA)
    ),
) -> PlanTaskRead:
    task = db.get(PlanTask, task_id)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan task not found")
    plan = db.get(OperationalPlan, task.plan_id)
    if plan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")
    require_plan_access(db, plan_id=plan.id, user=current_user)

    # Build kwargs for the update — only pass provided fields
    kwargs: dict = {"actor_user_id": current_user.id}
    if payload.status is not None:
        kwargs["status"] = payload.status
    if payload.notes is not None:
        kwargs["notes"] = payload.notes
    if payload.sub_action_completions is not None:
        kwargs["sub_action_completions"] = payload.sub_action_completions
    if payload.deliverable_completions is not None:
        kwargs["deliverable_completions"] = payload.deliverable_completions

    try:
        task = update_task(db, task_id, **kwargs)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except DraftPlanMutationError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return _serialize_task(task)


@router.patch("/{plan_id}", response_model=PlanRead)
def update_plan(
    plan_id: str,
    payload: PlanUpdateRequest,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(
        require_roles(AuthRole.OWNER, AuthRole.MANAGER)
    ),
) -> PlanRead:
    plan = require_plan_access(db, plan_id=plan_id, user=current_user)

    try:
        plan = update_plan_service(
            db,
            plan_id,
            status=payload.status,
            title=payload.title,
            summary=payload.summary,
            actor_user_id=current_user.id,
        )
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return serialize_plan(db, plan)


@router.get("/tasks/{task_id}/comments", response_model=list[TaskCommentRead])
def get_task_comments(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(get_current_user),
) -> list[TaskCommentRead]:
    task = db.get(PlanTask, task_id)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan task not found")
    plan = db.get(OperationalPlan, task.plan_id)
    if plan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")
    require_plan_access(db, plan_id=plan.id, user=current_user)
    return list_task_comments(db, task_id=task_id)


@router.post("/tasks/{task_id}/comments", response_model=TaskCommentRead, status_code=status.HTTP_201_CREATED)
def post_task_comment(
    task_id: str,
    payload: TaskCommentCreateRequest,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(
        require_roles(AuthRole.OWNER, AuthRole.MANAGER, AuthRole.BARISTA)
    ),
) -> TaskCommentRead:
    task = db.get(PlanTask, task_id)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan task not found")
    plan = db.get(OperationalPlan, task.plan_id)
    if plan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")
    require_plan_access(db, plan_id=plan.id, user=current_user)
    if payload.venue_id != plan.venue_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Comment venue_id must match task venue")
    try:
        return create_task_comment_entry(
            db,
            task_id=task_id,
            venue_id=payload.venue_id,
            body=payload.body,
            actor_user_id=current_user.id,
            visibility=payload.visibility,
        )
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except DraftPlanMutationError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
