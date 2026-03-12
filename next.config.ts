import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow larger body sizes for file uploads
  serverExternalPackages: ["bcryptjs"],
  devIndicators: false,
  experimental: {
    serverActions: {
      bodySizeLimit: "100mb",
    },
    proxyClientMaxBodySize: "100mb",
  },
};

export default nextConfig;

