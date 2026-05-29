/**
 * /inicio · KUDOS Home Feed v5 (mockup GPT-5 / AXÓN 1.0).
 * El HomeScreen anterior queda disponible en /inicio-legacy.
 */
import type { Metadata } from "next";
import { HomeFeedV5 } from "@/components/screens/home/v5/HomeFeedV5";

export const metadata: Metadata = {
  title: "KUDOS · Descubre",
  description: "El mundo está lleno de historias esperando ser descubiertas.",
};

export default function InicioPage() {
  return <HomeFeedV5 />;
}
