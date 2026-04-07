from fastapi import APIRouter, Depends, HTTPException, status
from packages.ontology_runtime import InvalidOntologyMountError, OntologyMountNotFoundError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user, require_assessment_access, require_roles, require_venue_access
from app.db.session import get_db
from app.models.domain import Assessment, AuthRole, EngineRun, OperationalPlan, PlanTask
from app.schemas.domain import (
    AssessmentCreateRequest,
    AssessmentHistoryItem,
    AssessmentRead,
    AssessmentSignalUpdateRequest,
    EngineRunOutput,
)
from app.services.assessment_profiles import canonical_assessment_type, normalize_assessment_triage
from app.services.assessment_runtime import execute_assessment
from app.services.auth import AuthenticatedActor
from app.services.audit import record_audit_entry
from app.services.ontology_bindings import hydrate_assessment_identity, resolve_venue_mount
from app.services.ontology import get_ontology_repository


router = APIRouter()


@router.get("", response_model=list[AssessmentHistoryItem])
def list_assessments(
    venue_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(get_current_user),
) -> list[AssessmentHistoryItem]:
    require_venue_access(db, venue_id=venue_id, user=current_user)
    assessments = list(
        db.scalars(
            select(Assessment).where(Assessment.venue_id == venue_id).order_by(Assessment.created_at.desc())
        ).all()
    )
    if not assessments:
        return []

    assessment_ids = [assessment.id for assessment in assessments]
    engine_runs = list(
        db.scalars(
            select(EngineRun).where(EngineRun.assessment_id.in_(assessment_ids)).order_by(EngineRun.created_at.desc())
        ).all()
    )
    engine_runs_by_assessment: dict[str, EngineRun] = {}
    for engine_run in engine_runs:
        engine_runs_by_assessment.setdefault(engine_run.assessment_id, engine_run)

    engine_run_ids = [engine_run.id for engine_run in engine_runs_by_assessment.values()]
    plans = list(
        db.scalars(
            select(OperationalPlan).where(OperationalPlan.engine_run_id.in_(engine_run_ids))
        ).all()
    ) if engine_run_ids else []
    plans_by_engine_run = {plan.engine_run_id: plan for plan in plans}
    plan_ids = [plan.id for plan in plans]
    tasks = list(
        db.scalars(select(PlanTask).where(PlanTask.plan_id.in_(plan_ids)))
    ) if plan_ids else []
    task_counts_by_plan: dict[str, int] = {}
    for task in tasks:
        task_counts_by_plan[task.plan_id] = task_counts_by_plan.get(task.plan_id, 0) + 1

    repository = get_ontology_repository()
    history: list[AssessmentHistoryItem] = []
    for assessment in assessments:
        bundle = repository.load_bundle_for_identity(
            assessment.ontology_id,
            assessment.ontology_version,
            allow_invalid=True,
        )
        signal_map: dict[str, str] = {}
        for signal in bundle.signals:
            signal_map[signal.id] = signal.name
            for alias in getattr(signal, "adapter_aliases", []):
                signal_map[alias] = signal.name
        engine_run = engine_runs_by_assessment.get(assessment.id)
        plan = plans_by_engine_run.get(engine_run.id) if engine_run else None
        active_signal_names = [signal_map[signal_id] for signal_id in assessment.selected_signal_ids if signal_id in signal_map]
        history.append(
            AssessmentHistoryItem(
                id=assessment.id,
                venue_id=assessment.venue_id,
                created_at=assessment.created_at,
                notes=assessment.notes,
                selected_signal_count=len(assessment.selected_signal_ids),
                active_signal_names=active_signal_names,
                engine_run_id=engine_run.id if engine_run else None,
                plan_load_classification=engine_run.plan_load_classification if engine_run else None,
                plan_task_count=task_counts_by_plan.get(plan.id, 0) if plan else 0,
                ontology_id=assessment.ontology_id,
                ontology_version=assessment.ontology_version,
            )
        )
    return history


