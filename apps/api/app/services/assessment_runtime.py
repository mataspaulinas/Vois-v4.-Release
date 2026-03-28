from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.domain import Assessment, EngineRun, OperationalPlan, PlanStatus, PlanTask, TaskEventType
from app.schemas.domain import EngineRunOutput
from app.services.engine import EngineService
from app.services.ontology_bindings import (
    hydrate_assessment_identity,
    hydrate_engine_run_identity,
    hydrate_plan_identity,
    resolve_venue_mount,
)
from app.services.ontology import OntologyRepository
from app.services.task_history import record_task_event, sync_task_dependencies


def execute_assessment(
    db: Session,
    assessment: Assessment,
    ontology_repository: OntologyRepository,
) -> EngineRunOutput:
    mount = resolve_venue_mount(
        db,
        assessment.venue_id,
        ontology_repository,
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

    result = _run_native_engine(
        assessment,
        ontology_repository,
        ontology_id=mount.ontology_id,
        version=mount.version,
    )

    engine_run = EngineRun(
        venue_id=assessment.venue_id,
        assessment_id=assessment.id,
        created_by=assessment.created_by,
        ontology_version=result["ontology_version"],
        plan_load_classification=result["load_classification"],
        report_json=result["report"].model_dump(),
        normalized_signals_json=result["_snapshot"]["normalized_signals"],
        diagnostic_snapshot_json=result["_snapshot"]["diagnostic"],
        plan_snapshot_json=result["_snapshot"]["plan_snapshot"],
        report_markdown=result["_snapshot"]["report_markdown"],
        report_type=result["_snapshot"]["report_type"],
        ai_trace_json=result["_snapshot"]["ai_trace"],
    )
    hydrate_engine_run_identity(
        engine_run,
        ontology_id=mount.ontology_id,
        ontology_version=mount.version,
        core_canon_version=mount.core_canon_version,
        adapter_id=mount.adapter_id,
        manifest_digest=mount.manifest_digest,
    )
    db.add(engine_run)
    db.flush()

    plan = OperationalPlan(
        engine_run_id=engine_run.id,
        venue_id=assessment.venue_id,
        title="Operational reset plan",
        summary=result["report"].summary,
        total_effort_hours=sum(task.effort_hours for task in result["plan_tasks"]),
        status=PlanStatus.DRAFT,
        snapshot_json=result["_snapshot"]["plan_snapshot"],
    )
    hydrate_plan_identity(
        plan,
        ontology_id=mount.ontology_id,
        ontology_version=mount.version,
        core_canon_version=mount.core_canon_version,
        adapter_id=mount.adapter_id,
        manifest_digest=mount.manifest_digest,
    )
    db.add(plan)
    db.flush()

    persisted_tasks: list[PlanTask] = []
    for order_index, task in enumerate(result["plan_tasks"]):
        persisted_task = PlanTask(
            plan_id=plan.id,
            block_id=task.block_id,
            title=task.title,
            order_index=order_index,
            effort_hours=task.effort_hours,
            rationale=task.rationale,
            dependencies=task.dependencies,
            trace=task.trace,
            layer=_derive_task_layer(task, order_index),
            timeline_label=_task_field(task, "timeline"),
            priority=_task_field(task, "priority"),
            source_response_pattern_id=_first_trace_pattern_id(task.trace),
            source_response_pattern_name=_first_trace_pattern_name(task.trace),
            module_id=_task_field(task, "module_id"),
            sub_actions=[{"text": item, "completed": False} for item in task.sub_actions],
            deliverables=[{"name": item, "completed": False} for item in task.deliverables],
        )
        db.add(persisted_task)
        db.flush()
        record_task_event(
            db,
            task_id=persisted_task.id,
            event_type=TaskEventType.NOTE_CAPTURED,
            actor_user_id=assessment.created_by,
            note="Task created from assessment execution.",
            payload={"block_id": task.block_id, "order_index": order_index},
        )
        persisted_tasks.append(persisted_task)

    sync_task_dependencies(db, plan_id=plan.id, tasks=persisted_tasks)
    db.commit()

    return EngineRunOutput(
        engine_run_id=engine_run.id,
        assessment_id=assessment.id,
        venue_id=assessment.venue_id,
        plan_id=plan.id,
        ontology_version=mount.version,
        ontology_id=mount.ontology_id,
        core_canon_version=mount.core_canon_version,
        adapter_id=mount.adapter_id,
        manifest_digest=mount.manifest_digest,
        load_classification=result["load_classification"],
        active_signals=result["active_signals"],
        failure_modes=result["failure_modes"],
        response_patterns=result["response_patterns"],
        plan_tasks=result["plan_tasks"],
        report=result["report"],
    )

def _run_native_engine(
    assessment: Assessment,
    ontology_repository: OntologyRepository,
    *,
    ontology_id: str,
    version: str | None,
) -> dict:
    service = EngineService(ontology_repository)
    result = service.run(
        selected_signal_ids=assessment.selected_signal_ids,
        management_hours_available=assessment.management_hours_available,
        weekly_effort_budget=assessment.weekly_effort_budget,
        signal_states=assessment.signal_states,
        vertical=ontology_id,
        version=version,
        ontology_id=ontology_id,
    )
    result["_snapshot"] = {
        "normalized_signals": [finding.model_dump() for finding in result["active_signals"]],
        "diagnostic": {
            "active_signals": [finding.model_dump() for finding in result["active_signals"]],
            "failure_modes": [finding.model_dump() for finding in result["failure_modes"]],
            "response_patterns": [finding.model_dump() for finding in result["response_patterns"]],
        },
        "plan_snapshot": {
            "tasks": [task.model_dump() for task in result["plan_tasks"]],
            "load_classification": result["load_classification"],
        },
        "report_markdown": None,
        "report_type": "structured_json",
        "ai_trace": {},
    }
    return result


def _first_trace_pattern_id(trace: dict) -> str | None:
    patterns = trace.get("response_patterns")
    if isinstance(patterns, list) and patterns:
        first = patterns[0]
        if isinstance(first, dict):
            return first.get("id")
    return None


def _first_trace_pattern_name(trace: dict) -> str | None:
    patterns = trace.get("response_patterns")
    if isinstance(patterns, list) and patterns:
        first = patterns[0]
        if isinstance(first, dict):
            return first.get("name")
    return None


def _task_field(task: object, field_name: str) -> str | None:
    value = getattr(task, field_name, None)
    if value is None and hasattr(task, "trace"):
        trace = getattr(task, "trace")
        if isinstance(trace, dict):
            value = trace.get(field_name)
    return value if isinstance(value, str) and value else None


def _derive_task_layer(task: object, order_index: int) -> str | None:
    legacy_task_id = _task_field(task, "legacy_task_id")
    if isinstance(legacy_task_id, str) and "_" in legacy_task_id:
        return legacy_task_id.split("_", 1)[0]
    return None
