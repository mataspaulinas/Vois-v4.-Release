from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps.auth import get_current_user, require_roles
from app.models.domain import AuthRole
from app.schemas.ontology import (
    CoreOntologyBundle,
    DraftStatusUpdateRequest,
    OntologyEvaluationPack,
    OntologyEvaluationPackResult,
    OntologyEvaluationPackSummary,
    OntologyAlignmentSummary,
    OntologyAuthoringBrief,
    OntologyBundle,
    OntologyMapType,
    OntologyEntityType,
    OntologyGovernanceSummary,
    OntologyMountSummary,
    OntologySummary,
    PublishOntologyVersionRequest,
    PublishOntologyVersionResponse,
    RecoveryImportBatch,
    RecoveryImportBatchResult,
    SignalCascade,
    WorkbenchDraftRecord,
    WorkbenchDraftUpsert,
    WorkbenchMapDraftRecord,
    WorkbenchMapDraftUpsert,
    WorkbenchOverview,
)
from app.services.ontology import get_ontology_repository
from app.services.ontology_evaluation import get_ontology_evaluation_service
from app.services.ontology_workbench import get_ontology_workbench_service
from app.services.auth import AuthenticatedActor


router = APIRouter()


@router.get("/bundle", response_model=OntologyBundle)
def ontology_bundle(
    ontology_id: str,
    version: str | None = None,
    current_user: AuthenticatedActor = Depends(get_current_user),
) -> OntologyBundle:
    repository = get_ontology_repository()
    return repository.load_bundle_for_identity(ontology_id=ontology_id, version=version, allow_invalid=True)


@router.get("/core-canon", response_model=CoreOntologyBundle)
def ontology_core_canon(
    version: str = "v2",
    current_user: AuthenticatedActor = Depends(get_current_user),
) -> CoreOntologyBundle:
    return get_ontology_repository().load_core_bundle(version)


@router.get("/evaluations/packs", response_model=list[OntologyEvaluationPackSummary])
def ontology_evaluation_packs(
    ontology_id: str,
    current_user: AuthenticatedActor = Depends(require_roles(AuthRole.DEVELOPER)),
) -> list[OntologyEvaluationPackSummary]:
    return get_ontology_evaluation_service().list_packs(vertical=ontology_id)


