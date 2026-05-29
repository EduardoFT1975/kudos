/**
 * /world - KUDOS Map MVP - PROMPT 3/6.
 *
 * Pantalla cinematografica de mapa: imagen aerea Roma nocturna + POIs
 * flotantes con halos + carousel inferior. NO usa Leaflet.
 *
 * El WorldEngine anterior queda congelado en _postlaunch/world-engine
 * (preservado, no importado).
 */
import type { Metadata } from "next";
import { MapMVP } from "@/components/screens/map/v1/MapMVP";

export const metadata: Metadata = {
  title: "KUDOS - Mapa",
  description: "Roma nocturna iluminada por historias.",
};

export default function WorldPage() {
  return <MapMVP />;
}
