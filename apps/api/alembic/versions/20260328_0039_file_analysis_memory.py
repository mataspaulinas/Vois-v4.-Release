"""add file analysis memory tables

Revision ID: 20260328_0039
Revises: 20260328_0038
Create Date: 2026-03-28 18:20:00.000000
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "20260328_0039"
down_revision: str | None = "20260328_0038"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


sqlite_fileanalysisstatus_enum = sa.Enum(
    "pending",
    "ready",
    "failed",
    name="fileanalysisstatus",
)

sqlite_fileanalysiskind_enum = sa.Enum(
    "text",
    "image",
    "pdf",
    "binary",
    name="fileanalysiskind",
)


def upgrade() -> None:
    bind = op.get_bind()
    status_type: sa.TypeEngine
    kind_type: sa.TypeEngine
    if bind.dialect.name != "sqlite":
        status_type = postgresql.ENUM(
            "pending",
            "ready",
            "failed",
            name="fileanalysisstatus",
            create_type=False,
        )
        kind_type = postgresql.ENUM(
            "text",
            "image",
            "pdf",
            "binary",
            name="fileanalysiskind",
            create_type=False,
        )
        status_type.create(bind, checkfirst=True)
        kind_type.create(bind, checkfirst=True)
    else:
        status_type = sqlite_fileanalysisstatus_enum
        kind_type = sqlite_fileanalysiskind_enum

    op.create_table(
        "file_asset_analyses",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("file_asset_id", sa.String(length=36), nullable=False),
        sa.Column("organization_id", sa.String(length=36), nullable=False),
        sa.Column("venue_id", sa.String(length=36), nullable=True),
        sa.Column("created_by", sa.String(length=36), nullable=True),
        sa.Column("status", status_type, nullable=False),
        sa.Column("analysis_kind", kind_type, nullable=False),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("extracted_text", sa.Text(), nullable=True),
        sa.Column("structured_facts", sa.JSON(), nullable=False),
        sa.Column("keywords", sa.JSON(), nullable=False),
        sa.Column("salient_quotes", sa.JSON(), nullable=False),
        sa.Column("ai_provider", sa.String(length=64), nullable=True),
        sa.Column("ai_model", sa.String(length=128), nullable=True),
        sa.Column("prompt_version", sa.String(length=64), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("last_referenced_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["file_asset_id"], ["file_assets.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["venue_id"], ["venues.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("file_asset_id", name="uq_file_asset_analyses_file_asset"),
    )
    op.create_index("ix_file_asset_analyses_file_asset_id", "file_asset_analyses", ["file_asset_id"], unique=False)
    op.create_index("ix_file_asset_analyses_organization_id", "file_asset_analyses", ["organization_id"], unique=False)
    op.create_index("ix_file_asset_analyses_venue_id", "file_asset_analyses", ["venue_id"], unique=False)

    op.create_table(
        "file_asset_memory_chunks",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("analysis_id", sa.String(length=36), nullable=False),
        sa.Column("file_asset_id", sa.String(length=36), nullable=False),
        sa.Column("organization_id", sa.String(length=36), nullable=False),
        sa.Column("venue_id", sa.String(length=36), nullable=True),
        sa.Column("chunk_index", sa.Integer(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("keywords", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["analysis_id"], ["file_asset_analyses.id"]),
        sa.ForeignKeyConstraint(["file_asset_id"], ["file_assets.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["venue_id"], ["venues.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("analysis_id", "chunk_index", name="uq_file_asset_memory_chunks_analysis_chunk"),
    )
    op.create_index("ix_file_asset_memory_chunks_analysis_id", "file_asset_memory_chunks", ["analysis_id"], unique=False)
    op.create_index("ix_file_asset_memory_chunks_file_asset_id", "file_asset_memory_chunks", ["file_asset_id"], unique=False)
    op.create_index("ix_file_asset_memory_chunks_organization_id", "file_asset_memory_chunks", ["organization_id"], unique=False)
    op.create_index("ix_file_asset_memory_chunks_venue_id", "file_asset_memory_chunks", ["venue_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_file_asset_memory_chunks_venue_id", table_name="file_asset_memory_chunks")
    op.drop_index("ix_file_asset_memory_chunks_organization_id", table_name="file_asset_memory_chunks")
    op.drop_index("ix_file_asset_memory_chunks_file_asset_id", table_name="file_asset_memory_chunks")
    op.drop_index("ix_file_asset_memory_chunks_analysis_id", table_name="file_asset_memory_chunks")
    op.drop_table("file_asset_memory_chunks")

    op.drop_index("ix_file_asset_analyses_venue_id", table_name="file_asset_analyses")
    op.drop_index("ix_file_asset_analyses_organization_id", table_name="file_asset_analyses")
    op.drop_index("ix_file_asset_analyses_file_asset_id", table_name="file_asset_analyses")
    op.drop_table("file_asset_analyses")

    bind = op.get_bind()
    if bind.dialect.name != "sqlite":
        postgresql.ENUM("text", "image", "pdf", "binary", name="fileanalysiskind").drop(bind, checkfirst=True)
        postgresql.ENUM("pending", "ready", "failed", name="fileanalysisstatus").drop(bind, checkfirst=True)
