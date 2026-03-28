"""harden integration event ingestion model

Revision ID: 20260314_0005
Revises: 20260314_0004
Create Date: 2026-03-14 16:05:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260314_0005"
down_revision = "20260314_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("integration_events") as batch_op:
        batch_op.add_column(sa.Column("organization_id", sa.String(length=36), nullable=True))
        batch_op.add_column(sa.Column("external_event_id", sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column("source_entity_id", sa.String(length=128), nullable=True))
        batch_op.add_column(sa.Column("ingest_mode", sa.String(length=64), nullable=True, server_default="manual_push"))
        batch_op.add_column(sa.Column("status", sa.String(length=64), nullable=True, server_default="received"))
        batch_op.add_column(sa.Column("normalized_signal_ids", sa.JSON(), nullable=True, server_default="[]"))
        batch_op.add_column(sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(sa.Column("error_message", sa.Text(), nullable=True))

    op.execute(
        """
        UPDATE integration_events
        SET organization_id = (
            SELECT venues.organization_id
            FROM venues
            WHERE venues.id = integration_events.venue_id
        )
        WHERE organization_id IS NULL
        """
    )

    with op.batch_alter_table("integration_events") as batch_op:
        batch_op.alter_column("organization_id", existing_type=sa.String(length=36), nullable=False)
        batch_op.alter_column(
            "ingest_mode",
            existing_type=sa.String(length=64),
            nullable=False,
            server_default=None,
        )
        batch_op.alter_column(
            "status",
            existing_type=sa.String(length=64),
            nullable=False,
            server_default=None,
        )
        batch_op.alter_column(
            "normalized_signal_ids",
            existing_type=sa.JSON(),
            nullable=False,
            server_default=None,
        )
        batch_op.create_index("ix_integration_events_organization_id", ["organization_id"], unique=False)
        batch_op.create_index("ix_integration_events_external_event_id", ["external_event_id"], unique=False)
        batch_op.create_index("ix_integration_events_status", ["status"], unique=False)
        batch_op.create_foreign_key(
            "fk_integration_events_organization_id_organizations",
            "organizations",
            ["organization_id"],
            ["id"],
        )


def downgrade() -> None:
    with op.batch_alter_table("integration_events") as batch_op:
        batch_op.drop_constraint("fk_integration_events_organization_id_organizations", type_="foreignkey")
        batch_op.drop_index("ix_integration_events_status")
        batch_op.drop_index("ix_integration_events_external_event_id")
        batch_op.drop_index("ix_integration_events_organization_id")
        batch_op.drop_column("error_message")
        batch_op.drop_column("occurred_at")
        batch_op.drop_column("normalized_signal_ids")
        batch_op.drop_column("status")
        batch_op.drop_column("ingest_mode")
        batch_op.drop_column("source_entity_id")
        batch_op.drop_column("external_event_id")
        batch_op.drop_column("organization_id")
