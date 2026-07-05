import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: 'export' removed — app runs as a Next server with dynamic /kpi/[key] routes.
  compiler: {
    styledComponents: true
  },
  eslint: {
    ignoreDuringBuilds: true, // <--- Disable ESLint during build
  },
  typescript: {
    ignoreBuildErrors: true, // POC: don't block the production build on type errors
  },

  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    });
    return config;
  },
};

export default nextConfig;
