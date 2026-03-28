"""Add push_subscriptions table for Web Push notifications.

Revision ID: 20260318_0030
Revises: 20260318_0010
"""

from alembic import op
import sqlalchemy as sa

revision = "20260318_0030"
down_revision = "20260318_0010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "push_subscriptions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), nullable=False, index=True),
        sa.Column("endpoint", sa.Text, nullable=False),
        sa.Column("p256dh_key", sa.Text, nullable=False),
        sa.Column("auth_key", sa.Text, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("push_subscriptions")
