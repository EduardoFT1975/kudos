/**
 * KUDOS Experience · /descubrir (Discovery Feed)
 *
 * Moved from `/` in Phase 14.10 beta unblock · root path now redirects
 * to `/aqui` (live geolocation experience). The curated discovery feed
 * remains available at this stable URL for users who want the
 * cinematic browse experience instead of the live one.
 *
 * Server Component: carga el feed cinematográfico en SSR (curated + AXÓN
 * real intercalados) y lo pasa al componente cliente que orquesta el
 * scroll-snap vertical y las animaciones.
 *
 * Métrica de éxito: Time To First Wow < 5 segundos.
 */
import { getDiscoveryFeed } from "@/lib/axon";
import { DiscoveryFeed } from "@/components/feed/DiscoveryFeed";

// Feed cinematográfico: queremos primera carga estática rápida + actualización
// de fondo cada 2 minutos para nuevas cápsulas en AXÓN. NO force-dynamic
// (eso destruye el TTFB).
export const revalidate = 120;

export const metadata = {
  title: "KUDOS · La interfaz de descubrimiento de la realidad",
  description:
    "Cápsulas humanas sobre el mundo físico. Descubre Roma, su tiempo y sus capas ocultas.",
  openGraph: {
    title: "KUDOS · La interfaz de descubrimiento de la realidad",
    description:
      "Cápsulas humanas sobre el mundo físico. Descubre Roma, su tiempo y sus capas ocultas.",
    type: "website",
  },
};

export default async function DiscoveryPage() {
  const items = await getDiscoveryFeed({ limit: 12 });
  return <DiscoveryFeed items={items} />;
}
