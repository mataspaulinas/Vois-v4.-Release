from __future__ import annotations

from packages.ontology_runtime import InvalidOntologyMountError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.domain import Assessment, EngineRun, OperationalPlan, Venue
from app.models.ontology_bindings import VenueOntologyBinding, VenueOntologyBindingStatus
from app.schemas.domain import VenueOntologyBindingRead
from app.services.ontology import OntologyRepository


def compatibility_binding_for_vertical(vertical: str | None) -> tuple[str, str]:
    normalized = vertical or "restaurant"
    if normalized == "cafe":
        return ("cafe", "v1")
    return ("restaurant-legacy", "v8")


def get_venue_binding(db: Session, venue_id: str) -> VenueOntologyBinding | None:
    return db.get(VenueOntologyBinding, venue_id)


def require_venue_binding(
    db: Session,
    venue: Venue,
) -> VenueOntologyBinding:
    binding = db.get(VenueOntologyBinding, venue.id)
    if binding is None:
        raise InvalidOntologyMountError(f"Venue {venue.id} has no ontology binding")
    return binding


def set_venue_binding(
    db: Session,
    venue: Venue,
    repository: OntologyRepository,
    *,
    ontology_id: str,
    ontology_version: str,
    bound_by: str | None,
) -> VenueOntologyBinding:
    mount = repository.load_mount(ontology_id, ontology_version, allow_invalid=True)
    binding = db.get(VenueOntologyBinding, venue.id)
    if binding is None:
        binding = VenueOntologyBinding(venue_id=venue.id)
        db.add(binding)
    binding.ontology_id = ontology_id
    binding.ontology_version = ontology_version
    binding.bound_by = bound_by
    binding.binding_status = (
        VenueOntologyBindingStatus.ACTIVE if mount.validation.is_mountable else VenueOntologyBindingStatus.INVALID
    )
    db.flush()
    return binding


def serialize_binding(
    binding: VenueOntologyBinding,
    repository: OntologyRepository,
) -> VenueOntologyBindingRead:
    mount = repository.load_mount(binding.ontology_id, binding.ontology_version, allow_invalid=True)
    return VenueOntologyBindingRead(
        venue_id=binding.venue_id,
        ontology_id=binding.ontology_id,
        ontology_version=binding.ontology_version,
        binding_status=binding.binding_status,
        bound_at=binding.bound_at,
        bound_by=binding.bound_by,
        mount=repository.mount_summary(binding.ontology_id, binding.ontology_version).model_dump(),
    )


def list_bindings_for_organization(
    db: Session,
    organization_id: str,
    repository: OntologyRepository,
) -> list[VenueOntologyBindingRead]:
    venue_ids = list(db.scalars(select(Venue.id).where(Venue.organization_id == organization_id)).all())
    if not venue_ids:
        return []
    bindings = list(
        db.scalars(
            select(VenueOntologyBinding).where(VenueOntologyBinding.venue_id.in_(venue_ids))
        ).all()
    )
    return [serialize_binding(binding, repository) for binding in bindings]


def resolve_venue_mount(
    db: Session,
    venue_id: str,
    repository: OntologyRepository,
    *,
    allow_invalid: bool = False,
    require_runtime: bool = True,
):
    venue = db.get(Venue, venue_id)
    if venue is None:
        raise ValueError(f"Venue not found: {venue_id}")
    binding = require_venue_binding(db, venue)
    return repository.load_mount(
        binding.ontology_id,
        binding.ontology_version,
        allow_invalid=allow_invalid,
        require_runtime=require_runtime,
    )


def hydrate_assessment_identity(
    assessment: Assessment,
    *,
    ontology_id: str,
    ontology_version: str,
    core_canon_version: str,
    adapter_id: str,
    manifest_digest: str,
) -> None:
    assessment.ontology_id = ontology_id
    assessment.ontology_version = ontology_version
    assessment.core_canon_version = core_canon_version
    assessment.adapter_id = adapter_id
    assessment.manifest_digest = manifest_digest


def hydrate_engine_run_identity(
    engine_run: EngineRun,
    *,
    ontology_id: str,
    ontology_version: str,
    core_canon_version: str,
    adapter_id: str,
    manifest_digest: str,
) -> None:
    engine_run.ontology_id = ontology_id
    engine_run.ontology_version = ontology_version
    engine_run.core_canon_version = core_canon_version
    engine_run.adapter_id = adapter_id
    engine_run.manifest_digest = manifest_digest


def hydrate_plan_identity(
    plan: OperationalPlan,
    *,
    ontology_id: str,
    ontology_version: str,
    core_canon_version: str,
    adapter_id: str,
    manifest_digest: str,
) -> None:
    plan.ontology_id = ontology_id
    plan.ontology_version = ontology_version
    plan.core_canon_version = core_canon_version
    plan.adapter_id = adapter_id
    plan.manifest_digest = manifest_digest


def backfill_identity_from_venue(db: Session, repository: OntologyRepository) -> None:
    venues = {venue.id: venue for venue in db.scalars(select(Venue)).all()}
    for venue in venues.values():
        if db.get(VenueOntologyBinding, venue.id) is None:
            ontology_id, ontology_version = compatibility_binding_for_vertical(venue.vertical)
            set_venue_binding(
                db,
                venue,
                repository,
                ontology_id=ontology_id,
                ontology_version=ontology_version,
                bound_by=None,
            )

    for assessment in db.scalars(select(Assessment)).all():
        venue = venues.get(assessment.venue_id)
        if venue is None:
            continue
        binding = require_venue_binding(db, venue)
        mount = repository.load_mount(binding.ontology_id, binding.ontology_version, allow_invalid=True)
        hydrate_assessment_identity(
            assessment,
            ontology_id=mount.ontology_id,
            ontology_version=mount.version,
            core_canon_version=mount.core_canon_version,
            adapter_id=mount.adapter_id,
            manifest_digest=mount.manifest_digest,
        )

    for engine_run in db.scalars(select(EngineRun)).all():
        venue = venues.get(engine_run.venue_id)
        if venue is None:
            continue
        if engine_run.ontology_id and engine_run.manifest_digest:
            continue
        compatibility_version = (
            engine_run.ontology_version
            if engine_run.ontology_version and engine_run.ontology_version.startswith("v")
            else None
        )
        fallback_id, fallback_version = compatibility_binding_for_vertical(venue.vertical)
        mount = repository.load_mount(
            fallback_id,
            compatibility_version or fallback_version,
            allow_invalid=True,
        )
        hydrate_engine_run_identity(
            engine_run,
            ontology_id=mount.ontology_id,
            ontology_version=mount.version,
            core_canon_version=mount.core_canon_version,
            adapter_id=mount.adapter_id,
            manifest_digest=mount.manifest_digest,
        )

    for plan in db.scalars(select(OperationalPlan)).all():
        engine_run = db.get(EngineRun, plan.engine_run_id)
        if engine_run is None:
            continue
        hydrate_plan_identity(
            plan,
            ontology_id=engine_run.ontology_id,
            ontology_version=engine_run.ontology_version,
            core_canon_version=engine_run.core_canon_version,
            adapter_id=engine_run.adapter_id,
            manifest_digest=engine_run.manifest_digest,
        )
