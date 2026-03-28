"""SQLite truth alignment for closure gates.

Revision ID: 20260327_0032
Revises: 20260327_0031
Create Date: 2026-03-27 18:40:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260327_0032"
down_revision = "20260327_0031"
branch_labels = None
depends_on = None


def _is_sqlite() -> bool:
    return op.get_context().dialect.name == "sqlite"


def upgrade() -> None:
    if not _is_sqlite():
        return

    with op.batch_alter_table("users", recreate="always") as batch_op:
        batch_op.alter_column("venue_id", existing_type=sa.String(length=36), nullable=True)
        batch_op.create_foreign_key("fk_users_venue_id_venues", "venues", ["venue_id"], ["id"])

    with op.batch_alter_table("copilot_threads", recreate="always") as batch_op:
        batch_op.alter_column(
            "scope",
            existing_type=sa.String(length=6),
            type_=sa.String(length=32),
            existing_nullable=False,
        )


def downgrade() -> None:
    if not _is_sqlite():
        return

    with op.batch_alter_table("copilot_threads", recreate="always") as batch_op:
        batch_op.alter_column(
            "scope",
            existing_type=sa.String(length=32),
            type_=sa.String(length=6),
            existing_nullable=False,
        )

    with op.batch_alter_table("users", recreate="always") as batch_op:
        batch_op.drop_constraint("fk_users_venue_id_venues", type_="foreignkey")
        batch_op.alter_column("venue_id", existing_type=sa.String(length=36), nullable=True)
