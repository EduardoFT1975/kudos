/**
 * /mi-mundo · KUDOS Personal World Layer v5 (mockup GPT-5 / AXÓN 1.0).
 * Phase 1: datos desde localStorage. Phase 2: API v2 desplegada.
 */
import type { Metadata } from "next";
import { MiMundoV5 } from "@/components/screens/mi-mundo/v5/MiMundoV5";

export const metadata: Metadata = {
  title: "KUDOS · Mi Mundo",
  description: "Tu universo de lugares, historias y recuerdos.",
};

export default function MiMundoPage() {
  return <MiMundoV5 />;
}
