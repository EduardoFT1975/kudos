/**
 * /mi-mundo · KUDOS Personal World V2 · T3.2 EJEC Day 16.
 *
 * Tres tabs:
 *   - Mapa cognitivo  -> PersonalGraph (constelacion 7 pilares)
 *   - Tus shifts      -> ShiftHistory (lista revisitable)
 *   - Tus lugares     -> MiMundoV5 (favoritos clasicos)
 */
import type { Metadata } from "next";
import { MiMundoTabs } from "@/components/screens/mi-mundo/v5/MiMundoTabs";

export const metadata: Metadata = {
  title: "KUDOS - Mi Mundo",
  description: "Tu mapa personal de descubrimiento.",
};

export default function MiMundoPage() {
  return <MiMundoTabs />;
}
