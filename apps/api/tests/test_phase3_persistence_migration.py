from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path

from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, func, inspect, select

from app.core.config import get_settings
from app.db.session import get_engine, get_session_factory, init_db
from app.models.domain import (
    Assessment,
    CopilotMessage,
    CopilotThread,
    DeliverableProof,
    EngineRun,
    NotificationEvent,
    OperationalPlan,
    PlanTask,
    ProgressEntry,
    ProgressEntryType,
    TaskComment,
    TaskDependency,
    TaskEvent,
    TaskEventType,
    TaskStatus,
)
from app.services.execution_control import check_and_escalate_overdue, create_evidence, create_follow_up
from app.services.notifications import dispatch_notification, save_push_subscription
from app.services.phase3_fixture_import import import_phase0_fixture
from app.services.plans import create_task_comment_entry, update_task
from app.services.task_history import blocking_dependency_task_ids


ROOT_DIR = Path(__file__).resolve().parents[3]
API_DIR = Path(__file__).resolve().parents[1]
FIXTURE_ROOT = ROOT_DIR / "embedded_engine" / "OIS_Cafe_v2" / "docs" / "migration" / "phase0" / "fixtures"


def test_phase3_migrations_run_cleanly_from_zero_and_existing_revision(tmp_path, monkeypatch):
    zero_db = tmp_path / "phase3_zero.db"
    existing_db = tmp_path / "phase3_existing.db"

    _run_alembic_upgrade(monkeypatch, zero_db, "head")
    inspector = inspect(create_engine(f"sqlite+pysqlite:///{zero_db.as_posix()}"))
    assert inspector.has_table("task_dependencies")
    assert inspector.has_table("task_events")
    assert inspector.has_table("task_comments")
    assert inspector.has_table("deliverable_proofs")
    assert inspector.has_table("notification_events")

    _run_alembic_upgrade(monkeypatch, existing_db, "20260318_0030")
    _run_alembic_upgrade(monkeypatch, existing_db, "head")
    existing_inspector = inspect(create_engine(f"sqlite+pysqlite:///{existing_db.as_posix()}"))
    assert existing_inspector.has_table("notification_events")


def test_phase3_fixture_import_round_trip_preserves_snapshots_and_relationships():
    init_db()
    session_factory = get_session_factory()

    with session_factory() as db:
        kaunas = import_phase0_fixture(
            db,
            fixture_dir=FIXTURE_ROOT / "F004_existing_active_plan_kaunas",
        )
        assessment = db.get(Assessment, kaunas.assessment_id)
        engine_run = db.get(EngineRun, kaunas.engine_run_id)
        plan = db.get(OperationalPlan, kaunas.plan_id)
        task_count = db.scalar(select(func.count(PlanTask.id)).where(PlanTask.plan_id == plan.id))

        assert assessment is not None
        assert assessment.assessment_type == "follow-up"
        assert assessment.venue_context_json["venue_name"] == "Kavos Namai Kaunas"
        assert assessment.raw_intake_payload["venue_id"] == "kavos_namai_kaunas"
        assert engine_run is not None
        assert len(engine_run.normalized_signals_json) == 4
        assert engine_run.diagnostic_snapshot_json["constraint_report"]["constrained_count"] == 54
        assert engine_run.report_markdown
        assert plan is not None
        assert plan.snapshot_json["summary"]["total_tasks"] == 54
        assert task_count == 54

        muzos = import_phase0_fixture(
            db,
            fixture_dir=FIXTURE_ROOT / "F005_ambiguous_ai_preopening_muzos2",
        )
        muzos_assessment = db.get(Assessment, muzos.assessment_id)
        muzos_engine_run = db.get(EngineRun, muzos.engine_run_id)
        muzos_plan = db.get(OperationalPlan, muzos.plan_id)
        muzos_task_count = db.scalar(select(func.count(PlanTask.id)).where(PlanTask.plan_id == muzos.plan_id))
        dependency_count = db.scalar(select(func.count(TaskDependency.id)).where(TaskDependency.plan_id == muzos.plan_id))

        assert muzos_assessment is not None
        assert muzos_assessment.raw_input_text
        assert muzos_assessment.raw_intake_payload["confidence_distribution"]["medium"] == 38
        assert muzos_engine_run is not None
        assert muzos_engine_run.ai_trace_json["raw_input_length"] == 10000
        assert muzos_engine_run.plan_snapshot_json["summary"]["dependencies_enforced"] == 9
        assert muzos_plan is not None
        assert muzos_task_count == 213
        assert dependency_count > 0

        dependent_task = next(
            (
                task
                for task in db.scalars(
                    select(PlanTask)
                    .where(PlanTask.plan_id == muzos.plan_id)
                    .order_by(PlanTask.order_index.asc())
                ).all()
                if task.dependencies
            ),
            None,
        )
        assert dependent_task is not None
        assert blocking_dependency_task_ids(db, task=dependent_task) != []

        thread = db.scalar(
            select(CopilotThread)
            .where(CopilotThread.venue_id == muzos.venue_id)
            .order_by(CopilotThread.created_at.desc())
        )
        assert thread is not None
        message = db.scalar(
            select(CopilotMessage)
            .where(CopilotMessage.thread_id == thread.id)
            .order_by(CopilotMessage.created_at.asc())
        )
        assert message is not None
        assert message.attachments[0]["file_name"] == "F005_ambiguous_ai_preopening_muzos2_ai_trace.json"


