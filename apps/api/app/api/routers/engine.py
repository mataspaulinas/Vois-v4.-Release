from fastapi import APIRouter, Depends, HTTPException, status
from packages.ontology_runtime import InvalidOntologyMountError, OntologyMountNotFoundError
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user, require_engine_run_access, require_roles, require_venue_access
from app.db.session import get_db
from app.models.domain import Assessment, AuthRole, EngineRun
from app.schemas.ai import EnhancedReportResponse
from app.schemas.domain import AssessmentRunRequest, EngineRunOutput, PersistedEngineRunDetailRead, PersistedEngineRunRead
from app.services.assessment_runtime import execute_assessment
from app.services.ai_runtime import AIRuntimePolicyError, ai_invocation_payload, get_ai_runtime_service_for_actor
from app.services.auth import AuthenticatedActor
from app.services.audit import record_audit_entry
from app.services.engine_history import engine_run_detail, latest_engine_run_for_venue, list_engine_runs_for_venue
from app.services.ontology_bindings import hydrate_assessment_identity, resolve_venue_mount
from app.services.ontology import get_ontology_repository


router = APIRouter()


@router.get("/runs", response_model=list[PersistedEngineRunRead])
def list_engine_runs(
    venue_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(get_current_user),
) -> list[PersistedEngineRunRead]:
    require_venue_access(db, venue_id=venue_id, user=current_user)
    return list_engine_runs_for_venue(db, venue_id)


@router.get("/runs/latest", response_model=PersistedEngineRunRead)
def get_latest_engine_run(
    venue_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(get_current_user),
) -> PersistedEngineRunRead:
    require_venue_access(db, venue_id=venue_id, user=current_user)
    run = latest_engine_run_for_venue(db, venue_id)
    if run is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No engine run found for venue")
    return run


@router.get("/runs/{engine_run_id}", response_model=PersistedEngineRunDetailRead)
def get_engine_run_detail(
    engine_run_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(get_current_user),
) -> PersistedEngineRunDetailRead:
    require_engine_run_access(db, engine_run_id=engine_run_id, user=current_user)
    detail = engine_run_detail(db, engine_run_id)
    if detail is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Engine run not found")
    return detail


@router.post("/runs", response_model=EngineRunOutput)
def create_engine_run(
    payload: AssessmentRunRequest,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(
        require_roles(AuthRole.OWNER, AuthRole.MANAGER)
    ),
) -> EngineRunOutput:
    assessment = Assessment(**payload.model_dump())
    assessment.created_by = current_user.id
    mount = resolve_venue_mount(
        db,
        payload.venue_id,
        get_ontology_repository(),
        allow_invalid=False,
        require_runtime=True,
    )
    hydrate_assessment_identity(
        assessment,
        ontology_id=mount.ontology_id,
        ontology_version=mount.version,
        core_canon_version=mount.core_canon_version,
        adapter_id=mount.adapter_id,
        manifest_digest=mount.manifest_digest,
    )
    db.add(assessment)
    db.flush()
    try:
        return execute_assessment(
            db=db,
            assessment=assessment,
            ontology_repository=get_ontology_repository(),
        )
    except (InvalidOntologyMountError, OntologyMountNotFoundError) as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc


@router.get("/runs/{engine_run_id}/report-enhanced", response_model=EnhancedReportResponse)
def get_enhanced_report(
    engine_run_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(get_current_user),
) -> EnhancedReportResponse:
    engine_run = require_engine_run_access(db, engine_run_id=engine_run_id, user=current_user)

    try:
        response = get_ai_runtime_service_for_actor(current_user.role).enhance_report(db=db, engine_run_id=engine_run_id)
    except AIRuntimePolicyError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    record_audit_entry(
        db,
        organization_id=current_user.organization_id,
        actor_user_id=current_user.id,
        entity_type="ai_invocation",
        entity_id=engine_run_id,
        action="report_generation",
        payload=ai_invocation_payload(
            function=response.function,
            provider=response.provider,
            model=response.model,
            prompt_version=response.prompt_version,
            organization_id=current_user.organization_id,
            venue_id=engine_run.venue_id,
            ontology_version=engine_run.ontology_version,
            evidence_refs=[reference.label for reference in response.references],
        ),
    )
    db.commit()
    return response


@router.get("/runs/{engine_run_id}/export")
def export_engine_run(
    engine_run_id: str,
    format: str = "markdown",
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(get_current_user),
):
    """Export a persisted engine run as markdown or JSON."""
    engine_run = require_engine_run_access(db, engine_run_id=engine_run_id, user=current_user)
    if format == "json":
        return {
            "engine_run_id": engine_run.id,
            "venue_id": engine_run.venue_id,
            "ontology_version": engine_run.ontology_version,
            "ontology_id": engine_run.ontology_id,
            "load_classification": engine_run.plan_load_classification,
            "created_at": engine_run.created_at.isoformat() if engine_run.created_at else None,
            "report_markdown": engine_run.report_markdown,
            "normalized_signals": engine_run.normalized_signals_json,
            "diagnostic_snapshot": engine_run.diagnostic_snapshot_json,
            "plan_snapshot": engine_run.plan_snapshot_json,
            "report_json": engine_run.report_json,
        }
    # Default: markdown
    from fastapi.responses import PlainTextResponse
    markdown = engine_run.report_markdown or "# No report markdown persisted for this run.\n"
    return PlainTextResponse(content=markdown, media_type="text/markdown")


@router.post("/run-legacy")
def run_legacy_engine_bridge(
    payload: dict,
    current_user: AuthenticatedActor = Depends(require_roles(AuthRole.DEVELOPER)),
):
    """
    Bridge to OIS 3.6 legacy engine for parity testing.
    Expects raw 3.6-compatible input format.
    """
    from app.services.legacy_bridge import LegacyEngineService

    service = LegacyEngineService()
    return service.run_legacy_analysis(payload)
