from fastapi import APIRouter, Depends, HTTPException, status
from packages.ontology_runtime import OntologyMountNotFoundError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user, require_organization_id_access, require_roles, require_venue_access
from app.db.session import get_db
from app.models.domain import AuthRole, Venue
from app.schemas.domain import VenueCreate, VenueOntologyBindingRead, VenueOntologyBindingWrite, VenueRead
from app.services.ontology import get_ontology_repository
from app.services.ontology_bindings import require_venue_binding, serialize_binding, set_venue_binding
from app.services.auth import AuthenticatedActor
from app.services.access_control import get_membership_for_user, set_venue_access_assignments
from app.services.workspace_setup import ensure_venue_thread


router = APIRouter()


@router.get("", response_model=list[VenueRead])
def list_venues(
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(get_current_user),
) -> list[Venue]:
    if current_user.organization_id is None:
        return []
    statement = (
        select(Venue)
        .where(Venue.organization_id == current_user.organization_id)
        .order_by(Venue.created_at.desc())
    )
    if current_user.role in {AuthRole.MANAGER, AuthRole.BARISTA}:
        if not current_user.accessible_venue_ids:
            return []
        statement = statement.where(Venue.id.in_(sorted(current_user.accessible_venue_ids)))
    return list(
        db.scalars(statement).all()
    )


@router.post("", response_model=VenueRead, status_code=status.HTTP_201_CREATED)
def create_venue(
    payload: VenueCreate,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(require_roles(AuthRole.OWNER)),
) -> Venue:
    require_organization_id_access(current_user, payload.organization_id)
    venue = Venue(
        **payload.model_dump(
            exclude={"ontology_binding", "initial_manager_user_id"}
        )
    )
    db.add(venue)
    db.flush()
    try:
        set_venue_binding(
            db,
            venue,
            get_ontology_repository(),
            ontology_id=payload.ontology_binding.ontology_id,
            ontology_version=payload.ontology_binding.ontology_version,
            bound_by=current_user.id,
        )
    except OntologyMountNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    ensure_venue_thread(db, organization_id=venue.organization_id, venue=venue)
    if payload.initial_manager_user_id is not None:
        membership = get_membership_for_user(
            db,
            user_id=payload.initial_manager_user_id,
            organization_id=venue.organization_id,
        )
        if membership is None or membership.role_claim not in {AuthRole.MANAGER, AuthRole.BARISTA}:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Initial operator assignment requires an active manager or barista membership in this organization",
            )
        set_venue_access_assignments(
            db,
            organization_id=venue.organization_id,
            user_id=payload.initial_manager_user_id,
            venue_ids=[venue.id],
            created_by=current_user.id,
        )
    db.commit()
    db.refresh(venue)
    return venue


@router.get("/{venue_id}", response_model=VenueRead)
def get_venue(
    venue_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(get_current_user),
) -> Venue:
    return require_venue_access(db, venue_id=venue_id, user=current_user)


@router.get("/{venue_id}/ontology-binding", response_model=VenueOntologyBindingRead)
def get_venue_ontology_binding(
    venue_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(get_current_user),
) -> VenueOntologyBindingRead:
    venue = require_venue_access(db, venue_id=venue_id, user=current_user)
    try:
        binding = require_venue_binding(db, venue)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    return serialize_binding(binding, get_ontology_repository())


@router.put("/{venue_id}/ontology-binding", response_model=VenueOntologyBindingRead)
def update_venue_ontology_binding(
    venue_id: str,
    payload: VenueOntologyBindingWrite,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(
        require_roles(AuthRole.OWNER, AuthRole.DEVELOPER)
    ),
) -> VenueOntologyBindingRead:
    venue = db.get(Venue, venue_id)
    if venue is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Venue not found")
    require_organization_id_access(current_user, venue.organization_id)
    try:
        binding = set_venue_binding(
            db,
            venue,
            get_ontology_repository(),
            ontology_id=payload.ontology_id,
            ontology_version=payload.ontology_version,
            bound_by=current_user.id,
        )
    except OntologyMountNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    db.commit()
    return serialize_binding(binding, get_ontology_repository())
