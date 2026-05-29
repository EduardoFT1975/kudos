import type { Metadata } from "next";
import { MeritScreen } from "@/components/screens/merit/MeritScreen";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Merito",
  description: "El motor que impulsa el valor en KUDOS.",
};

export default function MeritoPage() {
  return <MeritScreen />;
}
