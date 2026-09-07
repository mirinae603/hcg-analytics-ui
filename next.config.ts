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

  // SVGs are imported as REACT COMPONENTS (src/icons/index.tsx does
  // `import PlusIcon from "./plus.svg"` and renders <PlusIcon />), which needs SVGR.
  //
  // This used to be configured for webpack ONLY. Turbopack ignores the webpack() hook
  // entirely, so under `next dev --turbopack` every .svg import resolved to a static asset
  // instead of a component and React threw "Element type is invalid: expected a string ...
  // Check the render method of `SignInForm`" — the sign-in page, and every page with an
  // icon, was dead. That left a choice between a dev server that worked and one that was
  // usable: webpack compiles /ai at 100% CPU for 12+ minutes on this machine.
  //
  // Both bundlers now get the same loader, so they agree on what an .svg import is.
  turbopack: {
    rules: {
      "*.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
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
