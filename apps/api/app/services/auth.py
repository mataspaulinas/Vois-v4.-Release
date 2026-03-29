from __future__ import annotations

import hashlib
import hmac
import secrets
from dataclasses import dataclass, field
from datetime import timedelta
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.firebase_admin import FirebaseAdminConfigurationError, verify_id_token
from app.core.config import get_settings
from app.models.domain import AuthRole, Organization, Role, User, UserSession, Venue, utc_now
from app.services.access_control import accessible_venue_ids, list_active_memberships, sync_user_access_pointers
from app.services.audit import record_audit_entry


PASSWORD_ALGORITHM = "pbkdf2_sha256"
PASSWORD_ITERATIONS = 260_000


@dataclass
class AuthenticatedActor:
    user: User
    role: AuthRole
    authentication_mode: str
    session: UserSession | None = None
    provider_uid: str | None = None
    provider_email: str | None = None
    provider_display_name: str | None = None
    claims: dict[str, Any] = field(default_factory=dict)
    organization_ids: set[str] = field(default_factory=set)
    accessible_venue_ids: set[str] = field(default_factory=set)

    @property
    def id(self) -> str:
        return self.user.id

    @property
    def organization_id(self) -> str | None:
        return self.user.organization_id

    @property
    def venue_id(self) -> str | None:
        return self.user.venue_id

    @property
    def email(self) -> str:
        return self.provider_email or self.user.email

    @property
    def full_name(self) -> str:
        return self.provider_display_name or self.user.full_name

    @property
    def is_active(self) -> bool:
        return self.user.is_active

    @property
    def legacy_role(self) -> Role:
        return self.user.role


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt), PASSWORD_ITERATIONS).hex()
    return f"{PASSWORD_ALGORITHM}${PASSWORD_ITERATIONS}${salt}${digest}"


def verify_password(password: str, password_hash: str | None) -> bool:
    if not password_hash:
        return False
    try:
        algorithm, iteration_text, salt, expected = password_hash.split("$", 3)
    except ValueError:
        return False
    if algorithm != PASSWORD_ALGORITHM:
        return False
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        bytes.fromhex(salt),
        int(iteration_text),
    ).hex()
    return hmac.compare_digest(digest, expected)


def authenticate_user(db: Session, *, email: str, password: str) -> User:
    user = db.scalar(select(User).where(User.email == email.lower()))
    if user is None or not user.is_active or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    return user


def create_session(db: Session, *, user: User, issued_by: str | None = None) -> tuple[UserSession, str]:
    raw_token = secrets.token_urlsafe(32)
    token_hash = _hash_session_token(raw_token)
    expires_at = utc_now() + timedelta(hours=get_settings().session_ttl_hours)
    session = UserSession(
        user_id=user.id,
        organization_id=user.organization_id,
        token_hash=token_hash,
        issued_by=issued_by or user.id,
        expires_at=expires_at,
        last_seen_at=utc_now(),
    )
    db.add(session)
    db.flush()
    record_audit_entry(
        db,
        organization_id=user.organization_id,
        actor_user_id=user.id,
        entity_type="user_session",
        entity_id=session.id,
        action="created",
        payload={"user_id": user.id, "expires_at": expires_at.isoformat()},
    )
    return session, raw_token


def revoke_session(db: Session, *, session: UserSession, actor_user_id: str | None = None) -> None:
    if session.revoked_at is not None:
        return
    session.revoked_at = utc_now()
    record_audit_entry(
        db,
        organization_id=session.organization_id,
        actor_user_id=actor_user_id or session.user_id,
        entity_type="user_session",
        entity_id=session.id,
        action="revoked",
        payload={"user_id": session.user_id},
    )


def resolve_session_token(db: Session, token: str) -> AuthenticatedActor | None:
    token_hash = _hash_session_token(token)
    session = db.scalar(select(UserSession).where(UserSession.token_hash == token_hash))
    if session is None:
        return None
    expires_at = _coerce_utc(session.expires_at)
    revoked_at = _coerce_utc(session.revoked_at) if session.revoked_at is not None else None
    if revoked_at is not None or expires_at <= utc_now():
        return None
    user = db.get(User, session.user_id)
    if user is None or not user.is_active:
        return None
    session.last_seen_at = utc_now()
    db.commit()
    return build_local_actor_with_db(db, user=user, session=session, authentication_mode="local_session")


