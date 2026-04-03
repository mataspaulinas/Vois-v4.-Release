from collections.abc import Callable

from fastapi import Cookie, Depends, Header, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.models.domain import (
    Assessment,
    AuthRole,
    CopilotThread,
    CopilotThreadVisibility,
    EngineRun,
    HelpRequest,
    OperationalPlan,
    ProgressEntry,
    Role,
    ThreadScope,
    UserSession,
    Venue,
)
from app.services.auth import (
    AuthenticatedActor,
    auth_roles_for_requirement,
    fallback_bootstrap_user,
    resolve_firebase_actor,
    resolve_legacy_user,
    resolve_session_token,
)


def get_auth_context(
    request: Request,
    x_ois_user_id: str | None = Header(default=None, alias="X-OIS-User-Id"),
    x_ois_session_token: str | None = Header(default=None, alias="X-OIS-Session-Token"),
    ois_session: str | None = Cookie(default=None),
    db: Session = Depends(get_db),
) -> AuthenticatedActor | None:
    settings = get_settings()
    authorization = request.headers.get("Authorization")
    bearer_token = None
    if authorization and authorization.lower().startswith("bearer "):
        bearer_token = authorization.split(" ", 1)[1].strip()

    if bearer_token:
        return resolve_firebase_actor(db, token=bearer_token)

    if settings.allow_local_password_auth:
        session_token = x_ois_session_token or ois_session or request.cookies.get(settings.session_cookie_name)
        if session_token:
            context = resolve_session_token(db, session_token)
            if context is not None:
                return context
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session is invalid or expired")

    if x_ois_user_id and settings.allow_legacy_header_auth:
        context = resolve_legacy_user(db, user_id=x_ois_user_id)
        if context is not None:
            return context
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Legacy user context is invalid")

    return None


def get_optional_current_user(
    auth_context: AuthenticatedActor | None = Depends(get_auth_context),
    db: Session = Depends(get_db),
) -> AuthenticatedActor | None:
    if auth_context is not None:
        return auth_context
    if get_settings().allow_bootstrap_fallback:
        return fallback_bootstrap_user(db)
    return None


def get_current_user(auth_context: AuthenticatedActor | None = Depends(get_auth_context)) -> AuthenticatedActor:
    if auth_context is None or auth_context.user is None or not auth_context.user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Active authenticated user required")
    return auth_context


def get_current_session(
    auth_context: AuthenticatedActor | None = Depends(get_auth_context),
) -> UserSession:
    if auth_context is None or auth_context.session is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session-backed authentication required")
    return auth_context.session


def require_roles(*allowed_roles: Role | AuthRole) -> Callable[[AuthenticatedActor], AuthenticatedActor]:
    normalized = set()
    for role in allowed_roles:
        normalized.update(auth_roles_for_requirement(role))

    def dependency(user: AuthenticatedActor = Depends(get_current_user)) -> AuthenticatedActor:
        if user.legacy_role == Role.VIEWER:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Read-only legacy viewers cannot perform this action")
        if user.role not in normalized:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User role is not allowed for this action")
        return user

    return dependency


def require_role(role: Role | AuthRole) -> Callable[[AuthenticatedActor], AuthenticatedActor]:
    return require_roles(role)


def require_any_role(*allowed_roles: Role | AuthRole) -> Callable[[AuthenticatedActor], AuthenticatedActor]:
    return require_roles(*allowed_roles)


def require_organization_id_access(user: AuthenticatedActor, organization_id: str) -> None:
    if user.role == AuthRole.DEVELOPER:
        return
    if organization_id not in user.organization_ids:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")


def require_venue_access(db: Session, *, venue_id: str, user: AuthenticatedActor) -> Venue:
    venue = db.get(Venue, venue_id)
    if venue is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Venue not found")
    require_organization_id_access(user, venue.organization_id)
    if user.role in {AuthRole.MANAGER, AuthRole.BARISTA} and venue_id not in user.accessible_venue_ids:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access is limited to the assigned venue")
    return venue


def require_assessment_access(db: Session, *, assessment_id: str, user: AuthenticatedActor) -> Assessment:
    assessment = db.get(Assessment, assessment_id)
    if assessment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assessment not found")
    venue = db.get(Venue, assessment.venue_id)
    if venue is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Venue not found")
    require_organization_id_access(user, venue.organization_id)
    if user.role in {AuthRole.MANAGER, AuthRole.BARISTA} and venue.id not in user.accessible_venue_ids:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Assessment is not available for this venue assignment")
    return assessment


def require_plan_access(db: Session, *, plan_id: str, user: AuthenticatedActor) -> OperationalPlan:
    plan = db.get(OperationalPlan, plan_id)
    if plan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")
    venue = db.get(Venue, plan.venue_id)
    if venue is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Venue not found")
    require_organization_id_access(user, venue.organization_id)
    if user.role in {AuthRole.MANAGER, AuthRole.BARISTA} and venue.id not in user.accessible_venue_ids:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Plan is not available for this venue assignment")
    return plan


def require_engine_run_access(db: Session, *, engine_run_id: str, user: AuthenticatedActor) -> EngineRun:
    engine_run = db.get(EngineRun, engine_run_id)
    if engine_run is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Engine run not found")
    venue = db.get(Venue, engine_run.venue_id)
    if venue is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Venue not found")
    require_organization_id_access(user, venue.organization_id)
    if user.role in {AuthRole.MANAGER, AuthRole.BARISTA} and venue.id not in user.accessible_venue_ids:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Engine run is not available for this venue assignment")
    return engine_run


def require_thread_access(db: Session, *, thread_id: str, user: AuthenticatedActor) -> CopilotThread:
    thread = db.get(CopilotThread, thread_id)
    if thread is None or thread.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Copilot thread not found")
    require_organization_id_access(user, thread.organization_id)
    if thread.visibility == CopilotThreadVisibility.PRIVATE and thread.owner_user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Copilot thread not found")
    if thread.venue_id is not None and user.role in {AuthRole.MANAGER, AuthRole.BARISTA} and thread.venue_id not in user.accessible_venue_ids:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access is limited to the assigned venue")
    if user.role == AuthRole.BARISTA:
        if thread.visibility == CopilotThreadVisibility.PRIVATE and thread.owner_user_id == user.id:
            return thread
        if thread.scope != ThreadScope.HELP_REQUEST:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Barista copilot access is limited to help request threads",
            )
        help_request = db.scalar(select(HelpRequest).where(HelpRequest.linked_thread_id == thread.id))
        if help_request is None or help_request.requester_user_id not in {None, user.id}:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Help request thread is not available to this barista",
            )
    return thread


def require_progress_entry_access(db: Session, *, progress_entry_id: str, user: AuthenticatedActor) -> ProgressEntry:
    entry = db.get(ProgressEntry, progress_entry_id)
    if entry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Progress entry not found")
    venue = db.get(Venue, entry.venue_id)
    if venue is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Venue not found")
    require_organization_id_access(user, venue.organization_id)
    if user.role in {AuthRole.MANAGER, AuthRole.BARISTA} and venue.id not in user.accessible_venue_ids:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Progress entry is not available for this venue assignment")
    return entry
