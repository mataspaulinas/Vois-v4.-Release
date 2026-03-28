"""initial schema

Revision ID: 20260313_0001
Revises:
Create Date: 2026-03-13 16:30:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260313_0001"
down_revision = None
branch_labels = None
depends_on = None


role_enum = sa.Enum(
    "platform_admin",
    "org_admin",
    "portfolio_director",
    "venue_manager",
    "contributor",
    "viewer",
    name="role",
)
venue_status_enum = sa.Enum(
    "active",
    "monitoring",
    "paused",
    "critical",
    "archived",
    name="venuestatus",
)
vertical_enum = sa.Enum("restaurant", name="vertical")
thread_scope_enum = sa.Enum("global", "venue", name="threadscope")
task_status_enum = sa.Enum(
    "not_started",
    "in_progress",
    "completed",
    "deferred",
    name="taskstatus",
)


def upgrade() -> None:
    op.create_table(
        "organizations",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("slug", sa.String(length=255), nullable=False),
        sa.Column("region", sa.String(length=64), nullable=False),
        sa.Column("data_residency", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_organizations_slug", "organizations", ["slug"], unique=True)

    op.create_table(
        "users",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("organization_id", sa.String(length=36), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("role", role_enum, nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_organization_id", "users", ["organization_id"], unique=False)

    op.create_table(
        "venues",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("organization_id", sa.String(length=36), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("slug", sa.String(length=255), nullable=False),
        sa.Column("vertical", vertical_enum, nullable=False),
        sa.Column("status", venue_status_enum, nullable=False),
        sa.Column("concept", sa.String(length=255), nullable=True),
        sa.Column("location", sa.String(length=255), nullable=True),
        sa.Column("size_note", sa.String(length=255), nullable=True),
        sa.Column("capacity_profile", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_venues_organization_id", "venues", ["organization_id"], unique=False)
    op.create_index("ix_venues_slug", "venues", ["slug"], unique=True)

    op.create_table(
        "assessments",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("venue_id", sa.String(length=36), sa.ForeignKey("venues.id"), nullable=False),
        sa.Column("created_by", sa.String(length=36), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("selected_signal_ids", sa.JSON(), nullable=False),
        sa.Column("signal_states", sa.JSON(), nullable=False),
        sa.Column("management_hours_available", sa.Float(), nullable=False),
        sa.Column("weekly_effort_budget", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_assessments_venue_id", "assessments", ["venue_id"], unique=False)

    op.create_table(
        "engine_runs",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("venue_id", sa.String(length=36), sa.ForeignKey("venues.id"), nullable=False),
        sa.Column("assessment_id", sa.String(length=36), sa.ForeignKey("assessments.id"), nullable=False),
        sa.Column("created_by", sa.String(length=36), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("ontology_version", sa.String(length=64), nullable=False),
        sa.Column("plan_load_classification", sa.String(length=64), nullable=False),
        sa.Column("report_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_engine_runs_assessment_id", "engine_runs", ["assessment_id"], unique=False)
    op.create_index("ix_engine_runs_venue_id", "engine_runs", ["venue_id"], unique=False)

    op.create_table(
        "operational_plans",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("engine_run_id", sa.String(length=36), sa.ForeignKey("engine_runs.id"), nullable=False),
        sa.Column("venue_id", sa.String(length=36), sa.ForeignKey("venues.id"), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("total_effort_hours", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_operational_plans_engine_run_id", "operational_plans", ["engine_run_id"], unique=False)
    op.create_index("ix_operational_plans_venue_id", "operational_plans", ["venue_id"], unique=False)

    op.create_table(
        "plan_tasks",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("plan_id", sa.String(length=36), sa.ForeignKey("operational_plans.id"), nullable=False),
        sa.Column("block_id", sa.String(length=64), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("status", task_status_enum, nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.Column("effort_hours", sa.Float(), nullable=False),
        sa.Column("rationale", sa.Text(), nullable=False),
        sa.Column("dependencies", sa.JSON(), nullable=False),
        sa.Column("trace", sa.JSON(), nullable=False),
        sa.Column("sub_actions", sa.JSON(), nullable=False),
        sa.Column("deliverables", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_plan_tasks_block_id", "plan_tasks", ["block_id"], unique=False)
    op.create_index("ix_plan_tasks_plan_id", "plan_tasks", ["plan_id"], unique=False)

    op.create_table(
        "progress_entries",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("venue_id", sa.String(length=36), sa.ForeignKey("venues.id"), nullable=False),
        sa.Column("created_by", sa.String(length=36), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("summary", sa.String(length=255), nullable=False),
        sa.Column("detail", sa.Text(), nullable=True),
        sa.Column("status", venue_status_enum, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_progress_entries_venue_id", "progress_entries", ["venue_id"], unique=False)

    op.create_table(
        "copilot_threads",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("organization_id", sa.String(length=36), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("venue_id", sa.String(length=36), sa.ForeignKey("venues.id"), nullable=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("scope", thread_scope_enum, nullable=False),
        sa.Column("archived", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_copilot_threads_organization_id", "copilot_threads", ["organization_id"], unique=False)

    op.create_table(
        "integration_events",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("venue_id", sa.String(length=36), sa.ForeignKey("venues.id"), nullable=False),
        sa.Column("provider", sa.String(length=64), nullable=False),
        sa.Column("event_type", sa.String(length=128), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_integration_events_venue_id", "integration_events", ["venue_id"], unique=False)

    op.create_table(
        "audit_entries",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("organization_id", sa.String(length=36), sa.ForeignKey("organizations.id"), nullable=True),
        sa.Column("actor_user_id", sa.String(length=36), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("entity_type", sa.String(length=128), nullable=False),
        sa.Column("entity_id", sa.String(length=128), nullable=False),
        sa.Column("action", sa.String(length=128), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_audit_entries_entity_id", "audit_entries", ["entity_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_audit_entries_entity_id", table_name="audit_entries")
    op.drop_table("audit_entries")

    op.drop_index("ix_integration_events_venue_id", table_name="integration_events")
    op.drop_table("integration_events")

    op.drop_index("ix_copilot_threads_organization_id", table_name="copilot_threads")
    op.drop_table("copilot_threads")

    op.drop_index("ix_progress_entries_venue_id", table_name="progress_entries")
    op.drop_table("progress_entries")

    op.drop_index("ix_plan_tasks_plan_id", table_name="plan_tasks")
    op.drop_index("ix_plan_tasks_block_id", table_name="plan_tasks")
    op.drop_table("plan_tasks")

    op.drop_index("ix_operational_plans_venue_id", table_name="operational_plans")
    op.drop_index("ix_operational_plans_engine_run_id", table_name="operational_plans")
    op.drop_table("operational_plans")

    op.drop_index("ix_engine_runs_venue_id", table_name="engine_runs")
    op.drop_index("ix_engine_runs_assessment_id", table_name="engine_runs")
    op.drop_table("engine_runs")

    op.drop_index("ix_assessments_venue_id", table_name="assessments")
    op.drop_table("assessments")

    op.drop_index("ix_venues_slug", table_name="venues")
    op.drop_index("ix_venues_organization_id", table_name="venues")
    op.drop_table("venues")

    op.drop_index("ix_users_organization_id", table_name="users")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")

    op.drop_index("ix_organizations_slug", table_name="organizations")
    op.drop_table("organizations")
