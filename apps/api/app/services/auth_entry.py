from __future__ import annotations

import hashlib
import secrets
from datetime import timedelta

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.firebase_admin import FirebaseAdminConfigurationError, generate_password_reset_link
from app.core.config import get_settings
from app.models.domain import Organization, PasswordResetRequest, User, Venue, WorkspaceInvite, utc_now
from app.schemas.auth import (
    AuthDiscoveryRead,
    AuthEntryConfigRead,
    AuthPasswordForgotResponse,
    AuthPasswordResetResponse,
)
from app.schemas.domain import InviteAcceptanceRead, InvitePreviewRead
from app.services.auth import AuthenticatedActor, hash_password
from app.services.audit import record_audit_entry
from app.services.workspace_setup import build_owner_setup_state


def build_auth_entry_config() -> AuthEntryConfigRead:
    settings = get_settings()
    enabled_providers: list[str] = []
    if not settings.firebase_client_missing_configuration():
        enabled_providers.append("password")
    if settings.auth_google_enabled:
        enabled_providers.append("google")
    if settings.auth_microsoft_enabled:
        enabled_providers.append("microsoft")
    if settings.auth_sso_enabled:
        enabled_providers.append("sso")

    return AuthEntryConfigRead(
        environment_mode=settings.auth_environment_mode(),
        environment_label=settings.auth_environment_label(),
        local_auth_available=settings.allow_local_password_auth and settings.auth_environment_mode() != "production",
        enabled_providers=enabled_providers,
        support_url=settings.auth_support_url,
        status_url=settings.auth_status_url,
        invite_enabled=True,
        password_reset_available=True,
    )


def discover_auth_route(db: Session, *, email: str) -> AuthDiscoveryRead:
    settings = get_settings()
    normalized_email = email.strip().lower()
    user = db.scalar(select(User).where(User.email == normalized_email))
    invite = _latest_invite_by_email(db, normalized_email)
    password_mode = _password_mode()

    if user is not None and not user.is_active:
        return AuthDiscoveryRead(
            email=normalized_email,
            route="no_access",
            provider_label=None,
            password_mode=None,
            workspace_hint=_workspace_hint_from_invite(db, invite),
            message="This account is currently inactive. Contact a workspace owner for access.",
        )

    if invite is not None and invite.revoked_at is None and invite.accepted_at is None and _coerce_utc(invite.expires_at) > utc_now():
        return AuthDiscoveryRead(
            email=normalized_email,
            route="invite_required",
            provider_label="Pending invite",
            password_mode=password_mode,
            workspace_hint=_workspace_hint_from_invite(db, invite),
            message="This email has a pending VOIS invite.",
        )

    if password_mode is not None:
        return AuthDiscoveryRead(
            email=normalized_email,
            route="password",
            provider_label="Password",
            password_mode=password_mode,
            workspace_hint=_workspace_hint_for_user(db, user),
            message=None,
        )

    return AuthDiscoveryRead(
        email=normalized_email,
        route="no_access",
        provider_label=None,
        password_mode=None,
        workspace_hint=_workspace_hint_for_user(db, user),
        message="This build does not have an interactive sign-in method available right now.",
    )


def issue_workspace_invite(
    db: Session,
    *,
    organization_id: str,
    user: User,
    role_claim,
    venue_ids: list[str],
    invited_by_user_id: str | None,
) -> tuple[str, object]:
    existing_invites = list(
        db.scalars(
            select(WorkspaceInvite).where(
                WorkspaceInvite.organization_id == organization_id,
                WorkspaceInvite.email == user.email,
                WorkspaceInvite.accepted_at.is_(None),
                WorkspaceInvite.revoked_at.is_(None),
            )
        ).all()
    )
    now = utc_now()
    for existing in existing_invites:
        existing.revoked_at = now

    raw_token = secrets.token_urlsafe(24)
    expires_at = now + timedelta(hours=get_settings().auth_invite_ttl_hours)
    invite = WorkspaceInvite(
        organization_id=organization_id,
        user_id=user.id,
        invited_by_user_id=invited_by_user_id,
        email=user.email,
        full_name=user.full_name,
        role_claim=role_claim,
        venue_ids=venue_ids,
        token_hash=_hash_token(raw_token),
        expires_at=expires_at,
    )
    db.add(invite)
    db.flush()
    return _build_app_url(f"/auth/invite/{raw_token}"), expires_at


