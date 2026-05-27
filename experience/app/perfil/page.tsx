import type { Metadata } from "next";
import { PerfilScreen } from "@/components/screens/perfil/PerfilScreen";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Perfil",
  description: "Tu identidad y reputacion en KUDOS.",
};

export default function PerfilPage() {
  return <PerfilScreen />;
}