def test_phase3_state_integrity_for_task_mutation_and_event_truth():
    init_db()
    session_factory = get_session_factory()

    with session_factory() as db:
        imported = import_phase0_fixture(
            db,
            fixture_dir=FIXTURE_ROOT / "F004_existing_active_plan_kaunas",
        )
        task = db.get(PlanTask, imported.task_ids[0])
        assert task is not None

        updated_task = update_task(
            db,
            task.id,
            status=TaskStatus.IN_PROGRESS,
            notes="Kickoff reviewed with venue manager.",
            actor_user_id=imported.user_id,
        )
        assert updated_task.started_at is not None
        assert updated_task.updated_at is not None

        progress_entries = list(
            db.scalars(select(ProgressEntry).where(ProgressEntry.venue_id == imported.venue_id)).all()
        )
        assert any(entry.entry_type == ProgressEntryType.UPDATE for entry in progress_entries)

        comment = create_task_comment_entry(
            db,
            task_id=task.id,
            venue_id=imported.venue_id,
            body="Need owner confirmation before next sprint block.",
            actor_user_id=imported.user_id,
        )
        assert comment.body.startswith("Need owner confirmation")
        assert db.scalar(select(func.count(TaskComment.id)).where(TaskComment.task_id == task.id)) == 1

        task_events = list(
            db.scalars(select(TaskEvent).where(TaskEvent.task_id == task.id).order_by(TaskEvent.created_at.asc())).all()
        )
        assert any(event.event_type == TaskEventType.STATUS_CHANGED for event in task_events)
        assert any(event.event_type == TaskEventType.COMMENT_ADDED for event in task_events)

        overdue_due_at = datetime.now(timezone.utc) - timedelta(hours=2)
        create_follow_up(
            db,
            venue_id=imported.venue_id,
            task_id=task.id,
            assigned_to=imported.user_id,
            created_by=imported.user_id,
            title="Check imported Kaunas intervention",
            due_at=overdue_due_at,
            notes="Imported follow-up timer.",
        )
        escalations = check_and_escalate_overdue(db, imported.venue_id, actor_user_id=imported.user_id)
        assert len(escalations) == 1

        evidence = create_evidence(
            db,
            venue_id=imported.venue_id,
            task_id=task.id,
            follow_up_id=None,
            created_by=imported.user_id,
            title="Shift checklist photo",
            description="Captured after implementing the first block.",
            evidence_type="photo",
            file_asset_id=None,
        )
        proof = DeliverableProof(
            task_id=task.id,
            evidence_id=evidence.id,
            deliverable_name="Checklist proof",
            note="Stored for Phase 3 canonical truth validation.",
        )
        db.add(proof)
        db.commit()
        db.refresh(proof)
        assert proof.id is not None

        save_push_subscription(
            db,
            user_id=imported.user_id,
            endpoint="https://example.com/push/sub-1",
            p256dh_key="p256dh",
            auth_key="auth",
        )
        results = dispatch_notification(
            db,
            user_id=imported.user_id,
            title="Phase 3 notification",
            body="Imported fixture requires review.",
            url="/venues/demo",
        )
        assert len(results) == 1
        assert db.scalar(select(func.count(NotificationEvent.id)).where(NotificationEvent.user_id == imported.user_id)) == 1

        refreshed_task_events = list(
            db.scalars(select(TaskEvent).where(TaskEvent.task_id == task.id).order_by(TaskEvent.created_at.asc())).all()
        )
        assert any(event.event_type == TaskEventType.ESCALATED for event in refreshed_task_events)
        assert any(event.event_type == TaskEventType.DELIVERABLE_CHECKED for event in refreshed_task_events)


