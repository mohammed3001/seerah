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
};

export default nextConfig;
