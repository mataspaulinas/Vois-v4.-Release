"""add copilot messages

Revision ID: 20260314_0002
Revises: 20260313_0001
Create Date: 2026-03-14 11:30:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260314_0002"
down_revision = "20260313_0001"
branch_labels = None
depends_on = None


copilot_author_role_enum = sa.Enum("user", "assistant", "system", name="copilotauthorrole")


def upgrade() -> None:
    op.create_table(
        "copilot_messages",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("thread_id", sa.String(length=36), sa.ForeignKey("copilot_threads.id"), nullable=False),
        sa.Column("created_by", sa.String(length=36), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("author_role", copilot_author_role_enum, nullable=False),
        sa.Column("source_mode", sa.String(length=64), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("references", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_copilot_messages_thread_id", "copilot_messages", ["thread_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_copilot_messages_thread_id", table_name="copilot_messages")
    op.drop_table("copilot_messages")
