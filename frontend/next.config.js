/** @type {import('next').NextConfig} */
const basePath = process.env.NEXT_BASE_PATH || process.env.NEXT_PUBLIC_BASE_PATH || "";
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  // Enable static HTML export for GitHub Pages
  output: "export",
  images: { unoptimized: true },
  // Auto-configure basePath/assetPrefix via env (set by GitHub Actions)
  basePath,
  assetPrefix: basePath ? `${basePath}/` : "",
  // Generate .../index.html for better GitHub Pages compatibility
  trailingSlash: true,
};

module.exports = nextConfig;


