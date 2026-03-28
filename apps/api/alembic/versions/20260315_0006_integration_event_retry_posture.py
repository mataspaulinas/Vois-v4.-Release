"""add retry posture fields to integration events

Revision ID: 20260315_0006
Revises: 20260314_0005
Create Date: 2026-03-15 17:20:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260315_0006"
down_revision = "20260314_0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("integration_events") as batch_op:
        batch_op.add_column(sa.Column("attempt_count", sa.Integer(), nullable=True, server_default="1"))
        batch_op.add_column(sa.Column("last_attempted_at", sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(sa.Column("next_retry_at", sa.DateTime(timezone=True), nullable=True))

    with op.batch_alter_table("integration_events") as batch_op:
        batch_op.alter_column("attempt_count", existing_type=sa.Integer(), nullable=False, server_default=None)


def downgrade() -> None:
    with op.batch_alter_table("integration_events") as batch_op:
        batch_op.drop_column("next_retry_at")
        batch_op.drop_column("last_attempted_at")
        batch_op.drop_column("attempt_count")