def preview_invite(db: Session, *, token: str) -> InvitePreviewRead:
    invite = _resolve_invite(db, token)
    organization = db.get(Organization, invite.organization_id)
    inviter = db.get(User, invite.invited_by_user_id) if invite.invited_by_user_id else None
    venues = _venues_for_ids(db, invite.venue_ids)
    now = utc_now()

    if invite.revoked_at is not None:
        token_status = "revoked"
        message = "This invite has been revoked."
    elif invite.accepted_at is not None:
        token_status = "accepted"
        message = "This invite has already been accepted."
    elif _coerce_utc(invite.expires_at) <= now:
        token_status = "expired"
        message = "This invite has expired. Ask an owner to send a new one."
    else:
        token_status = "pending"
        message = "Sign in with the invited email to accept access."

    return InvitePreviewRead(
        token_status=token_status,
        organization_name=organization.name if organization is not None else "Workspace",
        organization_slug=organization.slug if organization is not None else "workspace",
        invited_by_name=inviter.full_name if inviter is not None else None,
        email=invite.email,
        full_name=invite.full_name,
        role=invite.role_claim,
        venue_names=[venue.name for venue in venues],
        expires_at=invite.expires_at,
        accepted_at=invite.accepted_at,
        message=message,
    )


def accept_invite(db: Session, *, token: str, actor: AuthenticatedActor) -> InviteAcceptanceRead:
    invite = _resolve_invite(db, token)
    organization = db.get(Organization, invite.organization_id)
    if organization is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invite organization not found")

    if actor.email.lower() != invite.email.lower():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Sign in with the invited email address before accepting this invite.",
        )

    if invite.revoked_at is not None:
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="This invite has been revoked")
    if _coerce_utc(invite.expires_at) <= utc_now():
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="This invite has expired")

    if invite.accepted_at is None:
        invite.accepted_at = utc_now()
        invite.accepted_by_user_id = actor.id
        record_audit_entry(
            db,
            organization_id=invite.organization_id,
            actor_user_id=actor.id,
            entity_type="workspace_invite",
            entity_id=invite.id,
            action="accepted",
            payload={"email": invite.email, "role": invite.role_claim.value, "venue_ids": invite.venue_ids},
        )
        db.commit()

    setup_state = build_owner_setup_state(db, actor=actor)
    return InviteAcceptanceRead(
        accepted=True,
        organization_id=invite.organization_id,
        organization_slug=organization.slug,
        role=invite.role_claim,
        venue_ids=invite.venue_ids,
        requires_owner_claim=setup_state.requires_owner_claim,
        message="Invite accepted.",
    )


