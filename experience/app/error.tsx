"use client";

import * as React from "react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  React.useEffect(() => {
    // Local log only · no vendor telemetry
    if (typeof window !== "undefined") {
      try { console.error("[kudos] route error", error); } catch { /* noop */ }
    }
  }, [error]);

  return (
    <main
      style={{
        display: "grid",
        placeItems: "center",
        padding: "24px 20px",
        minHeight: "calc(var(--kudos-dvh, 1vh) * 80)",
      }}
    >
      <section
        style={{
          maxWidth: 520,
          width: "100%",
          padding: 28,
          background: "var(--kudos-glass)",
          border: "1px solid rgba(248, 113, 113, 0.32)",
          borderRadius: 22,
          boxShadow: "0 24px 48px -16px rgba(0,0,0,0.6)",
          backdropFilter: "blur(16px) saturate(140%)",
          WebkitBackdropFilter: "blur(16px) saturate(140%)",
        }}
      >
        <div style={{
          fontFamily: "var(--kudos-font-mono)",
          fontSize: 10.5,
          color: "#f87171",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          marginBottom: 8,
        }}>
          Algo se rompió
        </div>
        <h1 style={{
          margin: 0,
          fontFamily: "var(--kudos-font-display)",
          fontSize: 24,
          fontWeight: 600,
          color: "var(--kudos-ink)",
          letterSpacing: "-0.01em",
        }}>
          Te tenemos. Vamos a recuperar.
        </h1>
        <p style={{
          margin: "10px 0 18px",
          color: "var(--kudos-ink-mid)",
          fontFamily: "var(--kudos-font-body)",
          fontSize: 13.5,
          lineHeight: 1.55,
        }}>
          La pantalla anterior tuvo un problema. Reintentar suele resolverlo. Si persiste, vuelve al inicio.
        </p>
        <details style={{
          marginBottom: 18,
          padding: 12,
          background: "rgba(255,255,255,0.025)",
          border: "1px solid var(--kudos-border)",
          borderRadius: 12,
          fontFamily: "var(--kudos-font-mono)",
          fontSize: 11,
          color: "var(--kudos-ink-low)",
        }}>
          <summary style={{ cursor: "pointer", color: "var(--kudos-ink-mid)" }}>Detalles técnicos</summary>
          <div style={{ marginTop: 8, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {error?.message ?? "error desconocido"}
            {error?.digest ? "\ndigest: " + error.digest : ""}
          </div>
        </details>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              padding: "10px 16px",
              borderRadius: 999,
              background: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
              border: "1px solid #8b5cf6",
              color: "#0a0612",
              fontFamily: "var(--kudos-font-body)",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reintentar
          </button>
          <a
            href="/inicio"
            style={{
              padding: "10px 16px",
              borderRadius: 999,
              background: "transparent",
              border: "1px solid var(--kudos-border-hi)",
              color: "var(--kudos-ink)",
              fontFamily: "var(--kudos-font-body)",
              fontSize: 13,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            Inicio
          </a>
        </div>
      </section>
    </main>
  );
}
