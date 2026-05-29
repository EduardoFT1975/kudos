"use client";
/**
 * LoginGoogleButton · KUDOS T3.2 EJEC Day 18.
 *
 * Boton Google OAuth limpio (sin marcas competidoras), variant minimal/full.
 * Tras login, automaticamente useMigrateAnon hace el trasvase de eventos anon -> user.
 *
 * Uso:
 *   <LoginGoogleButton callbackUrl="/mi-mundo" />
 */
import * as React from "react";
import { signIn } from "next-auth/react";


interface Props {
  callbackUrl?: string;
  variant?: "primary" | "ghost";
  fullWidth?: boolean;
  children?: React.ReactNode;
}


export function LoginGoogleButton({
  callbackUrl = "/mi-mundo",
  variant = "primary",
  fullWidth = false,
  children,
}: Props) {
  const [loading, setLoading] = React.useState(false);

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await signIn("google", { callbackUrl });
    } catch {
      setLoading(false);
    }
  };

  const baseStyle: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10,
    padding: "12px 22px",
    borderRadius: 12,
    fontSize: 14, fontWeight: 600,
    letterSpacing: "0.02em",
    cursor: loading ? "wait" : "pointer",
    transition: "transform 120ms ease, background 200ms ease",
    width: fullWidth ? "100%" : undefined,
    border: "none",
    fontFamily: 'inherit',
  };

  const primaryStyle: React.CSSProperties = {
    ...baseStyle,
    background: "#fff", color: "#0a0814",
  };
  const ghostStyle: React.CSSProperties = {
    ...baseStyle,
    background: "rgba(255,255,255,0.06)", color: "#fff",
    border: "1px solid rgba(255,255,255,0.18)",
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      style={variant === "primary" ? primaryStyle : ghostStyle}
    >
      <GoogleGlyph />
      <span>{children || (loading ? "Conectando..." : "Continuar con Google")}</span>
    </button>
  );
}


function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.13-.84 2.08-1.78 2.72v2.26h2.88c1.69-1.55 2.67-3.84 2.67-6.62z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.46-.81 5.95-2.18l-2.88-2.26c-.8.54-1.83.85-3.07.85-2.36 0-4.36-1.6-5.07-3.74H.93v2.34C2.42 16.13 5.42 18 9 18z"/>
      <path fill="#FBBC04" d="M3.93 10.67A5.43 5.43 0 0 1 3.65 9c0-.58.1-1.14.27-1.67V4.99H.93A8.99 8.99 0 0 0 0 9c0 1.45.35 2.83.93 4.01l3-2.34z"/>
      <path fill="#EA4335" d="M9 3.57c1.32 0 2.51.45 3.45 1.35l2.59-2.59C13.46.93 11.43 0 9 0 5.42 0 2.42 1.87.93 4.99l3 2.34C4.64 5.18 6.64 3.57 9 3.57z"/>
    </svg>
  );
}
