from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import get_settings
from app.db.session import ensure_schema_ready, get_session_factory
from app.services.scheduler import BackgroundScheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    ensure_schema_ready(settings.database_url)
    session_factory = get_session_factory(settings.database_url)

    scheduler = None
    if settings.enable_inprocess_scheduler:
        scheduler = BackgroundScheduler(lambda: session_factory())
        await scheduler.start(interval_minutes=30)
    try:
        yield
    finally:
        if scheduler is not None:
            await scheduler.stop()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.app_name, lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(api_router, prefix=settings.api_v1_prefix)
    return app


app = create_app()
