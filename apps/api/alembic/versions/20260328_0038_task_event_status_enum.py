"""align task event status with taskstatus enum

Revision ID: 20260328_0038
Revises: 20260328_0037
Create Date: 2026-03-28 14:35:00.000000
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260328_0038"
down_revision: str | None = "20260328_0037"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


taskstatus_enum = sa.Enum(
    "not_started",
    "in_progress",
    "completed",
    "blocked",
    "on_hold",
    "deferred",
    name="taskstatus",
)


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "sqlite":
        with op.batch_alter_table("task_events") as batch_op:
            batch_op.alter_column(
                "status",
                existing_type=sa.String(length=32),
                type_=taskstatus_enum,
                existing_nullable=True,
            )
    else:
        op.alter_column(
            "task_events",
            "status",
            existing_type=sa.String(length=32),
            type_=taskstatus_enum,
            existing_nullable=True,
            postgresql_using="status::taskstatus",
        )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "sqlite":
        with op.batch_alter_table("task_events") as batch_op:
            batch_op.alter_column(
                "status",
                existing_type=taskstatus_enum,
                type_=sa.String(length=32),
                existing_nullable=True,
            )
    else:
        op.alter_column(
            "task_events",
            "status",
            existing_type=taskstatus_enum,
            type_=sa.String(length=32),
            existing_nullable=True,
            postgresql_using="status::text",
        )
