from __future__ import annotations

from app.db.session import get_session_factory
from app.services.bootstrap import ensure_seed_data


def main() -> None:
    from app.core.config import get_settings

    settings = get_settings()
    session_factory = get_session_factory(settings.database_url)
    with session_factory() as session:
        ensure_seed_data(session)


if __name__ == "__main__":
    main()
