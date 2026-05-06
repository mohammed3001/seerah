"""Tests for `seerah_pdf.config.Settings`.

Currently focused on `render_allowed_extra_hosts()` because the
implementation has historically had a strip-vs-keep mismatch where the
predicate filtered on `s.strip()` but the output kept the unstripped
`s`, causing whitespace-padded entries (`" host2"`) to leak through.
"""

from __future__ import annotations

import pytest

from seerah_pdf.config import Settings


def _make(value: str, monkeypatch: pytest.MonkeyPatch) -> Settings:
    """Construct a Settings instance with `pdf_render_allowed_extra_hosts`
    overridden via its env alias, leaving every other field at default.
    Direct constructor kwargs do not work because the field is declared
    with `alias=`, which pydantic-settings requires to be matched by the
    env name (or populated explicitly via `populate_by_name`)."""
    monkeypatch.setenv("PDF_RENDER_ALLOWED_EXTRA_HOSTS", value)
    return Settings()


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("", []),
        ("host1", ["host1"]),
        ("host1,host2", ["host1", "host2"]),
        # The bug: input "host1, host2" used to return ["host1", " host2"].
        # The fix strips each entry before yielding it.
        ("host1, host2", ["host1", "host2"]),
        ("  spaced  ,  also  ", ["spaced", "also"]),
        # Pure-whitespace entries are dropped (predicate already handled
        # this; we re-assert to lock the behavior).
        ("host1, ,host2", ["host1", "host2"]),
        # A trailing comma is harmless.
        ("host1,", ["host1"]),
    ],
)
def test_render_allowed_extra_hosts_strips_each_entry(
    raw: str, expected: list[str], monkeypatch: pytest.MonkeyPatch
) -> None:
    settings = _make(raw, monkeypatch)
    assert settings.render_allowed_extra_hosts() == expected


def test_render_allowed_extra_hosts_preserves_dot_prefix(monkeypatch: pytest.MonkeyPatch) -> None:
    # The leading-dot suffix syntax (`.cloudfront.net`) must survive the
    # strip.  This is the operator's primary way to allow-list a CDN
    # without enumerating every subdomain.
    settings = _make(" .cloudfront.net , fonts.googleapis.com ", monkeypatch)
    assert settings.render_allowed_extra_hosts() == [".cloudfront.net", "fonts.googleapis.com"]
