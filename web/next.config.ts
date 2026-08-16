import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true },
  typedRoutes: true,
  // Lets a production build run against a separate output dir while the dev
  // server keeps using .next — they corrupt each other when they share one.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
