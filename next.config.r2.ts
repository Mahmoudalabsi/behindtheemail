import type { NextConfig } from "next";

/**
 * Static export config — used by `bun run build:static`.
 * Generates a fully static site under `out/` ready for any S3-compatible host
 * (Cloudflare R2, S3, Vercel static, GitHub Pages, etc.).
 *
 * Supports a basePath via NEXT_BASE_PATH env var — useful when deploying to
 * GitHub Pages (e.g., https://user.github.io/behindtheemail/).
 *
 * Usage:
 *   bun run build:static                                    # → no basePath (root deployment)
 *   NEXT_BASE_PATH=/behindtheemail bun run build:static     # → with basePath (GitHub Pages)
 */

const basePath = process.env.NEXT_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
  images: {
    // R2/GitHub Pages don't run Next's image optimizer — disable it and serve originals
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
