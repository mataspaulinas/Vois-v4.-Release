from __future__ import annotations

import secrets

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.firebase_admin import (
    FirebaseAdminConfigurationError,
    set_custom_claims,
    update_user_disabled,
    update_user_password,
    upsert_email_password_user,
)
from app.models.domain import (
    AuthRole,
    Organization,
    OrganizationMembership,
    Role,
    User,
    Venue,
)
from app.schemas.domain import (
    OrganizationMemberCreateRequest,
    OrganizationMemberProvisionResponse,
    OrganizationMemberRead,
    OrganizationMemberUpdateRequest,
    OrganizationMemberVenueAccessWrite,
    ProvisionedLoginPacket,
    VenueAccessAssignmentRead,
)
from app.services.access_control import (
    list_active_memberships,
    list_active_venue_assignments,
    set_venue_access_assignments,
    sync_user_access_pointers,
)
from app.services.audit import record_audit_entry
from app.services.auth import hash_password
from app.services.workspace_setup import ensure_global_thread, serialize_membership


def list_organization_members(db: Session, *, organization_id: str) -> list[OrganizationMemberRead]:
    memberships = list(
        db.scalars(
            select(OrganizationMembership)
            .where(OrganizationMembership.organization_id == organization_id)
            .order_by(OrganizationMembership.created_at.asc())
        ).all()
    )
    user_ids = [membership.user_id for membership in memberships]
    users = {
        user.id: user
        for user in db.scalars(select(User).where(User.id.in_(user_ids))).all()
    } if user_ids else {}

    member_records: list[OrganizationMemberRead] = []
    for membership in memberships:
        user = users.get(membership.user_id)
        if user is None:
            continue
        assignments = list_active_venue_assignments(
            db,
            user_id=user.id,
            organization_id=organization_id,
        )
        member_records.append(
            OrganizationMemberRead(
                id=membership.id,
                user_id=user.id,
                organization_id=organization_id,
                email=user.email,
                full_name=user.full_name,
                firebase_uid=user.firebase_uid,
                role=membership.role_claim,
                active=user.is_active and membership.is_active,
                membership=serialize_membership(membership),
                venue_access=[
                    VenueAccessAssignmentRead(
                        id=assignment.id,
                        organization_id=assignment.organization_id,
                        venue_id=assignment.venue_id,
                        user_id=assignment.user_id,
                        is_active=assignment.is_active,
                        created_by=assignment.created_by,
                        created_at=assignment.created_at,
                        updated_at=assignment.updated_at,
                    )
                    for assignment in assignments
                ],
            )
        )
    return member_records


