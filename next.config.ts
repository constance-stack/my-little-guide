import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components is off on purpose: this app gates content by purchase
  // entitlement, and the caching model risks serving cached paid content
  // across users. Plain per-request dynamic rendering is correct-by-default.
  experimental: {
    serverActions: {
      // Default is 1MB, too small for a real photo straight from a phone
      // camera — the admin photo upload form was silently failing above
      // that size.
      bodySizeLimit: "15mb",
    },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
