/**
 * /perfil · KUDOS Profile v5.
 */
import type { Metadata } from "next";
import { PerfilV5 } from "@/components/screens/perfil/v5/PerfilV5";

export const metadata: Metadata = {
  title: "KUDOS · Perfil",
};

export default function PerfilPage() {
  return <PerfilV5 />;
}
