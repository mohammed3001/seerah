"""SSRF defense for the Playwright renderer.

The renderer drives a real headless Chrome at /render/{id}, which produces
HTML that is then loaded by the browser.  Any `<img>` / `<link>` / `<script>`
inside that HTML triggers a network fetch — and because Chrome resolves DNS
and follows redirects on its own, a sufficiently creative attacker can in
principle plant `<img src="http://169.254.169.254/...">` inside resume
content and exfiltrate cloud-metadata service responses to an attacker-
controlled URL.

This module is the request-level allow-list / RFC1918 block that prevents
the above.  It is wired into Playwright via `context.route("**/*", ...)` in
`renderer.py`; everything Chromium tries to fetch passes through
`should_allow()` before the network is touched.

Two layers, both must pass:

1. **Hostname allow-list** — only the configured `allowed_hosts` (the web
   app itself, the Supabase public storage host, plus any operator-added
   entries) and the `data:` scheme can be loaded.  Schemes like `file:`,
   `blob:`, `chrome:`, `chrome-extension:` are rejected outright.

2. **Address-family check** — even for an allow-listed hostname, resolve
   it and refuse if any answer is in a private / loopback / link-local /
   reserved range.  This catches DNS rebinding attacks where an attacker
   registers an allow-listed-looking hostname whose A record points to
   169.254.169.254.

The check is intentionally a *deny-by-default* allow-list, not a deny-list.
Adding a new external dependency to the rendered page (e.g. a new web font
provider) is an explicit operator decision that has to flip a config flag.
"""

from __future__ import annotations

import ipaddress
import logging
import socket
from dataclasses import dataclass
from urllib.parse import urlparse

_logger = logging.getLogger(__name__)

# Schemes Chromium might generate a request for.  Anything not in this set
# is dropped without further inspection.
_ALLOWED_SCHEMES = frozenset({"http", "https", "data"})

# Schemes that are always allowed regardless of host (no network traffic).
_INERT_SCHEMES = frozenset({"data"})


@dataclass(frozen=True)
class GuardDecision:
    """Result of running a candidate URL through `should_allow()`."""

    allowed: bool
    reason: str

    def __bool__(self) -> bool:
        return self.allowed


def _normalize_host(host: str) -> str:
    """Lowercase and strip trailing dot, both of which are valid in DNS but
    annoying for set-membership comparisons."""
    return host.lower().rstrip(".")


def _hostname_matches(hostname: str, allowed: list[str]) -> bool:
    """`allowed` entries can be:
        - exact hostname            ('cdn.example.com')
        - leading-wildcard suffix   ('.example.com', 'example.com' as suffix)
    Comparison is case-insensitive after `_normalize_host`."""
    h = _normalize_host(hostname)
    for entry in allowed:
        e = _normalize_host(entry).lstrip(".")
        if not e:
            continue
        if h == e or h.endswith("." + e):
            return True
    return False


def _resolve_addresses(hostname: str) -> list[ipaddress.IPv4Address | ipaddress.IPv6Address]:
    """getaddrinfo wrapper that returns a deduped list of IP addresses for
    every A / AAAA record.  Returns empty list on lookup failure (caller
    treats unresolvable hostnames as denied)."""
    try:
        infos = socket.getaddrinfo(hostname, None)
    except socket.gaierror:
        return []
    out: list[ipaddress.IPv4Address | ipaddress.IPv6Address] = []
    seen: set[str] = set()
    for info in infos:
        addr = info[4][0]
        # Strip IPv6 zone suffix if any.
        addr = addr.split("%")[0]
        if addr in seen:
            continue
        seen.add(addr)
        try:
            ip = ipaddress.ip_address(addr)
        except ValueError:
            continue
        out.append(ip)
    return out


def _is_safe_address(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    """Public-routable, not loopback / link-local / private / multicast /
    unspecified / reserved.  This is the union of the things Python's
    ipaddress module flags as 'not safe to fetch from inside a server
    process'."""
    return not (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_multicast
        or ip.is_unspecified
        or ip.is_reserved
    )


def should_allow(
    url: str,
    *,
    allowed_hosts: list[str],
    skip_address_check: bool = False,
) -> GuardDecision:
    """Run a candidate URL through both gates.

    `allowed_hosts` is the post-startup-merged list of legitimate request
    targets — at minimum the web app's own host and the Supabase public
    storage host.

    `skip_address_check` exists ONLY for tests.  In production callers
    should leave it false so DNS rebinding cannot bypass the guard.
    """
    if not url:
        return GuardDecision(False, "empty url")

    try:
        parsed = urlparse(url)
    except ValueError as e:
        return GuardDecision(False, f"unparseable url: {e}")

    scheme = parsed.scheme.lower()
    if scheme not in _ALLOWED_SCHEMES:
        return GuardDecision(False, f"scheme not allowed: {scheme}")

    if scheme in _INERT_SCHEMES:
        # data: URIs do not touch the network at all.
        return GuardDecision(True, "inert scheme")

    hostname = (parsed.hostname or "").strip()
    if not hostname:
        return GuardDecision(False, "missing hostname")

    if not _hostname_matches(hostname, allowed_hosts):
        return GuardDecision(False, f"host not in allow-list: {hostname}")

    if skip_address_check:
        return GuardDecision(True, "host allowed (address check skipped)")

    addresses = _resolve_addresses(hostname)
    if not addresses:
        return GuardDecision(False, f"hostname did not resolve: {hostname}")

    unsafe = [str(a) for a in addresses if not _is_safe_address(a)]
    if unsafe:
        return GuardDecision(
            False,
            f"hostname resolves to non-public address(es): {','.join(unsafe)}",
        )

    return GuardDecision(True, "host allowed and addresses are public")


def default_allowed_hosts(
    web_app_url: str,
    supabase_url: str,
    extras: list[str] | None = None,
) -> list[str]:
    """Build the per-process allow-list from settings.  The web app itself
    and the Supabase public storage CDN are always permitted; operators can
    add more via PDF_RENDER_ALLOWED_EXTRA_HOSTS (comma-separated)."""
    out: list[str] = []
    for raw in (web_app_url, supabase_url):
        if not raw:
            continue
        try:
            host = urlparse(raw).hostname
        except ValueError:
            continue
        if host:
            out.append(host)
    if extras:
        for entry in extras:
            entry = entry.strip()
            if entry:
                out.append(entry)
    return out
