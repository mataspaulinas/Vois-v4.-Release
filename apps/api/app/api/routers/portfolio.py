from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps.auth import require_roles
from app.db.session import get_db
from app.models.domain import AuthRole
from app.schemas.domain import PortfolioSummaryResponse
from app.services.auth import AuthenticatedActor
from app.services.portfolio import build_portfolio_summary

router = APIRouter()


@router.get("/summary", response_model=PortfolioSummaryResponse)
def portfolio_summary(
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(require_roles(AuthRole.OWNER, AuthRole.DEVELOPER)),
) -> PortfolioSummaryResponse:
    if current_user.organization_id is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Owner setup is required before portfolio data is available.",
        )
    return build_portfolio_summary(db, current_user.organization_id)