@router.post("", response_model=AssessmentRead, status_code=status.HTTP_201_CREATED)
def create_assessment(
    payload: AssessmentCreateRequest,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(
        require_roles(AuthRole.OWNER, AuthRole.MANAGER)
    ),
) -> AssessmentRead:
    require_venue_access(db, venue_id=payload.venue_id, user=current_user)
    payload_data = payload.model_dump()
    payload_data["assessment_type"] = canonical_assessment_type(payload.assessment_type)
    payload_data["triage_enabled"], payload_data["triage_intensity"] = normalize_assessment_triage(
        payload_data["assessment_type"],
        payload.triage_enabled,
        payload.triage_intensity,
    )
    assessment = Assessment(**payload_data)
    assessment.created_by = current_user.id
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
    hydrate_assessment_identity(
        assessment,
        ontology_id=mount.ontology_id,
        ontology_version=mount.version,
        core_canon_version=mount.core_canon_version,
        adapter_id=mount.adapter_id,
        manifest_digest=mount.manifest_digest,
    )
    db.add(assessment)
    db.commit()
    db.refresh(assessment)
    return AssessmentRead.model_validate(assessment, from_attributes=True)


@router.get("/{assessment_id}", response_model=AssessmentRead)
def get_assessment(
    assessment_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(get_current_user),
) -> AssessmentRead:
    assessment = require_assessment_access(db, assessment_id=assessment_id, user=current_user)
    return AssessmentRead.model_validate(assessment, from_attributes=True)


@router.patch("/{assessment_id}/signals", response_model=AssessmentRead)
def update_assessment_signals(
    assessment_id: str,
    payload: AssessmentSignalUpdateRequest,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(
        require_roles(AuthRole.OWNER, AuthRole.MANAGER)
    ),
) -> AssessmentRead:
    assessment = require_assessment_access(db, assessment_id=assessment_id, user=current_user)

    bundle = get_ontology_repository().load_bundle_for_identity(
        assessment.ontology_id,
        assessment.ontology_version,
        allow_invalid=True,
    )
    signal_map = {signal.id: signal.name for signal in bundle.signals}
    selected_signal_ids = list(assessment.selected_signal_ids)
    signal_states = dict(assessment.signal_states or {})

    for addition in payload.add:
        if addition.signal_id not in signal_map:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unknown signal id: {addition.signal_id}")
        if addition.signal_id not in selected_signal_ids:
            selected_signal_ids.append(addition.signal_id)
        signal_states[addition.signal_id] = {
            "active": True,
            "notes": addition.notes,
            "confidence": addition.confidence,
        }

    for signal_id in payload.remove:
        if signal_id in selected_signal_ids:
            selected_signal_ids.remove(signal_id)
        if signal_id in signal_states:
            signal_states[signal_id] = {
                **signal_states[signal_id],
                "active": False,
            }

    assessment.selected_signal_ids = selected_signal_ids
    assessment.signal_states = signal_states
    assessment.created_by = assessment.created_by or current_user.id

    record_audit_entry(
        db,
        organization_id=current_user.organization_id,
        actor_user_id=current_user.id,
        entity_type="assessment",
        entity_id=assessment.id,
        action="signals_updated",
        payload={
            "source": payload.source,
            "added": [item.signal_id for item in payload.add],
            "removed": payload.remove,
        },
    )
    db.commit()
    db.refresh(assessment)
    return AssessmentRead.model_validate(assessment, from_attributes=True)


@router.post("/{assessment_id}/runs", response_model=EngineRunOutput)
def run_assessment(
    assessment_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(
        require_roles(AuthRole.OWNER, AuthRole.MANAGER)
    ),
) -> EngineRunOutput:
    assessment = require_assessment_access(db, assessment_id=assessment_id, user=current_user)
    assessment.created_by = assessment.created_by or current_user.id

    try:
        return execute_assessment(
            db=db,
            assessment=assessment,
            ontology_repository=get_ontology_repository(),
        )
    except (InvalidOntologyMountError, OntologyMountNotFoundError) as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
