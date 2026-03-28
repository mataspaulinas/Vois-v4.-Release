from __future__ import annotations

from app.db.session import get_session_factory
from app.services.bootstrap import seed_dev_workspace


def main() -> None:
    """Seed a developer-only demo workspace for local testing.

    This is NOT part of normal boot. Normal runtime boots empty-by-default.
    """
    from app.core.config import get_settings

    settings = get_settings()
    session_factory = get_session_factory(settings.database_url)
    with session_factory() as session:
        seed_dev_workspace(session)


if __name__ == "__main__":
    main()
