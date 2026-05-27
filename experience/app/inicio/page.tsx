import type { Metadata } from "next";
import { HomeScreen } from "@/components/screens/home/HomeScreen";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Inicio",
  description: "KUDOS . Descubre lugares y capsulas que merecen ser conocidos.",
};

export default function InicioPage() {
  return <HomeScreen />;
}
