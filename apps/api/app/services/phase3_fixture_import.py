from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

from sqlalchemy.orm import Session

from app.models.domain import (
    Assessment,
    CopilotAuthorRole,
    CopilotMessage,
    CopilotThread,
    EngineRun,
    OperationalPlan,
    Organization,
    PlanStatus,
    PlanTask,
    ProgressEntry,
    ProgressEntryType,
    Role,
    TaskEventType,
    TaskStatus,
    ThreadScope,
    User,
    Venue,
)
from app.services.ontology import get_ontology_repository
from app.services.ontology_bindings import (
    hydrate_assessment_identity,
    hydrate_engine_run_identity,
    hydrate_plan_identity,
    set_venue_binding,
)
from app.services.task_history import record_task_event, sync_task_dependencies


@dataclass(slots=True)
class ImportedFixtureBundle:
    fixture_id: str
    organization_id: str
    user_id: str
    venue_id: str
    assessment_id: str
    engine_run_id: str
    plan_id: str
    task_ids: list[str]


def import_phase0_fixture(db: Session, *, fixture_dir: Path) -> ImportedFixtureBundle:
    manifest = _load_json(fixture_dir / "manifest.json")
    fixture_input = _load_json(fixture_dir / "fixture_input.json")
    golden_summary = _load_json(fixture_dir / "golden_summary.json")
    action_plan = _load_json(fixture_dir / "golden_action_plan.json")
    ai_snapshot = _load_optional_json(fixture_dir / "ai_extraction_snapshot.json")

    fixture_id = manifest["fixture_id"]
    fixture_slug = fixture_id.lower()
    venue_context = fixture_input.get("venue_context") or {}
    venue_name = venue_context.get("venue_name") or manifest["label"]
    venue_slug = fixture_input.get("venue_id") or fixture_slug

    org = Organization(
        name=f"Imported {manifest['label']}",
        slug=f"{fixture_slug}-org",
        region="europe",
        data_residency="eu-central",
    )
    db.add(org)
    db.flush()

    venue = Venue(
        organization_id=org.id,
        name=venue_name,
        slug=venue_slug,
        concept=venue_context.get("type"),
        location=venue_context.get("location"),
        size_note=_stringify_if_needed(venue_context.get("team_size")),
        capacity_profile=venue_context,
    )
    db.add(venue)
    db.flush()

    user = User(
        organization_id=org.id,
        venue_id=venue.id,
        email=f"{fixture_slug}@example.com",
        full_name=f"{manifest['label']} Import Operator",
        role=Role.PLATFORM_ADMIN,
        is_active=True,
    )
    db.add(user)
    db.flush()
    repository = get_ontology_repository()
    ontology_id, ontology_version = _binding_from_fixture(venue_context)
    set_venue_binding(
        db,
        venue,
        repository,
        ontology_id=ontology_id,
        ontology_version=ontology_version,
        bound_by=user.id,
    )
    mount = repository.load_mount(ontology_id, ontology_version, allow_invalid=True)

    assessment = Assessment(
        venue_id=venue.id,
        created_by=user.id,
        notes=manifest["description"],
        assessment_type=fixture_input.get("assessment_type", "full_diagnostic"),
        assessment_date=fixture_input.get("assessment_date"),
        selected_signal_ids=list(_signal_state_map(fixture_input).keys()),
        signal_states=_signal_state_map(fixture_input),
        raw_input_text=(ai_snapshot or {}).get("raw_input_text") or fixture_input.get("raw_input_text"),
        raw_intake_payload=ai_snapshot or fixture_input,
        venue_context_json=venue_context,
        management_hours_available=fixture_input.get("management_hours", 8.0),
        weekly_effort_budget=fixture_input.get("weekly_budget", 8.0),
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

    report_markdown = (fixture_dir / "golden_report.md").read_text(encoding="utf-8")
    engine_run = EngineRun(
        venue_id=venue.id,
        assessment_id=assessment.id,
        created_by=user.id,
        plan_load_classification=str(golden_summary.get("plan_load", "TRIAGE")).lower(),
        report_json={
            "summary": _report_summary(manifest, golden_summary),
            "diagnostic_spine": _diagnostic_spine(golden_summary),
            "investigation_threads": [],
            "verification_briefs": [],
        },
        normalized_signals_json=_load_json(fixture_dir / "golden_normalized_signals.json"),
        diagnostic_snapshot_json={
            "failure_modes": _load_json(fixture_dir / "golden_failure_modes.json"),
            "response_patterns": _load_json(fixture_dir / "golden_response_patterns.json"),
            "activation_set_raw": _load_json(fixture_dir / "golden_activation_set_raw.json"),
            "activation_context": _load_json(fixture_dir / "golden_activation_context.json"),
            "activation_set_constrained": _load_json(fixture_dir / "golden_activation_set_constrained.json"),
            "constraint_report": _load_json(fixture_dir / "golden_constraint_report.json"),
        },
        plan_snapshot_json=action_plan,
        report_markdown=report_markdown,
        report_type=golden_summary.get("report_type", "legacy_markdown"),
        ai_trace_json=ai_snapshot or {},
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

    all_tasks = _flatten_action_plan(action_plan)
    plan = OperationalPlan(
        engine_run_id=engine_run.id,
        venue_id=venue.id,
        title=f"{manifest['label']} imported plan",
        summary=_report_summary(manifest, golden_summary),
        total_effort_hours=float(len(all_tasks)) * 1.5,
        status=PlanStatus.ACTIVE if "active plan" in manifest["category"] else PlanStatus.DRAFT,
        snapshot_json=action_plan,
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

    imported_tasks: list[PlanTask] = []
    for order_index, task_data in enumerate(all_tasks):
        task = PlanTask(
            plan_id=plan.id,
            block_id=task_data["item_id"],
            title=task_data["title"],
            status=TaskStatus(task_data.get("status", "not_started")),
            order_index=order_index,
            effort_hours=1.5,
            rationale=task_data.get("description", ""),
            dependencies=task_data.get("depends_on_modules", []),
            trace=task_data.get("trace", {}),
            layer=task_data.get("task_id", "").split("_", 1)[0] or None,
            timeline_label=task_data.get("timeline"),
            priority=task_data.get("priority"),
            source_response_pattern_id=task_data.get("source_rp"),
            source_response_pattern_name=task_data.get("rp_name"),
            module_id=task_data.get("module_id"),
            flags=[],
            sub_actions=[],
            deliverables=[],
        )
        db.add(task)
        db.flush()
        record_task_event(
            db,
            task_id=task.id,
            event_type=TaskEventType.NOTE_CAPTURED,
            actor_user_id=user.id,
            note="Imported from Phase 0 fixture baseline.",
            payload={"fixture_id": fixture_id, "legacy_task_id": task_data.get("task_id")},
        )
        imported_tasks.append(task)

    sync_task_dependencies(db, plan_id=plan.id, tasks=imported_tasks)

    db.add(
        ProgressEntry(
            venue_id=venue.id,
            created_by=user.id,
            entry_type=ProgressEntryType.MILESTONE,
            summary=f"Imported Phase 0 fixture {fixture_id}.",
            detail=manifest["description"],
            status=venue.status,
        )
    )

    _create_import_thread(
        db,
        organization_id=org.id,
        venue_id=venue.id,
        user_id=user.id,
        fixture_id=fixture_id,
        report_markdown=report_markdown,
        ai_snapshot=ai_snapshot,
    )

    db.commit()
    return ImportedFixtureBundle(
        fixture_id=fixture_id,
        organization_id=org.id,
        user_id=user.id,
        venue_id=venue.id,
        assessment_id=assessment.id,
        engine_run_id=engine_run.id,
        plan_id=plan.id,
        task_ids=[task.id for task in imported_tasks],
    )


def _create_import_thread(
    db: Session,
    *,
    organization_id: str,
    venue_id: str,
    user_id: str,
    fixture_id: str,
    report_markdown: str,
    ai_snapshot: dict | None,
) -> None:
    thread = CopilotThread(
        organization_id=organization_id,
        venue_id=venue_id,
        title=f"{fixture_id} imported context",
        scope=ThreadScope.VENUE,
        archived=False,
    )
    db.add(thread)
    db.flush()

    attachment = None
    if ai_snapshot:
        attachment = {
            "file_name": f"{fixture_id}_ai_trace.json",
            "content_type": "application/json",
            "url": None,
            "content_base64": None,
        }

    db.add(
        CopilotMessage(
            thread_id=thread.id,
            created_by=user_id,
            author_role=CopilotAuthorRole.USER,
            source_mode="fixture_import",
            content=report_markdown[:4000],
            references=[],
            attachments=[attachment] if attachment is not None else [],
        )
    )


def _binding_from_fixture(venue_context: dict) -> tuple[str, str]:
    """COMPATIBILITY-ONLY: infer ontology binding from fixture venue context.

    Owner: dev-only fixture import script (``phase3_fixture_import``)
    Retirement: remove when fixture import is replaced by a proper
    ontology-aware import tool that reads binding from the fixture payload
    directly rather than inferring from venue type string.

    This function is NOT used in normal runtime.  It only runs during
    ``python -m app.scripts.import_recovery_batch`` or similar dev paths.
    """
    venue_type = str(venue_context.get("type", "")).lower()
    if "cafe" in venue_type:
        return ("cafe", "v1")
    return ("restaurant-legacy", "v8")


def _signal_state_map(fixture_input: dict) -> dict:
    return {
        signal_id: signal_state
        for signal_id, signal_state in (fixture_input.get("signals") or {}).items()
        if isinstance(signal_state, dict) and signal_state.get("active", True)
    }


def _flatten_action_plan(action_plan: dict) -> list[dict]:
    tasks: list[dict] = []
    for bucket in ("L1_tasks", "L2_tasks", "L3_tasks"):
        tasks.extend(action_plan.get(bucket, []))
    return tasks


def _report_summary(manifest: dict, golden_summary: dict) -> str:
    return (
        f"{manifest['label']} imported from Phase 0 baseline with "
        f"{golden_summary.get('signals', 0)} active signals and "
        f"{golden_summary.get('failure_modes', 0)} failure modes."
    )


def _diagnostic_spine(golden_summary: dict) -> list[str]:
    return [
        f"Signals: {golden_summary.get('signals', 0)}",
        f"Failure modes: {golden_summary.get('failure_modes', 0)}",
        f"Response patterns: {golden_summary.get('response_patterns', 0)}",
        f"Constrained activation items: {golden_summary.get('constrained_activation_items', 0)}",
    ]


def _load_json(path: Path) -> dict | list:
    return json.loads(path.read_text(encoding="utf-8"))


def _load_optional_json(path: Path) -> dict | None:
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def _stringify_if_needed(value: object) -> str | None:
    if value is None:
        return None
    return str(value)
