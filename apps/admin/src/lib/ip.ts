/**
 * IP address utilities — extraction from request headers, parsing, and
 * CIDR matching.  Pure functions; safe to use from middleware (Edge) and
 * server actions (Node).
 */

/**
 * Extract the client IP address from common reverse-proxy headers.  Falls
 * back to null when no proxy header is present.
 */
export function extractClientIp(headers: Headers): string | null {
  const cf = headers.get("cf-connecting-ip");
  if (cf) return cf.trim();

  const real = headers.get("x-real-ip");
  if (real) return real.trim();

  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  return null;
}

/** Parse "1.2.3.4" or "192.168.0.0/16" or an IPv6 equivalent into bytes + prefix. */
interface ParsedCidr {
  bytes: Uint8Array; // 4 (IPv4) or 16 (IPv6)
  prefix: number;
}

function parseIpv4(value: string): Uint8Array | null {
  const parts = value.split(".");
  if (parts.length !== 4) return null;
  const bytes = new Uint8Array(4);
  for (let i = 0; i < 4; i++) {
    const part = parts[i];
    if (part === undefined) return null;
    if (!/^\d{1,3}$/.test(part)) return null;
    const num = Number.parseInt(part, 10);
    if (num < 0 || num > 255) return null;
    bytes[i] = num;
  }
  return bytes;
}

function parseIpv6(value: string): Uint8Array | null {
  // Only handle the minimum needed for allowlist comparisons. Full IPv6
  // parsing (zones, IPv4-mapped, ::ffff:1.2.3.4) is delegated to the
  // PostgreSQL `inet` type if/when we round-trip these.
  const trimmed = value.trim();
  if (!/^[0-9a-fA-F:]+$/.test(trimmed)) return null;

  const doubleColon = trimmed.split("::");
  if (doubleColon.length > 2) return null;

  const left = doubleColon[0] === "" ? [] : doubleColon[0]?.split(":") ?? [];
  const right =
    doubleColon.length === 2 ? (doubleColon[1] === "" ? [] : doubleColon[1]?.split(":") ?? []) : [];

  if (doubleColon.length === 1 && left.length !== 8) return null;
  const fillCount = 8 - left.length - right.length;
  if (fillCount < 0) return null;

  const groups: string[] = [...left];
  for (let i = 0; i < fillCount; i++) groups.push("0");
  groups.push(...right);
  if (groups.length !== 8) return null;

  const bytes = new Uint8Array(16);
  for (let i = 0; i < 8; i++) {
    const g = groups[i]!;
    if (g.length > 4) return null;
    const num = Number.parseInt(g || "0", 16);
    if (Number.isNaN(num) || num < 0 || num > 0xffff) return null;
    bytes[i * 2] = (num >> 8) & 0xff;
    bytes[i * 2 + 1] = num & 0xff;
  }
  return bytes;
}

function parseCidr(input: string): ParsedCidr | null {
  const [addrRaw, prefixRaw] = input.split("/");
  if (!addrRaw) return null;
  const addr = addrRaw.trim();

  const v4 = parseIpv4(addr);
  if (v4) {
    const prefix = prefixRaw !== undefined ? Number.parseInt(prefixRaw, 10) : 32;
    if (Number.isNaN(prefix) || prefix < 0 || prefix > 32) return null;
    return { bytes: v4, prefix };
  }

  const v6 = parseIpv6(addr);
  if (v6) {
    const prefix = prefixRaw !== undefined ? Number.parseInt(prefixRaw, 10) : 128;
    if (Number.isNaN(prefix) || prefix < 0 || prefix > 128) return null;
    return { bytes: v6, prefix };
  }

  return null;
}

function bytesMatchPrefix(a: Uint8Array, b: Uint8Array, prefix: number): boolean {
  if (a.length !== b.length) return false;
  const fullBytes = Math.floor(prefix / 8);
  for (let i = 0; i < fullBytes; i++) {
    if (a[i] !== b[i]) return false;
  }
  const remainder = prefix % 8;
  if (remainder === 0) return true;
  const mask = (0xff << (8 - remainder)) & 0xff;
  return ((a[fullBytes] ?? 0) & mask) === ((b[fullBytes] ?? 0) & mask);
}

export interface AllowlistEntry {
  cidr: string;
}

/**
 * Returns true if `ip` matches any of the supplied CIDR rules, OR the
 * allowlist is empty (open).  Matching an empty list to "open" is the
 * deliberate fail-safe so an operator can never lock themselves out by
 * mis-configuring the IP table.
 */
export function isIpAllowed(ip: string | null, allowlist: AllowlistEntry[]): boolean {
  if (allowlist.length === 0) return true;
  if (!ip) return false;

  const target = parseIpv4(ip) ?? parseIpv6(ip);
  if (!target) return false;

  for (const entry of allowlist) {
    const rule = parseCidr(entry.cidr);
    if (!rule) continue;
    if (rule.bytes.length !== target.length) continue;
    if (bytesMatchPrefix(target, rule.bytes, rule.prefix)) return true;
  }
  return false;
}
