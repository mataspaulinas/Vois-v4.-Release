"""Phase 9 closure defaults and venue vertical deprecation.

Revision ID: 20260327_0035
Revises: 20260327_0034
Create Date: 2026-03-27 23:59:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260327_0035"
down_revision = "20260327_0034"
branch_labels = None
depends_on = None


vertical_enum = sa.Enum("restaurant", "cafe", name="vertical")


def _is_sqlite() -> bool:
    return op.get_context().dialect.name == "sqlite"


def upgrade() -> None:
    if _is_sqlite():
        with op.batch_alter_table("venues", recreate="always") as batch_op:
            batch_op.alter_column(
                "vertical",
                existing_type=vertical_enum,
                type_=sa.String(length=64),
                nullable=True,
            )

        with op.batch_alter_table("assessments", recreate="always") as batch_op:
            batch_op.alter_column("ontology_id", existing_type=sa.String(length=128), server_default=None)
            batch_op.alter_column("ontology_version", existing_type=sa.String(length=64), server_default=None)
            batch_op.alter_column("core_canon_version", existing_type=sa.String(length=64), server_default=None)
            batch_op.alter_column("adapter_id", existing_type=sa.String(length=128), server_default=None)
            batch_op.alter_column("manifest_digest", existing_type=sa.String(length=64), server_default=None)

        with op.batch_alter_table("engine_runs", recreate="always") as batch_op:
            batch_op.alter_column("ontology_id", existing_type=sa.String(length=128), server_default=None)
            batch_op.alter_column("core_canon_version", existing_type=sa.String(length=64), server_default=None)
            batch_op.alter_column("adapter_id", existing_type=sa.String(length=128), server_default=None)
            batch_op.alter_column("manifest_digest", existing_type=sa.String(length=64), server_default=None)

        with op.batch_alter_table("operational_plans", recreate="always") as batch_op:
            batch_op.alter_column("ontology_id", existing_type=sa.String(length=128), server_default=None)
            batch_op.alter_column("ontology_version", existing_type=sa.String(length=64), server_default=None)
            batch_op.alter_column("core_canon_version", existing_type=sa.String(length=64), server_default=None)
            batch_op.alter_column("adapter_id", existing_type=sa.String(length=128), server_default=None)
            batch_op.alter_column("manifest_digest", existing_type=sa.String(length=64), server_default=None)
        return

    op.alter_column(
        "venues",
        "vertical",
        existing_type=vertical_enum,
        type_=sa.String(length=64),
        existing_nullable=False,
        nullable=True,
        postgresql_using="vertical::text",
    )

    op.alter_column("assessments", "ontology_id", existing_type=sa.String(length=128), server_default=None)
    op.alter_column("assessments", "ontology_version", existing_type=sa.String(length=64), server_default=None)
    op.alter_column("assessments", "core_canon_version", existing_type=sa.String(length=64), server_default=None)
    op.alter_column("assessments", "adapter_id", existing_type=sa.String(length=128), server_default=None)
    op.alter_column("assessments", "manifest_digest", existing_type=sa.String(length=64), server_default=None)

    op.alter_column("engine_runs", "ontology_id", existing_type=sa.String(length=128), server_default=None)
    op.alter_column("engine_runs", "core_canon_version", existing_type=sa.String(length=64), server_default=None)
    op.alter_column("engine_runs", "adapter_id", existing_type=sa.String(length=128), server_default=None)
    op.alter_column("engine_runs", "manifest_digest", existing_type=sa.String(length=64), server_default=None)

    op.alter_column("operational_plans", "ontology_id", existing_type=sa.String(length=128), server_default=None)
    op.alter_column("operational_plans", "ontology_version", existing_type=sa.String(length=64), server_default=None)
    op.alter_column("operational_plans", "core_canon_version", existing_type=sa.String(length=64), server_default=None)
    op.alter_column("operational_plans", "adapter_id", existing_type=sa.String(length=128), server_default=None)
    op.alter_column("operational_plans", "manifest_digest", existing_type=sa.String(length=64), server_default=None)


def downgrade() -> None:
    if _is_sqlite():
        op.execute("UPDATE venues SET vertical = 'restaurant' WHERE vertical IS NULL")

        with op.batch_alter_table("operational_plans", recreate="always") as batch_op:
            batch_op.alter_column("manifest_digest", existing_type=sa.String(length=64), server_default="compat-restaurant-legacy-v8")
            batch_op.alter_column("adapter_id", existing_type=sa.String(length=128), server_default="restaurant")
            batch_op.alter_column("core_canon_version", existing_type=sa.String(length=64), server_default="v3")
            batch_op.alter_column("ontology_version", existing_type=sa.String(length=64), server_default="v8")
            batch_op.alter_column("ontology_id", existing_type=sa.String(length=128), server_default="restaurant-legacy")

        with op.batch_alter_table("engine_runs", recreate="always") as batch_op:
            batch_op.alter_column("manifest_digest", existing_type=sa.String(length=64), server_default="compat-restaurant-legacy-v8")
            batch_op.alter_column("adapter_id", existing_type=sa.String(length=128), server_default="restaurant")
            batch_op.alter_column("core_canon_version", existing_type=sa.String(length=64), server_default="v3")
            batch_op.alter_column("ontology_id", existing_type=sa.String(length=128), server_default="restaurant-legacy")

        with op.batch_alter_table("assessments", recreate="always") as batch_op:
            batch_op.alter_column("manifest_digest", existing_type=sa.String(length=64), server_default="compat-restaurant-legacy-v8")
            batch_op.alter_column("adapter_id", existing_type=sa.String(length=128), server_default="restaurant")
            batch_op.alter_column("core_canon_version", existing_type=sa.String(length=64), server_default="v3")
            batch_op.alter_column("ontology_version", existing_type=sa.String(length=64), server_default="v8")
            batch_op.alter_column("ontology_id", existing_type=sa.String(length=128), server_default="restaurant-legacy")

        with op.batch_alter_table("venues", recreate="always") as batch_op:
            batch_op.alter_column(
                "vertical",
                existing_type=sa.String(length=64),
                type_=vertical_enum,
                nullable=False,
            )
        return

    op.execute("UPDATE venues SET vertical = 'restaurant' WHERE vertical IS NULL")
    vertical_enum.create(op.get_bind(), checkfirst=True)
    op.alter_column(
        "venues",
        "vertical",
        existing_type=sa.String(length=64),
        type_=vertical_enum,
        existing_nullable=True,
        nullable=False,
        postgresql_using="vertical::vertical",
    )

    op.alter_column("assessments", "ontology_id", existing_type=sa.String(length=128), server_default="restaurant-legacy")
    op.alter_column("assessments", "ontology_version", existing_type=sa.String(length=64), server_default="v8")
    op.alter_column("assessments", "core_canon_version", existing_type=sa.String(length=64), server_default="v3")
    op.alter_column("assessments", "adapter_id", existing_type=sa.String(length=128), server_default="restaurant")
    op.alter_column("assessments", "manifest_digest", existing_type=sa.String(length=64), server_default="compat-restaurant-legacy-v8")

    op.alter_column("engine_runs", "ontology_id", existing_type=sa.String(length=128), server_default="restaurant-legacy")
    op.alter_column("engine_runs", "core_canon_version", existing_type=sa.String(length=64), server_default="v3")
    op.alter_column("engine_runs", "adapter_id", existing_type=sa.String(length=128), server_default="restaurant")
    op.alter_column("engine_runs", "manifest_digest", existing_type=sa.String(length=64), server_default="compat-restaurant-legacy-v8")

    op.alter_column("operational_plans", "ontology_id", existing_type=sa.String(length=128), server_default="restaurant-legacy")
    op.alter_column("operational_plans", "ontology_version", existing_type=sa.String(length=64), server_default="v8")
    op.alter_column("operational_plans", "core_canon_version", existing_type=sa.String(length=64), server_default="v3")
    op.alter_column("operational_plans", "adapter_id", existing_type=sa.String(length=128), server_default="restaurant")
    op.alter_column("operational_plans", "manifest_digest", existing_type=sa.String(length=64), server_default="compat-restaurant-legacy-v8")