def resolve_legacy_user(db: Session, *, user_id: str) -> AuthenticatedActor | None:
    user = db.get(User, user_id)
    if user is None or not user.is_active:
        return None
    return build_local_actor_with_db(db, user=user, session=None, authentication_mode="legacy_header")


def fallback_bootstrap_user(db: Session) -> AuthenticatedActor | None:
    """COMPATIBILITY-ONLY bootstrap fallback (Law 8 documented).

    Owner: platform bootstrap path
    Retirement: remove when ``ALLOW_BOOTSTRAP_FALLBACK`` is permanently
    ``false`` in all environments (including local dev).
    Purpose: allows unauthenticated access during early development before
    Firebase auth is configured.  Must never be enabled in hosted or
    production environments.
    """
    import logging

    user = db.scalar(select(User).order_by(User.created_at.asc()))
    if user is None:
        return None
    logging.getLogger("app.auth").warning(
        "Bootstrap fallback activated — returning first user as actor. "
        "This path should be disabled in production (ALLOW_BOOTSTRAP_FALLBACK=false)."
    )
    return build_local_actor_with_db(db, user=user, session=None, authentication_mode="bootstrap_local")


def resolve_firebase_actor(db: Session, *, token: str) -> AuthenticatedActor:
    try:
        decoded = verify_id_token(token)
    except FirebaseAdminConfigurationError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except Exception as exc:
        error_name = exc.__class__.__name__
        if error_name in {"ExpiredIdTokenError", "InvalidIdTokenError", "RevokedIdTokenError"}:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Firebase ID token is invalid or expired") from exc
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Firebase authentication is temporarily unavailable",
        ) from exc

    uid = str(decoded.get("uid") or decoded.get("user_id") or "").strip()
    if not uid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Firebase token is missing a user id")

    role = _coerce_auth_role(decoded.get(get_settings().firebase_role_claim_key))
    if role is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Firebase role claim is missing or invalid for this account",
        )

    normalized_email = str(decoded.get("email") or "").strip().lower() or None
    display_name = str(decoded.get("name") or normalized_email or uid).strip()
    user = upsert_internal_user_for_firebase(
        db,
        provider_uid=uid,
        email=normalized_email,
        full_name=display_name,
        role=role,
    )
    organization_ids, venue_ids = _resolve_actor_access(db, user=user, role=role)
    return AuthenticatedActor(
        user=user,
        role=role,
        authentication_mode="firebase_id_token",
        session=None,
        provider_uid=uid,
        provider_email=normalized_email,
        provider_display_name=display_name,
        claims=dict(decoded),
        organization_ids=organization_ids,
        accessible_venue_ids=venue_ids,
    )


def upsert_internal_user_for_firebase(
    db: Session,
    *,
    provider_uid: str,
    email: str | None,
    full_name: str,
    role: AuthRole,
) -> User:
    user = db.scalar(select(User).where(User.firebase_uid == provider_uid))
    if user is None and email:
        user = db.scalar(select(User).where(User.email == email))

    created = False
    if user is None:
        if role not in {AuthRole.OWNER, AuthRole.DEVELOPER}:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This Firebase account is not provisioned in VOIS yet. Ask an owner to create and assign access.",
            )
        user = User(
            organization_id=None,
            venue_id=None,
            firebase_uid=provider_uid,
            email=email or f"{provider_uid}@firebase.local",
            full_name=full_name,
            role=_legacy_role_for_auth_role(role),
            password_hash=None,
            is_active=True,
        )
        db.add(user)
        db.flush()
        created = True
    else:
        if user.firebase_uid is None:
            user.firebase_uid = provider_uid
        if email and user.email != email:
            user.email = email
        if full_name and user.full_name != full_name:
            user.full_name = full_name
        user.role = _legacy_role_for_auth_role(role)

    sync_user_access_pointers(db, user=user)

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This VOIS account is inactive")

    if created:
        record_audit_entry(
            db,
            organization_id=user.organization_id,
            actor_user_id=user.id,
            entity_type="user",
            entity_id=user.id,
            action="firebase_provisioned",
            payload={"firebase_uid": provider_uid, "email": user.email, "role": role.value},
        )

    db.commit()
    db.refresh(user)
    return user


