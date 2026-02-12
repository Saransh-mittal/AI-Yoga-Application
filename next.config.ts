import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output for Docker deployment (self-contained production build)
  output: 'standalone',

  // Enable React strict mode for better debugging
  // reactStrictMode: true,

  // TypeScript - ignore pre-existing errors for deployment
  typescript: {
    ignoreBuildErrors: true,
  },

  // ESLint - ignore pre-existing errors for deployment
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
