from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user, require_organization_id_access, require_roles, require_venue_access
from app.db.session import get_db
from app.models.domain import AuthRole
from app.schemas.domain import (
    IntegrationConnectorRead,
    IntegrationEventCreateRequest,
    IntegrationHealthSummaryRead,
    IntegrationEventRead,
    IntegrationEventStatusUpdateRequest,
    LightspeedConnectorEventRequest,
    SumUpConnectorEventRequest,
    TrivecConnectorEventRequest,
)
from app.services.integrations import (
    build_integration_health_summary,
    get_integration_event,
    ingest_lightspeed_event,
    ingest_integration_event,
    ingest_sumup_event,
    ingest_trivec_event,
    list_connector_definitions,
    list_integration_events,
    retry_integration_event,
    serialize_integration_event,
    update_integration_event_status,
)
from app.services.auth import AuthenticatedActor


router = APIRouter()


@router.get("/connectors", response_model=list[IntegrationConnectorRead])
def list_connectors() -> list[IntegrationConnectorRead]:
    return list_connector_definitions()


@router.post("/connectors/lightspeed/events", response_model=IntegrationEventRead, status_code=status.HTTP_201_CREATED)
def create_lightspeed_event(
    payload: LightspeedConnectorEventRequest,
    response: Response,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(
        require_roles(AuthRole.OWNER, AuthRole.MANAGER)
    ),
) -> IntegrationEventRead:
    venue = require_venue_access(db, venue_id=payload.venue_id, user=current_user)
    event, created = ingest_lightspeed_event(db, venue=venue, current_user=current_user, payload=payload)
    db.commit()
    if not created:
        response.status_code = status.HTTP_200_OK
    return event


@router.post("/connectors/sumup/events", response_model=IntegrationEventRead, status_code=status.HTTP_201_CREATED)
def create_sumup_event(
    payload: SumUpConnectorEventRequest,
    response: Response,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(
        require_roles(AuthRole.OWNER, AuthRole.MANAGER)
    ),
) -> IntegrationEventRead:
    venue = require_venue_access(db, venue_id=payload.venue_id, user=current_user)
    event, created = ingest_sumup_event(db, venue=venue, current_user=current_user, payload=payload)
    db.commit()
    if not created:
        response.status_code = status.HTTP_200_OK
    return event


@router.post("/connectors/trivec/events", response_model=IntegrationEventRead, status_code=status.HTTP_201_CREATED)
def create_trivec_event(
    payload: TrivecConnectorEventRequest,
    response: Response,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(
        require_roles(AuthRole.OWNER, AuthRole.MANAGER)
    ),
) -> IntegrationEventRead:
    venue = require_venue_access(db, venue_id=payload.venue_id, user=current_user)
    event, created = ingest_trivec_event(db, venue=venue, current_user=current_user, payload=payload)
    db.commit()
    if not created:
        response.status_code = status.HTTP_200_OK
    return event


@router.get("/summary", response_model=IntegrationHealthSummaryRead)
def get_integration_summary(
    venue_id: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(get_current_user),
) -> IntegrationHealthSummaryRead:
    if venue_id is not None:
        venue = require_venue_access(db, venue_id=venue_id, user=current_user)
        organization_id = venue.organization_id
    else:
        organization_id = current_user.organization_id
        require_organization_id_access(current_user, organization_id)

    return build_integration_health_summary(
        db,
        organization_id=organization_id,
        venue_id=venue_id,
    )


@router.get("/events", response_model=list[IntegrationEventRead])
def list_events(
    venue_id: str | None = Query(default=None),
    provider: str | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(get_current_user),
) -> list[IntegrationEventRead]:
    if venue_id is not None:
        venue = require_venue_access(db, venue_id=venue_id, user=current_user)
        organization_id = venue.organization_id
    else:
        organization_id = current_user.organization_id
        require_organization_id_access(current_user, organization_id)

    return list_integration_events(
        db,
        organization_id=organization_id,
        venue_id=venue_id,
        provider=provider,
        status=status_filter,
        limit=limit,
    )


@router.post("/events", response_model=IntegrationEventRead, status_code=status.HTTP_201_CREATED)
def create_event(
    payload: IntegrationEventCreateRequest,
    response: Response,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(
        require_roles(AuthRole.OWNER, AuthRole.MANAGER)
    ),
) -> IntegrationEventRead:
    venue = require_venue_access(db, venue_id=payload.venue_id, user=current_user)
    event, created = ingest_integration_event(db, venue=venue, current_user=current_user, payload=payload)
    db.commit()
    if not created:
        response.status_code = status.HTTP_200_OK
    return event


@router.get("/events/{event_id}", response_model=IntegrationEventRead)
def get_event(
    event_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(get_current_user),
) -> IntegrationEventRead:
    event = get_integration_event(db, event_id=event_id)
    require_organization_id_access(current_user, event.organization_id)
    return serialize_integration_event(event)


@router.patch("/events/{event_id}", response_model=IntegrationEventRead)
def patch_event(
    event_id: str,
    payload: IntegrationEventStatusUpdateRequest,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(
        require_roles(AuthRole.OWNER, AuthRole.MANAGER)
    ),
) -> IntegrationEventRead:
    event = get_integration_event(db, event_id=event_id)
    require_organization_id_access(current_user, event.organization_id)
    updated = update_integration_event_status(db, event=event, current_user=current_user, payload=payload)
    db.commit()
    return updated


@router.post("/events/{event_id}/retry", response_model=IntegrationEventRead)
def retry_event(
    event_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(
        require_roles(AuthRole.OWNER, AuthRole.MANAGER)
    ),
) -> IntegrationEventRead:
    event = get_integration_event(db, event_id=event_id)
    require_organization_id_access(current_user, event.organization_id)
    updated = retry_integration_event(db, event=event, current_user=current_user)
    db.commit()
    return updated
