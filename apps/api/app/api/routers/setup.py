from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user, require_roles
from app.db.session import get_db
from app.models.domain import AuthRole
from app.schemas.domain import OwnerClaimRequest, OwnerSetupStateRead
from app.services.auth import AuthenticatedActor
from app.services.workspace_setup import build_owner_setup_state, claim_owner_workspace


router = APIRouter()


@router.get("/state", response_model=OwnerSetupStateRead)
def get_setup_state(
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(get_current_user),
) -> OwnerSetupStateRead:
    return build_owner_setup_state(db, actor=current_user)


@router.post("/claim-owner", response_model=OwnerSetupStateRead)
def claim_owner(
    payload: OwnerClaimRequest,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(require_roles(AuthRole.OWNER)),
) -> OwnerSetupStateRead:
    claim_owner_workspace(db, actor=current_user, payload=payload)
    return build_owner_setup_state(db, actor=current_user)
