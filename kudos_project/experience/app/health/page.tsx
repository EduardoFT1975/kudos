/**
 * KUDOS Experience · /health
 *
 * Server Component que pinguea AXÓN. Es el primer test real del cliente:
 * si esta ruta pinta verde, sabemos que NEXT_PUBLIC_API_BASE_URL apunta
 * bien y que AXÓN devuelve JSON parseable.
 *
 * NO se cachea — cada visita es un ping fresco.
 */
import { getHealth, getAxonBaseUrl, HEALTH_PATH, isAxonError } from "@/lib/axon";

export const dynamic = "force-dynamic"; // siempre fresco
export const revalidate = 0;

export const metadata = {
  title: "Health · AXÓN",
};

interface ProbeResult {
  ok: boolean;
  base: string | null;
  endpoint: string;
  data?: unknown;
  error?: {
    status?: number;
    code?: string;
    message: string;
    body?: unknown;
  };
  durationMs: number;
}

async function probe(): Promise<ProbeResult> {
  const base = getAxonBaseUrl();
  const start = Date.now();
  try {
    const data = await getHealth({ timeoutMs: 20_000 });
    return { ok: true, base, endpoint: HEALTH_PATH, data, durationMs: Date.now() - start };
  } catch (err) {
    const durationMs = Date.now() - start;
    if (isAxonError(err)) {
      return {
        ok: false,
        base,
        endpoint: HEALTH_PATH,
        error: { status: err.status, code: err.code, message: err.message, body: err.body },
        durationMs,
      };
    }
    return {
      ok: false,
      base,
      endpoint: HEALTH_PATH,
      error: { message: err instanceof Error ? err.message : String(err) },
      durationMs,
    };
  }
}

export default async function HealthPage() {
  const result = await probe();
  const accent = result.ok ? "#34d399" : "#f87171";

  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "#050a1f",
        color: "#e2e8f0",
        fontFamily: "system-ui, sans-serif",
        padding: "48px 24px",
        display: "grid",
        placeItems: "start center",
      }}
    >
      <div style={{ maxWidth: 720, width: "100%" }}>
        <p
          style={{
            fontSize: 11,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "#a78bfa",
            margin: 0,
          }}
        >
          KUDOS · puente con AXÓN
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 12 }}>
          <span
            aria-hidden
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: accent,
              boxShadow: `0 0 18px ${accent}`,
            }}
          />
          <h1 style={{ margin: 0, fontSize: "clamp(1.6rem, 4vw, 2.4rem)", color: "#fff" }}>
            AXÓN {result.ok ? "responde" : "no responde"}
          </h1>
        </div>

        <dl style={{ marginTop: 28, display: "grid", gap: 10, fontSize: 13 }}>
          <Row label="base URL" value={result.base ?? "(no configurada)"} mono />
          <Row label="endpoint" value={result.endpoint} mono />
          <Row label="latencia" value={`${result.durationMs} ms`} />
        </dl>

        {result.ok ? (
          <section style={{ marginTop: 28 }}>
            <h2 style={{ fontSize: 14, color: "#a78bfa", margin: "0 0 10px" }}>respuesta</h2>
            <pre style={preStyle}>{JSON.stringify(result.data, null, 2)}</pre>
          </section>
        ) : (
          <section style={{ marginTop: 28 }}>
            <h2 style={{ fontSize: 14, color: "#f87171", margin: "0 0 10px" }}>error</h2>
            <dl style={{ display: "grid", gap: 8, fontSize: 13, marginBottom: 14 }}>
              {result.error?.status !== undefined && (
                <Row label="status" value={String(result.error.status)} />
              )}
              {result.error?.code && <Row label="code" value={result.error.code} mono />}
              <Row label="message" value={result.error?.message ?? ""} />
            </dl>
            {result.error?.body !== undefined && result.error?.body !== null && (
              <pre style={preStyle}>
                {typeof result.error.body === "string"
                  ? result.error.body
                  : JSON.stringify(result.error.body, null, 2)}
              </pre>
            )}
            <p style={{ marginTop: 16, fontSize: 12, color: "#94a3b8" }}>
              Si <code>{HEALTH_PATH}</code> aún no existe en AXÓN, exponlo en Django para
              que el frontend pueda confirmar el puente. Mientras tanto, este panel
              refleja la verdad — sin mocks.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 12 }}>
      <dt style={{ color: "#64748b", textTransform: "uppercase", letterSpacing: "0.12em", fontSize: 11 }}>
        {label}
      </dt>
      <dd
        style={{
          margin: 0,
          color: "#e2e8f0",
          fontFamily: mono ? "ui-monospace, SFMono-Regular, Menlo, monospace" : undefined,
          wordBreak: "break-all",
        }}
      >
        {value}
      </dd>
    </div>
  );
}

const preStyle: React.CSSProperties = {
  margin: 0,
  padding: 16,
  background: "#0a132c",
  border: "1px solid rgba(167, 139, 250, 0.18)",
  borderRadius: 8,
  fontSize: 12,
  color: "#cbd5f5",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  maxHeight: 360,
  overflow: "auto",
};
