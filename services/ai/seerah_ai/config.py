"""Runtime configuration loaded from environment variables."""

from functools import lru_cache
from typing import ClassVar

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """AI service settings."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # `production` enables strict startup validation (see
    # `assert_runtime_ready`). Anything else (development / test / ci /
    # local) is permissive so unit tests with mocked dependencies can
    # still construct the app without real credentials.
    environment: str = Field(default="development", alias="ENVIRONMENT")

    openai_api_key: str = Field(default="", alias="OPENAI_API_KEY")
    openai_model: str = Field(default="gpt-4o-mini", alias="OPENAI_MODEL")
    openai_vision_model: str = Field(default="gpt-4o-mini", alias="OPENAI_VISION_MODEL")
    openai_request_timeout_s: float = Field(default=60.0, alias="OPENAI_REQUEST_TIMEOUT_S")

    supabase_url: str = Field(default="", alias="NEXT_PUBLIC_SUPABASE_URL")
    supabase_service_role_key: str = Field(default="", alias="SUPABASE_SERVICE_ROLE_KEY")

    upstash_redis_url: str = Field(default="", alias="UPSTASH_REDIS_REST_URL")
    upstash_redis_token: str = Field(default="", alias="UPSTASH_REDIS_REST_TOKEN")

    sentry_dsn: str = Field(default="", alias="SENTRY_DSN")
    internal_token: str = Field(default="", alias="AI_SERVICE_INTERNAL_TOKEN")

    rate_limit_free_per_day: int = Field(default=10, alias="AI_RATE_LIMIT_FREE")
    rate_limit_prime_per_day: int = Field(default=100, alias="AI_RATE_LIMIT_PRIME")

    cors_allow_origins: str = Field(
        default="http://localhost:3000",
        alias="AI_CORS_ALLOW_ORIGINS",
    )

    # Fields whose absence makes the service useless in production. Listed
    # as (env_var_name, attribute_name) so the error message points at the
    # variable the operator actually sets in their environment, not the
    # snake_case attribute.
    REQUIRED_IN_PRODUCTION: ClassVar[tuple[tuple[str, str], ...]] = (
        ("OPENAI_API_KEY", "openai_api_key"),
        ("AI_SERVICE_INTERNAL_TOKEN", "internal_token"),
        ("NEXT_PUBLIC_SUPABASE_URL", "supabase_url"),
        ("SUPABASE_SERVICE_ROLE_KEY", "supabase_service_role_key"),
    )

    def is_production(self) -> bool:
        return self.environment.strip().lower() == "production"

    def missing_required(self) -> list[str]:
        return [
            env_name
            for env_name, attr in self.REQUIRED_IN_PRODUCTION
            if not str(getattr(self, attr) or "").strip()
        ]

    def assert_runtime_ready(self) -> None:
        """Raise if any required env var is empty in production mode.

        Called from `create_app` so the service crashes loudly at boot
        instead of returning 502 on every API call. Non-production modes
        log a warning per missing var (see `main.py`) but do not raise.
        """
        if not self.is_production():
            return
        missing = self.missing_required()
        if missing:
            raise RuntimeError(
                "AI service is misconfigured for production: required "
                "environment variables are empty: " + ", ".join(missing)
            )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
