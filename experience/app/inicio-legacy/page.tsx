/**
 * /inicio-legacy · HomeScreen anterior (rollback por si el v5 falla).
 */
import type { Metadata } from "next";
import { HomeScreen } from "@/components/screens/home/HomeScreen";

export const metadata: Metadata = {
  title: "KUDOS · Inicio (legacy)",
};

export default function InicioLegacyPage() {
  return <HomeScreen />;
}
