"use client";

import * as React from "react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function EchoError({ error, reset }: ErrorProps) {
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      try { console.error("[kudos] /echo error", error); } catch { /* noop */ }
    }
  }, [error]);

  return (
    <main style={{
      display: "grid", placeItems: "center",
      padding: "32px 20px",
      minHeight: "calc(var(--kudos-dvh, 1vh) * 70)",
    }}>
      <section style={{
        maxWidth: 520, width: "100%", padding: 28,
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(248,113,113,0.32)",
        borderRadius: 22,
        backdropFilter: "blur(16px) saturate(140%)",
        WebkitBackdropFilter: "blur(16px) saturate(140%)",
      }}>
        <div style={{
          fontFamily: "var(--kudos-font-mono)", fontSize: 10.5,
          color: "#f87171", letterSpacing: "0.18em", textTransform: "uppercase",
          marginBottom: 8,
        }}>Cápsula no disponible</div>
        <h1 style={{
          margin: 0, fontFamily: "var(--kudos-font-display)",
          fontSize: 22, fontWeight: 600, color: "var(--kudos-ink)",
          letterSpacing: "-0.01em",
        }}>El eco no pudo cargar.</h1>
        <p style={{
          margin: "10px 0 18px", color: "var(--kudos-ink-mid)",
          fontFamily: "var(--kudos-font-body)", fontSize: 13.5, lineHeight: 1.55,
        }}>
          Reintenta o vuelve a explorar el mapa para abrir otra cápsula.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" onClick={() => reset()} style={{
            padding: "10px 16px", borderRadius: 999,
            background: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
            border: "1px solid #8b5cf6", color: "#0a0612",
            fontFamily: "var(--kudos-font-body)", fontSize: 13,
            fontWeight: 600, cursor: "pointer",
          }}>Reintentar</button>
          <a href="/mapa" style={{
            padding: "10px 16px", borderRadius: 999,
            background: "transparent",
            border: "1px solid var(--kudos-border-hi)",
            color: "var(--kudos-ink)",
            fontFamily: "var(--kudos-font-body)", fontSize: 13,
            textDecoration: "none", display: "inline-flex", alignItems: "center",
          }}>Volver al mapa</a>
        </div>
      </section>
    </main>
  );
}
