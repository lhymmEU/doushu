import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  // Pin Turbopack's workspace root to this repo so Next stops auto-detecting
  // an unrelated parent lockfile (e.g. ~/pnpm-lock.yaml) on local machines.
  // `next build` and `next dev` always run from the project root.
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