def serialize_actor(actor: AuthenticatedActor):
    from app.schemas.auth import AuthUserRead

    return AuthUserRead(
        id=actor.user.id,
        organization_id=actor.user.organization_id,
        venue_id=actor.user.venue_id,
        firebase_uid=actor.provider_uid or actor.user.firebase_uid,
        email=actor.email,
        full_name=actor.full_name,
        role=actor.role.value,
        allowed_shells=allowed_shells_for_role(actor.role),
        capabilities=capabilities_for_role(actor.role),
    )


def serialize_managed_session(
    session: UserSession,
    *,
    user: User,
    current_session_id: str | None = None,
    issued_by_name: str | None = None,
):
    from app.schemas.auth import AuthManagedSessionRead

    expires_at = _coerce_utc(session.expires_at)
    revoked_at = _coerce_utc(session.revoked_at) if session.revoked_at is not None else None
    return AuthManagedSessionRead(
        id=session.id,
        user_id=user.id,
        user_email=user.email,
        user_full_name=user.full_name,
        organization_id=session.organization_id,
        issued_by=session.issued_by,
        issued_by_name=issued_by_name,
        expires_at=expires_at,
        revoked_at=revoked_at,
        last_seen_at=_coerce_utc(session.last_seen_at) if session.last_seen_at is not None else None,
        created_at=_coerce_utc(session.created_at),
        is_current=session.id == current_session_id,
        is_active=revoked_at is None and expires_at > utc_now(),
    )


