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
  // T1.1 · Build integrity restaurado.
  // El codigo legacy AXON fue eliminado en T1.1 limpieza.
  // El build ahora respeta errores de TS y ESLint.
  // Si algun error reaparece, hay que arreglarlo, NO ocultarlo.
  // (eslint y typescript ahora se ejecutan en cada build)

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

  // CSP explícita y permisiva. Render/Brave bloqueaban 'eval' por defecto
  // → Leaflet no podía montar los markers del mapa (silencioso, sin log)
  // y el resultado era "mapa cargado pero sin POIs". Esta cabecera la
  // sobreescribe permitiendo unsafe-eval + unsafe-inline + CDNs externos.
  // P32-fix-csp · 28 may 2026.
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
