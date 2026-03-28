from fastapi import APIRouter, Depends, HTTPException, status
from packages.ontology_runtime import InvalidOntologyMountError, OntologyMountNotFoundError

from app.api.deps.auth import get_current_user, require_venue_access
from app.db.session import get_db
from app.models.domain import User
from app.schemas.intake import IntakePreviewRequest, IntakePreviewResponse
from app.services.intake import IntakeService
from app.services.ontology_bindings import resolve_venue_mount
from app.services.ontology import get_ontology_repository
from sqlalchemy.orm import Session


router = APIRouter()


@router.post("/preview", response_model=IntakePreviewResponse)
def intake_preview(
    payload: IntakePreviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> IntakePreviewResponse:
    require_venue_access(db, venue_id=payload.venue_id, user=current_user)
    service = IntakeService(get_ontology_repository())
    try:
        mount = resolve_venue_mount(
            db,
            payload.venue_id,
            get_ontology_repository(),
            allow_invalid=False,
            require_runtime=True,
        )
    except (InvalidOntologyMountError, OntologyMountNotFoundError) as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    return service.preview(raw_text=payload.raw_text, ontology_id=mount.ontology_id, version=mount.version)
