import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { dev }) => {
    // Evita cache corrompido no dev (comum no Windows / OneDrive)
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
