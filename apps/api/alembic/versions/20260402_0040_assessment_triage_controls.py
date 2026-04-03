"""add assessment triage controls

Revision ID: 20260402_0040
Revises: cdc97e9fb5ff
Create Date: 2026-04-02 21:20:00.000000
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260402_0040"
down_revision: str | None = "cdc97e9fb5ff"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "assessments",
        sa.Column("triage_enabled", sa.Boolean(), nullable=False, server_default=sa.text("0")),
    )
    op.add_column(
        "assessments",
        sa.Column("triage_intensity", sa.String(length=16), nullable=True),
    )

    op.execute(
        """
        UPDATE assessments
        SET
            triage_enabled = CASE
                WHEN assessment_type IN ('follow_up', 'follow-up', 'weekly_pulse') THEN 1
                WHEN assessment_type = 'incident' THEN 1
                ELSE 0
            END,
            triage_intensity = CASE
                WHEN assessment_type IN ('follow_up', 'follow-up', 'weekly_pulse', 'incident') THEN 'focused'
                WHEN assessment_type = 'preopening_gate' THEN NULL
                ELSE 'balanced'
            END
        """
    )

    with op.batch_alter_table("assessments") as batch_op:
        batch_op.alter_column("triage_enabled", server_default=None)


def downgrade() -> None:
    op.drop_column("assessments", "triage_intensity")
    op.drop_column("assessments", "triage_enabled")
