import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components is off on purpose: this app gates content by purchase
  // entitlement, and the caching model risks serving cached paid content
  // across users. Plain per-request dynamic rendering is correct-by-default.
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
