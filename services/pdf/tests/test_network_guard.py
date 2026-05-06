"""Unit tests for the SSRF guard.

The guard has two gates:
  1. scheme + hostname allow-list
  2. DNS-resolved address must be public

We exercise both, plus the data:-uri short-circuit and the helper that
builds the default allow-list from settings.
"""

from __future__ import annotations

import ipaddress
from collections.abc import Iterable
from unittest.mock import patch

import pytest

from seerah_pdf.network_guard import (
    default_allowed_hosts,
    default_trusted_hosts,
    should_allow,
)

# ---------- helpers ---------------------------------------------------------


def _stub_resolve(answers: dict[str, list[str]]):
    """Return a `getaddrinfo` stub that yields the given IPs for each
    hostname (and `gaierror` for everything else)."""
    import socket as _socket

    def _fn(host: str, _port=None, *_args, **_kwargs):
        if host not in answers:
            raise _socket.gaierror(_socket.EAI_NONAME, "Name or service not known")
        # getaddrinfo's tuple shape: (family, type, proto, canonname, sockaddr)
        out: list[tuple] = []
        for ip in answers[host]:
            try:
                family = _socket.AF_INET6 if ":" in ip else _socket.AF_INET
            except Exception:
                continue
            out.append((family, _socket.SOCK_STREAM, 0, "", (ip, 0)))
        return out

    return _fn


def _allow(
    url: str,
    *,
    hosts: Iterable[str],
    resolve: dict[str, list[str]] | None = None,
    skip_address_check: bool = False,
):
    if skip_address_check or resolve is None:
        return should_allow(
            url,
            allowed_hosts=list(hosts),
            skip_address_check=skip_address_check,
        )
    with patch("seerah_pdf.network_guard.socket.getaddrinfo", _stub_resolve(resolve)):
        return should_allow(url, allowed_hosts=list(hosts))


# ---------- scheme gate -----------------------------------------------------


def test_data_uri_is_inert_and_always_allowed() -> None:
    decision = _allow("data:image/png;base64,AAAA", hosts=[])
    assert decision.allowed is True
    assert "inert" in decision.reason


def test_unknown_scheme_is_blocked() -> None:
    for url in (
        "file:///etc/passwd",
        "chrome://settings",
        "javascript:alert(1)",
        "blob:https://example.com/abc",
    ):
        decision = _allow(url, hosts=["example.com"], skip_address_check=True)
        assert decision.allowed is False, url
        assert "scheme" in decision.reason


def test_empty_url_is_blocked() -> None:
    decision = _allow("", hosts=["example.com"], skip_address_check=True)
    assert decision.allowed is False


# ---------- hostname allow-list --------------------------------------------


def test_exact_host_match_is_allowed() -> None:
    decision = _allow(
        "https://cdn.example.com/font.woff2",
        hosts=["cdn.example.com"],
        skip_address_check=True,
    )
    assert decision.allowed is True


def test_subdomain_via_dot_prefix_is_allowed() -> None:
    decision = _allow(
        "https://foo.cdn.example.com/x.css",
        hosts=[".cdn.example.com"],
        skip_address_check=True,
    )
    assert decision.allowed is True


def test_subdomain_via_bare_suffix_is_allowed() -> None:
    decision = _allow(
        "https://foo.example.com/x.css",
        hosts=["example.com"],
        skip_address_check=True,
    )
    assert decision.allowed is True


def test_unknown_host_is_blocked() -> None:
    decision = _allow(
        "https://attacker.test/x",
        hosts=["example.com"],
        skip_address_check=True,
    )
    assert decision.allowed is False
    assert "allow-list" in decision.reason


def test_host_match_is_case_insensitive() -> None:
    decision = _allow(
        "https://CDN.EXAMPLE.com/x",
        hosts=["cdn.example.com"],
        skip_address_check=True,
    )
    assert decision.allowed is True


def test_trailing_dot_is_normalized() -> None:
    decision = _allow(
        "https://cdn.example.com./x",
        hosts=["cdn.example.com"],
        skip_address_check=True,
    )
    assert decision.allowed is True


