import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    staleTimes: {
      dynamic: 1800, // 30 minutes in-browser router cache
      static: 1800,
    },
  },
};

export default nextConfig;
