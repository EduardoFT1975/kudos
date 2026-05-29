"use client";
/**
 * KUDOS Sign-In page · T1.3.
 * Boton Google + boton "Sigue explorando" (no obliga).
 */
import * as React from "react";
import { useRouter } from "next/navigation";
import { KudosFlowerLogo } from "@/components/brand/KudosFlowerLogo";


export default function SignInPage() {
  const router = useRouter();

  const handleGoogle = () => {
    if (typeof window === "undefined") return;
    window.location.href = "/api/auth/signin/google?callbackUrl=/inicio";
  };

  const handleSkip = () => {
    router.push("/inicio");
  };

  return (
    <div style={WRAP}>
      <div style={CARD}>
        <div style={{ marginBottom: 16 }}>
          <KudosFlowerLogo size={56} variant="gold" glow />
        </div>
        <h1 style={TITLE}>Tu mundo, sincronizado</h1>
        <p style={SUB}>
          Inicia sesion para guardar lugares, recibir tus huellas y conectar tus historias
          entre dispositivos.
        </p>

        <button onClick={handleGoogle} style={GOOGLE_BTN}>
          <span style={GOOGLE_ICO}>G</span>
          <span>Entrar con Google</span>
        </button>

        <div style={DIVIDER}><span>o</span></div>

        <button onClick={handleSkip} style={SKIP_BTN}>
          Sigue explorando como invitado
        </button>

        <p style={FOOTNOTE}>
          Puedes guardar tu Mi Mundo local · se sincronizara cuando entres.
        </p>
      </div>
    </div>
  );
}


const WRAP: React.CSSProperties = {
  minHeight: "100vh", background: "#0a0814",
  display: "flex", alignItems: "center", justifyContent: "center",
  padding: 24,
};
const CARD: React.CSSProperties = {
  maxWidth: 420, width: "100%",
  padding: "36px 28px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 18, color: "#fff",
  textAlign: "center" as const,
  fontFamily: '"Poppins", system-ui, sans-serif',
};
const TITLE: React.CSSProperties = {
  fontFamily: 'var(--kudos-font-display, "Cormorant Garamond", serif)',
  fontSize: 26, fontWeight: 600, marginBottom: 8,
  letterSpacing: "-0.01em",
};
const SUB: React.CSSProperties = {
  fontSize: 13, color: "rgba(255,255,255,0.62)",
  lineHeight: 1.55, marginBottom: 22,
};
const GOOGLE_BTN: React.CSSProperties = {
  width: "100%", padding: "12px 16px",
  background: "#fff", color: "#1a1333",
  border: "none", borderRadius: 12,
  fontSize: 14, fontWeight: 600,
  cursor: "pointer",
  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10,
};
const GOOGLE_ICO: React.CSSProperties = {
  width: 22, height: 22, borderRadius: "50%",
  background: "linear-gradient(135deg, #4285F4 0%, #34A853 50%, #FBBC05 75%, #EA4335 100%)",
  color: "#fff", fontSize: 13, fontWeight: 700,
  display: "inline-flex", alignItems: "center", justifyContent: "center",
};
const DIVIDER: React.CSSProperties = {
  margin: "18px 0", textAlign: "center" as const,
  color: "rgba(255,255,255,0.32)", fontSize: 11,
};
const SKIP_BTN: React.CSSProperties = {
  width: "100%", padding: "11px 16px",
  background: "transparent", color: "rgba(255,255,255,0.85)",
  border: "1px solid rgba(255,255,255,0.18)", borderRadius: 12,
  fontSize: 13, fontWeight: 500,
  cursor: "pointer",
};
const FOOTNOTE: React.CSSProperties = {
  marginTop: 20, fontSize: 11,
  color: "rgba(255,255,255,0.42)",
};
