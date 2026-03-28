from __future__ import annotations

import os
from dataclasses import dataclass

from sqlalchemy import select

from app.auth.firebase_admin import FirebaseAdminConfigurationError, get_firebase_admin_app
from app.core.config import get_settings
from app.db.session import get_session_factory
from app.models.domain import User


@dataclass(frozen=True)
class LaunchAccount:
    role: str
    email: str
    display_name: str
    password_env: str


def sync_launch_accounts() -> int:
    settings = get_settings()
    try:
        get_firebase_admin_app()
    except FirebaseAdminConfigurationError as exc:
        print(f"[auth] Firebase Admin is not configured: {exc}")
        return 1

    from firebase_admin import auth as firebase_auth

    session_factory = get_session_factory(settings.database_url)
    db = session_factory()
    exit_code = 0

    accounts = [
        LaunchAccount("owner", settings.seed_owner_email, "VOIS Owner", "FIREBASE_OWNER_PASSWORD"),
        LaunchAccount("manager", settings.seed_manager_email, "VOIS Manager", "FIREBASE_MANAGER_PASSWORD"),
        LaunchAccount("barista", settings.seed_barista_email, "VOIS Barista", "FIREBASE_BARISTA_PASSWORD"),
        LaunchAccount("developer", settings.seed_developer_email, "VOIS Developer", "FIREBASE_DEVELOPER_PASSWORD"),
    ]

    try:
        for account in accounts:
            claims = {settings.firebase_role_claim_key: account.role}
            password = os.getenv(account.password_env)
            created = False

            try:
                user_record = firebase_auth.get_user_by_email(account.email)
            except firebase_auth.UserNotFoundError:
                if not password:
                    print(
                        f"[auth] Missing Firebase user {account.email}. "
                        f"Set {account.password_env} to create this account automatically."
                    )
                    exit_code = 1
                    continue
                user_record = firebase_auth.create_user(
                    email=account.email,
                    password=password,
                    display_name=account.display_name,
                    email_verified=True,
                    disabled=False,
                )
                created = True

            firebase_auth.set_custom_user_claims(user_record.uid, claims)

            internal_user = db.scalar(select(User).where(User.email == account.email))
            if internal_user is not None and internal_user.firebase_uid != user_record.uid:
                internal_user.firebase_uid = user_record.uid
                db.flush()

            action = "created" if created else "verified"
            print(
                f"[auth] {action} Firebase account {account.email} "
                f"-> role={account.role} uid={user_record.uid}"
            )
    finally:
        db.commit()
        db.close()

    return exit_code


def main() -> None:
    raise SystemExit(sync_launch_accounts())


if __name__ == "__main__":
    main()
