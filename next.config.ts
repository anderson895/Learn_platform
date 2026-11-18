import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Nasa kaliwang-ibaba ang Sign Out ng admin sidebar, kaya inilipat dito ang dev indicator.
  devIndicators: { position: "bottom-right" },
  async redirects() {
    return [{ source: "/", destination: "/login", permanent: false }];
  },
};

export default nextConfig;
