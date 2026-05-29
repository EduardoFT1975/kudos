"use client";

/**
 * KUDOS Experience · error boundary local de /places/[slug]
 *
 * Captura excepciones que se escapen de la página (p.ej. throw fuera del
 * try/catch del cliente AXÓN). Para errores de fetch concretos, la página
 * ya los maneja inline y NO los re-lanza. Si llegamos aquí es porque algo
 * más serio rompió — caemos al error boundary global con detalles.
 */
import { useEffect } from "react";

export default function PlaceErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[KUDOS /places error]", error);
  }, [error]);

  return (
    <main
      role="alert"
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        background: "#050a1f",
        color: "#e2e8f0",
        fontFamily: "system-ui, sans-serif",
        padding: "32px 24px",
      }}
    >
      <div style={{ maxWidth: 560 }}>
        <p
          style={{
            fontSize: 11,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "#f472b6",
            marginBottom: 12,
          }}
        >
          Place · error
        </p>
        <h1 style={{ margin: 0, fontSize: "clamp(1.5rem, 4vw, 2rem)", color: "#fff" }}>
          No pudimos componer este lugar.
        </h1>
        <p style={{ marginTop: 10, color: "#94a3b8", fontSize: 14, lineHeight: 1.6 }}>
          {error.message || "Sin mensaje."}
        </p>
        <div style={{ marginTop: 22, display: "flex", gap: 12 }}>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              background: "#a78bfa",
              color: "#0b1024",
              border: 0,
              padding: "10px 18px",
              borderRadius: 8,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reintentar
          </button>
          <a
            href="/"
            style={{
              padding: "10px 18px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.16)",
              color: "#e2e8f0",
              textDecoration: "none",
            }}
          >
            Inicio
          </a>
        </div>
      </div>
    </main>
  );
}
