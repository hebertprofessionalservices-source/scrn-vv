import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true },
  typedRoutes: true,
  // Lets a production build run against a separate output dir while the dev
  // server keeps using .next — they corrupt each other when they share one.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Netlify sets NETLIFY=true during its builds. Baked in at build time
  // because netlify.toml env doesn't reach functions at runtime.
  env: {
    LIVE_DATA_URL: process.env.NETLIFY === "true"
      ? "https://raw.githubusercontent.com/hebertprofessionalservices-source/scrn-vv/main/web/public/data"
      : "",
  },
  // Logos are rendered on most pages; let browsers keep them for a day
  // instead of revalidating every one on each visit.
  async headers() {
    return [
      {
        source: "/team-logos/:file*",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
      },
    ];
  },
};

export default nextConfig;
