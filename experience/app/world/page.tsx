/**
 * /world · KUDOS Mapa Real (T6.4.A swap atomico)
 *
 * Antes apuntaba a MapMVP (mapa fake con imagen aerea Roma).
 * Ahora apunta a WorldUniversalLayer: WorldEngine v2 (Leaflet + OSM + POIs
 * Wikidata reales) + capa universal (POIs personales + capsulas localStorage).
 *
 * El mapa fake MapMVP queda en components/screens/map/v1/ pero NO se importa
 * desde ninguna ruta activa. Pendiente eliminacion en T6.5.
 */
import type { Metadata } from "next";
import { WorldUniversalLayer } from "@/components/screens/poi/universal/WorldUniversalLayer";

export const metadata: Metadata = {
  title: "KUDOS - Mapa",
  description: "El mundo en sus coordenadas reales. Todo lugar es un nodo de memoria.",
};

export default function WorldPage() {
  return <WorldUniversalLayer />;
}
