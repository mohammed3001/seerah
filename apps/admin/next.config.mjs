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
};

export default nextConfig;
