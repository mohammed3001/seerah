"""Regression tests for production-mode env validation in config.Settings."""

from __future__ import annotations

import pytest

from seerah_pdf.config import Settings


def _settings(**overrides: str) -> Settings:
    """Build Settings ignoring the host environment so the test is hermetic."""
    return Settings.model_validate(overrides)


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
