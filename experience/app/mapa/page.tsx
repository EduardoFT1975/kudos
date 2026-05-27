import type { Metadata } from "next";
import { MapScreen } from "@/components/screens/map/MapScreen";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Mapa",
  description: "Explora lugares KUDOS en el mapa.",
};

export default function MapaPage() {
  return <MapScreen />;
}
