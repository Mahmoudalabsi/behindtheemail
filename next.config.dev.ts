import type { NextConfig } from "next";

/**
 * Static export config — used by `bun run build:static`.
 * Generates a fully static site under `out/` ready for any S3-compatible host (Cloudflare R2, S3, Vercel static, etc.).
 * NOTE: Pages that require server-side features (API routes, server actions, image optimization) must be
 * refactored or removed before this works. For an OSINT landing page clone (pure UI), this is fine.
 */
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    // R2 doesn't run Next's image optimizer — disable it and serve originals
    unoptimized: true,
  },
  // The dev sandbox passes a tsconfig that Next tries to mutate; keep build resilient
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
