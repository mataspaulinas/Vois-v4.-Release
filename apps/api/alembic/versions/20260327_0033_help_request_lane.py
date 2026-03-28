"""Add first-class help request lane.

Revision ID: 20260327_0033
Revises: 20260327_0032
Create Date: 2026-03-27 21:15:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260327_0033"
down_revision = "20260327_0032"
branch_labels = None
depends_on = None


help_request_status = sa.Enum("open", "answered", "closed", name="helprequeststatus")


def upgrade() -> None:
    op.create_table(
        "help_requests",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("venue_id", sa.String(length=36), sa.ForeignKey("venues.id"), nullable=False),
        sa.Column("requester_user_id", sa.String(length=36), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("channel", sa.String(length=64), nullable=False, server_default="pocket"),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("prompt", sa.Text(), nullable=False),
        sa.Column("status", help_request_status, nullable=False, server_default="open"),
        sa.Column("linked_thread_id", sa.String(length=36), sa.ForeignKey("copilot_threads.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_help_requests_venue_id", "help_requests", ["venue_id"], unique=False)
    op.create_index("ix_help_requests_requester_user_id", "help_requests", ["requester_user_id"], unique=False)
    op.create_index("ix_help_requests_linked_thread_id", "help_requests", ["linked_thread_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_help_requests_linked_thread_id", table_name="help_requests")
    op.drop_index("ix_help_requests_requester_user_id", table_name="help_requests")
    op.drop_index("ix_help_requests_venue_id", table_name="help_requests")
    op.drop_table("help_requests")
