from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user
from app.db.session import get_db
from app.schemas.domain import InviteAcceptanceRead, InvitePreviewRead
from app.services.auth import AuthenticatedActor
from app.services.auth_entry import accept_invite, preview_invite


router = APIRouter()


@router.get("/{token}", response_model=InvitePreviewRead)
def get_invite(
    token: str,
    db: Session = Depends(get_db),
) -> InvitePreviewRead:
    return preview_invite(db, token=token)


@router.post("/{token}/accept", response_model=InviteAcceptanceRead)
def accept(
    token: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(get_current_user),
) -> InviteAcceptanceRead:
    return accept_invite(db, token=token, actor=current_user)
