import type { NextConfig } from "next";

const backendUrl =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, "") ||
  "https://erpapi.erphubtechnologies.in";

const nextConfig: NextConfig = {
  experimental: {
    // The on-disk dev cache kept failing compaction ("Another write batch or compaction is already active")
    turbopackFileSystemCacheForDev: false,
  },
  async rewrites() {
    return [
      {
        source: "/api/ai-placement/proxy/:path*",
        destination: `${process.env.AI_PLACEMENT_BACKEND_URL || "http://localhost:5030"}/api/:path*`,
      },
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
