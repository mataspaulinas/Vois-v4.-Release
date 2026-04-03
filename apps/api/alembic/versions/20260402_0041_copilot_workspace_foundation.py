"""add copilot workspace foundation

Revision ID: 20260402_0041
Revises: 20260402_0040
Create Date: 2026-04-02 23:15:00.000000
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "20260402_0041"
down_revision: str | None = "20260402_0040"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


sqlite_copilotthreadvisibility_enum = sa.Enum(
    "shared",
    "private",
    name="copilotthreadvisibility",
)

sqlite_copilotcontextkind_enum = sa.Enum(
    "portfolio",
    "venue",
    "assessment",
    "plan",
    "help_request",
    "report",
    "general",
    name="copilotcontextkind",
)


def upgrade() -> None:
    bind = op.get_bind()
    visibility_type: sa.TypeEngine
    context_kind_type: sa.TypeEngine
    if bind.dialect.name != "sqlite":
        visibility_type = postgresql.ENUM(
            "shared",
            "private",
            name="copilotthreadvisibility",
            create_type=False,
        )
        context_kind_type = postgresql.ENUM(
            "portfolio",
            "venue",
            "assessment",
            "plan",
            "help_request",
            "report",
            "general",
            name="copilotcontextkind",
            create_type=False,
        )
        visibility_type.create(bind, checkfirst=True)
        context_kind_type.create(bind, checkfirst=True)
    else:
        visibility_type = sqlite_copilotthreadvisibility_enum
        context_kind_type = sqlite_copilotcontextkind_enum

    op.add_column(
        "copilot_threads",
        sa.Column("owner_user_id", sa.String(length=36), nullable=True),
    )
    op.add_column(
        "copilot_threads",
        sa.Column("visibility", visibility_type, nullable=False, server_default="shared"),
    )
    op.add_column(
        "copilot_threads",
        sa.Column("context_kind", context_kind_type, nullable=False, server_default="general"),
    )
    op.add_column(
        "copilot_threads",
        sa.Column("context_id", sa.String(length=36), nullable=True),
    )
    op.add_column(
        "copilot_threads",
        sa.Column("pinned", sa.Boolean(), nullable=False, server_default=sa.text("0")),
    )
    op.add_column(
        "copilot_threads",
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "copilot_threads",
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "copilot_threads",
        sa.Column("last_activity_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )

    op.create_index("ix_copilot_threads_owner_user_id", "copilot_threads", ["owner_user_id"], unique=False)
    op.create_index("ix_copilot_threads_context_id", "copilot_threads", ["context_id"], unique=False)
    op.create_index("ix_copilot_threads_last_activity_at", "copilot_threads", ["last_activity_at"], unique=False)
    if bind.dialect.name != "sqlite":
        op.create_foreign_key(
            "fk_copilot_threads_owner_user_id_users",
            "copilot_threads",
            "users",
            ["owner_user_id"],
            ["id"],
        )

    op.execute(
        """
        UPDATE copilot_threads
        SET
            visibility = 'shared',
            pinned = 0,
            last_activity_at = COALESCE(last_activity_at, created_at),
            archived_at = CASE WHEN archived = 1 THEN COALESCE(archived_at, created_at) ELSE archived_at END,
            context_kind = CASE
                WHEN scope = 'global' THEN 'portfolio'
                WHEN scope = 'venue' THEN 'venue'
                WHEN scope = 'task' THEN 'plan'
                WHEN scope = 'help_request' THEN 'help_request'
                ELSE 'general'
            END,
            context_id = CASE
                WHEN scope = 'venue' THEN venue_id
                WHEN scope = 'task' THEN context_id
                ELSE context_id
            END
        """
    )

    op.execute(
        """
        UPDATE copilot_threads
        SET context_id = (
            SELECT help_requests.id
            FROM help_requests
            WHERE help_requests.linked_thread_id = copilot_threads.id
            LIMIT 1
        )
        WHERE scope = 'help_request'
        """
    )

    with op.batch_alter_table("copilot_threads") as batch_op:
        batch_op.alter_column("visibility", server_default=None)
        batch_op.alter_column("context_kind", server_default=None)
        batch_op.alter_column("pinned", server_default=None)
        batch_op.alter_column("last_activity_at", server_default=None)

    op.create_table(
        "copilot_thread_participants",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("thread_id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("last_read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("joined_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["thread_id"], ["copilot_threads.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("thread_id", "user_id", name="uq_copilot_thread_participants_thread_user"),
    )
    op.create_index("ix_copilot_thread_participants_thread_id", "copilot_thread_participants", ["thread_id"], unique=False)
    op.create_index("ix_copilot_thread_participants_user_id", "copilot_thread_participants", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_copilot_thread_participants_user_id", table_name="copilot_thread_participants")
    op.drop_index("ix_copilot_thread_participants_thread_id", table_name="copilot_thread_participants")
    op.drop_table("copilot_thread_participants")

    bind = op.get_bind()
    if bind.dialect.name != "sqlite":
        op.drop_constraint("fk_copilot_threads_owner_user_id_users", "copilot_threads", type_="foreignkey")
    op.drop_index("ix_copilot_threads_last_activity_at", table_name="copilot_threads")
    op.drop_index("ix_copilot_threads_context_id", table_name="copilot_threads")
    op.drop_index("ix_copilot_threads_owner_user_id", table_name="copilot_threads")

    op.drop_column("copilot_threads", "last_activity_at")
    op.drop_column("copilot_threads", "deleted_at")
    op.drop_column("copilot_threads", "archived_at")
    op.drop_column("copilot_threads", "pinned")
    op.drop_column("copilot_threads", "context_id")
    op.drop_column("copilot_threads", "context_kind")
    op.drop_column("copilot_threads", "visibility")
    op.drop_column("copilot_threads", "owner_user_id")

    if bind.dialect.name != "sqlite":
        postgresql.ENUM("portfolio", "venue", "assessment", "plan", "help_request", "report", "general", name="copilotcontextkind").drop(bind, checkfirst=True)
        postgresql.ENUM("shared", "private", name="copilotthreadvisibility").drop(bind, checkfirst=True)