def create_member(
    db: Session,
    *,
    organization: Organization,
    payload: OrganizationMemberCreateRequest,
    actor_user_id: str,
    firebase_role_claim_key: str,
) -> OrganizationMemberProvisionResponse:
    existing = db.scalar(select(User).where(User.email == payload.email.lower()))
    if existing is not None and list_active_memberships(db, user_id=existing.id, organization_id=organization.id):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This user already belongs to the organization")

    venue_ids = _validate_venue_ids(db, organization_id=organization.id, venue_ids=payload.venue_ids)
    if payload.role in {AuthRole.MANAGER, AuthRole.BARISTA} and not venue_ids:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Managers and baristas must be assigned to at least one venue")
    if payload.role in {AuthRole.OWNER, AuthRole.DEVELOPER} and venue_ids:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Owner and developer accounts do not accept venue assignments")

    temporary_password = generate_temporary_password()
    firebase_record = _provision_firebase_identity(
        email=payload.email.lower(),
        full_name=payload.full_name,
        password=temporary_password,
        role=payload.role,
        firebase_role_claim_key=firebase_role_claim_key,
    )

    user = existing or User(
        organization_id=organization.id,
        venue_id=None,
        firebase_uid=firebase_record.uid,
        email=payload.email.lower(),
        full_name=payload.full_name,
        role=_legacy_role(payload.role),
        password_hash=hash_password(temporary_password),
        is_active=True,
    )
    if existing is None:
        db.add(user)
        db.flush()
    else:
        user.organization_id = organization.id
        user.email = payload.email.lower()
        user.full_name = payload.full_name
        user.firebase_uid = firebase_record.uid
        user.role = _legacy_role(payload.role)
        user.password_hash = hash_password(temporary_password)
        user.is_active = True

    membership = _upsert_membership(
        db,
        organization_id=organization.id,
        user_id=user.id,
        role=payload.role,
        actor_user_id=actor_user_id,
    )
    set_venue_access_assignments(
        db,
        organization_id=organization.id,
        user_id=user.id,
        venue_ids=venue_ids,
        created_by=actor_user_id,
    )
    ensure_global_thread(db, organization_id=organization.id)
    sync_user_access_pointers(db, user=user)

    record_audit_entry(
        db,
        organization_id=organization.id,
        actor_user_id=actor_user_id,
        entity_type="organization_member",
        entity_id=membership.id,
        action="provisioned",
        payload={"user_id": user.id, "role": payload.role.value, "venue_ids": venue_ids},
    )
    db.commit()
    return OrganizationMemberProvisionResponse(
        member=_find_member_read(db, organization_id=organization.id, membership_id=membership.id),
        login_packet=ProvisionedLoginPacket(
            email=user.email,
            temporary_password=temporary_password,
            reset_required=True,
            firebase_uid=user.firebase_uid,
        ),
    )


