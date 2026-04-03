"""add auth entry rebuild tables

Revision ID: 20260402_0042
Revises: 20260402_0041
Create Date: 2026-04-02 23:55:00.000000
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260402_0042"
down_revision: str | None = "20260402_0041"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "workspace_invites",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("organization_id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=True),
        sa.Column("invited_by_user_id", sa.String(length=36), nullable=True),
        sa.Column("accepted_by_user_id", sa.String(length=36), nullable=True),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("role_claim", sa.Enum("owner", "manager", "barista", "developer", name="authrole"), nullable=False),
        sa.Column("venue_ids", sa.JSON(), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["accepted_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["invited_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash"),
    )
    op.create_index("ix_workspace_invites_organization_id", "workspace_invites", ["organization_id"], unique=False)
    op.create_index("ix_workspace_invites_user_id", "workspace_invites", ["user_id"], unique=False)
    op.create_index("ix_workspace_invites_email", "workspace_invites", ["email"], unique=False)
    op.create_index("ix_workspace_invites_token_hash", "workspace_invites", ["token_hash"], unique=True)
    op.create_index("ix_workspace_invites_expires_at", "workspace_invites", ["expires_at"], unique=False)

    op.create_table(
        "password_reset_requests",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("delivery_mode", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash"),
    )
    op.create_index("ix_password_reset_requests_user_id", "password_reset_requests", ["user_id"], unique=False)
    op.create_index("ix_password_reset_requests_email", "password_reset_requests", ["email"], unique=False)
    op.create_index("ix_password_reset_requests_token_hash", "password_reset_requests", ["token_hash"], unique=True)
    op.create_index("ix_password_reset_requests_expires_at", "password_reset_requests", ["expires_at"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_password_reset_requests_expires_at", table_name="password_reset_requests")
    op.drop_index("ix_password_reset_requests_token_hash", table_name="password_reset_requests")
    op.drop_index("ix_password_reset_requests_email", table_name="password_reset_requests")
    op.drop_index("ix_password_reset_requests_user_id", table_name="password_reset_requests")
    op.drop_table("password_reset_requests")

    op.drop_index("ix_workspace_invites_expires_at", table_name="workspace_invites")
    op.drop_index("ix_workspace_invites_token_hash", table_name="workspace_invites")
    op.drop_index("ix_workspace_invites_email", table_name="workspace_invites")
    op.drop_index("ix_workspace_invites_user_id", table_name="workspace_invites")
    op.drop_index("ix_workspace_invites_organization_id", table_name="workspace_invites")
    op.drop_table("workspace_invites")
