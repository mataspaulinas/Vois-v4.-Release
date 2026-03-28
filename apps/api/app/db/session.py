from functools import lru_cache
from typing import Generator

from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import get_settings


class Base(DeclarativeBase):
    pass


@lru_cache
def get_engine(database_url: str | None = None):
    url = database_url or get_settings().database_url
    connect_args = {"check_same_thread": False} if url.startswith("sqlite") else {}
    return create_engine(url, future=True, connect_args=connect_args)


@lru_cache
def get_session_factory(database_url: str | None = None):
    return sessionmaker(bind=get_engine(database_url), autoflush=False, autocommit=False, expire_on_commit=False)


def init_db(database_url: str | None = None) -> None:
    from app.models import domain  # noqa: F401
    from app.services import notifications  # noqa: F401 — registers PushSubscription table

    Base.metadata.create_all(bind=get_engine(database_url))


def should_auto_create_schema(database_url: str | None = None) -> bool:
    settings = get_settings()
    return settings.auto_create_schema


def schema_is_ready(database_url: str | None = None) -> bool:
    inspector = inspect(get_engine(database_url))
    return inspector.has_table("organizations")


def ensure_schema_ready(database_url: str | None = None) -> None:
    url = database_url or get_settings().database_url
    if should_auto_create_schema(url):
        init_db(url)
        return
    if not schema_is_ready(url):
        raise RuntimeError(
            "Database schema is not initialized. Run `alembic upgrade head` from `apps/api` before starting the API."
        )


def get_db() -> Generator[Session, None, None]:
    session_factory = get_session_factory(get_settings().database_url)
    with session_factory() as session:
        yield session
