import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  scope: "/",
  sw: "sw.js",
  cacheOnFrontEndNav: true,
  workboxOptions: {
    skipWaiting: true,
    clientsClaim: true,
  },
});

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

export default withPWA(nextConfig);
