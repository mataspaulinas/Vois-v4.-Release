from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.domain import (
    AuthRole,
    CopilotThread,
    Organization,
    OrganizationMembership,
    Role,
    ThreadScope,
    User,
    Venue,
    VenueStatus,
)
from app.schemas.domain import (
    BootstrapOrganization,
    OrganizationMembershipRead,
    OwnerClaimRequest,
    OwnerSetupStateRead,
    VenueRead,
)
from app.services.access_control import accessible_venue_ids, get_primary_membership, sync_user_access_pointers
from app.services.audit import record_audit_entry
from app.services.auth import AuthenticatedActor
from app.services.ontology import get_ontology_repository
from app.services.ontology_bindings import set_venue_binding


def serialize_membership(membership: OrganizationMembership) -> OrganizationMembershipRead:
    return OrganizationMembershipRead(
        id=membership.id,
        organization_id=membership.organization_id,
        user_id=membership.user_id,
        role_claim=membership.role_claim,
        is_active=membership.is_active,
        created_by=membership.created_by,
        created_at=membership.created_at,
        updated_at=membership.updated_at,
    )


def build_owner_setup_state(db: Session, *, actor: AuthenticatedActor) -> OwnerSetupStateRead:
    membership = get_primary_membership(db, user=actor.user)
    organization_claimed = membership is not None and actor.user.organization_id is not None
    accessible_ids = sorted(
        accessible_venue_ids(
            db,
            user=actor.user,
            role=actor.role,
            organization_id=membership.organization_id if membership is not None else actor.user.organization_id,
        )
    )
    requires_owner_claim = actor.role == AuthRole.OWNER and not organization_claimed

    if requires_owner_claim:
        message = "Claim your organization to start using VOIS for real operations."
    elif actor.role == AuthRole.DEVELOPER and not organization_claimed:
        message = "Developer diagnostics are available. Claim or join an organization to test real role flows."
    elif not organization_claimed:
        message = "This account has not been assigned to an organization yet."
    elif not accessible_ids and actor.role in {AuthRole.MANAGER, AuthRole.BARISTA}:
        message = "This account has no venue access yet."
    else:
        message = None

    return OwnerSetupStateRead(
        requires_owner_claim=requires_owner_claim,
        organization_claimed=organization_claimed,
        accessible_venue_ids=accessible_ids,
        active_membership_count=1 if membership is not None else 0,
        current_membership=serialize_membership(membership) if membership is not None else None,
        status_message=message,
    )


def claim_owner_workspace(
    db: Session,
    *,
    actor: AuthenticatedActor,
    payload: OwnerClaimRequest,
):
    if actor.role != AuthRole.OWNER:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only owners can claim a workspace")
    if get_primary_membership(db, user=actor.user) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This owner already belongs to an organization")

    existing = db.scalar(select(Organization).where(Organization.slug == payload.organization_slug))
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Organization slug is already in use")

    organization = Organization(
        name=payload.organization_name.strip(),
        slug=payload.organization_slug.strip(),
        region=payload.region,
        data_residency=payload.data_residency,
    )
    db.add(organization)
    db.flush()

    actor.user.organization_id = organization.id
    actor.user.venue_id = None
    actor.user.role = Role.PORTFOLIO_DIRECTOR

    membership = OrganizationMembership(
        organization_id=organization.id,
        user_id=actor.user.id,
        role_claim=AuthRole.OWNER,
        is_active=True,
        created_by=actor.user.id,
    )
    db.add(membership)
    db.flush()

    venue_record = None
    if payload.first_venue is not None:
        venue_record = Venue(
            organization_id=organization.id,
            name=payload.first_venue.name,
            slug=payload.first_venue.slug,
            vertical=payload.first_venue.vertical,
            status=VenueStatus.ACTIVE,
            concept=payload.first_venue.concept,
            location=payload.first_venue.location,
            size_note=payload.first_venue.size_note,
            capacity_profile=payload.first_venue.capacity_profile,
        )
        db.add(venue_record)
        db.flush()
        set_venue_binding(
            db,
            venue_record,
            get_ontology_repository(),
            ontology_id=payload.first_venue.ontology_binding.ontology_id,
            ontology_version=payload.first_venue.ontology_binding.ontology_version,
            bound_by=actor.user.id,
        )
        ensure_venue_thread(db, organization_id=organization.id, venue=venue_record)

    ensure_global_thread(db, organization_id=organization.id)
    sync_user_access_pointers(db, user=actor.user)

    record_audit_entry(
        db,
        organization_id=organization.id,
        actor_user_id=actor.user.id,
        entity_type="organization",
        entity_id=organization.id,
        action="owner_claimed",
        payload={
            "organization_slug": organization.slug,
            "first_venue_id": venue_record.id if venue_record is not None else None,
        },
    )
    db.commit()
    db.refresh(organization)
    db.refresh(actor.user)
    return organization, membership, venue_record


def ensure_global_thread(db: Session, *, organization_id: str) -> CopilotThread:
    existing = db.scalar(
        select(CopilotThread)
        .where(CopilotThread.organization_id == organization_id, CopilotThread.scope == ThreadScope.GLOBAL)
        .order_by(CopilotThread.created_at.asc())
    )
    if existing is not None:
        return existing
    thread = CopilotThread(
        organization_id=organization_id,
        title="Portfolio strategy",
        scope=ThreadScope.GLOBAL,
        archived=False,
    )
    db.add(thread)
    db.flush()
    return thread


def ensure_venue_thread(db: Session, *, organization_id: str, venue: Venue) -> CopilotThread:
    existing = db.scalar(
        select(CopilotThread)
        .where(CopilotThread.organization_id == organization_id, CopilotThread.venue_id == venue.id)
        .order_by(CopilotThread.created_at.asc())
    )
    if existing is not None:
        return existing
    thread = CopilotThread(
        organization_id=organization_id,
        venue_id=venue.id,
        title=f"{venue.name} workspace",
        scope=ThreadScope.VENUE,
        archived=False,
    )
    db.add(thread)
    db.flush()
    return thread


def serialize_bootstrap_organization(organization: Organization | None) -> BootstrapOrganization | None:
    if organization is None:
        return None
    return BootstrapOrganization(
        id=organization.id,
        name=organization.name,
        slug=organization.slug,
        data_residency=organization.data_residency,
    )


def serialize_bootstrap_venues(venues: list[Venue]) -> list[VenueRead]:
    return [VenueRead.model_validate(venue) for venue in venues]
