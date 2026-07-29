import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export for Azure Static Web Apps (free tier, no server-side Functions
  // runtime needed). The one dynamic route (/kpi/[key]) enumerates every real
  // param via generateStaticParams, so this is safe.
  output: "export",
  images: {
    unoptimized: true,
  },
  compiler: {
    styledComponents: true
  },
  eslint: {
    ignoreDuringBuilds: true, // <--- Disable ESLint during build
  },
  typescript: {
    ignoreBuildErrors: true, // POC: don't block the production build on type errors
  },

  // Perf only (no behaviour change): rewrite heavy barrel imports to direct paths
  // so each page bundles only the icons/components it uses → smaller chunks, faster
  // first render & reloads.
  experimental: {
    optimizePackageImports: [
      "react-icons", "@mui/material", "@mui/icons-material", "lodash",
      "recharts", "@headlessui/react", "@heroicons/react",
    ],
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
