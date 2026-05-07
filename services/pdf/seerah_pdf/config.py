"""Runtime configuration for the PDF service."""

from functools import lru_cache
from typing import ClassVar

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """PDF service settings."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # `production` enables strict startup validation (see
    # `assert_runtime_ready`). Anything else (development / test / ci) is
    # permissive so unit tests can construct the app without real creds.
    environment: str = Field(default="development", alias="ENVIRONMENT")

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
        # Strip each entry before returning so callers see clean hostnames.
        # The split-then-filter pattern previously left whitespace on the
        # entries (e.g. " host2" for input "host1, host2"), which the SSRF
        # guard happened to tolerate via an internal strip but any other
        # consumer (logging, display, alternate matching path) would not.
        raw = self.pdf_render_allowed_extra_hosts or ""
        return [s.strip() for s in raw.split(",") if s.strip()]

    # Fields whose absence makes the service useless in production.
    REQUIRED_IN_PRODUCTION: ClassVar[tuple[tuple[str, str], ...]] = (
        ("PDF_SERVICE_INTERNAL_TOKEN", "pdf_service_internal_token"),
        ("RENDER_INTERNAL_TOKEN", "render_internal_token"),
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
        instead of returning 502 / silently allowing unauthenticated
        renders. Non-production modes still boot but log warnings.
        """
        if not self.is_production():
            return
        missing = self.missing_required()
        if missing:
            raise RuntimeError(
                "PDF service is misconfigured for production: required "
                "environment variables are empty: " + ", ".join(missing)
            )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
