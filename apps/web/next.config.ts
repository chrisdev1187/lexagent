import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow standalone output for Docker / Render deploys
  // output: "standalone",

  // Suppress noisy build warnings from pdfjs worker
  webpack(config) {
    config.resolve.alias.canvas = false;
    return config;
  },
};

export default nextConfig;