# ---------- address-family gate (DNS rebinding defense) -------------------


def test_public_ip_passes() -> None:
    decision = _allow(
        "https://cdn.example.com/x",
        hosts=["cdn.example.com"],
        resolve={"cdn.example.com": ["104.16.1.1"]},
    )
    assert decision.allowed is True


@pytest.mark.parametrize(
    "address,family",
    [
        ("127.0.0.1", "loopback"),
        ("169.254.169.254", "link_local"),  # AWS metadata
        ("10.0.0.5", "private (RFC1918)"),
        ("172.16.0.5", "private (RFC1918)"),
        ("192.168.1.5", "private (RFC1918)"),
        ("0.0.0.0", "unspecified"),
        ("224.0.0.1", "multicast"),
        ("::1", "loopback v6"),
        ("fe80::1", "link_local v6"),
        ("fc00::1", "private v6"),
    ],
)
def test_unsafe_address_blocks_even_for_allowlisted_host(address: str, family: str) -> None:
    decision = _allow(
        "https://cdn.example.com/x",
        hosts=["cdn.example.com"],
        resolve={"cdn.example.com": [address]},
    )
    assert decision.allowed is False, f"{family} ({address}) should be blocked"
    assert "non-public address" in decision.reason


def test_mixed_resolution_blocks_if_any_unsafe() -> None:
    # An attacker who can poison DNS for one of two records still gets
    # blocked — we conservatively reject the whole hostname.
    decision = _allow(
        "https://cdn.example.com/x",
        hosts=["cdn.example.com"],
        resolve={"cdn.example.com": ["104.16.1.1", "169.254.169.254"]},
    )
    assert decision.allowed is False


def test_unresolvable_host_is_blocked() -> None:
    decision = _allow(
        "https://cdn.example.com/x",
        hosts=["cdn.example.com"],
        resolve={},
    )
    assert decision.allowed is False
    assert "did not resolve" in decision.reason


# ---------- default_allowed_hosts builder ----------------------------------


def test_default_allowed_hosts_includes_web_and_supabase() -> None:
    out = default_allowed_hosts(
        web_app_url="https://app.example.com",
        supabase_url="https://abc.supabase.co",
    )
    assert "app.example.com" in out
    assert "abc.supabase.co" in out


def test_default_allowed_hosts_appends_extras() -> None:
    out = default_allowed_hosts(
        web_app_url="https://app.example.com",
        supabase_url="https://abc.supabase.co",
        extras=[".cloudfront.net", "fonts.googleapis.com"],
    )
    assert ".cloudfront.net" in out
    assert "fonts.googleapis.com" in out


def test_default_allowed_hosts_skips_empty_settings() -> None:
    out = default_allowed_hosts(web_app_url="", supabase_url="")
    assert out == []


def test_default_allowed_hosts_ignores_unparseable_url() -> None:
    out = default_allowed_hosts(
        web_app_url="not a url",
        supabase_url="https://abc.supabase.co",
    )
    # Only the parseable one should land in the allow-list.
    assert "abc.supabase.co" in out


# ---------- sanity: canonical attacker payloads ----------------------------


def test_aws_imds_host_is_blocked_even_if_allowlisted() -> None:
    # Worst-case: an operator accidentally allow-lists 169.254.169.254
    # by hostname alone.  The address-family gate still catches it.
    decision = _allow(
        "http://169.254.169.254/latest/meta-data/iam/security-credentials/",
        hosts=["169.254.169.254"],
        resolve={"169.254.169.254": ["169.254.169.254"]},
    )
    assert decision.allowed is False


def test_attacker_dns_rebind_is_blocked() -> None:
    # Hostname is on the operator's allow-list (looks legitimate) but its
    # A record is the AWS metadata IP.  Real-world DNS rebinding attack.
    decision = _allow(
        "https://cdn-good-looking.example.com/x",
        hosts=["cdn-good-looking.example.com"],
        resolve={"cdn-good-looking.example.com": ["169.254.169.254"]},
    )
    assert decision.allowed is False


