/**
 * Build the Content-Security-Policy directive.
 *
 * In development we must permit `'unsafe-eval'` because Next.js's dev
 * runtime relies on `eval` for HMR / source maps.  Production gets a
 * stricter policy.  We allowlist exactly the third-parties the web app
 * actually contacts: Stripe (checkout iframe + JS), Supabase (DB +
 * storage + realtime), PostHog (analytics), and Sentry (error
 * ingestion).  Inline styles are allowed because Tailwind injects
 * style attributes for arbitrary class fragments and the resume
 * preview embeds inline color tokens.
 */
function buildCsp() {
  const isDev = process.env.NODE_ENV !== "production";
  const supabase = "https://*.supabase.co wss://*.supabase.co";
  const sentry = "https://*.sentry.io https://*.ingest.sentry.io";
  const posthog = "https://*.posthog.com https://*.i.posthog.com";
  const stripe = "https://js.stripe.com https://hooks.stripe.com https://api.stripe.com";

  const directives = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      "'unsafe-inline'",
      ...(isDev ? ["'unsafe-eval'"] : []),
      stripe,
      posthog,
    ],
    "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    "font-src": ["'self'", "data:", "https://fonts.gstatic.com"],
    "img-src": ["'self'", "data:", "blob:", "https:"],
    "media-src": ["'self'", "blob:"],
    "connect-src": [
      "'self'",
      supabase,
      stripe,
      posthog,
      sentry,
      // Upstash REST endpoint is configured per-deployment and varies; we
      // open https: above via supabase rule. If you tighten this further
      // remember to allow the Upstash subdomain.
    ],
    "frame-src": ["https://js.stripe.com", "https://hooks.stripe.com"],
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
  {
    key: "Content-Security-Policy",
    value: buildCsp(),
  },
  // X-Frame-Options is superseded by `frame-ancestors 'none'` in CSP for
  // modern browsers, but legacy clients still honour the header.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: ["camera=()", "microphone=()", "geolocation=()", "interest-cohort=()"].join(", "),
  },
  { key: "X-DNS-Prefetch-Control", value: "off" },
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
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
  experimental: {
    serverActions: {
      // Avatar uploads cap at 4 MB (validated server-side by
      // `uploadAvatarAction`).  Default Next.js cap is 1 MB which would
      // truncate larger files before validation runs.  6 MB leaves
      // headroom for the FormData boundary.
      bodySizeLimit: "6mb",
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
