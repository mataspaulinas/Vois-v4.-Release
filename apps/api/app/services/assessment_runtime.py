from __future__ import annotations

import csv
import json
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from sqlalchemy.orm import Session

from app.models.domain import (
    Assessment,
    EngineRun,
    OperationalPlan,
    PlanStatus,
    PlanTask,
    TaskEventType,
    Venue,
)
from app.schemas.domain import DiagnosticFinding, EngineReportOutput, EngineRunOutput, PlanTaskOutput
from app.services.assessment_profiles import (
    assessment_profile_for,
    canonical_assessment_type,
    normalize_assessment_triage,
)
from app.services.ontology import OntologyRepository
from app.services.ontology_bindings import (
    hydrate_assessment_identity,
    hydrate_engine_run_identity,
    hydrate_plan_identity,
    resolve_venue_mount,
)
from app.services.task_history import record_task_event, sync_task_dependencies
from packages.engine_runtime.ois_engine.api import build_report, run_diagnostic


_LAYER_SECTION_MAP = {
    "L1": "L1_setup",
    "L2": "L2_build",
    "L3": "L3_embed",
}

_LAYER_OFFSETS = {
    "L1": 3,
    "L2": 21,
    "L3": 90,
}

_LAYER_METADATA = {
    "L1": {
        "index": 0,
        "title": "Immediate Control",
        "description": "Stabilize the highest-pressure breakdowns and make the venue safe to act from.",
    },
    "L2": {
        "index": 1,
        "title": "System Build",
        "description": "Turn corrections into repeatable operating structure instead of one-off effort.",
    },
    "L3": {
        "index": 2,
        "title": "Embed and Sustain",
        "description": "Lock the gains into leadership rhythm, review cycles, and long-term discipline.",
    },
}


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

    assessment.assessment_type = canonical_assessment_type(assessment.assessment_type)
    assessment.triage_enabled, assessment.triage_intensity = normalize_assessment_triage(
        assessment.assessment_type,
        assessment.triage_enabled,
        assessment.triage_intensity,
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

    result = _run_packaged_engine(
        db,
        assessment,
        ontology_repository=ontology_repository,
        ontology_id=mount.ontology_id,
        version=mount.version,
        engine_root=Path(mount.engine_mount_root),
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
        title=result["plan_title"],
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
            assigned_to=task.assigned_to,
            layer=task.layer,
            timeline_label=task.timeline_label,
            priority=task.priority,
            source_response_pattern_id=task.source_response_pattern_id,
            source_response_pattern_name=task.source_response_pattern_name,
            module_id=task.module_id,
            sub_actions=[{"text": item, "completed": False} for item in task.sub_actions],
            deliverables=[{"name": item, "completed": False} for item in task.deliverables],
            due_at=_due_at_for_layer(task.layer, assessment.assessment_date),
            verification=task.verification,
            expected_output=task.expected_output,
        )
        db.add(persisted_task)
        db.flush()
        record_task_event(
            db,
            task_id=persisted_task.id,
            event_type=TaskEventType.NOTE_CAPTURED,
            actor_user_id=assessment.created_by,
            note="Task created from packaged assessment execution.",
            payload={
                "block_id": task.block_id,
                "order_index": order_index,
                "layer": task.layer,
                "source_response_pattern_id": task.source_response_pattern_id,
            },
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
        constraint_report=result["constraint_report"],
        generated_plan=result["generated_plan"],
        report=result["report"],
    )


def _run_packaged_engine(
    db: Session,
    assessment: Assessment,
    *,
    ontology_repository: OntologyRepository,
    ontology_id: str,
    version: str | None,
    engine_root: Path,
) -> dict[str, Any]:
    venue = db.get(Venue, assessment.venue_id)
    signal_id_map = _build_engine_signal_id_map(
        ontology_repository,
        ontology_id=ontology_id,
        version=version,
        engine_root=engine_root,
    )
    raw_input = _build_raw_engine_input(assessment, venue, signal_id_map=signal_id_map["app_to_engine"])
    run_result = run_diagnostic(raw_input, root_dir=engine_root)
    normalized_signals = _translate_signal_refs(
        run_result.normalized_signals or [],
        signal_id_map["engine_to_app"],
    )
    failure_modes = _translate_signal_refs(
        run_result.failure_modes or [],
        signal_id_map["engine_to_app"],
    )
    response_patterns = run_result.response_patterns or []
    activation_set_raw = _translate_signal_refs(
        run_result.activation_set_raw or {},
        signal_id_map["engine_to_app"],
    )
    activation_context = _translate_signal_refs(
        run_result.activation_context or [],
        signal_id_map["engine_to_app"],
    )
    activation_set_constrained = _translate_signal_refs(
        run_result.activation_set_constrained or {},
        signal_id_map["engine_to_app"],
    )
    generated_plan = _translate_signal_refs(
        run_result.action_plan or {},
        signal_id_map["engine_to_app"],
    )
    constraint_report = run_result.constraint_report or {}
    load_classification = str(constraint_report.get("plan_load", "MEDIUM")).upper()
    plan_tasks = _build_executable_plan_tasks(
        generated_plan=generated_plan,
        engine_root=engine_root,
        assessment=assessment,
    )
    report = _build_structured_report(
        assessment=assessment,
        normalized_signals=normalized_signals,
        failure_modes=failure_modes,
        response_patterns=response_patterns,
        constraint_report=constraint_report,
        generated_plan=generated_plan,
    )
    assessment_profile = assessment_profile_for(assessment.assessment_type)
    report_markdown, report_type = build_report(
        action_plan=generated_plan,
        activated_fms=failure_modes,
        activated_rps=response_patterns,
        normalized_signals=normalized_signals,
        venue_context=_report_context(raw_input),
        root_dir=engine_root,
    )

    return {
        "assessment_type": assessment.assessment_type,
        "assessment_type_label": assessment_profile.label,
        "plan_title": assessment_profile.plan_title,
        "ontology_version": version or "unknown",
        "load_classification": load_classification,
        "active_signals": _active_signal_findings(normalized_signals),
        "failure_modes": _failure_mode_findings(failure_modes),
        "response_patterns": _response_pattern_findings(response_patterns),
        "plan_tasks": plan_tasks,
        "constraint_report": constraint_report,
        "generated_plan": generated_plan,
        "report": report,
        "_snapshot": {
            "normalized_signals": normalized_signals,
            "diagnostic": {
                "failure_modes": failure_modes,
                "response_patterns": response_patterns,
                "activation_set_raw": activation_set_raw,
                "activation_context": activation_context,
                "activation_set_constrained": activation_set_constrained,
                "constraint_report": constraint_report,
            },
            "plan_snapshot": generated_plan,
            "report_markdown": report_markdown,
            "report_type": report_type,
            "ai_trace": {
                "engine_runtime": "packaged_mount",
                "console": run_result.console,
            },
        },
    }


def _build_raw_engine_input(
    assessment: Assessment,
    venue: Venue | None,
    *,
    signal_id_map: dict[str, str] | None = None,
) -> dict[str, Any]:
    return {
        "venue_id": assessment.venue_id,
        "assessment_date": assessment.assessment_date or _today_iso(),
        "assessment_type": assessment.assessment_type,
        "triage_enabled": assessment.triage_enabled,
        "triage_intensity": assessment.triage_intensity or "balanced",
        "venue_context": _build_venue_context(assessment, venue),
        "signals": _build_signal_payload(assessment, signal_id_map=signal_id_map),
    }


def _build_venue_context(assessment: Assessment, venue: Venue | None) -> dict[str, Any]:
    context = dict(venue.capacity_profile or {}) if venue is not None else {}
    context.update(assessment.venue_context_json or {})
    if venue is not None:
        context.setdefault("venue_name", venue.name)
        context.setdefault("venue_slug", venue.slug)
        context.setdefault("venue_type", venue.concept)
        context.setdefault("location", venue.location)
        context.setdefault("team_size_note", venue.size_note)

    team_size = _parse_team_size(
        context.get("team_size"),
        context.get("team_size_note"),
        venue.size_note if venue is not None else None,
    )
    if team_size is not None:
        context["team_size"] = team_size
    context["management_hours_available"] = assessment.management_hours_available
    context["weekly_effort_budget"] = assessment.weekly_effort_budget
    return context


def _build_signal_payload(
    assessment: Assessment,
    *,
    signal_id_map: dict[str, str] | None = None,
) -> dict[str, dict[str, Any]]:
    signal_states = dict(assessment.signal_states or {})
    selected_signal_ids = {
        signal_id
        for signal_id in assessment.selected_signal_ids or []
        if isinstance(signal_id, str) and signal_id.strip()
    }
    active_state_ids = {
        signal_id
        for signal_id, state in signal_states.items()
        if isinstance(signal_id, str) and isinstance(state, dict) and state.get("active", False)
    }

    payload: dict[str, dict[str, Any]] = {}
    for signal_id in sorted(selected_signal_ids | active_state_ids):
        state = signal_states.get(signal_id) or {}
        mapped_signal_id = _map_engine_signal_id(signal_id, signal_id_map)
        next_state = {
            "active": state.get("active", signal_id in selected_signal_ids),
            "notes": state.get("notes"),
            "confidence": state.get("confidence"),
            "value": state.get("value"),
        }
        existing = payload.get(mapped_signal_id)
        if existing is None:
            payload[mapped_signal_id] = next_state
            continue
        payload[mapped_signal_id] = {
            "active": bool(existing.get("active")) or bool(next_state.get("active")),
            "notes": _merge_signal_notes(existing.get("notes"), next_state.get("notes")),
            "confidence": _higher_confidence(existing.get("confidence"), next_state.get("confidence")),
            "value": existing.get("value") if existing.get("value") is not None else next_state.get("value"),
        }
    return payload


def _build_engine_signal_id_map(
    ontology_repository: OntologyRepository,
    *,
    ontology_id: str,
    version: str | None,
    engine_root: Path,
) -> dict[str, dict[str, str]]:
    bundle = ontology_repository.load_bundle_for_identity(
        ontology_id,
        version,
        allow_invalid=True,
    )
    engine_signal_library = _load_engine_signal_library(engine_root)
    app_to_engine: dict[str, str] = {}
    engine_to_app: dict[str, str] = {}

    for signal in bundle.signals:
        candidates = [signal.id, *signal.adapter_aliases]
        engine_id = next((candidate for candidate in candidates if candidate in engine_signal_library["ids"]), None)
        if engine_id is None and signal.id.startswith("sig_"):
            engine_id = engine_signal_library["by_name"].get(signal.id[4:])
        if engine_id is None:
            engine_id = signal.id

        app_to_engine[signal.id] = engine_id
        engine_to_app.setdefault(engine_id, signal.id)

        for alias in signal.adapter_aliases:
            if alias:
                app_to_engine.setdefault(alias, engine_id)
                engine_to_app.setdefault(alias, signal.id)

    return {
        "app_to_engine": app_to_engine,
        "engine_to_app": engine_to_app,
    }


def _load_engine_signal_library(engine_root: Path) -> dict[str, Any]:
    signal_ids: set[str] = set()
    by_name: dict[str, str] = {}
    signals_path = engine_root / "01_ontology" / "signals.csv"
    if not signals_path.exists():
        return {"ids": signal_ids, "by_name": by_name}
    with signals_path.open("r", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            signal_id = str(row.get("signal_id") or "").strip()
            signal_name = str(row.get("signal_name") or "").strip()
            if signal_id:
                signal_ids.add(signal_id)
            if signal_id and signal_name:
                by_name.setdefault(signal_name, signal_id)
    return {"ids": signal_ids, "by_name": by_name}


def _map_engine_signal_id(signal_id: str, signal_id_map: dict[str, str] | None) -> str:
    if not signal_id_map:
        return signal_id
    return signal_id_map.get(signal_id, signal_id)


def _translate_signal_refs(value: Any, signal_id_map: dict[str, str]) -> Any:
    if isinstance(value, list):
        return [_translate_signal_refs(item, signal_id_map) for item in value]
    if isinstance(value, dict):
        translated: dict[str, Any] = {}
        for key, nested_value in value.items():
            if key == "signal_id" and isinstance(nested_value, str):
                translated[key] = signal_id_map.get(nested_value, nested_value)
            elif key == "signal_ids" and isinstance(nested_value, list):
                translated[key] = [
                    signal_id_map.get(item, item) if isinstance(item, str) else item
                    for item in nested_value
                ]
            else:
                translated[key] = _translate_signal_refs(nested_value, signal_id_map)
        return translated
    return value


def _merge_signal_notes(existing: Any, incoming: Any) -> str | None:
    existing_text = _string_or_none(existing)
    incoming_text = _string_or_none(incoming)
    if existing_text and incoming_text and incoming_text not in existing_text:
        return f"{existing_text}\n{incoming_text}"
    return existing_text or incoming_text


def _higher_confidence(existing: Any, incoming: Any) -> str | None:
    rank = {"low": 0, "medium": 1, "high": 2}
    existing_text = _string_or_none(existing)
    incoming_text = _string_or_none(incoming)
    if existing_text is None:
        return incoming_text
    if incoming_text is None:
        return existing_text
    return incoming_text if rank.get(incoming_text, -1) > rank.get(existing_text, -1) else existing_text


def _build_executable_plan_tasks(
    *,
    generated_plan: dict[str, Any],
    engine_root: Path,
    assessment: Assessment,
) -> list[PlanTaskOutput]:
    block_catalog = _load_block_catalog(engine_root)
    tasks: list[PlanTaskOutput] = []

    for task_data in _flatten_generated_plan(generated_plan):
        layer = str(task_data.get("_layer") or _layer_from_task_id(task_data.get("task_id")))
        item_id = str(task_data.get("item_id") or "")
        item_type = str(task_data.get("item_type") or "block")
        block_data = block_catalog.get(item_id) if item_type == "block" else None
        section = _execution_section(block_data, layer)
        title = _task_title(task_data, block_data)
        rationale = _task_rationale(task_data, block_data)
        dependencies = list(dict.fromkeys([str(dep) for dep in task_data.get("depends_on_modules", []) if dep]))
        priority = _normalize_priority(task_data.get("priority"))
        timeline_label = str(task_data.get("timeline") or _default_timeline_label(layer))
        assigned_to = _string_or_none(section.get("responsible")) if isinstance(section, dict) else None
        verification = _string_or_none(section.get("verification")) if isinstance(section, dict) else None
        expected_output = _string_or_none(section.get("output")) if isinstance(section, dict) else None
        sub_actions = _section_actions(section)
        deliverables = _deliverable_names(block_data)

        tasks.append(
            PlanTaskOutput(
                block_id=item_id,
                title=title,
                rationale=rationale,
                effort_hours=_estimate_effort_hours(block_data, layer, item_type=item_type),
                dependencies=dependencies,
                trace=_build_task_trace(task_data, block_data, layer),
                sub_actions=sub_actions,
                deliverables=deliverables,
                layer=layer,
                timeline_label=timeline_label,
                priority=priority,
                source_response_pattern_id=_string_or_none(task_data.get("source_rp")),
                source_response_pattern_name=_string_or_none(task_data.get("rp_name")),
                module_id=_string_or_none(task_data.get("module_id")),
                assigned_to=assigned_to,
                verification=verification,
                expected_output=expected_output,
            )
        )

    return tasks


def _build_structured_report(
    *,
    assessment: Assessment,
    normalized_signals: list[dict[str, Any]],
    failure_modes: list[dict[str, Any]],
    response_patterns: list[dict[str, Any]],
    constraint_report: dict[str, Any],
    generated_plan: dict[str, Any],
) -> EngineReportOutput:
    profile = assessment_profile_for(assessment.assessment_type)
    signal_count = len(normalized_signals)
    failure_mode_count = len(failure_modes)
    response_pattern_count = len(response_patterns)
    load_classification = str(constraint_report.get("plan_load", "MEDIUM")).upper()
    confidence = generated_plan.get("confidence") or {}
    confidence_state = str(confidence.get("state", "PROVISIONAL")).upper()
    confidence_note = str(confidence.get("note", "")).strip()
    deferred_count = int(constraint_report.get("deferred_count") or 0)
    constrained_count = int(constraint_report.get("constrained_count") or generated_plan.get("summary", {}).get("total_tasks", 0))
    summary = (
        f"{profile.label} surfaced {failure_mode_count} failure modes from {signal_count} reviewed signals, "
        f"activated {response_pattern_count} response patterns, and produced a {load_classification} plan with "
        f"{constrained_count} executable tasks."
    )
    if assessment.triage_enabled and deferred_count > 0:
        summary += f" Triage deferred {deferred_count} lower-priority items to protect venue capacity."

    diagnostic_spine = [
        f"Assessment mode: {profile.label}.",
        f"Signals reviewed: {signal_count}. Failure modes activated: {failure_mode_count}. Response patterns activated: {response_pattern_count}.",
        f"Plan load: {load_classification}. Triage {'on' if assessment.triage_enabled else 'off'}"
        + (f" ({assessment.triage_intensity})." if assessment.triage_enabled and assessment.triage_intensity else "."),
        f"Confidence: {confidence_state}."
        + (f" {confidence_note}" if confidence_note else ""),
    ]
    if assessment.triage_enabled and constraint_report.get("triage_message"):
        diagnostic_spine.append(str(constraint_report["triage_message"]))

    investigation_threads = _investigation_threads(failure_modes, generated_plan)
    verification_briefs = _verification_briefs(constraint_report, generated_plan)

    return EngineReportOutput(
        assessment_type=profile.key,
        assessment_type_label=profile.label,
        summary=summary,
        diagnostic_spine=diagnostic_spine,
        investigation_threads=investigation_threads,
        verification_briefs=verification_briefs,
    )


def _investigation_threads(
    failure_modes: list[dict[str, Any]],
    generated_plan: dict[str, Any],
) -> list[str]:
    threads: list[str] = []
    for failure_mode in failure_modes[:3]:
        title = _string_or_none(failure_mode.get("title")) or _string_or_none(failure_mode.get("failure_mode_id"))
        description = _string_or_none(failure_mode.get("description"))
        if title:
            threads.append(f"{title}: {description}" if description else title)
    for note in generated_plan.get("dependency_notes", [])[:2]:
        if isinstance(note, str) and note and note not in threads:
            threads.append(note)
    return threads[:5]


def _verification_briefs(
    constraint_report: dict[str, Any],
    generated_plan: dict[str, Any],
) -> list[str]:
    briefs: list[str] = []
    evidence = constraint_report.get("evidence_warnings") or {}
    evidence_message = _string_or_none(evidence.get("message")) if isinstance(evidence, dict) else None
    if evidence_message:
        briefs.append(evidence_message)
    confidence = generated_plan.get("confidence") or {}
    confidence_note = _string_or_none(confidence.get("note")) if isinstance(confidence, dict) else None
    if confidence_note and confidence_note not in briefs:
        briefs.append(confidence_note)
    for note in generated_plan.get("dependency_notes", [])[:3]:
        if isinstance(note, str) and note and note not in briefs:
            briefs.append(note)
    if constraint_report.get("triage_message") and constraint_report.get("triage_mode"):
        triage_message = str(constraint_report["triage_message"])
        if triage_message not in briefs:
            briefs.append(triage_message)
    return briefs[:5]


def _active_signal_findings(normalized_signals: list[dict[str, Any]]) -> list[DiagnosticFinding]:
    return [
        DiagnosticFinding(
            id=str(signal.get("signal_id", "")),
            name=str(signal.get("signal_name") or signal.get("signal_id") or "Unknown signal"),
            score=1.0,
        )
        for signal in normalized_signals
        if signal.get("signal_id")
    ]


def _failure_mode_findings(failure_modes: list[dict[str, Any]]) -> list[DiagnosticFinding]:
    return [
        DiagnosticFinding(
            id=str(item.get("failure_mode_id", "")),
            name=str(item.get("title") or item.get("failure_mode_id") or "Unknown failure mode"),
            score=float(item.get("score") or 0.0),
        )
        for item in failure_modes
        if item.get("failure_mode_id")
    ]


def _response_pattern_findings(response_patterns: list[dict[str, Any]]) -> list[DiagnosticFinding]:
    return [
        DiagnosticFinding(
            id=str(item.get("response_pattern_id", "")),
            name=str(item.get("rp_name") or item.get("response_pattern_id") or "Unknown response pattern"),
            score=float(item.get("priority_score") or 0.0),
        )
        for item in response_patterns
        if item.get("response_pattern_id")
    ]


def _load_block_catalog(engine_root: Path) -> dict[str, dict[str, Any]]:
    blocks_dir = engine_root / "01_ontology" / "blocks"
    catalog: dict[str, dict[str, Any]] = {}
    if not blocks_dir.exists():
        return catalog
    for path in blocks_dir.glob("B*.json"):
        try:
            catalog[path.stem] = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
    return catalog


def _flatten_generated_plan(generated_plan: dict[str, Any]) -> list[dict[str, Any]]:
    flattened: list[dict[str, Any]] = []
    for layer_key in ("L1_tasks", "L2_tasks", "L3_tasks"):
        layer = layer_key.split("_", 1)[0]
        for item in generated_plan.get(layer_key, []) or []:
            if isinstance(item, dict):
                flattened.append({**item, "_layer": layer})
    return flattened


def _execution_section(block_data: dict[str, Any] | None, layer: str) -> dict[str, Any]:
    if not block_data:
        return {}
    framework = block_data.get("execution_framework") or {}
    section_key = _LAYER_SECTION_MAP.get(layer, "L1_setup")
    section = framework.get(section_key)
    return section if isinstance(section, dict) else {}


def _section_actions(section: dict[str, Any]) -> list[str]:
    if not isinstance(section, dict):
        return []
    actions = section.get("actions")
    if not isinstance(actions, list):
        return []
    return [str(action).strip() for action in actions if str(action).strip()]


def _deliverable_names(block_data: dict[str, Any] | None) -> list[str]:
    if not block_data:
        return []
    deliverables = block_data.get("deliverables")
    if not isinstance(deliverables, list):
        return []
    values: list[str] = []
    for deliverable in deliverables:
        if isinstance(deliverable, str) and deliverable.strip():
            values.append(deliverable.strip())
        elif isinstance(deliverable, dict):
            name = _string_or_none(deliverable.get("name"))
            if name:
                values.append(name)
    return values


def _task_title(task_data: dict[str, Any], block_data: dict[str, Any] | None) -> str:
    generated_title = _string_or_none(task_data.get("title"))
    if generated_title:
        return generated_title
    if block_data is not None:
        block_name = _string_or_none(block_data.get("name"))
        if block_name:
            return block_name
    rp_name = _string_or_none(task_data.get("rp_name"))
    module_id = _string_or_none(task_data.get("module_id"))
    if rp_name and module_id:
        return f"{rp_name} ({module_id})"
    if rp_name:
        return rp_name
    return _string_or_none(task_data.get("item_id")) or "Generated task"


def _task_rationale(task_data: dict[str, Any], block_data: dict[str, Any] | None) -> str:
    description = _string_or_none(task_data.get("description"))
    if description:
        return description
    if block_data is not None:
        for key in ("purpose", "why_this_matters"):
            value = _string_or_none(block_data.get(key))
            if value:
                return value
        meta_summary = _string_or_none((block_data.get("meta") or {}).get("summary_for_humans"))
        if meta_summary:
            return meta_summary
    return "Generated from the packaged diagnostic engine action plan."


def _build_task_trace(task_data: dict[str, Any], block_data: dict[str, Any] | None, layer: str) -> dict[str, Any]:
    trace = dict(task_data.get("trace") or {})
    module_name = _string_or_none(trace.get("module_name"))
    if module_name is None and block_data is not None:
        module_name = _string_or_none(block_data.get("module"))
    domain = _string_or_none(trace.get("domain"))
    if domain is None and block_data is not None:
        domain = _string_or_none(block_data.get("domain"))
    failure_modes = trace.get("failure_modes") if isinstance(trace.get("failure_modes"), list) else []
    signal_ids = trace.get("signal_ids") if isinstance(trace.get("signal_ids"), list) else []
    first_failure_mode = failure_modes[0].get("fm_id") if failure_modes else None
    response_pattern_id = _string_or_none(trace.get("rp_id")) or _string_or_none(task_data.get("source_rp"))
    response_pattern_name = _string_or_none(trace.get("rp_name")) or _string_or_none(task_data.get("rp_name"))
    layer_meta = _LAYER_METADATA.get(layer, _LAYER_METADATA["L1"])
    return {
        **trace,
        "signal_id": signal_ids[0] if signal_ids else None,
        "signal_ids": signal_ids,
        "failure_mode_id": first_failure_mode,
        "failure_modes": failure_modes,
        "response_pattern": (
            f"{response_pattern_id}: {response_pattern_name}"
            if response_pattern_id and response_pattern_name
            else response_pattern_id
        ),
        "response_pattern_id": response_pattern_id,
        "response_pattern_name": response_pattern_name,
        "module_id": _string_or_none(task_data.get("module_id")),
        "module_name": module_name,
        "domain": domain,
        "layer": layer,
        "layer_index": layer_meta["index"],
        "layer_title": layer_meta["title"],
        "layer_description": layer_meta["description"],
        "item_type": _string_or_none(task_data.get("item_type")) or "block",
        "legacy_task_id": _string_or_none(task_data.get("task_id")),
    }


def _estimate_effort_hours(block_data: dict[str, Any] | None, layer: str, *, item_type: str) -> float:
    if block_data is not None:
        time_load = block_data.get("time_load") or {}
        if isinstance(time_load, dict):
            layer_value = _string_or_none(time_load.get(layer))
            if layer_value:
                parsed = _first_number(layer_value)
                if parsed is not None:
                    return parsed
        effort_load = (block_data.get("block_design") or {}).get("effort_load") if isinstance(block_data.get("block_design"), dict) else {}
        if isinstance(effort_load, dict):
            for value in effort_load.values():
                parsed = _first_number(value)
                if parsed is not None:
                    return parsed
    if item_type == "tool":
        return {"L1": 1.0, "L2": 1.5, "L3": 1.0}.get(layer, 1.0)
    return {"L1": 3.0, "L2": 6.0, "L3": 2.0}.get(layer, 2.0)


def _first_number(value: Any) -> float | None:
    if isinstance(value, (int, float)):
        return float(value)
    if not isinstance(value, str):
        return None
    match = re.search(r"(\d+(?:\.\d+)?)", value)
    if not match:
        return None
    try:
        return float(match.group(1))
    except ValueError:
        return None


def _normalize_priority(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    lowered = value.strip().lower()
    if lowered == "standard":
        return "normal"
    return lowered or None


def _due_at_for_layer(layer: str | None, assessment_date: str | None) -> datetime | None:
    if not layer:
        return None
    base_date = _parse_assessment_date(assessment_date)
    return base_date + timedelta(days=_LAYER_OFFSETS.get(layer, 7))


def _report_context(raw_input: dict[str, Any]) -> dict[str, Any]:
    return {
        **(raw_input.get("venue_context") or {}),
        "venue_id": raw_input.get("venue_id", "unknown"),
        "assessment_date": raw_input.get("assessment_date", _today_iso()),
        "assessment_type": raw_input.get("assessment_type", "full_diagnostic"),
    }


def _parse_assessment_date(value: str | None) -> datetime:
    if isinstance(value, str):
        try:
            return datetime.strptime(value, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        except ValueError:
            pass
    return datetime.now(timezone.utc)


def _parse_team_size(*values: Any) -> int | None:
    for value in values:
        if isinstance(value, int) and value > 0:
            return value
        if isinstance(value, float) and value > 0:
            return int(value)
        if isinstance(value, str):
            match = re.search(r"(\d+)", value)
            if match:
                return int(match.group(1))
    return None


def _today_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _layer_from_task_id(task_id: Any) -> str:
    if isinstance(task_id, str) and "_" in task_id:
        return task_id.split("_", 1)[0]
    return "L1"


def _default_timeline_label(layer: str) -> str:
    return {
        "L1": "Days 1–30",
        "L2": "Days 31–60",
        "L3": "Days 61–90",
    }.get(layer, "Days 1–30")


def _string_or_none(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    cleaned = value.strip()
    return cleaned or None