@router.get("/evaluations/packs/{pack_id}", response_model=OntologyEvaluationPack)
def ontology_evaluation_pack(
    pack_id: str,
    ontology_id: str,
    current_user: AuthenticatedActor = Depends(require_roles(AuthRole.DEVELOPER)),
) -> OntologyEvaluationPack:
    try:
        return get_ontology_evaluation_service().load_pack(vertical=ontology_id, pack_id=pack_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("/evaluations/packs/{pack_id}/run", response_model=OntologyEvaluationPackResult)
def run_ontology_evaluation_pack(
    pack_id: str,
    ontology_id: str,
    current_user: AuthenticatedActor = Depends(require_roles(AuthRole.DEVELOPER)),
) -> OntologyEvaluationPackResult:
    try:
        return get_ontology_evaluation_service().run_pack(vertical=ontology_id, pack_id=pack_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get("/summary", response_model=OntologySummary)
def ontology_summary(
    ontology_id: str,
    version: str | None = None,
    current_user: AuthenticatedActor = Depends(get_current_user),
) -> OntologySummary:
    repository = get_ontology_repository()
    return repository.summary(vertical=ontology_id, version=version)


@router.get("/mounts", response_model=list[OntologyMountSummary])
def ontology_mounts(
    current_user: AuthenticatedActor = Depends(require_roles(AuthRole.DEVELOPER)),
) -> list[OntologyMountSummary]:
    return get_ontology_repository().list_mount_summaries()


@router.get("/mounts/{ontology_id}/{version}", response_model=OntologyMountSummary)
def ontology_mount(
    ontology_id: str,
    version: str,
    current_user: AuthenticatedActor = Depends(require_roles(AuthRole.DEVELOPER)),
) -> OntologyMountSummary:
    return get_ontology_repository().mount_summary(ontology_id, version)


@router.get("/audit")
def ontology_audit(
    ontology_id: str,
    version: str | None = None,
    current_user: AuthenticatedActor = Depends(require_roles(AuthRole.DEVELOPER)),
) -> dict[str, list[str]]:
    return {"errors": get_ontology_repository().audit(vertical=ontology_id, version=version)}


@router.get("/alignment", response_model=OntologyAlignmentSummary)
def ontology_alignment(
    ontology_id: str,
    version: str | None = None,
    adapter_id: str | None = None,
    adapter_version: str = "v1",
    core_version: str | None = None,
    current_user: AuthenticatedActor = Depends(get_current_user),
) -> OntologyAlignmentSummary:
    return get_ontology_repository().alignment_summary(
        vertical=ontology_id,
        version=version,
        adapter_id=adapter_id,
        adapter_version=adapter_version,
        core_version=core_version,
    )


@router.get("/governance", response_model=OntologyGovernanceSummary)
def ontology_governance(
    ontology_id: str,
    version: str | None = None,
    adapter_id: str | None = None,
    adapter_version: str = "v1",
    core_version: str | None = None,
    current_user: AuthenticatedActor = Depends(get_current_user),
) -> OntologyGovernanceSummary:
    return get_ontology_repository().governance_summary(
        vertical=ontology_id,
        version=version,
        adapter_id=adapter_id,
        adapter_version=adapter_version,
        core_version=core_version,
    )


@router.get("/authoring-brief", response_model=OntologyAuthoringBrief)
def ontology_authoring_brief(
    ontology_id: str,
    version: str | None = None,
    adapter_id: str | None = None,
    adapter_version: str = "v1",
    core_version: str | None = None,
    current_user: AuthenticatedActor = Depends(get_current_user),
) -> OntologyAuthoringBrief:
    return get_ontology_repository().authoring_brief(
        vertical=ontology_id,
        version=version,
        adapter_id=adapter_id,
        adapter_version=adapter_version,
        core_version=core_version,
    )


@router.get("/signals/{signal_id}/cascade", response_model=SignalCascade)
def signal_cascade(
    signal_id: str,
    ontology_id: str,
    version: str | None = None,
    current_user: AuthenticatedActor = Depends(get_current_user),
) -> SignalCascade:
    return get_ontology_repository().signal_cascade(signal_id, vertical=ontology_id, version=version)


@router.get("/workbench/overview", response_model=WorkbenchOverview)
def workbench_overview(
    ontology_id: str,
    current_user: AuthenticatedActor = Depends(require_roles(AuthRole.DEVELOPER)),
) -> WorkbenchOverview:
    return get_ontology_workbench_service().overview(vertical=ontology_id)


@router.get("/workbench/governance-preview", response_model=OntologyGovernanceSummary)
def workbench_governance_preview(
    ontology_id: str,
    source_version: str | None = None,
    adapter_id: str | None = None,
    adapter_version: str = "v1",
    core_version: str | None = None,
    current_user: AuthenticatedActor = Depends(require_roles(AuthRole.DEVELOPER)),
) -> OntologyGovernanceSummary:
    return get_ontology_workbench_service().governance_preview(
        vertical=ontology_id,
        source_version=source_version,
        adapter_id=adapter_id,
        adapter_version=adapter_version,
        core_version=core_version,
    )


@router.get("/workbench/{entity_type}/drafts", response_model=list[WorkbenchDraftRecord])
def list_drafts(
    entity_type: OntologyEntityType,
    ontology_id: str,
    current_user: AuthenticatedActor = Depends(require_roles(AuthRole.DEVELOPER)),
) -> list[WorkbenchDraftRecord]:
    return get_ontology_workbench_service().list_drafts(entity_type=entity_type, vertical=ontology_id)


@router.post(
    "/workbench/{entity_type}/drafts",
    response_model=WorkbenchDraftRecord,
    status_code=status.HTTP_201_CREATED,
)
def upsert_draft(
    entity_type: OntologyEntityType,
    payload: WorkbenchDraftUpsert,
    ontology_id: str,
    current_user: AuthenticatedActor = Depends(require_roles(AuthRole.DEVELOPER)),
) -> WorkbenchDraftRecord:
    return get_ontology_workbench_service().upsert_draft(entity_type=entity_type, payload=payload, vertical=ontology_id)


@router.patch("/workbench/{entity_type}/drafts/{draft_id}/status", response_model=WorkbenchDraftRecord)
def update_draft_status(
    entity_type: OntologyEntityType,
    draft_id: str,
    payload: DraftStatusUpdateRequest,
    ontology_id: str,
    current_user: AuthenticatedActor = Depends(require_roles(AuthRole.DEVELOPER)),
) -> WorkbenchDraftRecord:
    return get_ontology_workbench_service().update_draft_status(
        entity_type=entity_type,
        draft_id=draft_id,
        status=payload.status,
        vertical=ontology_id,
    )


@router.get("/workbench/maps/{map_type}/drafts", response_model=list[WorkbenchMapDraftRecord])
def list_map_drafts(
    map_type: OntologyMapType,
    ontology_id: str,
    current_user: AuthenticatedActor = Depends(require_roles(AuthRole.DEVELOPER)),
) -> list[WorkbenchMapDraftRecord]:
    return get_ontology_workbench_service().list_map_drafts(map_type=map_type, vertical=ontology_id)


@router.post(
    "/workbench/maps/{map_type}/drafts",
    response_model=WorkbenchMapDraftRecord,
    status_code=status.HTTP_201_CREATED,
)
def upsert_map_draft(
    map_type: OntologyMapType,
    payload: WorkbenchMapDraftUpsert,
    ontology_id: str,
    current_user: AuthenticatedActor = Depends(require_roles(AuthRole.DEVELOPER)),
) -> WorkbenchMapDraftRecord:
    return get_ontology_workbench_service().upsert_map_draft(map_type=map_type, payload=payload, vertical=ontology_id)


@router.patch("/workbench/maps/{map_type}/drafts/{draft_key}/status", response_model=WorkbenchMapDraftRecord)
def update_map_draft_status(
    map_type: OntologyMapType,
    draft_key: str,
    payload: DraftStatusUpdateRequest,
    ontology_id: str,
    current_user: AuthenticatedActor = Depends(require_roles(AuthRole.DEVELOPER)),
) -> WorkbenchMapDraftRecord:
    return get_ontology_workbench_service().update_map_draft_status(
        map_type=map_type,
        draft_key=draft_key,
        status=payload.status,
        vertical=ontology_id,
    )


@router.post("/workbench/import-batch", response_model=RecoveryImportBatchResult, status_code=status.HTTP_201_CREATED)
def import_recovery_batch(
    payload: RecoveryImportBatch,
    ontology_id: str,
    current_user: AuthenticatedActor = Depends(require_roles(AuthRole.DEVELOPER)),
) -> RecoveryImportBatchResult:
    return get_ontology_workbench_service().import_batch(payload=payload, vertical=ontology_id)


@router.post("/workbench/publish", response_model=PublishOntologyVersionResponse)
def publish_workbench_version(
    payload: PublishOntologyVersionRequest,
    ontology_id: str,
    current_user: AuthenticatedActor = Depends(require_roles(AuthRole.DEVELOPER)),
) -> PublishOntologyVersionResponse:
    try:
        return get_ontology_workbench_service().publish_version(payload=payload, vertical=ontology_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
