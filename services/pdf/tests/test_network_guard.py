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
