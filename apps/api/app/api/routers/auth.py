from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.api.deps.auth import get_auth_context, get_current_session, get_current_user
from app.auth.firebase_admin import firebase_admin_ready
from app.core.config import get_settings
from app.db.session import get_db
from app.models.domain import UserSession
from app.schemas.auth import (
    AuthLoginRequest,
    AuthLogoutResponse,
    AuthSecurityPostureRead,
    AuthSessionInfo,
    AuthSessionInventoryRead,
    AuthSessionRead,
    AuthSessionRevokeResponse,
)
from app.services.auth import (
    AuthenticatedActor,
    authenticate_user,
    create_session,
    build_local_actor_with_db,
    get_revokeable_session,
    list_visible_sessions,
    revoke_session,
    serialize_actor,
)
from app.services.workspace_setup import build_owner_setup_state


router = APIRouter()


@router.post("/login", response_model=AuthSessionRead)
def login(
    payload: AuthLoginRequest,
    response: Response,
    db: Session = Depends(get_db),
) -> AuthSessionRead:
    if not get_settings().allow_local_password_auth:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Local password auth is disabled. Sign in with Firebase Authentication instead.",
        )
    user = authenticate_user(db, email=payload.email, password=payload.password)
    session, raw_token = create_session(db, user=user, issued_by=user.id)
    db.commit()
    settings = get_settings()
    response.set_cookie(
        key=settings.session_cookie_name,
        value=raw_token,
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite=settings.session_cookie_samesite,
        domain=settings.session_cookie_domain,
        path=settings.session_cookie_path,
        max_age=settings.session_ttl_hours * 3600,
    )
    actor = build_local_actor_with_db(db, user=user, session=session, authentication_mode="local_session")
    setup_state = build_owner_setup_state(db, actor=actor)
    return AuthSessionRead(
        user=serialize_actor(actor),
        session=AuthSessionInfo(
            id=session.id,
            expires_at=session.expires_at,
            authentication_mode="local_session",
        ),
        setup_state=setup_state,
        requires_owner_claim=setup_state.requires_owner_claim,
        organization_claimed=setup_state.organization_claimed,
        session_token=raw_token,
    )


@router.post("/logout", response_model=AuthLogoutResponse)
def logout(
    response: Response,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(get_current_user),
    current_session: UserSession = Depends(get_current_session),
) -> AuthLogoutResponse:
    revoke_session(db, session=current_session, actor_user_id=current_user.id)
    db.commit()
    settings = get_settings()
    response.delete_cookie(
        settings.session_cookie_name,
        domain=settings.session_cookie_domain,
        path=settings.session_cookie_path,
    )
    return AuthLogoutResponse(revoked=True)


@router.get("/me", response_model=AuthSessionRead)
def me(
    current_user: AuthenticatedActor = Depends(get_current_user),
    auth_context: AuthenticatedActor | None = Depends(get_auth_context),
    db: Session = Depends(get_db),
) -> AuthSessionRead:
    current_session = auth_context.session if auth_context is not None else None
    setup_state = build_owner_setup_state(db, actor=current_user)
    return AuthSessionRead(
        user=serialize_actor(current_user),
        session=AuthSessionInfo(
            id=current_session.id if current_session is not None else None,
            expires_at=current_session.expires_at if current_session is not None else None,
            authentication_mode=auth_context.authentication_mode if auth_context is not None else "unauthenticated",
        ),
        setup_state=setup_state,
        requires_owner_claim=setup_state.requires_owner_claim,
        organization_claimed=setup_state.organization_claimed,
        session_token=None,
    )


@router.get("/sessions", response_model=AuthSessionInventoryRead)
def list_sessions(
    scope: str = Query(default="self"),
    current_user: AuthenticatedActor = Depends(get_current_user),
    current_session: UserSession = Depends(get_current_session),
    db: Session = Depends(get_db),
) -> AuthSessionInventoryRead:
    return list_visible_sessions(
        db,
        current_user=current_user,
        current_session_id=current_session.id,
        scope=scope,
    )


@router.delete("/sessions/{session_id}", response_model=AuthSessionRevokeResponse)
def revoke_managed_session(
    session_id: str,
    response: Response,
    current_user: AuthenticatedActor = Depends(get_current_user),
    current_session: UserSession = Depends(get_current_session),
    db: Session = Depends(get_db),
) -> AuthSessionRevokeResponse:
    target_session = get_revokeable_session(db, session_id=session_id, current_user=current_user)
    revoke_session(db, session=target_session, actor_user_id=current_user.id)
    db.commit()

    cleared_cookie = target_session.id == current_session.id
    if cleared_cookie:
        settings = get_settings()
        response.delete_cookie(
            settings.session_cookie_name,
            domain=settings.session_cookie_domain,
            path=settings.session_cookie_path,
        )

    return AuthSessionRevokeResponse(
        revoked=True,
        session_id=target_session.id,
        cleared_current_cookie=cleared_cookie,
    )


@router.get("/security-posture", response_model=AuthSecurityPostureRead)
def security_posture(
    auth_context: AuthenticatedActor | None = Depends(get_auth_context),
    current_user: AuthenticatedActor = Depends(get_current_user),
) -> AuthSecurityPostureRead:
    settings = get_settings()
    ai_policy = settings.ai_runtime_policy()
    firebase_ready, firebase_admin_missing = firebase_admin_ready()
    client_missing = settings.firebase_client_missing_configuration()
    auth_missing_configuration = list(dict.fromkeys([*client_missing, *firebase_admin_missing]))
    auth_ready = settings.auth_provider != "firebase" or not auth_missing_configuration
    authentication_mode = auth_context.authentication_mode if auth_context is not None else settings.auth_provider
    return AuthSecurityPostureRead(
        auth_provider=settings.auth_provider,
        authentication_mode=authentication_mode,
        auth_ready=auth_ready,
        auth_missing_configuration=auth_missing_configuration,
        firebase_project_id=settings.firebase_project_id,
        firebase_client_configured=not client_missing,
        firebase_admin_configured=firebase_ready,
        firebase_client_missing_configuration=client_missing,
        firebase_admin_missing_configuration=firebase_admin_missing,
        local_password_auth_enabled=settings.allow_local_password_auth,
        bootstrap_fallback_enabled=settings.allow_bootstrap_fallback,
        session_cookie_name=settings.session_cookie_name,
        session_cookie_secure=settings.session_cookie_secure,
        session_cookie_samesite=settings.session_cookie_samesite,
        session_cookie_domain=settings.session_cookie_domain,
        session_cookie_path=settings.session_cookie_path,
        session_ttl_hours=settings.session_ttl_hours,
        legacy_header_auth_enabled=settings.allow_legacy_header_auth,
        ai_provider=ai_policy.requested_provider,
        ai_model=ai_policy.requested_model,
        ai_mode=ai_policy.mode,
        ai_configured=ai_policy.configured,
        ai_provider_effective=ai_policy.effective_provider,
        ai_model_effective=ai_policy.effective_model,
        ai_live_activation_ready=ai_policy.live_activation_ready,
        ai_live_provider_supported=ai_policy.live_provider_supported,
        ai_mock_fallback_enabled=ai_policy.mock_fallback_enabled,
        ai_mock_fallback_active=ai_policy.mock_fallback_active,
        ai_secret_backend=ai_policy.secret_backend,
        ai_runtime_note=ai_policy.note,
        ai_missing_configuration=ai_policy.missing_configuration,
        upload_backend=settings.upload_backend,
        default_data_residency=settings.default_data_residency,
    )
