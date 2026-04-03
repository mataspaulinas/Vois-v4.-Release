from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.core.config import get_settings


class FirebaseAdminConfigurationError(RuntimeError):
    pass


def _load_firebase_modules():
    try:
        import firebase_admin
        from firebase_admin import auth, credentials
    except ImportError as exc:
        raise FirebaseAdminConfigurationError(
            "firebase-admin is not installed. Add the backend dependency before enabling Firebase auth."
        ) from exc
    return firebase_admin, auth, credentials


@lru_cache
def get_firebase_app():
    firebase_admin, _, credentials = _load_firebase_modules()
    settings = get_settings()
    missing = settings.firebase_admin_missing_configuration()
    if missing:
        raise FirebaseAdminConfigurationError(
            f"Firebase Admin is not configured. Missing: {', '.join(missing)}"
        )

    app_name = "vois-firebase-auth"
    try:
        return firebase_admin.get_app(app_name)
    except ValueError:
        pass

    credential = _build_credentials(credentials)
    options = {"projectId": settings.firebase_project_id}
    return firebase_admin.initialize_app(credential, options=options, name=app_name)


def get_firebase_admin_app():
    return get_firebase_app()


def get_firebase_auth_module():
    _, auth, _ = _load_firebase_modules()
    get_firebase_app()
    return auth


def verify_id_token(token: str, *, check_revoked: bool = False) -> dict[str, Any]:
    _, auth, _ = _load_firebase_modules()
    return auth.verify_id_token(token, app=get_firebase_app(), check_revoked=check_revoked)


def get_user_by_email(email: str):
    auth = get_firebase_auth_module()
    try:
        return auth.get_user_by_email(email)
    except Exception as exc:  # pragma: no cover - SDK-specific branches
        if exc.__class__.__name__ == "UserNotFoundError":
            return None
        raise


def upsert_email_password_user(*, email: str, display_name: str, password: str):
    auth = get_firebase_auth_module()
    record = get_user_by_email(email)
    if record is None:
        return auth.create_user(
            email=email,
            password=password,
            display_name=display_name,
            email_verified=True,
            disabled=False,
        )
    return auth.update_user(
        record.uid,
        email=email,
        password=password,
        display_name=display_name,
        email_verified=True,
        disabled=False,
    )


def update_user_disabled(uid: str, *, disabled: bool):
    auth = get_firebase_auth_module()
    return auth.update_user(uid, disabled=disabled)


def update_user_password(uid: str, *, password: str):
    auth = get_firebase_auth_module()
    return auth.update_user(uid, password=password)


def generate_password_reset_link(email: str) -> str:
    auth = get_firebase_auth_module()
    return auth.generate_password_reset_link(email)


def set_custom_claims(uid: str, claims: dict[str, Any]) -> None:
    auth = get_firebase_auth_module()
    auth.set_custom_user_claims(uid, claims)


def firebase_admin_ready() -> tuple[bool, list[str]]:
    settings = get_settings()
    missing = settings.firebase_admin_missing_configuration()
    if missing:
        return False, missing
    try:
        get_firebase_app()
    except FirebaseAdminConfigurationError as exc:
        return False, [str(exc)]
    except Exception as exc:  # pragma: no cover - defensive runtime posture
        return False, [str(exc)]
    return True, []


def _build_credentials(credentials_module):
    settings = get_settings()
    if settings.firebase_admin_credentials_json:
        try:
            payload = json.loads(settings.firebase_admin_credentials_json)
        except json.JSONDecodeError as exc:
            raise FirebaseAdminConfigurationError("FIREBASE_ADMIN_CREDENTIALS_JSON is not valid JSON.") from exc
        return credentials_module.Certificate(payload)

    if settings.firebase_admin_credentials_path:
        credential_path = Path(settings.firebase_admin_credentials_path)
        if not credential_path.exists():
            raise FirebaseAdminConfigurationError(
                f"Firebase Admin credentials file was not found at {credential_path}."
            )
        return credentials_module.Certificate(str(credential_path))

    raise FirebaseAdminConfigurationError(
        "Firebase Admin credentials are missing. Set FIREBASE_ADMIN_CREDENTIALS_JSON or FIREBASE_ADMIN_CREDENTIALS_PATH."
    )
