import type { NextConfig } from "next";
import path from "node:path";

const DJANGO_BACKEND =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  trailingSlash: true,
  skipTrailingSlashRedirect: false,

  // FIX Render - Next 15 a veces no respeta paths de tsconfig en build.
  // Forzamos los aliases en webpack directamente.
  webpack(config) {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@": path.resolve(__dirname),
      "@/app": path.resolve(__dirname, "app"),
      "@/components": path.resolve(__dirname, "components"),
      "@/features": path.resolve(__dirname, "features"),
      "@/design-system": path.resolve(__dirname, "design-system"),
      "@/motion": path.resolve(__dirname, "motion"),
      "@/styles": path.resolve(__dirname, "styles"),
      "@/lib": path.resolve(__dirname, "lib"),
    };
    return config;
  },

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "fastly.picsum.photos" },
      { protocol: "https", hostname: "*.tile.openstreetmap.org" },
      { protocol: "https", hostname: "commondatastorage.googleapis.com" },
    ],
  },

  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${DJANGO_BACKEND}/api/:path*/` },
    ];
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://unpkg.com https://cdnjs.cloudflare.com https://plausible.io",
              "style-src 'self' 'unsafe-inline' https://unpkg.com https://fonts.googleapis.com",
              "font-src 'self' data: https://fonts.gstatic.com",
              "img-src 'self' data: blob: https:",
              "media-src 'self' blob: https:",
              "connect-src 'self' https: wss: blob:",
              "frame-src 'self' https:",
              "worker-src 'self' blob:",
              "object-src 'none'",
              "base-uri 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
