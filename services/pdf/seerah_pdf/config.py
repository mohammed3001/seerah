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

    # Web app integration
    web_app_url: str = Field(default="http://localhost:3000", alias="NEXT_PUBLIC_APP_URL")
    render_internal_token: str = Field(default="", alias="RENDER_INTERNAL_TOKEN")

    # Authn for the export service itself: callers (the Next.js app) must
    # send this in `Authorization: Bearer <token>` so unauthenticated traffic
    # cannot trigger Playwright renders against the public render route.
    pdf_service_internal_token: str = Field(default="", alias="PDF_SERVICE_INTERNAL_TOKEN")

    # Supabase (service role)
    supabase_url: str = Field(default="", alias="NEXT_PUBLIC_SUPABASE_URL")
    supabase_service_role_key: str = Field(default="", alias="SUPABASE_SERVICE_ROLE_KEY")

    # Sentry
    sentry_dsn: str = Field(default="", alias="SENTRY_DSN")

    # Rate limiting (Upstash REST)
    upstash_redis_url: str = Field(default="", alias="UPSTASH_REDIS_REST_URL")
    upstash_redis_token: str = Field(default="", alias="UPSTASH_REDIS_REST_TOKEN")
    rate_limit_free_per_day: int = Field(default=5, alias="EXPORT_LIMIT_FREE_PER_DAY")
    rate_limit_prime_per_day: int = Field(default=10_000, alias="EXPORT_LIMIT_PRIME_PER_DAY")

    # Render configuration
    render_timeout_ms: int = Field(default=20_000, alias="RENDER_TIMEOUT_MS")
    render_viewport_width: int = Field(default=816, alias="RENDER_VIEWPORT_WIDTH")
    render_viewport_height: int = Field(default=1056, alias="RENDER_VIEWPORT_HEIGHT")

    # SSRF guard for the headless browser.  Comma-separated list of extra
    # hostnames the renderer is allowed to fetch (the web app's own host
    # and the Supabase public storage host are auto-included).  Anything
    # not on the list is blocked at the request layer; see network_guard.py
    # for the full check (also denies private / loopback / link-local IPs
    # even for allow-listed hostnames, to defeat DNS rebinding).
    pdf_render_allowed_extra_hosts: str = Field(
        default="",
        alias="PDF_RENDER_ALLOWED_EXTRA_HOSTS",
    )

    def render_allowed_extra_hosts(self) -> list[str]:
        return [s for s in (self.pdf_render_allowed_extra_hosts or "").split(",") if s.strip()]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
