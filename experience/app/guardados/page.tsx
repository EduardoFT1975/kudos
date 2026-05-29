/**
 * /guardados · Mi colección de saves (v5).
 */
import type { Metadata } from "next";
import { GuardadosV5 } from "@/components/screens/guardados/v5/GuardadosV5";

export const metadata: Metadata = {
  title: "KUDOS · Guardados",
};

export default function GuardadosPage() {
  return <GuardadosV5 />;
}
