from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.domain import (
    AuthRole,
    OrganizationMembership,
    User,
    Venue,
    VenueAccessAssignment,
)


def list_active_memberships(
    db: Session,
    *,
    user_id: str,
    organization_id: str | None = None,
) -> list[OrganizationMembership]:
    statement = select(OrganizationMembership).where(
        OrganizationMembership.user_id == user_id,
        OrganizationMembership.is_active.is_(True),
    )
    if organization_id is not None:
        statement = statement.where(OrganizationMembership.organization_id == organization_id)
    return list(db.scalars(statement.order_by(OrganizationMembership.created_at.asc())).all())


def get_primary_membership(db: Session, *, user: User) -> OrganizationMembership | None:
    memberships = list_active_memberships(db, user_id=user.id, organization_id=user.organization_id)
    if memberships:
        return memberships[0]
    fallback_memberships = list_active_memberships(db, user_id=user.id)
    return fallback_memberships[0] if fallback_memberships else None


def get_membership_for_user(
    db: Session,
    *,
    user_id: str,
    organization_id: str,
) -> OrganizationMembership | None:
    return db.scalar(
        select(OrganizationMembership).where(
            OrganizationMembership.user_id == user_id,
            OrganizationMembership.organization_id == organization_id,
            OrganizationMembership.is_active.is_(True),
        )
    )


def list_active_venue_assignments(
    db: Session,
    *,
    user_id: str,
    organization_id: str | None = None,
) -> list[VenueAccessAssignment]:
    statement = select(VenueAccessAssignment).where(
        VenueAccessAssignment.user_id == user_id,
        VenueAccessAssignment.is_active.is_(True),
    )
    if organization_id is not None:
        statement = statement.where(VenueAccessAssignment.organization_id == organization_id)
    return list(db.scalars(statement.order_by(VenueAccessAssignment.created_at.asc())).all())


def accessible_venue_ids(
    db: Session,
    *,
    user: User,
    role: AuthRole,
    organization_id: str | None = None,
) -> set[str]:
    if role == AuthRole.DEVELOPER:
        statement = select(Venue.id)
        if organization_id is not None:
            statement = statement.where(Venue.organization_id == organization_id)
        return set(db.scalars(statement).all())

    membership = get_primary_membership(db, user=user)
    effective_org_id = organization_id or membership.organization_id if membership is not None else organization_id
    if effective_org_id is None:
        return set()

    if role == AuthRole.OWNER:
        return set(
            db.scalars(select(Venue.id).where(Venue.organization_id == effective_org_id)).all()
        )

    return {
        assignment.venue_id
        for assignment in list_active_venue_assignments(
            db,
            user_id=user.id,
            organization_id=effective_org_id,
        )
    }


def sync_user_access_pointers(db: Session, *, user: User) -> None:
    primary_membership = get_primary_membership(db, user=user)
    user.organization_id = primary_membership.organization_id if primary_membership is not None else None

    venue_assignments = (
        list_active_venue_assignments(
            db,
            user_id=user.id,
            organization_id=user.organization_id,
        )
        if user.organization_id is not None
        else []
    )
    user.venue_id = venue_assignments[0].venue_id if venue_assignments else None


def set_venue_access_assignments(
    db: Session,
    *,
    organization_id: str,
    user_id: str,
    venue_ids: list[str],
    created_by: str | None,
) -> list[VenueAccessAssignment]:
    unique_ids = list(dict.fromkeys(venue_ids))
    existing = {
        assignment.venue_id: assignment
        for assignment in list_active_venue_assignments(
            db,
            user_id=user_id,
            organization_id=organization_id,
        )
    }

    for venue_id, assignment in existing.items():
        assignment.is_active = venue_id in unique_ids

    for venue_id in unique_ids:
        assignment = existing.get(venue_id)
        if assignment is None:
            db.add(
                VenueAccessAssignment(
                    organization_id=organization_id,
                    venue_id=venue_id,
                    user_id=user_id,
                    is_active=True,
                    created_by=created_by,
                )
            )
        else:
            assignment.is_active = True

    db.flush()
    user = db.get(User, user_id)
    if user is not None:
        sync_user_access_pointers(db, user=user)

    return list_active_venue_assignments(
        db,
        user_id=user_id,
        organization_id=organization_id,
    )
