import type { NextConfig } from "next";

/**
 * KUDOS Experience · next.config.ts
 *
 * - Rewrites legacy: `/api/django/*` y `/api/mind/*` siguen proxeando al
 *   backend AXÓN como red de seguridad para llamadas client-side cuando
 *   CORS falle. El cliente nuevo (`lib/axon/*`) usa URL absoluta directa
 *   vía NEXT_PUBLIC_API_BASE_URL, así que en general no pasan por aquí.
 * - Imágenes remotas: Wikipedia/UNESCO/etc. usadas por las cápsulas.
 * - Strict mode + experimental optimizaciones cinematic.
 */
const AXON_BACKEND =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.NEXT_PUBLIC_DJANGO_BACKEND ??
  "http://localhost:8000";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Proxy a backend Django para evitar CORS en desarrollo y mantener un
  // único origin en producción cuando el bundle se sirva desde Django.
  async rewrites() {
    return [
      {
        source: "/api/django/:path*",
        destination: `${AXON_BACKEND}/api/:path*`,
      },
      {
        source: "/api/mind/:path*",
        destination: `${AXON_BACKEND}/mind/:path*`,
      },
    ];
  },

  // Imágenes externas que las cápsulas pueden referenciar.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "upload.wikimedia.org" },
      { protocol: "https", hostname: "commons.wikimedia.org" },
      { protocol: "https", hostname: "images.metmuseum.org" },
      { protocol: "https", hostname: "whc.unesco.org" },
    ],
    formats: ["image/avif", "image/webp"],
  },

  // Headers de seguridad mínimos (compatibles con identidad cinematic).
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },

  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
};

export default nextConfig;
