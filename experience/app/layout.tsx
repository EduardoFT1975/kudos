/**
 * KUDOS Experience . Root Layout.
 * Minimal . html/body scaffold + metadata + Poppins font (next/font).
 * All providers + shell live in <AppShellV4>.
 */
import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import { PlausibleProvider } from "@/components/analytics/PlausibleProvider";
import { AppShellV4 } from "@/components/shell-v4/AppShellV4";
import { BackendHydration } from "@/components/providers/BackendHydration";
import { checkEnv } from "@/lib/env/check";
import "./globals.css";

checkEnv();

// Brand book . single family Poppins . loaded via next/font (auto-optimized)
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--kudos-font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ??
      process.env.NEXT_PUBLIC_API_BASE_URL ??
      process.env.NEXT_PUBLIC_DJANGO_BACKEND ??
      "http://localhost:3000"
  ),
  title: {
    default: "KUDOS . Merito. Descubrimiento. Memoria.",
    template: "%s . KUDOS",
  },
  description:
    "KUDOS conecta a las personas con los lugares del mundo que realmente merecen ser descubiertos, recordados y compartidos.",
  applicationName: "KUDOS",
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    siteName: "KUDOS",
    locale: "es_ES",
    images: [{ url: "/brand/kudos-logo-vertical.svg", width: 280, height: 260 }],
  },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "KUDOS" },
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
  themeColor: "#1A1333",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${poppins.variable} dark`} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://picsum.photos" />
        <link rel="preconnect" href="https://fastly.picsum.photos" />
        <link rel="preconnect" href="https://a.tile.openstreetmap.org" />
        <link rel="preconnect" href="https://b.tile.openstreetmap.org" />
        <link rel="preconnect" href="https://c.tile.openstreetmap.org" />
        <link rel="preconnect" href="https://unpkg.com" />
      </head>
      <body>
        <BackendHydration />
        <AppShellV4>{children}</AppShellV4>
      </body>
      <PlausibleProvider />
    </html>
  );
}
