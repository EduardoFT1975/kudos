/**
 * KUDOS Experience · /places/[slug]
 *
 * Primera estación del vertical slice:
 *   Roma → Timeline → Coliseo → Capsule → KUDOS Mind
 *
 * Server Component. Consume en paralelo:
 *   - GET /api/places/:slug/
 *   - GET /api/capsules/?place=:slug
 *
 * Si AXÓN aún no expone /api/places/:slug/ devolverá 404. En ese caso
 * pintamos un panel "endpoint pendiente en AXÓN" con la información
 * suficiente para que el backend sepa exactamente qué crear. NO se
 * inventan datos.
 */
import {
  getPlace,
  listCapsules,
  placePath,
  isAxonError,
  isMissingEndpoint,
  type Place,
  type Capsule,
} from "@/lib/axon";

export const revalidate = 300; // 5 min

interface PageProps {
  params: Promise<{ slug: string }>;
}

interface Loaded<T> {
  ok: true;
  data: T;
}
interface Failed {
  ok: false;
  status?: number;
  code?: string;
  message: string;
  path: string;
}

async function loadPlace(slug: string): Promise<Loaded<Place> | Failed> {
  try {
    const data = await getPlace(slug);
    return { ok: true, data };
  } catch (err) {
    if (isAxonError(err)) {
      return { ok: false, status: err.status, code: err.code, message: err.message, path: err.url };
    }
    return { ok: false, message: err instanceof Error ? err.message : String(err), path: placePath(slug) };
  }
}

async function loadCapsules(slug: string): Promise<Loaded<{ capsules: Capsule[]; total: number }> | Failed> {
  try {
    const data = await listCapsules({ place: slug }, { revalidate: 120 });
    return { ok: true, data };
  } catch (err) {
    if (isAxonError(err)) {
      return { ok: false, status: err.status, code: err.code, message: err.message, path: err.url };
    }
    return { ok: false, message: err instanceof Error ? err.message : String(err), path: "/api/capsules/" };
  }
}

export default async function PlacePage({ params }: PageProps) {
  const { slug } = await params;
  const [place, capsules] = await Promise.all([loadPlace(slug), loadCapsules(slug)]);

  const displayName =
    place.ok ? (place.data.name || slug) : slug.charAt(0).toUpperCase() + slug.slice(1);

  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "#050a1f",
        color: "#e2e8f0",
        fontFamily: "system-ui, sans-serif",
        padding: "48px 24px",
      }}
    >
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <p
          style={{
            fontSize: 11,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "#a78bfa",
            margin: 0,
          }}
        >
          KUDOS · Place · vertical slice
        </p>
        <h1
          style={{
            margin: "10px 0 6px",
            fontSize: "clamp(2rem, 6vw, 3.4rem)",
            color: "#fff",
            lineHeight: 1.05,
          }}
        >
          {displayName}
        </h1>
        {place.ok && place.data.country && (
          <p style={{ margin: 0, color: "#94a3b8" }}>{place.data.country}</p>
        )}

        {/* Place metadata */}
        <section style={{ marginTop: 32 }}>
          <h2 style={sectionTitle}>Lugar</h2>
          {place.ok ? (
            <PlaceCard place={place.data} />
          ) : (
            <PendingPanel failure={place} kind="place" slug={slug} />
          )}
        </section>

        {/* Capsules list */}
        <section style={{ marginTop: 32 }}>
          <h2 style={sectionTitle}>
            Cápsulas
            {capsules.ok && (
              <span style={{ marginLeft: 8, color: "#64748b", fontWeight: 400 }}>
                · {capsules.data.total}
              </span>
            )}
          </h2>
          {capsules.ok ? (
            capsules.data.capsules.length === 0 ? (
              <p style={{ color: "#94a3b8", fontSize: 14 }}>
                AXÓN respondió sin cápsulas para <code>{slug}</code>. Es respuesta real, no mock.
              </p>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
                {capsules.data.capsules.slice(0, 12).map((c) => (
                  <li key={c.uid} style={capsuleItem}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <strong style={{ color: "#fff" }}>{c.titulo}</strong>
                      {c.year != null && (
                        <span style={{ color: "#a78bfa", fontVariantNumeric: "tabular-nums" }}>
                          {c.year}
                        </span>
                      )}
                    </div>
                    <div style={{ marginTop: 4, fontSize: 12, color: "#94a3b8" }}>
                      <code style={{ color: "#00f0ff" }}>{c.uid}</code>
                      {c.modo && <> · {c.modo}</>}
                      {c.autor && <> · {c.autor}</>}
                    </div>
                  </li>
                ))}
              </ul>
            )
          ) : (
            <PendingPanel failure={capsules} kind="capsules" slug={slug} />
          )}
        </section>

        {/* Próximas estaciones del slice */}
        <section style={{ marginTop: 40 }}>
          <h2 style={sectionTitle}>Siguiente estación del slice</h2>
          <ol style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.8, paddingLeft: 18 }}>
            <li>Timeline Engine · línea temporal de las cápsulas del lugar</li>
            <li>Capsule Experience · detalle inmersivo del Coliseo</li>
            <li>KUDOS Mind · POST /mind/ask/ con contexto de la cápsula</li>
          </ol>
        </section>
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Subcomponentes
// ---------------------------------------------------------------------------

