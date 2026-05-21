/**
 * KUDOS Experience · /health (Phase P0.7 · rewire)
 *
 * Server Component que pinguea AXÓN vía el endpoint canonical real
 * (POST /api/place-capsule con coords inválidas → 400 bad_request).
 * No requiere que el backend exponga GET /api/health/ (que no existe).
 *
 * NO se cachea — cada visita es un ping fresco.
 */
import { getHealth, getAxonBaseUrl, HEALTH_PATH } from "@/lib/axon";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Health · AXÓN",
};

export default async function HealthPage() {
  const base = getAxonBaseUrl();
  const result = await getHealth({ timeoutMs: 20_000 });
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
          <Row label="base URL" value={base ?? "(no configurada)"} mono />
          <Row label="endpoint" value={`POST ${HEALTH_PATH}`} mono />
          <Row label="probe body" value='{"lat":9999,"lng":9999}' mono />
          <Row label="status" value={String(result.status)} />
          <Row label="pipeline-health" value={result.pipelineHealth} mono />
          <Row label="latencia" value={`${result.latencyMs} ms`} />
        </dl>

        <section style={{ marginTop: 28 }}>
          <h2
            style={{
              fontSize: 14,
              color: result.ok ? "#a78bfa" : "#f87171",
              margin: "0 0 10px",
            }}
          >
            {result.ok ? "resultado" : "error"}
          </h2>
          <pre style={preStyle}>{result.detail}</pre>
        </section>

        {!result.ok && (
          <p style={{ marginTop: 16, fontSize: 12, color: "#94a3b8" }}>
            Probe esperado: status 400 + pipeline-health=bad_request (coords fuera de
            rango). Cualquier 5xx o network failure indica backend caído / mal configurado /
            CORS bloqueando. Revisar logs de Render del servicio kudos.
          </p>
        )}
      </div>
    </main>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 12 }}>
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
