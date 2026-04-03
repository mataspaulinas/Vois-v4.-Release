"""add copilot action records

Revision ID: 20260403_0043
Revises: 20260402_0042
Create Date: 2026-04-03 07:20:00.000000
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260403_0043"
down_revision: str | None = "20260402_0042"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "copilot_action_records",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("organization_id", sa.String(length=36), nullable=False),
        sa.Column("thread_id", sa.String(length=36), nullable=False),
        sa.Column("source_message_id", sa.String(length=36), nullable=True),
        sa.Column("actor_user_id", sa.String(length=36), nullable=True),
        sa.Column("action_type", sa.String(length=64), nullable=False),
        sa.Column("mode", sa.String(length=32), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("target_artifact_type", sa.String(length=64), nullable=True),
        sa.Column("target_artifact_id", sa.String(length=128), nullable=True),
        sa.Column("payload", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["actor_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["source_message_id"], ["copilot_messages.id"]),
        sa.ForeignKeyConstraint(["thread_id"], ["copilot_threads.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_copilot_action_records_organization_id", "copilot_action_records", ["organization_id"], unique=False)
    op.create_index("ix_copilot_action_records_thread_id", "copilot_action_records", ["thread_id"], unique=False)
    op.create_index("ix_copilot_action_records_source_message_id", "copilot_action_records", ["source_message_id"], unique=False)
    op.create_index("ix_copilot_action_records_actor_user_id", "copilot_action_records", ["actor_user_id"], unique=False)
    op.create_index("ix_copilot_action_records_action_type", "copilot_action_records", ["action_type"], unique=False)
    op.create_index("ix_copilot_action_records_target_artifact_type", "copilot_action_records", ["target_artifact_type"], unique=False)
    op.create_index("ix_copilot_action_records_target_artifact_id", "copilot_action_records", ["target_artifact_id"], unique=False)
    op.create_index("ix_copilot_action_records_created_at", "copilot_action_records", ["created_at"], unique=False)

    with op.batch_alter_table("copilot_action_records") as batch_op:
        batch_op.alter_column("payload", server_default=None)


def downgrade() -> None:
    op.drop_index("ix_copilot_action_records_created_at", table_name="copilot_action_records")
    op.drop_index("ix_copilot_action_records_target_artifact_id", table_name="copilot_action_records")
    op.drop_index("ix_copilot_action_records_target_artifact_type", table_name="copilot_action_records")
    op.drop_index("ix_copilot_action_records_action_type", table_name="copilot_action_records")
    op.drop_index("ix_copilot_action_records_actor_user_id", table_name="copilot_action_records")
    op.drop_index("ix_copilot_action_records_source_message_id", table_name="copilot_action_records")
    op.drop_index("ix_copilot_action_records_thread_id", table_name="copilot_action_records")
    op.drop_index("ix_copilot_action_records_organization_id", table_name="copilot_action_records")
    op.drop_table("copilot_action_records")
