/**
 * KUDOS Experience · Root Layout
 *
 * SHELL P0 · estructura mínima. La instalación de fonts, el theme provider,
 * el atmosphere layer y la sidebar persistente se incorporan tras recibir
 * Design System v1.0 (ver EXPERIENCE_FOUNDATION_PLAN.md §3).
 */
import type { Metadata, Viewport } from "next";
import { PlausibleProvider } from "@/components/analytics/PlausibleProvider";
import { KudosHeader } from "@/components/shell/KudosHeader";
import { KudosFooter } from "@/components/shell/KudosFooter";
import { checkEnv } from "@/lib/env/check";
import "./globals.css";

// Phase 14.10 · run once at app boot. Throws in dev if NEXT_PUBLIC_API_BASE_URL
// is missing · soft-warns in prod (won't take the site down for misconfig).
checkEnv();

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ??
      process.env.NEXT_PUBLIC_API_BASE_URL ??
      process.env.NEXT_PUBLIC_DJANGO_BACKEND ??
      "http://localhost:3000"
  ),
  title: {
    default: "KUDOS · Memoria humana sobre un mapa temporal vivo",
    template: "%s · KUDOS",
  },
  description:
    "Google Earth emocional + histórico + humano. Explora memoria humana sobre un mapa temporal vivo.",
  openGraph: {
    type: "website",
    siteName: "KUDOS",
    locale: "es_ES",
    images: [
      { url: "/brand/kudos-logo-vertical.svg", width: 280, height: 260 },
    ],
  },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false },
  icons: {
    icon: [{ url: "/brand/kudos-symbol.svg", type: "image/svg+xml" }],
    apple: [{ url: "/brand/kudos-symbol.svg" }],
    shortcut: ["/brand/kudos-symbol.svg"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#050a1f", // pendiente · vendrá de design-system/tokens/colors.ts
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body className="flex min-h-[100dvh] flex-col">
        <KudosHeader />
        <div className="flex-1">{children}</div>
        <KudosFooter />
      </body>
      <PlausibleProvider />
    </html>
  );
}
