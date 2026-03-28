from fastapi import APIRouter
from sqlalchemy import text

from app.auth.firebase_admin import firebase_admin_ready
from app.core.config import get_settings
from app.db.session import get_session_factory, schema_is_ready


router = APIRouter()


@router.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/health/ready")
def readiness_check() -> dict[str, object]:
    settings = get_settings()
    db_session = get_session_factory(settings.database_url)()
    db_status = "ok"
    try:
        db_session.execute(text("SELECT 1"))
    except Exception:
        db_status = "error"
    finally:
        db_session.close()

    upload_root_ready = settings.local_upload_root.exists() or settings.upload_backend != "local_disk"
    schema_ready = schema_is_ready(settings.database_url)
    firebase_ready, firebase_missing = firebase_admin_ready()
    auth_ready = settings.auth_provider != "firebase" or firebase_ready
    status = "ok" if db_status == "ok" and schema_ready and upload_root_ready and auth_ready else "degraded"
    return {
        "status": status,
        "checks": {
            "database": db_status,
            "schema": "ok" if schema_ready else "missing",
            "upload_root": "ok" if upload_root_ready else "missing",
            "scheduler": "enabled" if settings.enable_inprocess_scheduler else "disabled",
            "auth": "ok" if auth_ready else "missing",
        },
        "auth": {
            "provider": settings.auth_provider,
            "firebase_project_id": settings.firebase_project_id,
            "missing_configuration": firebase_missing if settings.auth_provider == "firebase" else [],
        },
    }
