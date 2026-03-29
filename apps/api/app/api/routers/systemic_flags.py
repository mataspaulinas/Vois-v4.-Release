"""Systemic issue flagging API."""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user, require_roles, require_venue_access, get_db
from app.models.domain import AuthRole, SystemicFlag, utc_now
from app.services.auth import AuthenticatedActor

router = APIRouter(tags=["systemic-flags"])


class SystemicFlagCreate(BaseModel):
    signal_id: str
    signal_name: str | None = None
    notes: str | None = None


class SystemicFlagRead(BaseModel):
    id: str
    venue_id: str
    signal_id: str
    signal_name: str | None
    flagged_by: str | None
    notes: str | None
    resolved_at: str | None
    created_at: str


@router.get("/venues/{venue_id}/systemic-flags", response_model=list[SystemicFlagRead])
def list_flags(
    venue_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(get_current_user),
) -> list[SystemicFlagRead]:
    require_venue_access(db, venue_id=venue_id, user=current_user)
    flags = list(
        db.scalars(
            select(SystemicFlag)
            .where(SystemicFlag.venue_id == venue_id)
            .order_by(SystemicFlag.created_at.desc())
        ).all()
    )
    return [
        SystemicFlagRead(
            id=f.id, venue_id=f.venue_id, signal_id=f.signal_id,
            signal_name=f.signal_name, flagged_by=f.flagged_by,
            notes=f.notes,
            resolved_at=f.resolved_at.isoformat() if f.resolved_at else None,
            created_at=f.created_at.isoformat() if f.created_at else "",
        )
        for f in flags
    ]


@router.post("/venues/{venue_id}/systemic-flags", response_model=SystemicFlagRead, status_code=status.HTTP_201_CREATED)
def create_flag(
    venue_id: str,
    payload: SystemicFlagCreate,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(require_roles(AuthRole.OWNER, AuthRole.MANAGER)),
) -> SystemicFlagRead:
    require_venue_access(db, venue_id=venue_id, user=current_user)
    flag = SystemicFlag(
        venue_id=venue_id,
        signal_id=payload.signal_id,
        signal_name=payload.signal_name,
        flagged_by=current_user.id,
        notes=payload.notes,
    )
    db.add(flag)
    db.commit()
    db.refresh(flag)
    return SystemicFlagRead(
        id=flag.id, venue_id=flag.venue_id, signal_id=flag.signal_id,
        signal_name=flag.signal_name, flagged_by=flag.flagged_by,
        notes=flag.notes,
        resolved_at=None,
        created_at=flag.created_at.isoformat() if flag.created_at else "",
    )


@router.patch("/systemic-flags/{flag_id}/resolve")
def resolve_flag(
    flag_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(require_roles(AuthRole.OWNER, AuthRole.MANAGER)),
):
    flag = db.get(SystemicFlag, flag_id)
    if flag is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Flag not found")
    require_venue_access(db, venue_id=flag.venue_id, user=current_user)
    if flag.resolved_at is None:
        flag.resolved_at = utc_now()
        db.commit()
    return {"id": flag.id, "resolved_at": flag.resolved_at.isoformat()}
