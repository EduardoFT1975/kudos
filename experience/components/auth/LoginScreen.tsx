"use client";
/**
 * LoginScreen · KUDOS T3.2 EJEC Day 18.
 *
 * Una sola pantalla. Sin distracciones.
 * Centro: bloque de texto + boton Google.
 * Footer: enlace "Seguir como invitado" (vuelve a /inicio sin auth).
 *
 * Despues del login Google, NextAuth devuelve aqui y se redirige a callbackUrl
 * (por defecto /mi-mundo). useMigrateAnon se encarga del trasvase.
 */
import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoginGoogleButton } from "./LoginGoogleButton";
import { useAuth } from "./useAuth";


export function LoginScreen() {
  const router = useRouter();
  const search = useSearchParams();
  const { user } = useAuth();

  const callbackUrl = search?.get("callbackUrl") || "/mi-mundo";

  React.useEffect(() => {
    if (user) router.replace(callbackUrl);
  }, [user, callbackUrl, router]);

  return (
    <main style={ROOT}>
      <div style={CARD}>
        <div style={LOGO}>KUDOS</div>

        <h1 style={H1}>Conserva tu mapa entre dispositivos.</h1>
        <p style={LEAD}>
          KUDOS funciona sin cuenta. Pero si entras, tu Discovery DNA
          (lo que has descubierto, los pilares que tocaste, los shifts vividos)
          te sigue donde vayas.
        </p>

        <div style={ACTIONS}>
          <LoginGoogleButton callbackUrl={callbackUrl} fullWidth />
        </div>

        <div style={FOOT}>
          <button onClick={() => router.replace("/inicio")} style={GUEST}>
            Seguir como invitado
          </button>
          <p style={NOTE}>
            No publicamos en tu nombre. No leemos tu correo.<br/>
            Solo email + nombre + avatar para identificarte.
          </p>
        </div>
      </div>
    </main>
  );
}


// =================== styles ===================

const ROOT: React.CSSProperties = {
  minHeight: "100vh",
  background: "radial-gradient(ellipse at top, #1a0f2e 0%, #0a0814 70%)",
  display: "flex", alignItems: "center", justifyContent: "center",
  padding: "40px 20px",
  fontFamily: '"Poppins", system-ui, sans-serif',
  color: "#fff",
};
const CARD: React.CSSProperties = {
  width: "100%", maxWidth: 440,
  background: "rgba(15,10,31,0.5)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 22,
  padding: "36px 30px",
  backdropFilter: "blur(10px)",
};
const LOGO: React.CSSProperties = {
  fontSize: 14, letterSpacing: "0.32em", fontWeight: 700,
  color: "rgba(201,169,97,0.95)",
  textAlign: "center" as const,
  marginBottom: 28,
};
const H1: React.CSSProperties = {
  margin: 0,
  fontFamily: 'var(--kudos-font-display, "Cormorant Garamond", Georgia, serif)',
  fontSize: 28, fontWeight: 500,
  lineHeight: 1.25,
  letterSpacing: "-0.01em",
  textAlign: "center" as const,
};
const LEAD: React.CSSProperties = {
  margin: "16px 0 28px",
  fontSize: 14, lineHeight: 1.6,
  color: "rgba(255,255,255,0.7)",
  textAlign: "center" as const,
};
const ACTIONS: React.CSSProperties = {
  display: "flex", flexDirection: "column",
  gap: 12,
};
const FOOT: React.CSSProperties = {
  marginTop: 26, textAlign: "center" as const,
};
const GUEST: React.CSSProperties = {
  background: "transparent", border: "none",
  color: "rgba(255,255,255,0.55)",
  fontSize: 12, letterSpacing: "0.04em",
  cursor: "pointer",
  fontFamily: 'inherit',
  textDecoration: "underline",
};
const NOTE: React.CSSProperties = {
  margin: "18px 0 0",
  fontSize: 11, lineHeight: 1.5,
  color: "rgba(255,255,255,0.4)",
};
