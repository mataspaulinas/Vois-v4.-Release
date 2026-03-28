"""add organization memberships and venue access assignments

Revision ID: 20260328_0037
Revises: 20260327_0036
Create Date: 2026-03-28 13:45:00.000000
"""

from collections.abc import Sequence
from uuid import uuid4

from alembic import op
import sqlalchemy as sa


revision: str = "20260328_0037"
down_revision: str | None = "20260327_0036"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


authrole_enum = sa.Enum("owner", "manager", "barista", "developer", name="authrole")


def upgrade() -> None:
    bind = op.get_bind()

    if bind.dialect.name == "sqlite":
        with op.batch_alter_table("users") as batch_op:
            batch_op.alter_column("organization_id", existing_type=sa.String(length=36), nullable=True)
        with op.batch_alter_table("user_sessions") as batch_op:
            batch_op.alter_column("organization_id", existing_type=sa.String(length=36), nullable=True)
    else:
        op.alter_column("users", "organization_id", existing_type=sa.String(length=36), nullable=True)
        op.alter_column("user_sessions", "organization_id", existing_type=sa.String(length=36), nullable=True)

    op.create_table(
        "organization_memberships",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("organization_id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("role_claim", authrole_enum, nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_by", sa.String(length=36), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id", "user_id", name="uq_organization_memberships_org_user"),
    )
    op.create_index("ix_organization_memberships_organization_id", "organization_memberships", ["organization_id"], unique=False)
    op.create_index("ix_organization_memberships_user_id", "organization_memberships", ["user_id"], unique=False)

    op.create_table(
        "venue_access_assignments",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("organization_id", sa.String(length=36), nullable=False),
        sa.Column("venue_id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_by", sa.String(length=36), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["venue_id"], ["venues.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("venue_id", "user_id", name="uq_venue_access_assignments_venue_user"),
    )
    op.create_index("ix_venue_access_assignments_organization_id", "venue_access_assignments", ["organization_id"], unique=False)
    op.create_index("ix_venue_access_assignments_user_id", "venue_access_assignments", ["user_id"], unique=False)
    op.create_index("ix_venue_access_assignments_venue_id", "venue_access_assignments", ["venue_id"], unique=False)

    users = bind.execute(
        sa.text(
            """
            SELECT id, organization_id, venue_id, role
            FROM users
            """
        )
    ).mappings()

    for user in users:
        organization_id = user["organization_id"]
        venue_id = user["venue_id"]
        if organization_id:
            bind.execute(
                sa.text(
                    """
                    INSERT INTO organization_memberships (
                        id, organization_id, user_id, role_claim, is_active, created_by, created_at, updated_at
                    )
                    SELECT
                        CAST(:id AS VARCHAR(36)),
                        CAST(:organization_id AS VARCHAR(36)),
                        CAST(:user_id AS VARCHAR(36)),
                        CAST(:role_claim AS authrole),
                        CAST(:is_active AS BOOLEAN),
                        NULL,
                        CURRENT_TIMESTAMP,
                        CURRENT_TIMESTAMP
                    WHERE NOT EXISTS (
                        SELECT 1 FROM organization_memberships
                        WHERE organization_id = :organization_id AND user_id = :user_id
                    )
                    """
                ),
                {
                    "id": str(uuid4()),
                    "organization_id": organization_id,
                    "user_id": user["id"],
                    "role_claim": _auth_role_for_legacy_role(user["role"]),
                    "is_active": True,
                },
            )
        if organization_id and venue_id:
            bind.execute(
                sa.text(
                    """
                    INSERT INTO venue_access_assignments (
                        id, organization_id, venue_id, user_id, is_active, created_by, created_at, updated_at
                    )
                    SELECT
                        CAST(:id AS VARCHAR(36)),
                        CAST(:organization_id AS VARCHAR(36)),
                        CAST(:venue_id AS VARCHAR(36)),
                        CAST(:user_id AS VARCHAR(36)),
                        CAST(:is_active AS BOOLEAN),
                        NULL,
                        CURRENT_TIMESTAMP,
                        CURRENT_TIMESTAMP
                    WHERE NOT EXISTS (
                        SELECT 1 FROM venue_access_assignments
                        WHERE venue_id = :venue_id AND user_id = :user_id
                    )
                    """
                ),
                {
                    "id": str(uuid4()),
                    "organization_id": organization_id,
                    "venue_id": venue_id,
                    "user_id": user["id"],
                    "is_active": True,
                },
            )


def downgrade() -> None:
    op.drop_index("ix_venue_access_assignments_venue_id", table_name="venue_access_assignments")
    op.drop_index("ix_venue_access_assignments_user_id", table_name="venue_access_assignments")
    op.drop_index("ix_venue_access_assignments_organization_id", table_name="venue_access_assignments")
    op.drop_table("venue_access_assignments")

    op.drop_index("ix_organization_memberships_user_id", table_name="organization_memberships")
    op.drop_index("ix_organization_memberships_organization_id", table_name="organization_memberships")
    op.drop_table("organization_memberships")

    bind = op.get_bind()
    if bind.dialect.name == "sqlite":
        with op.batch_alter_table("user_sessions") as batch_op:
            batch_op.alter_column("organization_id", existing_type=sa.String(length=36), nullable=False)
        with op.batch_alter_table("users") as batch_op:
            batch_op.alter_column("organization_id", existing_type=sa.String(length=36), nullable=False)
    else:
        op.alter_column("user_sessions", "organization_id", existing_type=sa.String(length=36), nullable=False)
        op.alter_column("users", "organization_id", existing_type=sa.String(length=36), nullable=False)

    authrole_enum.drop(bind, checkfirst=True)


def _auth_role_for_legacy_role(role: str) -> str:
    if role in {"platform_admin"}:
        return "developer"
    if role in {"org_admin", "portfolio_director", "viewer"}:
        return "owner"
    if role in {"venue_manager", "contributor"}:
        return "manager"
    return "barista"
