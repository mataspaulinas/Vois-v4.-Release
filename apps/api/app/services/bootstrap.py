from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.domain import (
    CopilotAuthorRole,
    CopilotMessage,
    CopilotThread,
    Organization,
    Role,
    ThreadScope,
    User,
    Venue,
    VenueStatus,
)
from app.services.auth import hash_password
from app.services.ontology import get_ontology_repository
from app.services.ontology_bindings import set_venue_binding


DEMO_PASSWORD = "ois-demo-2026"


def ensure_seed_data(session: Session) -> None:
    organization = session.scalar(select(Organization).where(Organization.slug == "ois-demo"))
    if organization is None:
        organization = Organization(
            name="OIS Demo Group",
            slug="ois-demo",
            region="europe",
            data_residency=get_settings().default_data_residency,
        )
        session.add(organization)
        session.flush()
        venue = Venue(
            organization_id=organization.id,
            name="Rosehip Bistro",
            slug="rosehip-bistro",
            vertical=None,
            status=VenueStatus.ACTIVE,
            concept="Plant-forward neighborhood bistro",
            location="Vilnius",
            size_note="75 seats",
            capacity_profile={
                "leadership_strength": "medium",
                "volatility": "medium",
                "management_hours_available": "8"
            },
        )
        session.add(venue)
        session.flush()
    else:
        venue = session.scalar(select(Venue).where(Venue.organization_id == organization.id).order_by(Venue.created_at.asc()))

    if organization is None or venue is None:
        return

    owner_user = _ensure_seed_user(
        session,
        organization=organization,
        venue=None,
        email=get_settings().seed_owner_email,
        full_name="VOIS Owner",
        role=Role.PORTFOLIO_DIRECTOR,
    )
    _ensure_seed_user(
        session,
        organization=organization,
        venue=venue,
        email=get_settings().seed_manager_email,
        full_name="VOIS Manager",
        role=Role.VENUE_MANAGER,
    )
    _ensure_seed_user(
        session,
        organization=organization,
        venue=venue,
        email=get_settings().seed_barista_email,
        full_name="VOIS Barista",
        role=Role.EMPLOYEE,
    )
    _ensure_seed_user(
        session,
        organization=organization,
        venue=None,
        email=get_settings().seed_developer_email,
        full_name="VOIS Developer",
        role=Role.PLATFORM_ADMIN,
    )

    seed_mount = _default_seed_mount()
    set_venue_binding(
        session,
        venue,
        get_ontology_repository(),
        ontology_id=seed_mount.ontology_id,
        ontology_version=seed_mount.version,
        bound_by=owner_user.id,
    )

    global_thread = session.scalar(
        select(CopilotThread)
        .where(CopilotThread.organization_id == organization.id, CopilotThread.scope == ThreadScope.GLOBAL)
        .order_by(CopilotThread.created_at.asc())
    )
    if global_thread is None:
        global_thread = CopilotThread(
            organization_id=organization.id,
            title="Morning operational pulse",
            scope=ThreadScope.GLOBAL,
            archived=False,
        )
        session.add(global_thread)
        session.flush()

    venue_thread = session.scalar(
        select(CopilotThread)
        .where(CopilotThread.organization_id == organization.id, CopilotThread.venue_id == venue.id)
        .order_by(CopilotThread.created_at.asc())
    )
    if venue_thread is None:
        venue_thread = CopilotThread(
            organization_id=organization.id,
            venue_id=venue.id,
            title=f"{venue.name} working thread",
            scope=ThreadScope.VENUE,
            archived=False,
        )
        session.add(venue_thread)
        session.flush()

    _ensure_seed_message(
        session,
        thread=global_thread,
        content=(
            "VOIS is tracking the portfolio surface. Use this thread for cross-venue pattern spotting and portfolio-level questions."
        ),
    )
    _ensure_seed_message(
        session,
        thread=venue_thread,
        content=(
            f"VOIS is grounded in {venue.name}. Ask what to focus on next, what is blocked, or how the latest assessment is shaping execution."
        ),
    )
    session.commit()


def _ensure_seed_user(
    session: Session,
    *,
    organization: Organization,
    venue: Venue | None,
    email: str,
    full_name: str,
    role: Role,
) -> User:
    user = session.scalar(select(User).where(User.email == email.lower()))
    if user is None:
        user = User(
            organization_id=organization.id,
            venue_id=venue.id if venue is not None else None,
            email=email.lower(),
            full_name=full_name,
            role=role,
            password_hash=hash_password(DEMO_PASSWORD),
        )
        session.add(user)
        session.flush()
        return user

    user.organization_id = organization.id
    user.venue_id = venue.id if venue is not None else None
    user.full_name = full_name
    user.role = role
    user.is_active = True
    if not user.password_hash:
        user.password_hash = hash_password(DEMO_PASSWORD)
    return user


def _ensure_seed_message(session: Session, *, thread: CopilotThread, content: str) -> None:
    existing_message = session.scalar(
        select(CopilotMessage)
        .where(CopilotMessage.thread_id == thread.id)
        .order_by(CopilotMessage.created_at.asc())
    )
    if existing_message is not None:
        return

    session.add(
        CopilotMessage(
            thread_id=thread.id,
            author_role=CopilotAuthorRole.ASSISTANT,
            source_mode="system_seed",
            content=content,
            references=[],
        )
    )


def _default_seed_mount():
    repository = get_ontology_repository()
    mounts = [
        mount
        for mount in repository.list_mount_summaries()
        if mount.status == "active" and mount.validation.get("mountable", False) and mount.pack_kind != "legacy"
    ]
    if not mounts:
        raise RuntimeError("Bootstrap seed requires at least one active, mountable, non-legacy ontology pack.")
    return sorted(mounts, key=lambda item: (item.ontology_id, item.version))[0]
