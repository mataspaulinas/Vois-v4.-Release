"""task editing enrichment: notes column, expanded task status enum

Revision ID: 20260318_0008
Revises: 20260317_0007
Create Date: 2026-03-18 12:00:00
"""

import sqlalchemy as sa
from alembic import op


revision = "20260318_0008"
down_revision = "20260317_0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add notes column to plan_tasks
    op.add_column("plan_tasks", sa.Column("notes", sa.Text(), nullable=True))

    # Expand TaskStatus enum with new values
    if op.get_context().dialect.name == "postgresql":
        op.execute("ALTER TYPE taskstatus ADD VALUE IF NOT EXISTS 'blocked'")
        op.execute("ALTER TYPE taskstatus ADD VALUE IF NOT EXISTS 'on_hold'")


def downgrade() -> None:
    op.drop_column("plan_tasks", "notes")
    # PostgreSQL does not support removing enum values; left as no-op.
