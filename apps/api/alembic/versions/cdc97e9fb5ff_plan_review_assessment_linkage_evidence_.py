"""plan_review_assessment_linkage_evidence_quality

Revision ID: cdc97e9fb5ff
Revises: 0b0e456a756e
Create Date: 2026-03-29 15:44:54.306512
"""
from alembic import op
import sqlalchemy as sa


revision = 'cdc97e9fb5ff'
down_revision = '0b0e456a756e'
branch_labels = None
depends_on = None


def _column_exists(table: str, column: str) -> bool:
    """Check if a column already exists in a SQLite table."""
    conn = op.get_bind()
    result = conn.execute(sa.text(f"PRAGMA table_info({table})"))
    return any(row[1] == column for row in result)


def upgrade() -> None:
    if not _column_exists('assessments', 'prior_assessment_id'):
        with op.batch_alter_table('assessments') as batch_op:
            batch_op.add_column(sa.Column('prior_assessment_id', sa.String(length=36), nullable=True))

    if not _column_exists('evidence', 'quality_score'):
        with op.batch_alter_table('evidence') as batch_op:
            batch_op.add_column(sa.Column('quality_score', sa.Integer(), nullable=True, server_default='50'))
            batch_op.add_column(sa.Column('trust_level', sa.String(length=16), nullable=True, server_default='medium'))

    if not _column_exists('operational_plans', 'review_status'):
        with op.batch_alter_table('operational_plans') as batch_op:
            batch_op.add_column(sa.Column('review_status', sa.String(length=32), nullable=True, server_default='none'))
            batch_op.add_column(sa.Column('reviewed_by', sa.String(length=36), nullable=True))
            batch_op.add_column(sa.Column('review_notes', sa.Text(), nullable=True))
            batch_op.add_column(sa.Column('review_requested_at', sa.DateTime(timezone=True), nullable=True))
            batch_op.add_column(sa.Column('review_completed_at', sa.DateTime(timezone=True), nullable=True))
            batch_op.add_column(sa.Column('archived_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('operational_plans') as batch_op:
        batch_op.drop_column('archived_at')
        batch_op.drop_column('review_completed_at')
        batch_op.drop_column('review_requested_at')
        batch_op.drop_column('review_notes')
        batch_op.drop_column('reviewed_by')
        batch_op.drop_column('review_status')
    with op.batch_alter_table('evidence') as batch_op:
        batch_op.drop_column('trust_level')
        batch_op.drop_column('quality_score')
    with op.batch_alter_table('assessments') as batch_op:
        batch_op.drop_column('prior_assessment_id')
