import importlib.util
import sys
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


ROOT_DIR = Path(__file__).resolve().parents[4]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))


def _openai_sdk_installed() -> bool:
    return importlib.util.find_spec("openai") is not None


def _anthropic_sdk_installed() -> bool:
    return importlib.util.find_spec("anthropic") is not None


@dataclass(frozen=True)
class AIRuntimePolicy:
    requested_provider: str
    requested_model: str
    effective_provider: str
    effective_model: str
    mode: str
    configured: bool
    live_activation_ready: bool
    live_provider_supported: bool
    mock_fallback_enabled: bool
    mock_fallback_active: bool
    missing_configuration: list[str]
    secret_backend: str
    note: str


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "OIS API"
    api_v1_prefix: str = "/api/v1"
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/ois"
    auto_create_schema: bool = False
    ontology_root: Path = Field(default_factory=lambda: ROOT_DIR / "ontology")
    ontology_packs_root: Path = Field(default_factory=lambda: ROOT_DIR / "ontology_packs")
    ontology_shared_root: Path = Field(default_factory=lambda: ROOT_DIR / "ontology_shared")
    local_upload_root: Path = Field(default_factory=lambda: ROOT_DIR / ".codex-runtime" / "uploads")
    default_data_residency: str = "eu-central"
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:5174"]
    upload_backend: str = "local_disk"
    ai_provider: str = "openai"
    ai_model: str = "claude-sonnet-4-20250514"
    ai_mock_model: str = "vois-mock-1"
    ai_api_key: str | None = None
    ai_api_base: str | None = None
    ai_mock_fallback_enabled: bool = False
    ai_secret_backend: str = "environment"
    auth_provider: str = "firebase"
    allow_local_password_auth: bool = False
    session_cookie_name: str = "ois_session"
    session_cookie_secure: bool = False
    session_cookie_samesite: str = "lax"
    session_cookie_domain: str | None = None
    session_cookie_path: str = "/"
    session_ttl_hours: int = 24 * 30
    allow_legacy_header_auth: bool = False
    allow_bootstrap_fallback: bool = False
    enable_inprocess_scheduler: bool = False
    auth_auto_provision_users: bool = False
    auth_default_organization_slug: str | None = None
    auth_default_manager_venue_slug: str | None = None
    auth_default_barista_venue_slug: str | None = None
    seed_owner_email: str = "owner@ois-demo.local"
    seed_manager_email: str = "manager@ois-demo.local"
    seed_barista_email: str = "barista@ois-demo.local"
    seed_developer_email: str = "developer@ois-demo.local"
    firebase_project_id: str | None = None
    firebase_web_api_key: str | None = None
    firebase_auth_domain: str | None = None
    firebase_storage_bucket: str | None = None
    firebase_messaging_sender_id: str | None = None
    firebase_app_id: str | None = None
    firebase_measurement_id: str | None = None
    firebase_admin_credentials_path: Path | None = None
    firebase_admin_credentials_json: str | None = None
    firebase_role_claim_key: str = "role"

    def ai_provider_readiness(self) -> tuple[str, bool, list[str]]:
        policy = self.ai_runtime_policy()
        return (policy.mode, policy.configured, policy.missing_configuration)

    def firebase_web_config(self) -> dict[str, str]:
        values = {
            "apiKey": self.firebase_web_api_key,
            "authDomain": self.firebase_auth_domain,
            "projectId": self.firebase_project_id,
            "storageBucket": self.firebase_storage_bucket,
            "messagingSenderId": self.firebase_messaging_sender_id,
            "appId": self.firebase_app_id,
        }
        if self.firebase_measurement_id:
            values["measurementId"] = self.firebase_measurement_id
        return {key: value for key, value in values.items() if value}

    def firebase_client_missing_configuration(self) -> list[str]:
        missing: list[str] = []
        if not self.firebase_web_api_key:
            missing.append("FIREBASE_WEB_API_KEY")
        if not self.firebase_auth_domain:
            missing.append("FIREBASE_AUTH_DOMAIN")
        if not self.firebase_project_id:
            missing.append("FIREBASE_PROJECT_ID")
        if not self.firebase_storage_bucket:
            missing.append("FIREBASE_STORAGE_BUCKET")
        if not self.firebase_messaging_sender_id:
            missing.append("FIREBASE_MESSAGING_SENDER_ID")
        if not self.firebase_app_id:
            missing.append("FIREBASE_APP_ID")
        return missing

    def firebase_admin_missing_configuration(self) -> list[str]:
        missing: list[str] = []
        if not self.firebase_project_id:
            missing.append("FIREBASE_PROJECT_ID")
        if not self.firebase_admin_credentials_json and not self.firebase_admin_credentials_path:
            missing.append("FIREBASE_ADMIN_CREDENTIALS_JSON|FIREBASE_ADMIN_CREDENTIALS_PATH")
        return missing

    def ai_runtime_policy(self) -> AIRuntimePolicy:
        requested_provider = (self.ai_provider or "mock").strip().lower()
        requested_model = self.ai_model
        secret_backend = self.ai_secret_backend

        if requested_provider == "mock":
            return AIRuntimePolicy(
                requested_provider=requested_provider,
                requested_model=self.ai_mock_model,
                effective_provider="mock",
                effective_model=self.ai_mock_model,
                mode="mock",
                configured=True,
                live_activation_ready=False,
                live_provider_supported=False,
                mock_fallback_enabled=self.ai_mock_fallback_enabled,
                mock_fallback_active=False,
                missing_configuration=[],
                secret_backend=secret_backend,
                note="Mock runtime is explicitly requested.",
            )

        missing: list[str] = []
        if not self.ai_api_key:
            missing.append("AI_API_KEY")

        live_provider_supported = False
        if requested_provider == "openai":
            live_provider_supported = _openai_sdk_installed()
            if not live_provider_supported:
                missing.append("OPENAI_SDK")
        elif requested_provider == "anthropic":
            live_provider_supported = _anthropic_sdk_installed()
            if not live_provider_supported:
                missing.append("ANTHROPIC_SDK")
        live_activation_ready = len(missing) == 0

        if live_provider_supported and live_activation_ready:
            return AIRuntimePolicy(
                requested_provider=requested_provider,
                requested_model=requested_model,
                effective_provider=requested_provider,
                effective_model=requested_model,
                mode="live",
                configured=True,
                live_activation_ready=True,
                live_provider_supported=True,
                mock_fallback_enabled=self.ai_mock_fallback_enabled,
                mock_fallback_active=False,
                missing_configuration=[],
                secret_backend=secret_backend,
                note="Live provider is configured and active.",
            )

        if self.ai_mock_fallback_enabled:
            if live_activation_ready:
                note = (
                    f"Requested provider '{requested_provider}' is configured but not implemented yet, "
                    "so the runtime is using the governed mock fallback."
                )
            else:
                note = (
                    f"Requested provider '{requested_provider}' is missing {', '.join(missing)}, "
                    "so the runtime is using the governed mock fallback."
                )
            return AIRuntimePolicy(
                requested_provider=requested_provider,
                requested_model=requested_model,
                effective_provider="mock",
                effective_model=self.ai_mock_model,
                mode="mock_fallback",
                configured=False,
                live_activation_ready=live_activation_ready,
                live_provider_supported=False,
                mock_fallback_enabled=True,
                mock_fallback_active=True,
                missing_configuration=missing,
                secret_backend=secret_backend,
                note=note,
            )

        if live_activation_ready:
            note = (
                f"Requested provider '{requested_provider}' is configured, but no live provider implementation "
                "is enabled and mock fallback is disabled."
            )
        else:
            note = (
                f"Requested provider '{requested_provider}' is missing {', '.join(missing)}, "
                "and mock fallback is disabled."
            )
        return AIRuntimePolicy(
            requested_provider=requested_provider,
            requested_model=requested_model,
            effective_provider="blocked",
            effective_model=requested_model,
            mode="blocked",
            configured=False,
            live_activation_ready=live_activation_ready,
            live_provider_supported=False,
            mock_fallback_enabled=False,
            mock_fallback_active=False,
            missing_configuration=missing,
            secret_backend=secret_backend,
            note=note,
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