def list_visible_sessions(
    db: Session,
    *,
    current_user: AuthenticatedActor,
    current_session_id: str | None,
    scope: str = "self",
):
    from app.schemas.auth import AuthSessionInventoryRead

    if scope not in {"self", "organization"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported session scope")

    if current_user.legacy_role == Role.VIEWER:
        if scope == "organization":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Organization session inventory requires elevated access")
        scope = "self"

    if scope == "organization" and current_user.role not in {AuthRole.OWNER, AuthRole.DEVELOPER}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Organization session inventory requires elevated access")

    statement = select(UserSession).order_by(UserSession.created_at.desc())
    if scope == "self":
        statement = statement.where(UserSession.user_id == current_user.id)
    elif current_user.role != AuthRole.DEVELOPER:
        statement = statement.where(UserSession.organization_id == current_user.organization_id)

    sessions = list(db.scalars(statement).all())
    user_ids = sorted({session.user_id for session in sessions})
    users = {
        user.id: user
        for user in db.scalars(select(User).where(User.id.in_(user_ids))).all()
    } if user_ids else {}
    issuer_ids = sorted({session.issued_by for session in sessions if session.issued_by})
    issuers = {
        user.id: user.full_name
        for user in db.scalars(select(User).where(User.id.in_(issuer_ids))).all()
    } if issuer_ids else {}

    serialized_sessions = []
    for session in sessions:
        user = users.get(session.user_id)
        if user is None:
            continue
        serialized_sessions.append(
            serialize_managed_session(
                session,
                user=user,
                current_session_id=current_session_id,
                issued_by_name=issuers.get(session.issued_by) if session.issued_by else None,
            )
        )

    return AuthSessionInventoryRead(
        scope=scope,
        current_session_id=current_session_id,
        sessions=serialized_sessions,
    )


def get_revokeable_session(db: Session, *, session_id: str, current_user: AuthenticatedActor) -> UserSession:
    session = db.get(UserSession, session_id)
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    if current_user.role == AuthRole.DEVELOPER:
        return session

    if session.organization_id != current_user.organization_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    if session.user_id == current_user.id:
        return session

    if current_user.role != AuthRole.OWNER:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only owners can revoke other operators' sessions")

    return session


def get_organization_for_user(db: Session, user: AuthenticatedActor) -> Organization:
    if user.organization_id is None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This account has not claimed or joined an organization yet")
    organization = db.get(Organization, user.organization_id)
    if organization is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    return organization


def build_local_actor(*, user: User, session: UserSession | None, authentication_mode: str) -> AuthenticatedActor:
    raise RuntimeError("build_local_actor now requires a database session")


def build_local_actor_with_db(
    db: Session,
    *,
    user: User,
    session: UserSession | None,
    authentication_mode: str,
) -> AuthenticatedActor:
    role = legacy_role_to_auth_role(user.role)
    organization_ids, venue_ids = _resolve_actor_access(db, user=user, role=role)
    return AuthenticatedActor(
        user=user,
        role=role,
        authentication_mode=authentication_mode,
        session=session,
        provider_uid=user.firebase_uid,
        provider_email=user.email,
        provider_display_name=user.full_name,
        claims={},
        organization_ids=organization_ids,
        accessible_venue_ids=venue_ids,
    )


def allowed_shells_for_role(role: AuthRole) -> list[str]:
    if role == AuthRole.OWNER:
        return ["owner", "manager", "reference", "kb", "settings", "portfolio", "setup"]
    if role == AuthRole.MANAGER:
        return ["manager", "reference", "kb", "settings"]
    if role == AuthRole.BARISTA:
        return ["pocket", "reference", "kb", "settings"]
    return ["settings", "reference", "kb", "portfolio", "developer"]


def capabilities_for_role(role: AuthRole) -> list[str]:
    if role == AuthRole.OWNER:
        return ["portfolio", "venue_admin", "plan_activation", "people_intelligence", "exports", "owner_setup", "people_admin"]
    if role == AuthRole.MANAGER:
        return ["execution", "assessments", "plans", "help_requests", "comments", "proofs"]
    if role == AuthRole.BARISTA:
        return ["pocket", "shift", "standards", "help", "log", "proof"]
    return ["developer_tools", "mount_inspection", "diagnostics", "health"]


def legacy_role_to_auth_role(role: Role) -> AuthRole:
    if role == Role.PLATFORM_ADMIN:
        return AuthRole.DEVELOPER
    if role in {Role.ORG_ADMIN, Role.PORTFOLIO_DIRECTOR, Role.VIEWER}:
        return AuthRole.OWNER
    if role in {Role.VENUE_MANAGER, Role.CONTRIBUTOR}:
        return AuthRole.MANAGER
    return AuthRole.BARISTA


def auth_roles_for_requirement(role: Role | AuthRole) -> set[AuthRole]:
    if isinstance(role, AuthRole):
        return {role}
    mapping: dict[Role, set[AuthRole]] = {
        Role.PLATFORM_ADMIN: {AuthRole.DEVELOPER, AuthRole.OWNER},
        Role.ORG_ADMIN: {AuthRole.OWNER},
        Role.PORTFOLIO_DIRECTOR: {AuthRole.OWNER},
        Role.VENUE_MANAGER: {AuthRole.OWNER, AuthRole.MANAGER},
        Role.CONTRIBUTOR: {AuthRole.OWNER, AuthRole.MANAGER},
        Role.VIEWER: {AuthRole.OWNER},
        Role.EMPLOYEE: {AuthRole.OWNER, AuthRole.MANAGER, AuthRole.BARISTA},
    }
    return mapping[role]


def _coerce_auth_role(value: object) -> AuthRole | None:
    if value is None:
        return None
    normalized = str(value).strip().lower()
    for role in AuthRole:
        if role.value == normalized:
            return role
    return None


def _legacy_role_for_auth_role(role: AuthRole) -> Role:
    if role == AuthRole.OWNER:
        return Role.PORTFOLIO_DIRECTOR
    if role == AuthRole.MANAGER:
        return Role.VENUE_MANAGER
    if role == AuthRole.BARISTA:
        return Role.EMPLOYEE
    return Role.PLATFORM_ADMIN


def _hash_session_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def _coerce_utc(value):
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=utc_now().tzinfo)
    return value


def _resolve_actor_access(db: Session, *, user: User, role: AuthRole) -> tuple[set[str], set[str]]:
    organization_ids = {
        membership.organization_id
        for membership in list_active_memberships(db, user_id=user.id)
    }
    if user.organization_id:
        organization_ids.add(user.organization_id)
    venue_ids: set[str] = set()
    for organization_id in organization_ids:
        venue_ids.update(
            accessible_venue_ids(
                db,
                user=user,
                role=role,
                organization_id=organization_id,
            )
        )
    return organization_ids, venue_ids
