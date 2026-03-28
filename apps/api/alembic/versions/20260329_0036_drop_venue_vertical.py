"""Drop deprecated venue vertical compatibility column.

Revision ID: 20260329_0036
Revises: 20260327_0035
Create Date: 2026-03-29 12:10:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260329_0036"
down_revision = "20260327_0035"
branch_labels = None
depends_on = None


def _is_sqlite() -> bool:
    return op.get_context().dialect.name == "sqlite"


def upgrade() -> None:
    if _is_sqlite():
        with op.batch_alter_table("venues", recreate="always") as batch_op:
            batch_op.drop_column("vertical")
        return

    op.drop_column("venues", "vertical")
    sa.Enum(name="vertical").drop(op.get_bind(), checkfirst=True)


def downgrade() -> None:
    if _is_sqlite():
        with op.batch_alter_table("venues", recreate="always") as batch_op:
            batch_op.add_column(sa.Column("vertical", sa.String(length=64), nullable=True))
        return

    op.add_column("venues", sa.Column("vertical", sa.String(length=64), nullable=True))
