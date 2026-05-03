/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ["@seerah/api", "@seerah/types", "@seerah/ui"],
  // typedRoutes is intentionally disabled — the admin panel has many dynamic
  // segments (`/users/[id]`, `/resumes/[id]`, etc.) and the generated types
  // make every cross-route redirect/Link a typecheck headache for negligible
  // benefit.  Routes are still validated at build time by Next itself.
};

export default nextConfig;
