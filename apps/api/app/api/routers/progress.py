from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user, require_roles, require_venue_access
from app.db.session import get_db
from app.models.domain import AuthRole, ProgressEntry
from app.schemas.domain import ProgressEntryCreateRequest, ProgressEntryRead
from app.services.auth import AuthenticatedActor
from app.services.audit import record_audit_entry


router = APIRouter()


@router.get("", response_model=list[ProgressEntryRead])
def list_progress_entries(
    venue_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(get_current_user),
) -> list[ProgressEntryRead]:
    require_venue_access(db, venue_id=venue_id, user=current_user)
    entries = list(
        db.scalars(
            select(ProgressEntry)
            .where(ProgressEntry.venue_id == venue_id)
            .order_by(ProgressEntry.created_at.desc())
        ).all()
    )
    return [
        ProgressEntryRead(
            id=entry.id,
            venue_id=entry.venue_id,
            created_by=entry.created_by,
            summary=entry.summary,
            detail=entry.detail,
            status=entry.status,
            created_at=entry.created_at,
        )
        for entry in entries
    ]


@router.post("", response_model=ProgressEntryRead, status_code=status.HTTP_201_CREATED)
def create_progress_entry(
    payload: ProgressEntryCreateRequest,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(
        require_roles(AuthRole.OWNER, AuthRole.MANAGER, AuthRole.BARISTA)
    ),
) -> ProgressEntryRead:
    venue = require_venue_access(db, venue_id=payload.venue_id, user=current_user)
    entry = ProgressEntry(**payload.model_dump())
    entry.created_by = current_user.id
    db.add(entry)
    db.flush()
    record_audit_entry(
        db,
        organization_id=venue.organization_id if venue is not None else None,
        actor_user_id=current_user.id,
        entity_type="progress_entry",
        entity_id=entry.id,
        action="created",
        payload={
            "venue_id": payload.venue_id,
            "status": payload.status.value,
            "summary": payload.summary,
        },
    )
    db.commit()
    db.refresh(entry)
    return ProgressEntryRead(
        id=entry.id,
        venue_id=entry.venue_id,
        created_by=entry.created_by,
        summary=entry.summary,
        detail=entry.detail,
        status=entry.status,
        created_at=entry.created_at,
    )
