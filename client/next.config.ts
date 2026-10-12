import type { NextConfig } from "next";

import { API_PROXY_PREFIXES } from "./lib/api-proxy-paths";

const internalApi =
  process.env.INTERNAL_API_URL?.replace(/\/$/, "") ||
  "http://127.0.0.1:1337";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    const rules = API_PROXY_PREFIXES.map((prefix) => ({
      source: `/${prefix}/:path*`,
      destination: `${internalApi}/${prefix}/:path*`,
    }));
    rules.push({
      source: "/health",
      destination: `${internalApi}/health`,
    });
    return rules;
  },
  cacheComponents: true,
  partialPrefetching: true,
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
