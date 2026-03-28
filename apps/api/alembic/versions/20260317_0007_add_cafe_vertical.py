"""add cafe vertical

Revision ID: 20260317_0007
Revises: 20260315_0006
Create Date: 2026-03-17 21:00:00
"""

from alembic import op


revision = "20260317_0007"
down_revision = "20260315_0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    if op.get_context().dialect.name == "postgresql":
        op.execute("ALTER TYPE vertical ADD VALUE IF NOT EXISTS 'cafe'")


def downgrade() -> None:
    # PostgreSQL does not support removing enum values directly.
    # A full recreate would be needed; left as no-op for safety.
    pass
