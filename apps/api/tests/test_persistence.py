import json
import uuid
from pathlib import Path

from sqlalchemy.orm import Session

from app.db.session import get_session_factory
from app.models.domain import Assessment, EngineRun, OperationalPlan, Organization, PlanTask, Role, User, Venue
from app.services.legacy_bridge import LegacyEngineService
from app.services.ontology import get_ontology_repository
from app.services.ontology_bindings import (
    hydrate_assessment_identity,
    hydrate_engine_run_identity,
    hydrate_plan_identity,
    set_venue_binding,
)


FIXTURE_DIR = (
    Path(__file__).resolve().parents[3]
    / "embedded_engine"
    / "OIS_Cafe_v2"
    / "docs"
    / "migration"
    / "phase0"
    / "fixtures"
    / "F001_normal_followup_warsaw"
)


def test_round_trip_persistence():
    db: Session = get_session_factory()()
    try:
        org_id = str(uuid.uuid4())
        venue_id = str(uuid.uuid4())
        user_id = str(uuid.uuid4())
        repository = get_ontology_repository()

        db.add(Organization(id=org_id, name="Test Org", slug=f"test-org-{org_id[:8]}"))
        venue = Venue(
            id=venue_id,
            organization_id=org_id,
            name="Test Venue",
            slug=f"test-venue-{venue_id[:8]}",
        )
        db.add(venue)
        db.add(
            User(
                id=user_id,
                organization_id=org_id,
                email=f"test-{user_id[:8]}@example.com",
                full_name="Test User",
                role=Role.PLATFORM_ADMIN,
            )
        )
        db.flush()
        ontology_id, ontology_version = ("cafe", "v1")
        set_venue_binding(
            db,
            venue,
            repository,
            ontology_id=ontology_id,
            ontology_version=ontology_version,
            bound_by=user_id,
        )
        mount = repository.load_mount(ontology_id, ontology_version, allow_invalid=True)

        fixture_input = json.loads((FIXTURE_DIR / "fixture_input.json").read_text(encoding="utf-8"))
        raw_input = {
            "venue_id": venue_id,
            "assessment_type": fixture_input.get("assessment_type", "full_diagnostic"),
            "assessment_date": fixture_input.get("assessment_date"),
            "selected_signal_ids": [
                signal_id
                for signal_id, state in (fixture_input.get("signals") or {}).items()
                if not isinstance(state, dict) or state.get("active", True)
            ],
            "signal_states": fixture_input.get("signals", {}),
            "management_hours": fixture_input.get("management_hours", 8.0),
            "weekly_budget": fixture_input.get("weekly_budget", 8.0),
            "raw_input_text": fixture_input.get("raw_input_text"),
            "venue_context": fixture_input.get("venue_context", {}),
        }

        assessment = Assessment(
            venue_id=venue_id,
            created_by=user_id,
            notes="GF-001 Persistence Test",
            assessment_type=raw_input.get("assessment_type", "full_diagnostic"),
            assessment_date=raw_input.get("assessment_date"),
            selected_signal_ids=raw_input.get("selected_signal_ids", []),
            signal_states=raw_input.get("signal_states", {}),
            raw_input_text=raw_input.get("raw_input_text"),
            raw_intake_payload=raw_input.get("raw_intake_payload", {}),
            venue_context_json=raw_input.get("venue_context", {}),
            management_hours_available=raw_input.get("management_hours", 8.0),
            weekly_effort_budget=raw_input.get("weekly_budget", 8.0),
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

        result = LegacyEngineService().run_legacy_analysis(raw_input)
        pipeline_data = result["pipeline_data"]

        engine_run = EngineRun(
            venue_id=venue_id,
            assessment_id=assessment.id,
            created_by=user_id,
            plan_load_classification=pipeline_data.get("load_classification", "moderate"),
            report_json={
                "summary": "GF-001 persistence snapshot",
                "diagnostic_spine": [],
                "investigation_threads": [],
                "verification_briefs": [],
            },
            normalized_signals_json=pipeline_data.get("normalized_signals", []),
            diagnostic_snapshot_json={
                "failure_modes": pipeline_data.get("failure_modes", []),
                "response_patterns": pipeline_data.get("response_patterns", []),
                "activation_set_raw": pipeline_data.get("activation_set_raw", {}),
                "activation_context": pipeline_data.get("activation_context", []),
                "activation_set_constrained": pipeline_data.get("activation_set_constrained", {}),
                "constraint_report": pipeline_data.get("constraint_report", {}),
            },
            plan_snapshot_json=pipeline_data.get("action_plan", {}),
            report_markdown=result.get("report_markdown"),
            report_type=pipeline_data.get("report_type"),
            ai_trace_json={},
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
            venue_id=venue_id,
            title=f"Plan for {venue_id}",
            summary="Test persistence summary",
            total_effort_hours=pipeline_data.get("summary", {}).get("total_blocks", 0) * 1.5,
            snapshot_json=pipeline_data.get("action_plan", {}),
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

        all_tasks = (
            pipeline_data["action_plan"]["L1_tasks"]
            + pipeline_data["action_plan"]["L2_tasks"]
            + pipeline_data["action_plan"]["L3_tasks"]
        )
        for order_index, task_data in enumerate(all_tasks):
            db.add(
                PlanTask(
                    plan_id=plan.id,
                    block_id=task_data["item_id"],
                    title=task_data["title"],
                    order_index=order_index,
                    effort_hours=1.5,
                    rationale=task_data.get("description", ""),
                    dependencies=task_data.get("depends_on_modules", []),
                    trace=task_data.get("trace", {}),
                )
            )

        db.commit()
        db.expire_all()

        reloaded_engine_run = db.get(EngineRun, engine_run.id)
        reloaded_plan = db.get(OperationalPlan, plan.id)
        reloaded_tasks = list(db.query(PlanTask).filter(PlanTask.plan_id == plan.id).all())

        assert reloaded_engine_run is not None
        assert reloaded_plan is not None
        assert reloaded_engine_run.normalized_signals_json == pipeline_data.get("normalized_signals", [])
        assert reloaded_engine_run.plan_snapshot_json == pipeline_data.get("action_plan", {})
        assert reloaded_plan.snapshot_json == pipeline_data.get("action_plan", {})
        assert len(reloaded_tasks) == len(all_tasks)
    finally:
        db.close()
