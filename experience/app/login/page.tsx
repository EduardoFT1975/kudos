/**
 * /login · KUDOS T3.2 EJEC Day 18.
 *
 * Pantalla de login Google limpia, con explicacion 1-line del
 * porque KUDOS pide login (preservar tu Discovery DNA entre dispositivos).
 *
 * Es opcional: KUDOS funciona 100% anonimo. El login solo desbloquea sync.
 */
import type { Metadata } from "next";
import { LoginScreen } from "@/components/auth/LoginScreen";


export const metadata: Metadata = {
  title: "KUDOS · Entrar",
  description: "Conserva tu Discovery DNA entre dispositivos.",
  robots: { index: false, follow: false },
};


export default function LoginPage() {
  return <LoginScreen />;
}
