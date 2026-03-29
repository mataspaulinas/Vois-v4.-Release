from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps.auth import get_optional_current_user
from app.db.session import get_db
from app.models.domain import CopilotThread, Organization, Venue
from app.schemas.domain import (
    BootstrapResponse,
    BootstrapThread,
    BootstrapUser,
)
from app.services.ontology import get_ontology_repository
from app.services.ontology_bindings import list_bindings_for_organization
from app.services.auth import AuthenticatedActor
from app.services.workspace_setup import (
    build_owner_setup_state,
    serialize_bootstrap_organization,
    serialize_bootstrap_venues,
)


router = APIRouter()


@router.get("", response_model=BootstrapResponse)
def bootstrap_data(
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor | None = Depends(get_optional_current_user),
) -> BootstrapResponse:
    if current_user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Active authenticated user required")
    setup_state = build_owner_setup_state(db, actor=current_user)
    repository = get_ontology_repository()
    configuration_issues: list[str] = []
    organization = db.get(Organization, current_user.organization_id) if current_user.organization_id else None
    venues: list[Venue] = []
    threads: list[CopilotThread] = []
    bindings = []

    if organization is not None:
        venues = list(
            db.scalars(
                select(Venue)
                .where(Venue.organization_id == organization.id)
                .order_by(Venue.created_at.asc())
            ).all()
        )
        threads = list(
            db.scalars(
                select(CopilotThread)
                .where(CopilotThread.organization_id == organization.id)
                .order_by(CopilotThread.created_at.asc())
            ).all()
        )
        bindings = list_bindings_for_organization(db, organization.id, repository)
        binding_by_venue = {binding.venue_id: binding for binding in bindings}
        for venue in venues:
            binding = binding_by_venue.get(venue.id)
            if binding is None:
                configuration_issues.append(f"Venue '{venue.name}' has no ontology binding.")
            elif (
                binding.binding_status.value != "active"
                or binding.mount is None
                or not binding.mount.validation.get("mountable", False)
            ):
                configuration_issues.append(
                    f"Venue '{venue.name}' is bound to {binding.ontology_id}@{binding.ontology_version} but the mount is not runtime-ready."
                )
    elif setup_state.requires_owner_claim:
        configuration_issues.append("Owner setup is required before VOIS can open a workspace.")
    elif not setup_state.organization_claimed:
        configuration_issues.append("This account does not belong to an organization yet.")

    return BootstrapResponse(
        organization=serialize_bootstrap_organization(organization),
        current_user=BootstrapUser(
            id=current_user.id,
            full_name=current_user.full_name,
            email=current_user.email,
            role=current_user.role.value,
            venue_id=current_user.user.venue_id if hasattr(current_user, "user") else None,
        ),
        setup_state=setup_state,
        requires_owner_claim=setup_state.requires_owner_claim,
        organization_claimed=setup_state.organization_claimed,
        venues=serialize_bootstrap_venues(venues),
        ontology_mounts=[mount.model_dump() for mount in repository.list_mount_summaries()],
        venue_ontology_bindings=bindings,
        copilot_threads=[
            BootstrapThread(id=thread.id, title=thread.title, scope=thread.scope, archived=thread.archived)
            for thread in threads
        ],
        readiness={
            "ontology": "Venue-bound ontology mounts are required for execution.",
            "engine": "Deterministic pipeline active",
            "platform": "Multi-tenant foundation in place",
        },
        configuration_issues=configuration_issues,
    )
