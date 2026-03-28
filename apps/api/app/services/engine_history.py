from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.domain import Assessment, EngineRun, OperationalPlan, PlanTask
from app.schemas.domain import PersistedEngineRunDetailRead, PersistedEngineRunRead
from app.services.ontology import get_ontology_repository


def latest_engine_run_for_venue(db: Session, venue_id: str) -> PersistedEngineRunRead | None:
    engine_run = db.scalar(
        select(EngineRun)
        .where(EngineRun.venue_id == venue_id)
        .order_by(EngineRun.created_at.desc())
    )
    if engine_run is None:
        return None
    return serialize_engine_run(db, engine_run)


def list_engine_runs_for_venue(db: Session, venue_id: str) -> list[PersistedEngineRunRead]:
    runs = list(
        db.scalars(
            select(EngineRun)
            .where(EngineRun.venue_id == venue_id)
            .order_by(EngineRun.created_at.desc())
        ).all()
    )
    return [serialize_engine_run(db, run) for run in runs]


def engine_run_detail(db: Session, engine_run_id: str) -> PersistedEngineRunDetailRead | None:
    engine_run = db.get(EngineRun, engine_run_id)
    if engine_run is None:
        return None
    summary = serialize_engine_run(db, engine_run)
    return PersistedEngineRunDetailRead(
        **summary.model_dump(),
        normalized_signals=engine_run.normalized_signals_json or [],
        diagnostic_snapshot=engine_run.diagnostic_snapshot_json or {},
        plan_snapshot=engine_run.plan_snapshot_json or {},
        report_markdown=engine_run.report_markdown,
        report_type=engine_run.report_type,
        ai_trace=engine_run.ai_trace_json or {},
    )


def serialize_engine_run(db: Session, engine_run: EngineRun) -> PersistedEngineRunRead:
    assessment = db.get(Assessment, engine_run.assessment_id)
    plan = db.scalar(select(OperationalPlan).where(OperationalPlan.engine_run_id == engine_run.id))
    plan_task_count = 0
    if plan is not None:
        plan_task_count = len(list(db.scalars(select(PlanTask).where(PlanTask.plan_id == plan.id)).all()))

    repository = get_ontology_repository()
    bundle = repository.load_bundle_for_identity(
        engine_run.ontology_id,
        engine_run.ontology_version,
        allow_invalid=True,
    )
    signal_map = {signal.id: signal.name for signal in bundle.signals}
    active_signal_names = (
        [signal_map[signal_id] for signal_id in assessment.selected_signal_ids if signal_id in signal_map]
        if assessment is not None
        else []
    )
    report_json = engine_run.report_json or {}

    return PersistedEngineRunRead(
        engine_run_id=engine_run.id,
        assessment_id=engine_run.assessment_id,
        venue_id=engine_run.venue_id,
        plan_id=plan.id if plan is not None else None,
        ontology_version=engine_run.ontology_version,
        ontology_id=engine_run.ontology_id,
        core_canon_version=engine_run.core_canon_version,
        adapter_id=engine_run.adapter_id,
        manifest_digest=engine_run.manifest_digest,
        load_classification=engine_run.plan_load_classification,
        summary=report_json.get("summary", ""),
        diagnostic_spine=report_json.get("diagnostic_spine", []),
        investigation_threads=report_json.get("investigation_threads", []),
        verification_briefs=report_json.get("verification_briefs", []),
        active_signal_names=active_signal_names,
        plan_task_count=plan_task_count,
        created_at=engine_run.created_at,
    )
