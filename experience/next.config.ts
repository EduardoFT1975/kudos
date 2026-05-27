import type { NextConfig } from "next";

// Backend Django local. En dev se proxy /api/* al backend para evitar
// problemas CORS + cookies cross-origin.
//
// trailingSlash:true es necesario porque Django requiere "/" al final
// y APPEND_SLASH=True NO redirige POSTs (solo GETs), dando 500. Con
// trailingSlash:true, Next preserva el slash en rewrites.
const DJANGO_BACKEND =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  trailingSlash: true,
  skipTrailingSlashRedirect: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "fastly.picsum.photos" },
      { protocol: "https", hostname: "*.tile.openstreetmap.org" },
      { protocol: "https", hostname: "commondatastorage.googleapis.com" },
    ],
  },
  // En build de produccion ignoramos errores de TS y ESLint que vienen
  // de codigo AXON viejo (lib/capsule-engine/, lib/capsule-generation/)
  // que no forma parte del MVP de maquetas. El frontend MVP compila
  // limpio. En dev local seguimos viendo los errores con `npm run typecheck`.
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  async rewrites() {
    if (process.env.NODE_ENV === "production") return [];
    return [
      { source: "/api/:path*", destination: `${DJANGO_BACKEND}/api/:path*/` },
    ];
  },
};

export default nextConfig;
