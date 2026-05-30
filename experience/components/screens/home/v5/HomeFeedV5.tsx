"use client";
/**
 * KUDOS - HomeFeedV5 - PROMPT 2/6 Discover MVP (rectificado segun maqueta real).
 *
 * Bloques (en orden):
 *   1. DiscoverHero
 *   2. FeaturedCapsule
 *   3. Para ti, hoy (rail horizontal)
 *   4. Historias que conectan epocas (rail horizontal)
 */
import * as React from "react";
import { useRouter } from "next/navigation";
import { DiscoverHero } from "./DiscoverHero";
import { FeaturedCapsule } from "./FeaturedCapsule";
import { HorizontalRail, ForYouCard, TimelineEpochCard } from "./DiscoverRails";


const API = process.env.NEXT_PUBLIC_KUDOS_API_URL || "";


interface DiscoverCard {
  poi_id: string;
  title: string;
  location: string;
  image_url: string;
  duration_s: number;
  video_url: string;
  evocative: string;
  tier?: string;
  category?: string;
}
interface TimelineItem {
  from: DiscoverCard;
  to: DiscoverCard;
  bridge: string;
}
interface DiscoverPayload {
  featured: DiscoverCard | null;
  for_you: DiscoverCard[];
  timelines: TimelineItem[];
  total_capsules: number;
}


export function HomeFeedV5() {
  const router = useRouter();
  const [data, setData] = React.useState<DiscoverPayload | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (!API) {
      setError("NEXT_PUBLIC_KUDOS_API_URL no inyectada en build. Verifica env vars de Render frontend y haz Manual Deploy.");
      setLoading(false);
      return;
    }
    fetch(`${API}/api/discover/`, { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.text().catch(() => "");
          throw new Error(`HTTP ${r.status} ${body.slice(0, 120)}`);
        }
        return r.json();
      })
      .then((j) => {
        setData(j);
        setLoading(false);
      })
      .catch((e) => {
        setError(`Fetch ${API}/api/discover/ fallo: ${String(e?.message || e)}`);
        setLoading(false);
      });
  }, []);

  const goLocate = () => router.push("/world");

  return (
    <div style={ROOT}>
      <DiscoverHero onLocate={goLocate} />

      {loading && (
        <div style={LOAD_BOX}>Cargando descubrimientos...</div>
      )}

      {error && (
        <div style={SOFT_EMPTY}>
          <p style={SOFT_EMPTY_TITLE}>El mundo se está despertando.</p>
          <p style={SOFT_EMPTY_SUB}>Vuelve en un momento. Las historias están en camino.</p>
          <details style={SOFT_EMPTY_DETAILS}>
            <summary style={SOFT_EMPTY_SUMMARY}>Detalles técnicos</summary>
            <code style={SOFT_EMPTY_CODE}>{error}</code>
          </details>
        </div>
      )}

      {!loading && !error && !data?.featured && (
        <div style={SOFT_EMPTY}>
          <p style={SOFT_EMPTY_TITLE}>Aún no hay historias destacadas.</p>
          <p style={SOFT_EMPTY_SUB}>Explora el mapa para descubrir lugares por tu cuenta.</p>
        </div>
      )}

      {data?.featured && <FeaturedCapsule card={data.featured} />}

      {data?.for_you && data.for_you.length > 0 && (
        <HorizontalRail title="Para ti, hoy" seeAll={() => router.push("/world")}>
          {data.for_you.map((c, i) => (
            <ForYouCard
              key={c.poi_id}
              card={c}
              progress={i === 0 ? 22 : i === 1 ? 0 : undefined}
            />
          ))}
        </HorizontalRail>
      )}

      {data?.timelines && data.timelines.length > 0 && (
        <HorizontalRail title="Historias que conectan epocas" seeAll={() => router.push("/world")}>
          {data.timelines.map((t, i) => (
            <TimelineEpochCard key={`tl-${i}`} item={t} />
          ))}
        </HorizontalRail>
      )}

      <FooterCalm />
    </div>
  );
}


function FooterCalm() {
  return (
    <footer style={FOOTER}>
      <div style={FOOTER_TXT}>KUDOS</div>
      <div style={FOOTER_SUB}>La capa narrativa de la humanidad.</div>
    </footer>
  );
}


const ROOT: React.CSSProperties = {
  background: "#0a0814",
  minHeight: "100vh",
  paddingBottom: 110,
  fontFamily: '"Poppins", system-ui, sans-serif',
  color: "#fff",
};
const SOFT_EMPTY: React.CSSProperties = {
  margin: "28px 20px",
  padding: "26px 22px",
  background: "rgba(139,107,255,0.06)",
  border: "1px solid rgba(139,107,255,0.18)",
  borderRadius: 16,
  textAlign: "center" as const,
};
const SOFT_EMPTY_TITLE: React.CSSProperties = {
  margin: "0 0 6px",
  fontFamily: 'var(--kudos-font-display, "Cormorant Garamond", Georgia, serif)',
  fontSize: 20,
  fontWeight: 500,
  color: "rgba(245,240,232,0.95)",
  lineHeight: 1.25,
};
const SOFT_EMPTY_SUB: React.CSSProperties = {
  margin: "0 0 12px",
  fontSize: 13,
  color: "rgba(245,240,232,0.6)",
  fontStyle: "italic",
  fontFamily: "Georgia, serif",
};
const SOFT_EMPTY_DETAILS: React.CSSProperties = {
  marginTop: 14,
  textAlign: "left" as const,
};
const SOFT_EMPTY_SUMMARY: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "rgba(245,240,232,0.4)",
  cursor: "pointer",
  paddingBottom: 6,
};
const SOFT_EMPTY_CODE: React.CSSProperties = {
  display: "block",
  fontSize: 10,
  color: "rgba(245,240,232,0.5)",
  fontFamily: "monospace",
  padding: 8,
  background: "rgba(0,0,0,0.25)",
  borderRadius: 6,
  overflowWrap: "break-word" as const,
};
const LOAD_BOX: React.CSSProperties = {
  margin: "18px 16px",
  padding: "12px 14px",
  background: "rgba(139,107,255,0.08)",
  border: "1px solid rgba(139,107,255,0.18)",
  borderRadius: 10,
  color: "rgba(255,255,255,0.7)",
  fontSize: 13,
  textAlign: "center" as const,
};
const FOOTER: React.CSSProperties = {
  textAlign: "center" as const,
  padding: "40px 20px 16px",
};
const FOOTER_TXT: React.CSSProperties = {
  fontSize: 12,
  letterSpacing: "0.32em",
  fontWeight: 700,
  color: "rgba(201,169,97,0.7)",
};
const FOOTER_SUB: React.CSSProperties = {
  marginTop: 4,
  fontSize: 11,
  color: "rgba(255,255,255,0.35)",
  fontStyle: "italic",
};