def request_password_reset(db: Session, *, email: str) -> AuthPasswordForgotResponse:
    settings = get_settings()
    normalized_email = email.strip().lower()
    user = db.scalar(select(User).where(User.email == normalized_email))
    if user is None or not user.is_active:
        return AuthPasswordForgotResponse(
            accepted=True,
            delivery_mode="generic",
            message="If an account exists for this email, the reset flow has been started.",
        )

    if user.firebase_uid:
        try:
            reset_link = generate_password_reset_link(user.email)
            record_audit_entry(
                db,
                organization_id=user.organization_id,
                actor_user_id=user.id,
                entity_type="password_reset_request",
                entity_id=user.id,
                action="requested",
                payload={"delivery_mode": "email_link"},
            )
            db.commit()
            return AuthPasswordForgotResponse(
                accepted=True,
                delivery_mode="email_link",
                message="If this account supports password reset, use the reset link sent through the configured auth provider.",
                reset_url=reset_link if settings.auth_environment_mode() != "production" else None,
            )
        except FirebaseAdminConfigurationError:
            pass
        except Exception:
            return AuthPasswordForgotResponse(
                accepted=True,
                delivery_mode="contact_support",
                message="Password reset is temporarily unavailable. Contact support or a workspace owner.",
            )

    if settings.allow_local_password_auth and settings.auth_environment_mode() != "production" and user.password_hash:
        raw_token = secrets.token_urlsafe(24)
        expires_at = utc_now() + timedelta(minutes=settings.auth_password_reset_ttl_minutes)
        reset_request = PasswordResetRequest(
            user_id=user.id,
            email=user.email,
            token_hash=_hash_token(raw_token),
            expires_at=expires_at,
            delivery_mode="local_reset_link",
        )
        db.add(reset_request)
        db.flush()
        record_audit_entry(
            db,
            organization_id=user.organization_id,
            actor_user_id=user.id,
            entity_type="password_reset_request",
            entity_id=reset_request.id,
            action="requested",
            payload={"delivery_mode": "local_reset_link"},
        )
        db.commit()
        return AuthPasswordForgotResponse(
            accepted=True,
            delivery_mode="local_reset_link",
            message="A local reset link is available for this environment.",
            reset_url=_build_app_url(f"/auth/reset?token={raw_token}"),
        )

    return AuthPasswordForgotResponse(
        accepted=True,
        delivery_mode="owner_reset_required",
        message="This account must be reset by an owner or admin.",
    )


def complete_password_reset(db: Session, *, token: str, new_password: str) -> AuthPasswordResetResponse:
    request = db.scalar(select(PasswordResetRequest).where(PasswordResetRequest.token_hash == _hash_token(token)))
    if request is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reset token not found")
    if request.consumed_at is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Reset token has already been used")
    if _coerce_utc(request.expires_at) <= utc_now():
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Reset token has expired")

    user = db.get(User, request.user_id)
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reset user not found")

    user.password_hash = hash_password(new_password)
    request.consumed_at = utc_now()
    record_audit_entry(
        db,
        organization_id=user.organization_id,
        actor_user_id=user.id,
        entity_type="password_reset_request",
        entity_id=request.id,
        action="completed",
        payload={"delivery_mode": request.delivery_mode},
    )
    db.commit()
    return AuthPasswordResetResponse(reset=True, message="Password updated. Sign in with the new password.")


def _resolve_invite(db: Session, token: str) -> WorkspaceInvite:
    invite = db.scalar(select(WorkspaceInvite).where(WorkspaceInvite.token_hash == _hash_token(token)))
    if invite is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invite not found")
    return invite


def _latest_invite_by_email(db: Session, email: str) -> WorkspaceInvite | None:
    return db.scalar(
        select(WorkspaceInvite)
        .where(WorkspaceInvite.email == email)
        .order_by(WorkspaceInvite.created_at.desc())
    )


def _workspace_hint_from_invite(db: Session, invite: WorkspaceInvite | None) -> str | None:
    if invite is None:
        return None
    organization = db.get(Organization, invite.organization_id)
    return organization.name if organization is not None else None


def _workspace_hint_for_user(db: Session, user: User | None) -> str | None:
    if user is None or user.organization_id is None:
        return None
    organization = db.get(Organization, user.organization_id)
    return organization.name if organization is not None else None


def _password_mode() -> str | None:
    settings = get_settings()
    if not settings.firebase_client_missing_configuration():
        return "firebase"
    if settings.allow_local_password_auth and settings.auth_environment_mode() != "production":
        return "local"
    return None


def _build_app_url(path: str) -> str:
    base = (get_settings().public_app_url or "").rstrip("/")
    if not path.startswith("/"):
        path = f"/{path}"
    return f"{base}{path}" if base else path


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _venues_for_ids(db: Session, venue_ids: list[str]) -> list[Venue]:
    if not venue_ids:
        return []
    venues = list(db.scalars(select(Venue).where(Venue.id.in_(venue_ids))).all())
    venues_by_id = {venue.id: venue for venue in venues}
    return [venues_by_id[venue_id] for venue_id in venue_ids if venue_id in venues_by_id]


def _coerce_utc(value):
    if value.tzinfo is None:
        return value.replace(tzinfo=utc_now().tzinfo)
    return value.astimezone(utc_now().tzinfo)
