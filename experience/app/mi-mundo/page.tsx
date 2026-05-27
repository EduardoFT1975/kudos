import type { Metadata } from "next";
import { MiMundoScreen } from "@/components/screens/mi-mundo/MiMundoScreen";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Mi Mundo",
  description: "Tu mapa personal de lugares guardados en KUDOS.",
};

export default function MiMundoPage() {
  return <MiMundoScreen />;
}
