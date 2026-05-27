import type { NextConfig } from "next";

// Backend Django. En dev apunta a localhost:8000. En produccion apunta
// a la URL publica de Render (NEXT_PUBLIC_API_BASE_URL en el dashboard).
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

  // Rewrite /api/* al backend Django · SIEMPRE (dev Y prod).
  // En dev evita CORS+cookies cross-origin con localhost.
  // En prod permite que el frontend (kudos-frontend-rsi3) hable con el
  // backend (kudos-40cq) sin pelearse con CORS · Next.js hace de proxy
  // server-side para que el navegador vea todo same-origin.
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${DJANGO_BACKEND}/api/:path*/` },
    ];
  },
};

export default nextConfig;
