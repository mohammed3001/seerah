"""Regression tests for production-mode env validation in config.Settings."""

from __future__ import annotations

import pytest

from seerah_pdf.config import Settings

# Every env-var alias the PDF service config knows about. The autouse
# fixture below clears each one so a host CI machine that already exports
# (say) RENDER_INTERNAL_TOKEN can't make
# `test_production_mode_raises_on_missing_required` pass for the wrong
# reason. pydantic-settings 2.x's `model_validate` still pulls from
# os.environ + the .env file regardless of init kwargs, so the only way
# to get a truly hermetic Settings is to wipe the environment for the
# test process.
_PDF_ENV_ALIASES: tuple[str, ...] = (
    "ENVIRONMENT",
    "NEXT_PUBLIC_APP_URL",
    "RENDER_INTERNAL_TOKEN",
    "PDF_SERVICE_INTERNAL_TOKEN",
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SENTRY_DSN",
    "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN",
    "EXPORT_LIMIT_FREE_PER_DAY",
    "EXPORT_LIMIT_PRIME_PER_DAY",
    "PDF_RENDER_ALLOWED_EXTRA_HOSTS",
    "RENDER_VIEWPORT_WIDTH",
    "RENDER_VIEWPORT_HEIGHT",
    "RENDER_TIMEOUT_MS",
)


@pytest.fixture(autouse=True)
def _isolate_env(monkeypatch: pytest.MonkeyPatch) -> None:
    for name in _PDF_ENV_ALIASES:
        monkeypatch.delenv(name, raising=False)


def _settings(**overrides: str) -> Settings:
    """Build Settings ignoring host env + .env file so the test is hermetic.

    Passes `_env_file=None` to skip on-disk .env discovery, and the
    autouse fixture above clears every relevant env var. Together they
    guarantee the only inputs to Settings are the kwargs the test
    explicitly passes.
    """
    return Settings(_env_file=None, **overrides)  # type: ignore[call-arg]


def test_dev_mode_allows_empty_required_fields() -> None:
    settings = _settings(ENVIRONMENT="development")
    settings.assert_runtime_ready()
    assert settings.is_production() is False


def test_production_mode_raises_on_missing_required() -> None:
    settings = _settings(ENVIRONMENT="production")
    with pytest.raises(RuntimeError) as excinfo:
        settings.assert_runtime_ready()
    msg = str(excinfo.value)
    assert "PDF_SERVICE_INTERNAL_TOKEN" in msg
    assert "RENDER_INTERNAL_TOKEN" in msg
    assert "NEXT_PUBLIC_SUPABASE_URL" in msg
    assert "SUPABASE_SERVICE_ROLE_KEY" in msg


def test_production_mode_passes_when_all_present() -> None:
    settings = _settings(
        ENVIRONMENT="production",
        PDF_SERVICE_INTERNAL_TOKEN="psit",
        RENDER_INTERNAL_TOKEN="rit",
        NEXT_PUBLIC_SUPABASE_URL="https://example.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY="srk",
    )
    settings.assert_runtime_ready()
    assert settings.missing_required() == []