def test_phase3_task_comment_routes_round_trip():
    from app.main import create_app

    with TestClient(create_app()) as client:
        bootstrap = client.get("/api/v1/bootstrap")
        bootstrap_payload = bootstrap.json()
        user_id = bootstrap_payload["current_user"]["id"]
        venue_id = bootstrap_payload["venues"][0]["id"]
        client.headers.update({"X-OIS-User-Id": user_id})
        binding = client.get(f"/api/v1/venues/{venue_id}/ontology-binding")
        assert binding.status_code == 200
        binding_payload = binding.json()
        bundle = client.get(
            f"/api/v1/ontology/bundle?ontology_id={binding_payload['ontology_id']}&version={binding_payload['ontology_version']}"
        )
        assert bundle.status_code == 200
        selected_signal_ids = [signal["id"] for signal in bundle.json()["signals"][:2]]
        assert len(selected_signal_ids) == 2

        assessment = client.post(
            "/api/v1/assessments",
            json={
                "venue_id": venue_id,
                "notes": "Phase 3 task comment route verification",
                "selected_signal_ids": selected_signal_ids,
                "signal_states": {},
                "management_hours_available": 8,
                "weekly_effort_budget": 8,
            },
        )
        assessment_id = assessment.json()["id"]
        run = client.post(f"/api/v1/assessments/{assessment_id}/runs", json={})
        assert run.status_code == 200
        plan_id = run.json()["plan_id"]
        activate_plan = client.patch(f"/api/v1/plans/{plan_id}", json={"status": "active"})
        assert activate_plan.status_code == 200

        plan = client.get(f"/api/v1/plans/latest?venue_id={venue_id}")
        assert plan.status_code == 200
        assert plan.json()["tasks"] != []
        task_id = plan.json()["tasks"][0]["id"]

        create_comment = client.post(
            f"/api/v1/plans/tasks/{task_id}/comments",
            json={
                "venue_id": venue_id,
                "body": "Comment persisted through the Phase 3 canonical route.",
                "visibility": "internal",
            },
        )
        assert create_comment.status_code == 201
        assert create_comment.json()["body"].startswith("Comment persisted")

        get_comments = client.get(f"/api/v1/plans/tasks/{task_id}/comments")
        assert get_comments.status_code == 200
        assert any(comment["body"].startswith("Comment persisted") for comment in get_comments.json())


def _run_alembic_upgrade(monkeypatch, database_path: Path, revision: str) -> None:
    monkeypatch.setenv("DATABASE_URL", f"sqlite+pysqlite:///{database_path.as_posix()}")
    get_settings.cache_clear()
    get_engine.cache_clear()
    get_session_factory.cache_clear()
    config = Config(str(API_DIR / "alembic.ini"))
    config.set_main_option("script_location", str(API_DIR / "alembic"))
    command.upgrade(config, revision)
