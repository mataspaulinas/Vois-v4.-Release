"""People intelligence endpoints — team behavioral analysis."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user, require_roles, require_venue_access
from app.db.session import get_db
from app.models.domain import AuthRole, Venue
from app.services.auth import AuthenticatedActor
from app.services.people_intelligence import (
    compute_delegation_health,
    get_active_delegations,
    get_attention_items,
    get_flight_risk_indicators,
    get_overload_map,
    get_team_profiles,
    get_venue_execution_velocity,
)

router = APIRouter()


@router.get("/team-profiles")
def team_profiles(
    venue_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(
        require_roles(AuthRole.OWNER, AuthRole.MANAGER)
    ),
) -> list[dict[str, Any]]:
    require_venue_access(db, venue_id=venue_id, user=current_user)
    return get_team_profiles(db, venue_id)


@router.get("/overload-map")
def overload_map(
    venue_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(
        require_roles(AuthRole.OWNER, AuthRole.MANAGER)
    ),
) -> list[dict[str, Any]]:
    require_venue_access(db, venue_id=venue_id, user=current_user)
    return get_overload_map(db, venue_id)


@router.get("/flight-risk")
def flight_risk(
    venue_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(
        require_roles(AuthRole.OWNER)
    ),
) -> list[dict[str, Any]]:
    require_venue_access(db, venue_id=venue_id, user=current_user)
    return get_flight_risk_indicators(db, venue_id)


@router.get("/execution-velocity")
def execution_velocity(
    venue_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(
        require_roles(AuthRole.OWNER, AuthRole.MANAGER)
    ),
) -> dict[str, Any]:
    require_venue_access(db, venue_id=venue_id, user=current_user)
    return get_venue_execution_velocity(db, venue_id)


@router.get("/delegations")
def delegations(
    venue_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(
        require_roles(AuthRole.OWNER, AuthRole.MANAGER)
    ),
) -> list[dict[str, Any]]:
    require_venue_access(db, venue_id=venue_id, user=current_user)
    return get_active_delegations(db, venue_id)


@router.get("/attention-items")
def attention_items(
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(
        require_roles(AuthRole.OWNER)
    ),
) -> list[dict[str, Any]]:
    """Top attention items across all venues the user can access."""
    from sqlalchemy import select
    venues = db.scalars(
        select(Venue).where(Venue.organization_id == current_user.organization_id)
    ).all()
    venue_ids = [v.id for v in venues]
    return get_attention_items(db, venue_ids)


@router.get("/delegation-health")
def delegation_health(
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(
        require_roles(AuthRole.OWNER)
    ),
) -> dict:
    """Delegation health score across all venues."""
    from sqlalchemy import select
    venues = db.scalars(
        select(Venue).where(Venue.organization_id == current_user.organization_id)
    ).all()
    venue_ids = [v.id for v in venues]
    return compute_delegation_health(db, venue_ids)
