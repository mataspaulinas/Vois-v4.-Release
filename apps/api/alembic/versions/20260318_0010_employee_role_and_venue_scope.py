"""Add EMPLOYEE role to Role enum and venue_id to users table.

Revision ID: 20260318_0010
Revises: 20260318_0009
"""

from alembic import op
import sqlalchemy as sa

revision = "20260318_0010"
down_revision = "20260318_0009"
branch_labels = None
depends_on = None


def _is_postgres() -> bool:
    return op.get_context().dialect.name == "postgresql"


def upgrade() -> None:
    if _is_postgres():
        op.execute("ALTER TYPE role ADD VALUE IF NOT EXISTS 'employee'")
        op.add_column("users", sa.Column("venue_id", sa.String(36), sa.ForeignKey("venues.id"), nullable=True))
    else:
        op.add_column("users", sa.Column("venue_id", sa.String(36), nullable=True))
    op.create_index("ix_users_venue_id", "users", ["venue_id"])


def downgrade() -> None:
    op.drop_index("ix_users_venue_id", table_name="users")
    op.drop_column("users", "venue_id")
