from datetime import datetime

from pydantic import BaseModel, Field
from app.schemas.domain import OwnerSetupStateRead

class AuthLoginRequest(BaseModel):
    email: str = Field(min_length=3)
    password: str = Field(min_length=8)


class AuthUserRead(BaseModel):
    id: str
    organization_id: str | None = None
    venue_id: str | None = None
    firebase_uid: str | None = None
    email: str
    full_name: str
    role: str
    allowed_shells: list[str] = Field(default_factory=list)
    capabilities: list[str] = Field(default_factory=list)


class AuthSessionInfo(BaseModel):
    id: str | None = None
    expires_at: datetime | None = None
    authentication_mode: str


class AuthManagedSessionRead(BaseModel):
    id: str
    user_id: str
    user_email: str
    user_full_name: str
    organization_id: str | None = None
    issued_by: str | None = None
    issued_by_name: str | None = None
    expires_at: datetime
    revoked_at: datetime | None = None
    last_seen_at: datetime | None = None
    created_at: datetime
    is_current: bool
    is_active: bool


class AuthSessionInventoryRead(BaseModel):
    scope: str
    current_session_id: str | None = None
    sessions: list[AuthManagedSessionRead]


class AuthSessionRevokeResponse(BaseModel):
    revoked: bool
    session_id: str
    cleared_current_cookie: bool


class AuthSecurityPostureRead(BaseModel):
    auth_provider: str
    authentication_mode: str
    auth_ready: bool
    auth_missing_configuration: list[str] = Field(default_factory=list)
    firebase_project_id: str | None = None
    firebase_client_configured: bool
    firebase_admin_configured: bool
    firebase_client_missing_configuration: list[str] = Field(default_factory=list)
    firebase_admin_missing_configuration: list[str] = Field(default_factory=list)
    local_password_auth_enabled: bool
    bootstrap_fallback_enabled: bool
    session_cookie_name: str
    session_cookie_secure: bool
    session_cookie_samesite: str
    session_cookie_domain: str | None = None
    session_cookie_path: str
    session_ttl_hours: int
    legacy_header_auth_enabled: bool
    ai_provider: str
    ai_model: str
    ai_mode: str
    ai_configured: bool
    ai_provider_effective: str
    ai_model_effective: str
    ai_live_activation_ready: bool
    ai_live_provider_supported: bool
    ai_mock_fallback_enabled: bool
    ai_mock_fallback_active: bool
    ai_secret_backend: str
    ai_runtime_note: str
    ai_missing_configuration: list[str]
    upload_backend: str
    default_data_residency: str


class AuthSessionRead(BaseModel):
    user: AuthUserRead
    session: AuthSessionInfo
    setup_state: OwnerSetupStateRead | None = None
    requires_owner_claim: bool = False
    organization_claimed: bool = False
    session_token: str | None = None


class AuthLogoutResponse(BaseModel):
    revoked: bool
