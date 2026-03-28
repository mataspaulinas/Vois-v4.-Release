from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps.auth import require_organization_id_access, require_roles
from app.core.config import get_settings
from app.db.session import get_db
from app.models.domain import AuthRole, Organization
from app.schemas.domain import (
    OrganizationBackupReadinessRead,
    OrganizationMemberCreateRequest,
    OrganizationMemberProvisionResponse,
    OrganizationMemberRead,
    OrganizationMemberUpdateRequest,
    OrganizationMemberVenueAccessWrite,
    OrganizationDeleteReadinessRead,
    OrganizationExportBundleRead,
    OrganizationExportSummaryRead,
    ProvisionedLoginPacket,
)
from app.services.auth import AuthenticatedActor
from app.services.member_admin import (
    create_member,
    list_organization_members,
    reset_member_login,
    update_member,
    update_member_venue_access,
)
from app.services.organization_exports import (
    build_organization_backup_readiness,
    build_organization_delete_readiness,
    build_organization_export_bundle,
    build_organization_export_summary,
)


router = APIRouter()


@router.get("/export-summary", response_model=OrganizationExportSummaryRead)
def get_export_summary(
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(require_roles(AuthRole.OWNER)),
) -> OrganizationExportSummaryRead:
    organization = db.get(Organization, current_user.organization_id)
    if organization is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    return build_organization_export_summary(db, organization=organization)


@router.post("/export", response_model=OrganizationExportBundleRead)
def create_export_bundle(
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(require_roles(AuthRole.OWNER)),
) -> OrganizationExportBundleRead:
    organization = db.get(Organization, current_user.organization_id)
    if organization is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    bundle = build_organization_export_bundle(
        db,
        organization=organization,
        actor_user_id=current_user.id,
    )
    db.commit()
    return bundle


@router.get("/delete-readiness", response_model=OrganizationDeleteReadinessRead)
def get_delete_readiness(
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(require_roles(AuthRole.OWNER)),
) -> OrganizationDeleteReadinessRead:
    organization = db.get(Organization, current_user.organization_id)
    if organization is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    return build_organization_delete_readiness(db, organization=organization)


@router.get("/backup-readiness", response_model=OrganizationBackupReadinessRead)
def get_backup_readiness(
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(require_roles(AuthRole.OWNER)),
) -> OrganizationBackupReadinessRead:
    organization = db.get(Organization, current_user.organization_id)
    if organization is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    return build_organization_backup_readiness(db, organization=organization)


@router.get("/{organization_id}/members", response_model=list[OrganizationMemberRead])
def get_members(
    organization_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(require_roles(AuthRole.OWNER, AuthRole.DEVELOPER)),
) -> list[OrganizationMemberRead]:
    organization = db.get(Organization, organization_id)
    if organization is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    require_organization_id_access(current_user, organization.id)
    return list_organization_members(db, organization_id=organization.id)


@router.post("/{organization_id}/members", response_model=OrganizationMemberProvisionResponse, status_code=status.HTTP_201_CREATED)
def provision_member(
    organization_id: str,
    payload: OrganizationMemberCreateRequest,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(require_roles(AuthRole.OWNER)),
) -> OrganizationMemberProvisionResponse:
    organization = db.get(Organization, organization_id)
    if organization is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    require_organization_id_access(current_user, organization.id)
    return create_member(
        db,
        organization=organization,
        payload=payload,
        actor_user_id=current_user.id,
        firebase_role_claim_key=get_settings().firebase_role_claim_key,
    )


@router.patch("/{organization_id}/members/{member_id}", response_model=OrganizationMemberRead)
def patch_member(
    organization_id: str,
    member_id: str,
    payload: OrganizationMemberUpdateRequest,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(require_roles(AuthRole.OWNER)),
) -> OrganizationMemberRead:
    organization = db.get(Organization, organization_id)
    if organization is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    require_organization_id_access(current_user, organization.id)
    return update_member(
        db,
        organization=organization,
        membership_id=member_id,
        payload=payload,
        actor_user_id=current_user.id,
        firebase_role_claim_key=get_settings().firebase_role_claim_key,
    )


@router.post("/{organization_id}/members/{member_id}/reset-login", response_model=ProvisionedLoginPacket)
def reset_member_credentials(
    organization_id: str,
    member_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(require_roles(AuthRole.OWNER)),
) -> ProvisionedLoginPacket:
    organization = db.get(Organization, organization_id)
    if organization is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    require_organization_id_access(current_user, organization.id)
    return reset_member_login(
        db,
        organization=organization,
        membership_id=member_id,
        actor_user_id=current_user.id,
    )


@router.put("/{organization_id}/members/{member_id}/venue-access", response_model=OrganizationMemberRead)
def put_member_venue_access(
    organization_id: str,
    member_id: str,
    payload: OrganizationMemberVenueAccessWrite,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(require_roles(AuthRole.OWNER)),
) -> OrganizationMemberRead:
    organization = db.get(Organization, organization_id)
    if organization is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    require_organization_id_access(current_user, organization.id)
    return update_member_venue_access(
        db,
        organization=organization,
        membership_id=member_id,
        payload=payload,
        actor_user_id=current_user.id,
    )
