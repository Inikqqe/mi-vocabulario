import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export for GitHub Pages deployment
  output: "export",

  // Base path for GitHub Pages (repo name). Set empty for custom domain.
  // Example: if repo is github.com/user/mi-vocabulario, set NEXT_PUBLIC_BASE_PATH=/mi-vocabulario
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",

  // Disable image optimization (not supported in static export)
  images: {
    unoptimized: true,
  },

  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
