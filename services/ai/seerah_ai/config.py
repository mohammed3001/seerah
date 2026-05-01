"""Runtime configuration loaded from environment variables."""

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """AI service settings."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

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


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
