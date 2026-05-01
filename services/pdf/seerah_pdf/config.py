"""Runtime configuration for the PDF service."""

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """PDF service settings."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    supabase_url: str = Field(default="", alias="NEXT_PUBLIC_SUPABASE_URL")
    supabase_service_role_key: str = Field(default="", alias="SUPABASE_SERVICE_ROLE_KEY")
    sentry_dsn: str = Field(default="", alias="SENTRY_DSN")
    internal_token: str = Field(default="", alias="PDF_SERVICE_INTERNAL_TOKEN")
    web_app_url: str = Field(default="http://localhost:3000", alias="NEXT_PUBLIC_APP_URL")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
