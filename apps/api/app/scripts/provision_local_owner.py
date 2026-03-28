from __future__ import annotations

import os

from sqlalchemy import func, select

from app.core.config import get_settings
from app.db.session import ensure_schema_ready, get_session_factory
from app.models.domain import Role, User
from app.services.auth import hash_password


DEFAULT_EMAIL = "owner@vois.local"
DEFAULT_PASSWORD = "vois-owner-2026"
DEFAULT_NAME = "VOIS Owner"


def main() -> None:
    settings = get_settings()
    ensure_schema_ready(settings.database_url)
    session_factory = get_session_factory(settings.database_url)

    email = os.getenv("VOIS_LOCAL_OWNER_EMAIL", DEFAULT_EMAIL).strip().lower()
    password = os.getenv("VOIS_LOCAL_OWNER_PASSWORD", DEFAULT_PASSWORD).strip()
    full_name = os.getenv("VOIS_LOCAL_OWNER_NAME", DEFAULT_NAME).strip() or DEFAULT_NAME

    if len(password) < 8:
        raise SystemExit("VOIS_LOCAL_OWNER_PASSWORD must be at least 8 characters long")

    with session_factory() as session:
        existing = session.scalar(select(User).where(User.email == email))
        user_count = session.scalar(select(func.count()).select_from(User)) or 0

        if existing is None and user_count > 0:
            print(f"skipped_existing_workspace:{email}")
            return

        if existing is None:
            existing = User(
                organization_id=None,
                venue_id=None,
                firebase_uid=None,
                email=email,
                full_name=full_name,
                role=Role.PORTFOLIO_DIRECTOR,
                password_hash=hash_password(password),
                is_active=True,
            )
            session.add(existing)
            session.commit()
            print(f"provisioned_local_owner:{email}")
            return

        existing.full_name = full_name
        existing.role = Role.PORTFOLIO_DIRECTOR
        existing.is_active = True
        existing.password_hash = hash_password(password)
        session.commit()
        print(f"updated_local_owner:{email}")


if __name__ == "__main__":
    main()
