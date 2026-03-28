"""ECL core tables: follow_ups, escalations, evidence

Revision ID: 20260318_0009
Revises: 20260318_0008
Create Date: 2026-03-18 14:00:00
"""

import sqlalchemy as sa
from alembic import op


revision = "20260318_0009"
down_revision = "20260318_0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # FollowUpStatus enum
    follow_up_status = sa.Enum(
        "pending", "acknowledged", "completed", "overdue", "escalated",
        name="followupstatus",
    )

    # EscalationSeverity enum
    escalation_severity = sa.Enum(
        "low", "medium", "high", "critical",
        name="escalationseverity",
    )

    # EscalationStatus enum
    escalation_status = sa.Enum(
        "open", "acknowledged", "resolved",
        name="escalationstatus",
    )

    op.create_table(
        "follow_ups",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("venue_id", sa.String(36), sa.ForeignKey("venues.id"), nullable=False, index=True),
        sa.Column("task_id", sa.String(36), sa.ForeignKey("plan_tasks.id"), nullable=False, index=True),
        sa.Column("assigned_to", sa.String(36), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_by", sa.String(36), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("status", follow_up_status, nullable=False, server_default="pending"),
        sa.Column("due_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("acknowledged_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("escalated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "escalations",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("venue_id", sa.String(36), sa.ForeignKey("venues.id"), nullable=False, index=True),
        sa.Column("follow_up_id", sa.String(36), sa.ForeignKey("follow_ups.id"), nullable=True, index=True),
        sa.Column("task_id", sa.String(36), sa.ForeignKey("plan_tasks.id"), nullable=True, index=True),
        sa.Column("created_by", sa.String(36), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("escalated_to", sa.String(36), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("severity", escalation_severity, nullable=False, server_default="medium"),
        sa.Column("status", escalation_status, nullable=False, server_default="open"),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("resolution_notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "evidence",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("venue_id", sa.String(36), sa.ForeignKey("venues.id"), nullable=False, index=True),
        sa.Column("task_id", sa.String(36), sa.ForeignKey("plan_tasks.id"), nullable=True, index=True),
        sa.Column("follow_up_id", sa.String(36), sa.ForeignKey("follow_ups.id"), nullable=True, index=True),
        sa.Column("created_by", sa.String(36), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("evidence_type", sa.String(64), nullable=False, server_default="observation"),
        sa.Column("file_asset_id", sa.String(36), sa.ForeignKey("file_assets.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("evidence")
    op.drop_table("escalations")
    op.drop_table("follow_ups")
