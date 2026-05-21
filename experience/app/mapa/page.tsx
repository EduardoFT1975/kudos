/**
 * KUDOS Experience · /mapa (Atlas multidimensional · P0.9 MVP)
 *
 * Map-first surface. Pantalla completa con MapLibre GL. Tap-to-explore:
 * usuario tap en un punto del mapa → fetch capsule para esas coords →
 * panel inferior renderiza CapsuleStateRouter con respuesta.
 *
 * MapLibre GL es open source · sin token API · sin coste mensual. Estilo
 * default OSM raster tiles. Upgrade futuro: vector tiles via Protomaps,
 * estilos custom KUDOS, layer switcher (history/personal/social/...).
 */
import { MapExplorer } from "@/features/map/MapExplorer";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "KUDOS · Atlas",
  description:
    "Atlas multidimensional · explora la memoria del mundo punto por punto.",
  openGraph: {
    title: "KUDOS · Atlas",
    description: "Atlas multidimensional · explora la memoria del mundo.",
    type: "website",
  },
};

export default function MapaPage() {
  return <MapExplorer />;
}
