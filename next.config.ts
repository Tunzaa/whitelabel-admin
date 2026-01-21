import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  images: {
    domains: ["placehold.co"],
  },
  eslint: { ignoreDuringBuilds: true },
  async rewrites() {
    return [
      {
        source: "/api/proxy/:path*",
        destination: "http://164.92.162.131:8000/v1/:path*", // Proxy to Backend
      },
    ];
  },
};

export default nextConfig;
