"""add file assets

Revision ID: 20260314_0003
Revises: 20260314_0002
Create Date: 2026-03-14 22:15:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260314_0003"
down_revision = "20260314_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "file_assets",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("organization_id", sa.String(length=36), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("venue_id", sa.String(length=36), sa.ForeignKey("venues.id"), nullable=True),
        sa.Column("created_by", sa.String(length=36), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("file_name", sa.String(length=255), nullable=False),
        sa.Column("content_type", sa.String(length=128), nullable=True),
        sa.Column("storage_backend", sa.String(length=64), nullable=False),
        sa.Column("ingest_mode", sa.String(length=64), nullable=False),
        sa.Column("storage_key", sa.String(length=512), nullable=True),
        sa.Column("source_url", sa.Text(), nullable=True),
        sa.Column("size_bytes", sa.Integer(), nullable=True),
        sa.Column("sha256", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_file_assets_organization_id", "file_assets", ["organization_id"], unique=False)
    op.create_index("ix_file_assets_venue_id", "file_assets", ["venue_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_file_assets_venue_id", table_name="file_assets")
    op.drop_index("ix_file_assets_organization_id", table_name="file_assets")
    op.drop_table("file_assets")