function PlaceCard({ place }: { place: Place }) {
  return (
    <article style={cardStyle}>
      {place.summary && <p style={{ margin: 0, lineHeight: 1.6 }}>{place.summary}</p>}
      {place.description && !place.summary && (
        <p style={{ margin: 0, lineHeight: 1.6 }}>{place.description}</p>
      )}
      <dl style={{ marginTop: place.summary || place.description ? 16 : 0, display: "grid", gap: 8, fontSize: 13 }}>
        {typeof place.lat === "number" && typeof place.lon === "number" && (
          <Row label="coords" value={`${place.lat.toFixed(4)}, ${place.lon.toFixed(4)}`} mono />
        )}
        {place.era_range && (
          <Row
            label="rango"
            value={`${place.era_range.from ?? "?"} → ${place.era_range.to ?? "?"}`}
          />
        )}
        {place.capsule_count !== undefined && (
          <Row label="cápsulas" value={String(place.capsule_count)} />
        )}
      </dl>
    </article>
  );
}

function PendingPanel({
  failure,
  kind,
  slug,
}: {
  failure: Failed;
  kind: "place" | "capsules";
  slug: string;
}) {
  const missing = failure.status === 404 || failure.status === 501;
  const accent = missing ? "#fbbf24" : "#f87171";
  const heading = missing
    ? `Endpoint pendiente en AXÓN · ${kind}`
    : `AXÓN devolvió error · ${kind}`;
  const hint = missing
    ? kind === "place"
      ? `Falta exponer GET /api/places/${slug}/ en Django. El frontend ya está listo para consumirlo en cuanto exista.`
      : `GET /api/capsules/?place=${slug} no respondió como esperado. Confirma que el filtro por place esté implementado en AXÓN.`
    : "El backend respondió pero con un estado de error. Cuerpo abajo si lo hubo.";

  return (
    <div
      style={{
        border: `1px solid ${accent}55`,
        background: `${accent}10`,
        borderRadius: 10,
        padding: 16,
      }}
    >
      <p style={{ margin: 0, color: accent, fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase" }}>
        {heading}
      </p>
      <p style={{ margin: "8px 0 0", color: "#e2e8f0", fontSize: 14, lineHeight: 1.55 }}>{hint}</p>
      <dl style={{ marginTop: 14, display: "grid", gap: 6, fontSize: 12, color: "#94a3b8" }}>
        <Row label="endpoint" value={failure.path} mono />
        {failure.status !== undefined && <Row label="status" value={String(failure.status)} />}
        {failure.code && <Row label="code" value={failure.code} mono />}
        <Row label="message" value={failure.message} />
      </dl>
    </div>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: 12 }}>
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

const sectionTitle: React.CSSProperties = {
  margin: "0 0 14px",
  fontSize: 12,
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  color: "#a78bfa",
  fontWeight: 600,
};

const cardStyle: React.CSSProperties = {
  padding: 18,
  background: "rgba(167, 139, 250, 0.05)",
  border: "1px solid rgba(167, 139, 250, 0.18)",
  borderRadius: 10,
};

const capsuleItem: React.CSSProperties = {
  padding: "12px 14px",
  background: "#0a132c",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 8,
};

// Para silenciar import not used si `isMissingEndpoint` no se consume.
void isMissingEndpoint;
