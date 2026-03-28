"""Phase 9 ontology identity and venue bindings.

Revision ID: 20260327_0034
Revises: 20260327_0033
Create Date: 2026-03-27 23:45:00
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from alembic import op
import sqlalchemy as sa


revision = "20260327_0034"
down_revision = "20260327_0033"
branch_labels = None
depends_on = None


venue_ontology_binding_status = sa.Enum("active", "invalid", "archived", name="venueontologybindingstatus")


def upgrade() -> None:
    op.create_table(
        "venue_ontology_bindings",
        sa.Column("venue_id", sa.String(length=36), sa.ForeignKey("venues.id"), primary_key=True),
        sa.Column("ontology_id", sa.String(length=128), nullable=False),
        sa.Column("ontology_version", sa.String(length=64), nullable=False),
        sa.Column("binding_status", venue_ontology_binding_status, nullable=False, server_default="active"),
        sa.Column("bound_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("bound_by", sa.String(length=36), sa.ForeignKey("users.id"), nullable=True),
    )
    op.create_index(
        "ix_venue_ontology_bindings_ontology_id",
        "venue_ontology_bindings",
        ["ontology_id"],
        unique=False,
    )

    op.add_column("assessments", sa.Column("ontology_id", sa.String(length=128), nullable=False, server_default="restaurant-legacy"))
    op.add_column("assessments", sa.Column("ontology_version", sa.String(length=64), nullable=False, server_default="v8"))
    op.add_column("assessments", sa.Column("core_canon_version", sa.String(length=64), nullable=False, server_default="v3"))
    op.add_column("assessments", sa.Column("adapter_id", sa.String(length=128), nullable=False, server_default="restaurant"))
    op.add_column("assessments", sa.Column("manifest_digest", sa.String(length=64), nullable=False, server_default="compat-restaurant-legacy-v8"))

    op.add_column("engine_runs", sa.Column("ontology_id", sa.String(length=128), nullable=False, server_default="restaurant-legacy"))
    op.add_column("engine_runs", sa.Column("core_canon_version", sa.String(length=64), nullable=False, server_default="v3"))
    op.add_column("engine_runs", sa.Column("adapter_id", sa.String(length=128), nullable=False, server_default="restaurant"))
    op.add_column("engine_runs", sa.Column("manifest_digest", sa.String(length=64), nullable=False, server_default="compat-restaurant-legacy-v8"))

    op.add_column("operational_plans", sa.Column("ontology_id", sa.String(length=128), nullable=False, server_default="restaurant-legacy"))
    op.add_column("operational_plans", sa.Column("ontology_version", sa.String(length=64), nullable=False, server_default="v8"))
    op.add_column("operational_plans", sa.Column("core_canon_version", sa.String(length=64), nullable=False, server_default="v3"))
    op.add_column("operational_plans", sa.Column("adapter_id", sa.String(length=128), nullable=False, server_default="restaurant"))
    op.add_column("operational_plans", sa.Column("manifest_digest", sa.String(length=64), nullable=False, server_default="compat-restaurant-legacy-v8"))

    bind = op.get_bind()
    metadata = sa.MetaData()

    venues = sa.Table("venues", metadata, autoload_with=bind)
    assessments = sa.Table("assessments", metadata, autoload_with=bind)
    engine_runs = sa.Table("engine_runs", metadata, autoload_with=bind)
    plans = sa.Table("operational_plans", metadata, autoload_with=bind)
    bindings = sa.Table("venue_ontology_bindings", metadata, autoload_with=bind)

    digests = {
        "cafe": _manifest_digest("ontology_packs/cafe/ontology_manifest.json"),
        "restaurant-legacy": _manifest_digest("ontology_packs/restaurant-legacy/ontology_manifest.json"),
    }

    venue_rows = bind.execute(sa.select(venues.c.id, venues.c.vertical)).fetchall()
    binding_rows: list[dict[str, object]] = []
    venue_identity: dict[str, dict[str, str]] = {}
    for venue_id, vertical in venue_rows:
        ontology_id, ontology_version, adapter_id, manifest_digest = _identity_for_vertical(vertical, digests)
        binding_rows.append(
            {
                "venue_id": venue_id,
                "ontology_id": ontology_id,
                "ontology_version": ontology_version,
                "binding_status": "active",
            }
        )
        venue_identity[venue_id] = {
            "ontology_id": ontology_id,
            "ontology_version": ontology_version,
            "adapter_id": adapter_id,
            "manifest_digest": manifest_digest,
        }

    if binding_rows:
        op.bulk_insert(bindings, binding_rows)

    assessment_rows = bind.execute(sa.select(assessments.c.id, assessments.c.venue_id)).fetchall()
    for assessment_id, venue_id in assessment_rows:
        identity = venue_identity.get(venue_id)
        if identity is None:
            continue
        bind.execute(
            assessments.update()
            .where(assessments.c.id == assessment_id)
            .values(
                ontology_id=identity["ontology_id"],
                ontology_version=identity["ontology_version"],
                core_canon_version="v3",
                adapter_id=identity["adapter_id"],
                manifest_digest=identity["manifest_digest"],
            )
        )

    engine_rows = bind.execute(
        sa.select(engine_runs.c.id, engine_runs.c.venue_id, engine_runs.c.ontology_version)
    ).fetchall()
    for engine_run_id, venue_id, current_version in engine_rows:
        identity = venue_identity.get(venue_id)
        if identity is None:
            continue
        normalized_version = current_version if isinstance(current_version, str) and current_version.startswith("v") else identity["ontology_version"]
        bind.execute(
            engine_runs.update()
            .where(engine_runs.c.id == engine_run_id)
            .values(
                ontology_id=identity["ontology_id"],
                ontology_version=normalized_version,
                core_canon_version="v3",
                adapter_id=identity["adapter_id"],
                manifest_digest=identity["manifest_digest"],
            )
        )

    plan_rows = bind.execute(
        sa.select(
            plans.c.id,
            engine_runs.c.ontology_id,
            engine_runs.c.ontology_version,
            engine_runs.c.core_canon_version,
            engine_runs.c.adapter_id,
            engine_runs.c.manifest_digest,
        ).select_from(plans.join(engine_runs, plans.c.engine_run_id == engine_runs.c.id))
    ).fetchall()
    for plan_id, ontology_id, ontology_version, core_canon_version, adapter_id, manifest_digest in plan_rows:
        bind.execute(
            plans.update()
            .where(plans.c.id == plan_id)
            .values(
                ontology_id=ontology_id,
                ontology_version=ontology_version,
                core_canon_version=core_canon_version,
                adapter_id=adapter_id,
                manifest_digest=manifest_digest,
            )
        )


def downgrade() -> None:
    op.drop_column("operational_plans", "manifest_digest")
    op.drop_column("operational_plans", "adapter_id")
    op.drop_column("operational_plans", "core_canon_version")
    op.drop_column("operational_plans", "ontology_version")
    op.drop_column("operational_plans", "ontology_id")

    op.drop_column("engine_runs", "manifest_digest")
    op.drop_column("engine_runs", "adapter_id")
    op.drop_column("engine_runs", "core_canon_version")
    op.drop_column("engine_runs", "ontology_id")

    op.drop_column("assessments", "manifest_digest")
    op.drop_column("assessments", "adapter_id")
    op.drop_column("assessments", "core_canon_version")
    op.drop_column("assessments", "ontology_version")
    op.drop_column("assessments", "ontology_id")

    op.drop_index("ix_venue_ontology_bindings_ontology_id", table_name="venue_ontology_bindings")
    op.drop_table("venue_ontology_bindings")


def _identity_for_vertical(vertical: str, digests: dict[str, str]) -> tuple[str, str, str, str]:
    normalized = (vertical or "restaurant").lower()
    if normalized == "cafe":
        return ("cafe", "v1", "cafe", digests["cafe"])
    return ("restaurant-legacy", "v8", "restaurant", digests["restaurant-legacy"])


def _manifest_digest(relative_path: str) -> str:
    repo_root = Path(__file__).resolve().parents[4]
    path = repo_root / relative_path
    return hashlib.sha256(path.read_bytes()).hexdigest()
