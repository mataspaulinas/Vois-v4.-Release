from fastapi import APIRouter, Depends, HTTPException, status
from packages.ontology_runtime import InvalidOntologyMountError, OntologyMountNotFoundError
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user
from app.db.session import get_db
from app.schemas.ai import AIFunction
from app.schemas.intake import IntakePreviewRequest, IntakePreviewResponse
from app.services.ai_runtime import AIRuntimePolicyError, ai_invocation_payload, get_ai_runtime_service_for_actor
from app.services.auth import AuthenticatedActor
from app.services.audit import record_audit_entry
from app.services.ontology_bindings import resolve_venue_mount
from app.services.ontology import get_ontology_repository
from app.api.deps.auth import require_venue_access


router = APIRouter()


@router.post("/ai-intake", response_model=IntakePreviewResponse)
def ai_intake(
    payload: IntakePreviewRequest,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(get_current_user),
) -> IntakePreviewResponse:
    require_venue_access(db, venue_id=payload.venue_id, user=current_user)
    repository = get_ontology_repository()
    try:
        mount = resolve_venue_mount(db, payload.venue_id, repository, allow_invalid=False, require_runtime=True)
    except (InvalidOntologyMountError, OntologyMountNotFoundError) as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    try:
        runtime_service = get_ai_runtime_service_for_actor(current_user.role, repository)
        response = runtime_service.signal_intake(
            raw_text=payload.raw_text,
            ontology_id=mount.ontology_id,
            version=mount.version,
        )
    except AIRuntimePolicyError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    record_audit_entry(
        db,
        organization_id=current_user.organization_id,
        actor_user_id=current_user.id,
        entity_type="ai_invocation",
        entity_id=current_user.organization_id,
        action="signal_intake",
        payload=ai_invocation_payload(
            function=AIFunction.SIGNAL_INTAKE,
            provider=response.provider or "mock",
            model=response.model or "vois-mock-1",
            prompt_version=response.prompt_version or "v1",
            organization_id=current_user.organization_id,
            evidence_refs=[item.signal_id for item in response.detected_signals],
            ontology_version=response.ontology_version,
            venue_id=payload.venue_id,
        ),
    )
    db.commit()
    return response
