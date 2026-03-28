from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user, require_roles, require_venue_access
from app.db.session import get_db
from app.models.domain import AuthRole, Escalation, FollowUp
from app.schemas.domain import (
    EscalationCreateRequest,
    EscalationRead,
    EscalationResolveRequest,
    EvidenceCreateRequest,
    EvidenceRead,
    FollowUpCreateRequest,
    FollowUpRead,
    FollowUpUpdateRequest,
    NextActionItem,
)
from app.services.execution_control import (
    check_and_escalate_overdue,
    create_escalation,
    create_evidence,
    create_follow_up,
    list_escalations,
    list_evidence,
    list_follow_ups,
    resolve_escalation,
    resolve_next_actions,
    update_follow_up,
)
from app.services.auth import AuthenticatedActor

router = APIRouter()


# ─── Next-action ───


@router.get("/next-action", response_model=list[NextActionItem])
def get_next_actions(
    venue_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(get_current_user),
) -> list[NextActionItem]:
    require_venue_access(db, venue_id=venue_id, user=current_user)
    # Trigger overdue check before resolving actions
    check_and_escalate_overdue(db, venue_id, actor_user_id=current_user.id)
    return resolve_next_actions(db, venue_id, role=current_user.role.value)


# ─── Follow-ups ───


@router.get("/followups", response_model=list[FollowUpRead])
def get_follow_ups(
    venue_id: str,
    overdue_only: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(get_current_user),
) -> list[FollowUpRead]:
    require_venue_access(db, venue_id=venue_id, user=current_user)
    return list_follow_ups(db, venue_id, overdue_only=overdue_only)


@router.post("/followups", response_model=FollowUpRead, status_code=status.HTTP_201_CREATED)
def create_follow_up_endpoint(
    payload: FollowUpCreateRequest,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(
        require_roles(AuthRole.OWNER, AuthRole.MANAGER, AuthRole.BARISTA)
    ),
) -> FollowUpRead:
    require_venue_access(db, venue_id=payload.venue_id, user=current_user)
    return create_follow_up(
        db,
        venue_id=payload.venue_id,
        task_id=payload.task_id,
        assigned_to=payload.assigned_to,
        created_by=current_user.id,
        title=payload.title,
        due_at=payload.due_at,
        notes=payload.notes,
    )


@router.patch("/followups/{follow_up_id}", response_model=FollowUpRead)
def update_follow_up_endpoint(
    follow_up_id: str,
    payload: FollowUpUpdateRequest,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(
        require_roles(AuthRole.OWNER, AuthRole.MANAGER, AuthRole.BARISTA)
    ),
) -> FollowUpRead:
    fu = db.get(FollowUp, follow_up_id)
    if fu is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Follow-up not found")
    require_venue_access(db, venue_id=fu.venue_id, user=current_user)
    try:
        return update_follow_up(
            db, follow_up_id, status=payload.status, notes=payload.notes, actor_user_id=current_user.id
        )
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


# ─── Escalations ───


@router.post("/escalate", response_model=EscalationRead, status_code=status.HTTP_201_CREATED)
def create_escalation_endpoint(
    payload: EscalationCreateRequest,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(
        require_roles(AuthRole.OWNER, AuthRole.MANAGER, AuthRole.BARISTA)
    ),
) -> EscalationRead:
    require_venue_access(db, venue_id=payload.venue_id, user=current_user)
    return create_escalation(
        db,
        venue_id=payload.venue_id,
        follow_up_id=payload.follow_up_id,
        task_id=payload.task_id,
        created_by=current_user.id,
        escalated_to=payload.escalated_to,
        severity=payload.severity,
        reason=payload.reason,
    )


@router.get("/escalations", response_model=list[EscalationRead])
def get_escalations(
    venue_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(get_current_user),
) -> list[EscalationRead]:
    require_venue_access(db, venue_id=venue_id, user=current_user)
    return list_escalations(db, venue_id)


@router.patch("/escalations/{escalation_id}/resolve", response_model=EscalationRead)
def resolve_escalation_endpoint(
    escalation_id: str,
    payload: EscalationResolveRequest,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(
        require_roles(AuthRole.OWNER, AuthRole.MANAGER)
    ),
) -> EscalationRead:
    esc = db.get(Escalation, escalation_id)
    if esc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Escalation not found")
    require_venue_access(db, venue_id=esc.venue_id, user=current_user)
    try:
        return resolve_escalation(db, escalation_id, resolution_notes=payload.resolution_notes, actor_user_id=current_user.id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


# ─── Evidence ───


@router.post("/evidence", response_model=EvidenceRead, status_code=status.HTTP_201_CREATED)
def create_evidence_endpoint(
    payload: EvidenceCreateRequest,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(
        require_roles(AuthRole.OWNER, AuthRole.MANAGER, AuthRole.BARISTA)
    ),
) -> EvidenceRead:
    require_venue_access(db, venue_id=payload.venue_id, user=current_user)
    return create_evidence(
        db,
        venue_id=payload.venue_id,
        task_id=payload.task_id,
        follow_up_id=payload.follow_up_id,
        created_by=current_user.id,
        title=payload.title,
        description=payload.description,
        evidence_type=payload.evidence_type,
        file_asset_id=payload.file_asset_id,
    )


@router.get("/evidence", response_model=list[EvidenceRead])
def get_evidence(
    venue_id: str,
    task_id: str | None = None,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(get_current_user),
) -> list[EvidenceRead]:
    require_venue_access(db, venue_id=venue_id, user=current_user)
    return list_evidence(db, venue_id, task_id=task_id)
