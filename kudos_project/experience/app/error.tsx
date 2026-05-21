"use client";

/**
 * KUDOS Experience · error boundary global.
 *
 * Captura excepciones no controladas de cualquier ruta. Para errores
 * concretos del cliente AXÓN, intenta extraer status + url + body y
 * mostrarlos en un panel debug-friendly. NO se ocultan detalles: en este
 * estadio del proyecto la transparencia con el backend pesa más que el
 * acabado visual.
 */
import { useEffect } from "react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

// Extracción defensiva de campos de AxonError sin importar la clase
// (evitamos importar `lib/axon` aquí para no inflar el client bundle del
// error boundary; con shape-check basta).
function readAxonFields(err: unknown): {
  status?: number;
  code?: string;
  url?: string;
  body?: unknown;
} {
  if (!err || typeof err !== "object") return {};
  const e = err as Record<string, unknown>;
  if (e.name !== "AxonError") return {};
  return {
    status: typeof e.status === "number" ? e.status : undefined,
    code: typeof e.code === "string" ? e.code : undefined,
    url: typeof e.url === "string" ? e.url : undefined,
    body: e.body,
  };
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log mínimo en consola — Sentry / PostHog se enchufan cuando lleguen.
    console.error("[KUDOS error boundary]", error);
  }, [error]);

  const axon = readAxonFields(error);
  const isAxon = axon.status !== undefined;

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
      <div style={{ maxWidth: 640, width: "100%" }}>
        <p
          style={{
            fontSize: 11,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "#f472b6",
            marginBottom: 12,
          }}
        >
          {isAxon ? "AXÓN · respuesta inesperada" : "KUDOS · error inesperado"}
        </p>
        <h1
          style={{
            fontSize: "clamp(1.5rem, 4vw, 2.25rem)",
            margin: "0 0 14px",
            lineHeight: 1.15,
            color: "#fff",
          }}
        >
          {isAxon
            ? `HTTP ${axon.status ?? "?"} · ${axon.code ?? "ERROR"}`
            : "Algo se cayó en la experiencia."}
        </h1>
        <p style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.6, margin: 0 }}>
          {error.message || "Sin mensaje."}
        </p>

        {axon.url && (
          <div
            style={{
              marginTop: 22,
              padding: "12px 14px",
              border: "1px solid rgba(167, 139, 250, 0.25)",
              borderRadius: 8,
              background: "rgba(167, 139, 250, 0.06)",
              fontSize: 12,
              color: "#cbd5f5",
              wordBreak: "break-all",
            }}
          >
            <div style={{ opacity: 0.7, marginBottom: 4 }}>endpoint</div>
            <code style={{ color: "#00f0ff" }}>{axon.url}</code>
          </div>
        )}

        {axon.body !== undefined && axon.body !== null && (
          <details
            style={{
              marginTop: 14,
              fontSize: 12,
              color: "#94a3b8",
            }}
          >
            <summary style={{ cursor: "pointer", color: "#a78bfa" }}>
              Cuerpo de respuesta
            </summary>
            <pre
              style={{
                marginTop: 8,
                padding: 12,
                background: "#0a132c",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 6,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                maxHeight: 280,
                overflow: "auto",
              }}
            >
              {typeof axon.body === "string"
                ? axon.body
                : JSON.stringify(axon.body, null, 2)}
            </pre>
          </details>
        )}

        <div style={{ marginTop: 26, display: "flex", gap: 12, flexWrap: "wrap" }}>
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
              letterSpacing: "0.04em",
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
              fontWeight: 500,
            }}
          >
            Volver al inicio
          </a>
        </div>

        {error.digest && (
          <p style={{ marginTop: 22, fontSize: 11, color: "#64748b" }}>
            digest · <code>{error.digest}</code>
          </p>
        )}
      </div>
    </main>
  );
}
