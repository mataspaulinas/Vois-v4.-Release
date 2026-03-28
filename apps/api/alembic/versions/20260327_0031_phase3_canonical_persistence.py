"""Phase 3 canonical persistence hardening.

Revision ID: 20260327_0031
Revises: 20260318_0030
Create Date: 2026-03-27 12:00:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260327_0031"
down_revision = "20260318_0030"
branch_labels = None
depends_on = None


progress_entry_type = sa.Enum(
    "note",
    "update",
    "milestone",
    "risk",
    "decision",
    name="progressentrytype",
)
task_dependency_kind = sa.Enum(
    "finish_to_start",
    "soft_prerequisite",
    "parallel_support",
    name="taskdependencykind",
)
task_event_type = sa.Enum(
    "status_changed",
    "comment_added",
    "deliverable_checked",
    "sub_action_checked",
    "follow_up_created",
    "escalated",
    "note_captured",
    name="taskeventtype",
)
comment_visibility = sa.Enum("internal", "shared", "owner", name="commentvisibility")
notification_channel = sa.Enum("web_push", "email", "in_app", "sms", name="notificationchannel")
notification_level = sa.Enum("info", "warning", "critical", name="notificationlevel")
plan_status = sa.Enum("draft", "active", "archived", name="planstatus")


def _is_postgres() -> bool:
    return op.get_context().dialect.name == "postgresql"


def upgrade() -> None:
    if _is_postgres():
        op.execute("ALTER TYPE threadscope ADD VALUE IF NOT EXISTS 'task'")
        op.execute("ALTER TYPE threadscope ADD VALUE IF NOT EXISTS 'help_request'")

    op.add_column("assessments", sa.Column("assessment_type", sa.String(length=64), nullable=False, server_default="full_diagnostic"))
    op.add_column("assessments", sa.Column("assessment_date", sa.String(length=32), nullable=True))
    op.add_column("assessments", sa.Column("raw_input_text", sa.Text(), nullable=True))
    op.add_column(
        "assessments",
        sa.Column("raw_intake_payload", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
    )
    op.add_column(
        "assessments",
        sa.Column("venue_context_json", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
    )

    op.add_column(
        "engine_runs",
        sa.Column("normalized_signals_json", sa.JSON(), nullable=False, server_default=sa.text("'[]'")),
    )
    op.add_column(
        "engine_runs",
        sa.Column("diagnostic_snapshot_json", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
    )
    op.add_column(
        "engine_runs",
        sa.Column("plan_snapshot_json", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
    )
    op.add_column("engine_runs", sa.Column("report_markdown", sa.Text(), nullable=True))
    op.add_column("engine_runs", sa.Column("report_type", sa.String(length=32), nullable=True))
    op.add_column(
        "engine_runs",
        sa.Column("ai_trace_json", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
    )

    op.add_column(
        "operational_plans",
        sa.Column("status", plan_status, nullable=False, server_default="draft"),
    )
    op.add_column(
        "operational_plans",
        sa.Column("snapshot_json", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
    )
    op.add_column(
        "operational_plans",
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.add_column("plan_tasks", sa.Column("assigned_to", sa.String(length=255), nullable=True))
    op.add_column("plan_tasks", sa.Column("assignee_user_id", sa.String(length=36), nullable=True))
    op.create_index("ix_plan_tasks_assignee_user_id", "plan_tasks", ["assignee_user_id"], unique=False)
    op.add_column("plan_tasks", sa.Column("assignee_name", sa.String(length=255), nullable=True))
    op.add_column("plan_tasks", sa.Column("layer", sa.String(length=16), nullable=True))
    op.add_column("plan_tasks", sa.Column("timeline_label", sa.String(length=64), nullable=True))
    op.add_column("plan_tasks", sa.Column("priority", sa.String(length=32), nullable=True))
    op.add_column("plan_tasks", sa.Column("source_response_pattern_id", sa.String(length=64), nullable=True))
    op.add_column("plan_tasks", sa.Column("source_response_pattern_name", sa.String(length=255), nullable=True))
    op.add_column("plan_tasks", sa.Column("module_id", sa.String(length=64), nullable=True))
    op.add_column("plan_tasks", sa.Column("flags", sa.JSON(), nullable=False, server_default=sa.text("'[]'")))
    op.add_column("plan_tasks", sa.Column("due_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("plan_tasks", sa.Column("started_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("plan_tasks", sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column(
        "plan_tasks",
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.add_column("plan_tasks", sa.Column("updated_by", sa.String(length=255), nullable=True))
    op.add_column(
        "plan_tasks",
        sa.Column("review_required", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column("plan_tasks", sa.Column("verification", sa.Text(), nullable=True))
    op.add_column("plan_tasks", sa.Column("expected_output", sa.Text(), nullable=True))

    op.add_column(
        "progress_entries",
        sa.Column("entry_type", progress_entry_type, nullable=False, server_default="update"),
    )

    op.add_column(
        "copilot_messages",
        sa.Column("attachments", sa.JSON(), nullable=False, server_default=sa.text("'[]'")),
    )

    op.create_table(
        "task_dependencies",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("plan_id", sa.String(36), sa.ForeignKey("operational_plans.id"), nullable=False),
        sa.Column("predecessor_task_id", sa.String(36), sa.ForeignKey("plan_tasks.id"), nullable=False),
        sa.Column("successor_task_id", sa.String(36), sa.ForeignKey("plan_tasks.id"), nullable=False),
        sa.Column("dependency_kind", task_dependency_kind, nullable=False, server_default="finish_to_start"),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_task_dependencies_plan_id", "task_dependencies", ["plan_id"], unique=False)
    op.create_index("ix_task_dependencies_predecessor_task_id", "task_dependencies", ["predecessor_task_id"], unique=False)
    op.create_index("ix_task_dependencies_successor_task_id", "task_dependencies", ["successor_task_id"], unique=False)

    op.create_table(
        "task_events",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("task_id", sa.String(36), sa.ForeignKey("plan_tasks.id"), nullable=False),
        sa.Column("event_type", task_event_type, nullable=False),
        sa.Column("status", sa.String(length=32), nullable=True),
        sa.Column("actor_user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("actor_name", sa.String(length=255), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("payload", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_task_events_task_id", "task_events", ["task_id"], unique=False)

    op.create_table(
        "task_comments",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("task_id", sa.String(36), sa.ForeignKey("plan_tasks.id"), nullable=False),
        sa.Column("venue_id", sa.String(36), sa.ForeignKey("venues.id"), nullable=False),
        sa.Column("author_user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("author_name", sa.String(length=255), nullable=True),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("visibility", comment_visibility, nullable=False, server_default="internal"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_task_comments_task_id", "task_comments", ["task_id"], unique=False)
    op.create_index("ix_task_comments_venue_id", "task_comments", ["venue_id"], unique=False)

    op.create_table(
        "deliverable_proofs",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("task_id", sa.String(36), sa.ForeignKey("plan_tasks.id"), nullable=True),
        sa.Column("evidence_id", sa.String(36), sa.ForeignKey("evidence.id"), nullable=True),
        sa.Column("file_asset_id", sa.String(36), sa.ForeignKey("file_assets.id"), nullable=True),
        sa.Column("deliverable_name", sa.String(length=255), nullable=False),
        sa.Column("proof_kind", sa.String(length=64), nullable=False, server_default="evidence"),
        sa.Column("source_url", sa.Text(), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("verified_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_deliverable_proofs_task_id", "deliverable_proofs", ["task_id"], unique=False)
    op.create_index("ix_deliverable_proofs_evidence_id", "deliverable_proofs", ["evidence_id"], unique=False)

    op.create_table(
        "notification_events",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("organization_id", sa.String(36), sa.ForeignKey("organizations.id"), nullable=True),
        sa.Column("venue_id", sa.String(36), sa.ForeignKey("venues.id"), nullable=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("channel", notification_channel, nullable=False),
        sa.Column("level", notification_level, nullable=False, server_default="info"),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("entity_type", sa.String(length=128), nullable=True),
        sa.Column("entity_id", sa.String(length=128), nullable=True),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("acknowledged_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_notification_events_organization_id", "notification_events", ["organization_id"], unique=False)
    op.create_index("ix_notification_events_venue_id", "notification_events", ["venue_id"], unique=False)
    op.create_index("ix_notification_events_user_id", "notification_events", ["user_id"], unique=False)
    op.create_index("ix_notification_events_entity_id", "notification_events", ["entity_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_notification_events_entity_id", table_name="notification_events")
    op.drop_index("ix_notification_events_user_id", table_name="notification_events")
    op.drop_index("ix_notification_events_venue_id", table_name="notification_events")
    op.drop_index("ix_notification_events_organization_id", table_name="notification_events")
    op.drop_table("notification_events")

    op.drop_index("ix_deliverable_proofs_evidence_id", table_name="deliverable_proofs")
    op.drop_index("ix_deliverable_proofs_task_id", table_name="deliverable_proofs")
    op.drop_table("deliverable_proofs")

    op.drop_index("ix_task_comments_venue_id", table_name="task_comments")
    op.drop_index("ix_task_comments_task_id", table_name="task_comments")
    op.drop_table("task_comments")

    op.drop_index("ix_task_events_task_id", table_name="task_events")
    op.drop_table("task_events")

    op.drop_index("ix_task_dependencies_successor_task_id", table_name="task_dependencies")
    op.drop_index("ix_task_dependencies_predecessor_task_id", table_name="task_dependencies")
    op.drop_index("ix_task_dependencies_plan_id", table_name="task_dependencies")
    op.drop_table("task_dependencies")

    op.drop_column("copilot_messages", "attachments")
    op.drop_column("progress_entries", "entry_type")

    op.drop_column("plan_tasks", "expected_output")
    op.drop_column("plan_tasks", "verification")
    op.drop_column("plan_tasks", "review_required")
    op.drop_column("plan_tasks", "updated_by")
    op.drop_column("plan_tasks", "updated_at")
    op.drop_column("plan_tasks", "completed_at")
    op.drop_column("plan_tasks", "started_at")
    op.drop_column("plan_tasks", "due_at")
    op.drop_column("plan_tasks", "flags")
    op.drop_column("plan_tasks", "module_id")
    op.drop_column("plan_tasks", "source_response_pattern_name")
    op.drop_column("plan_tasks", "source_response_pattern_id")
    op.drop_column("plan_tasks", "priority")
    op.drop_column("plan_tasks", "timeline_label")
    op.drop_column("plan_tasks", "layer")
    op.drop_column("plan_tasks", "assignee_name")
    op.drop_index("ix_plan_tasks_assignee_user_id", table_name="plan_tasks")
    op.drop_column("plan_tasks", "assignee_user_id")
    op.drop_column("plan_tasks", "assigned_to")

    op.drop_column("operational_plans", "updated_at")
    op.drop_column("operational_plans", "snapshot_json")
    op.drop_column("operational_plans", "status")

    op.drop_column("engine_runs", "ai_trace_json")
    op.drop_column("engine_runs", "report_type")
    op.drop_column("engine_runs", "report_markdown")
    op.drop_column("engine_runs", "plan_snapshot_json")
    op.drop_column("engine_runs", "diagnostic_snapshot_json")
    op.drop_column("engine_runs", "normalized_signals_json")

    op.drop_column("assessments", "venue_context_json")
    op.drop_column("assessments", "raw_intake_payload")
    op.drop_column("assessments", "raw_input_text")
    op.drop_column("assessments", "assessment_date")
    op.drop_column("assessments", "assessment_type")
