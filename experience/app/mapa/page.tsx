/**
 * KUDOS Experience · /mapa · ECHO PORTAL
 *
 * Surface architecture (north star):
 *   LEFT   - Echo hero (poster · persistent story card)
 *   CENTER - Map intelligence (contextual)
 *   RIGHT  - Context panel stack
 *   BOTTOM - 4-module strip
 */
import { EchoPortalLayout } from "@/features/map/EchoPortalLayout";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "KUDOS · Echo Portal",
  description:
    "Atlas narrativo · cada lugar tiene un eco · explora memoria humana sobre un mapa vivo.",
  icons: {
    icon: [
      { url: "/brand/kudos-symbol.svg", type: "image/svg+xml" },
    ],
    shortcut: "/brand/kudos-symbol.svg",
    apple: "/brand/kudos-symbol.svg",
  },
  openGraph: {
    title: "KUDOS · Echo Portal",
    description: "Atlas narrativo · cada lugar tiene un eco.",
    type: "website",
  },
};

export default function MapaPage() {
  return <EchoPortalLayout />;
}