def test_ip_address_helper_classifications() -> None:
    # Sanity check that the classifications we rely on actually behave
    # as documented; if Python ever changes them this test catches it.
    assert ipaddress.ip_address("10.0.0.1").is_private
    assert ipaddress.ip_address("169.254.169.254").is_link_local
    assert ipaddress.ip_address("127.0.0.1").is_loopback
    assert ipaddress.ip_address("8.8.8.8").is_global


# ---------- trusted_hosts (renderer's primary targets) --------------------


def test_trusted_host_bypasses_address_check_for_loopback() -> None:
    # The renderer must be able to navigate to its configured web app URL
    # even when that URL resolves to loopback (dev mode where the web app
    # is `http://localhost:3000`).  Without the bypass, page.goto fails
    # before the page ever renders.
    with patch(
        "seerah_pdf.network_guard.socket.getaddrinfo",
        _stub_resolve({"localhost": ["127.0.0.1", "::1"]}),
    ):
        decision = should_allow(
            "http://localhost:3000/render/abc",
            allowed_hosts=["localhost"],
            trusted_hosts=["localhost"],
        )
    assert decision.allowed is True
    assert "trusted" in decision.reason


def test_trusted_host_bypasses_address_check_for_private_ip() -> None:
    # Same scenario for in-cluster service-mesh deployments where the web
    # app's hostname resolves to an RFC1918 private IP.
    with patch(
        "seerah_pdf.network_guard.socket.getaddrinfo",
        _stub_resolve({"web.internal": ["10.0.1.42"]}),
    ):
        decision = should_allow(
            "https://web.internal/render/xyz",
            allowed_hosts=["web.internal"],
            trusted_hosts=["web.internal"],
        )
    assert decision.allowed is True


def test_extras_still_get_address_check() -> None:
    # Operator-curated CDN entries on the wide allow-list are NOT trusted
    # in the strict sense — they still get the rebinding check.  An
    # attacker who registers a CDN-looking hostname pointing at IMDS
    # cannot bypass the check just because they ended up in
    # PDF_RENDER_ALLOWED_EXTRA_HOSTS.
    with patch(
        "seerah_pdf.network_guard.socket.getaddrinfo",
        _stub_resolve({"cdn-attacker.example.com": ["169.254.169.254"]}),
    ):
        decision = should_allow(
            "https://cdn-attacker.example.com/x.js",
            allowed_hosts=["localhost", "cdn-attacker.example.com"],
            trusted_hosts=["localhost"],
        )
    assert decision.allowed is False
    assert "non-public" in decision.reason


def test_trusted_host_must_also_be_on_allow_list() -> None:
    # Defense in depth: even a trusted host has to pass the allow-list
    # gate first.  This is what we'd expect from default_allowed_hosts
    # (which is a superset of default_trusted_hosts), but we assert it
    # here so a future refactor doesn't silently drop the precondition.
    decision = should_allow(
        "https://random.example/x",
        allowed_hosts=["localhost"],
        trusted_hosts=["random.example"],
        skip_address_check=True,
    )
    assert decision.allowed is False


def test_default_trusted_hosts_returns_only_primary_targets() -> None:
    out = default_trusted_hosts(
        web_app_url="http://localhost:3000",
        supabase_url="https://abc.supabase.co",
    )
    assert out == ["localhost", "abc.supabase.co"]


def test_default_trusted_hosts_excludes_extras() -> None:
    # `default_trusted_hosts` doesn't take an extras argument by design.
    # Confirm via shape rather than signature: the trusted set is always
    # a strict subset of the allow-list.
    allowed = default_allowed_hosts(
        web_app_url="http://localhost:3000",
        supabase_url="https://abc.supabase.co",
        extras=[".cloudfront.net", "fonts.googleapis.com"],
    )
    trusted = default_trusted_hosts(
        web_app_url="http://localhost:3000",
        supabase_url="https://abc.supabase.co",
    )
    assert ".cloudfront.net" in allowed
    assert ".cloudfront.net" not in trusted
    assert "fonts.googleapis.com" in allowed
    assert "fonts.googleapis.com" not in trusted
