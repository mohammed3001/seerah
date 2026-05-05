/**
 * Build the Content-Security-Policy directive for the admin panel.
 *
 * The admin app talks to Supabase (DB + storage) and itself; it does
 * not embed Stripe or Paddle iframes, but it DOES post to the web app's
 * `/api/admin/support/notify-*` endpoints, so those origins are
 * allowlisted via `connect-src`.  Sentry/PostHog are added if you
 * configure them later.
 */
function buildCsp() {
  const isDev = process.env.NODE_ENV !== "production";
  const supabase = "https://*.supabase.co wss://*.supabase.co";
  const sentry = "https://*.sentry.io https://*.ingest.sentry.io";
  // Web app endpoints that the admin posts to (notify-reply, notify-resolve).
  // We allow any https origin in dev for localhost flexibility; in prod the
  // operator should tighten this to the actual web origin via WEB_APP_URL.
  const webOrigin = process.env["WEB_APP_URL"] ?? process.env["NEXT_PUBLIC_APP_URL"] ?? "";

  const directives = {
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'", ...(isDev ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    "font-src": ["'self'", "data:", "https://fonts.gstatic.com"],
    "img-src": ["'self'", "data:", "blob:", "https:"],
    "media-src": ["'self'", "blob:"],
    "connect-src": [
      "'self'",
      supabase,
      sentry,
      ...(webOrigin ? [webOrigin] : []),
    ],
    "frame-src": ["'self'"],
    "frame-ancestors": ["'none'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "upgrade-insecure-requests": [],
  };

  return Object.entries(directives)
    .map(([key, sources]) => (sources.length ? `${key} ${sources.join(" ")}` : key))
    .join("; ");
}

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: buildCsp() },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: ["camera=()", "microphone=()", "geolocation=()", "interest-cohort=()"].join(", "),
  },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  // Admin must NEVER be indexed by search engines.
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive, noimageindex" },
  ...(process.env.NODE_ENV === "production"
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ["@seerah/api", "@seerah/types", "@seerah/ui"],
  // typedRoutes is intentionally disabled — the admin panel has many dynamic
  // segments (`/users/[id]`, `/resumes/[id]`, etc.) and the generated types
  // make every cross-route redirect/Link a typecheck headache for negligible
  // benefit.  Routes are still validated at build time by Next itself.
  experimental: {
    serverActions: {
      // Template thumbnail/preview uploads can be up to 10 MB (matches the
      // template-previews bucket policy in supabase/migrations/2026050500
      // 0000_admin_panel_foundation.sql).  The Next.js default of 1 MB
      // would otherwise reject larger uploads at the framework level
      // before our action code can validate them.  12 MB gives a small
      // headroom for FormData boundary overhead.
      bodySizeLimit: "12mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
