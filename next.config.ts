import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow larger body sizes for file uploads
  serverExternalPackages: ["bcryptjs"],
  devIndicators: false,
  experimental: {
    serverActions: {
      bodySizeLimit: "1gb",
    },
    proxyClientMaxBodySize: "1gb",
  },
};

export default nextConfig;