def update_member(
    db: Session,
    *,
    organization: Organization,
    membership_id: str,
    payload: OrganizationMemberUpdateRequest,
    actor_user_id: str,
    firebase_role_claim_key: str,
) -> OrganizationMemberRead:
    membership = _get_membership(db, organization_id=organization.id, membership_id=membership_id)
    user = db.get(User, membership.user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if payload.full_name is not None:
        user.full_name = payload.full_name
    if payload.role is not None:
        membership.role_claim = payload.role
        user.role = _legacy_role(payload.role)
        if user.firebase_uid:
            set_custom_claims(user.firebase_uid, {firebase_role_claim_key: payload.role.value})
    if payload.active is not None:
        membership.is_active = payload.active
        user.is_active = payload.active
        if user.firebase_uid:
            update_user_disabled(user.firebase_uid, disabled=not payload.active)
    if membership.role_claim in {AuthRole.OWNER, AuthRole.DEVELOPER}:
        set_venue_access_assignments(
            db,
            organization_id=organization.id,
            user_id=user.id,
            venue_ids=[],
            created_by=actor_user_id,
        )
    sync_user_access_pointers(db, user=user)

    record_audit_entry(
        db,
        organization_id=organization.id,
        actor_user_id=actor_user_id,
        entity_type="organization_member",
        entity_id=membership.id,
        action="updated",
        payload=payload.model_dump(exclude_none=True),
    )
    db.commit()
    return _find_member_read(db, organization_id=organization.id, membership_id=membership.id)


def reset_member_login(
    db: Session,
    *,
    organization: Organization,
    membership_id: str,
    actor_user_id: str,
) -> ProvisionedLoginPacket:
    membership = _get_membership(db, organization_id=organization.id, membership_id=membership_id)
    user = db.get(User, membership.user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    temporary_password = generate_temporary_password()
    if user.firebase_uid is None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This user has no Firebase identity to reset")
    update_user_password(user.firebase_uid, password=temporary_password)
    user.password_hash = hash_password(temporary_password)

    record_audit_entry(
        db,
        organization_id=organization.id,
        actor_user_id=actor_user_id,
        entity_type="organization_member",
        entity_id=membership.id,
        action="login_reset",
        payload={"user_id": user.id},
    )
    db.commit()
    return ProvisionedLoginPacket(
        email=user.email,
        temporary_password=temporary_password,
        reset_required=True,
        firebase_uid=user.firebase_uid,
    )


def update_member_venue_access(
    db: Session,
    *,
    organization: Organization,
    membership_id: str,
    payload: OrganizationMemberVenueAccessWrite,
    actor_user_id: str,
) -> OrganizationMemberRead:
    membership = _get_membership(db, organization_id=organization.id, membership_id=membership_id)
    if membership.role_claim in {AuthRole.OWNER, AuthRole.DEVELOPER}:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Owner and developer accounts do not use venue assignments")
    venue_ids = _validate_venue_ids(db, organization_id=organization.id, venue_ids=payload.venue_ids)
    if not venue_ids:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Managers and baristas must keep at least one venue assignment")
    set_venue_access_assignments(
        db,
        organization_id=organization.id,
        user_id=membership.user_id,
        venue_ids=venue_ids,
        created_by=actor_user_id,
    )
    record_audit_entry(
        db,
        organization_id=organization.id,
        actor_user_id=actor_user_id,
        entity_type="organization_member",
        entity_id=membership.id,
        action="venue_access_updated",
        payload={"venue_ids": venue_ids},
    )
    db.commit()
    return _find_member_read(db, organization_id=organization.id, membership_id=membership.id)


def generate_temporary_password() -> str:
    return f"VOIS-{secrets.token_urlsafe(12)}!"


def _get_membership(db: Session, *, organization_id: str, membership_id: str) -> OrganizationMembership:
    membership = db.get(OrganizationMembership, membership_id)
    if membership is None or membership.organization_id != organization_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization member not found")
    return membership


def _find_member_read(db: Session, *, organization_id: str, membership_id: str) -> OrganizationMemberRead:
    for member in list_organization_members(db, organization_id=organization_id):
        if member.id == membership_id:
            return member
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization member not found")


def _upsert_membership(
    db: Session,
    *,
    organization_id: str,
    user_id: str,
    role: AuthRole,
    actor_user_id: str,
) -> OrganizationMembership:
    membership = db.scalar(
        select(OrganizationMembership).where(
            OrganizationMembership.organization_id == organization_id,
            OrganizationMembership.user_id == user_id,
        )
    )
    if membership is None:
        membership = OrganizationMembership(
            organization_id=organization_id,
            user_id=user_id,
            role_claim=role,
            is_active=True,
            created_by=actor_user_id,
        )
        db.add(membership)
        db.flush()
        return membership
    membership.role_claim = role
    membership.is_active = True
    return membership


def _validate_venue_ids(db: Session, *, organization_id: str, venue_ids: list[str]) -> list[str]:
    unique_ids = list(dict.fromkeys(venue_ids))
    if not unique_ids:
        return []
    venues = list(
        db.scalars(
            select(Venue).where(Venue.organization_id == organization_id, Venue.id.in_(unique_ids))
        ).all()
    )
    found_ids = {venue.id for venue in venues}
    missing = [venue_id for venue_id in unique_ids if venue_id not in found_ids]
    if missing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Unknown venue ids: {', '.join(missing)}")
    return unique_ids


def _provision_firebase_identity(
    *,
    email: str,
    full_name: str,
    password: str,
    role: AuthRole,
    firebase_role_claim_key: str,
):
    try:
        record = upsert_email_password_user(email=email, display_name=full_name, password=password)
        set_custom_claims(record.uid, {firebase_role_claim_key: role.value})
        return record
    except FirebaseAdminConfigurationError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover - SDK runtime posture
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=f"Firebase provisioning failed: {exc}") from exc


def _legacy_role(role: AuthRole) -> Role:
    if role == AuthRole.OWNER:
        return Role.PORTFOLIO_DIRECTOR
    if role == AuthRole.MANAGER:
        return Role.VENUE_MANAGER
    if role == AuthRole.BARISTA:
        return Role.EMPLOYEE
    return Role.PLATFORM_ADMIN
