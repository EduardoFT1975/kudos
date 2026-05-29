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
        <div style={ERR_BOX}>
          <strong>No se pudo cargar el feed.</strong>
          <br />
          <code style={{ fontSize: 11, color: "rgba(255,255,255,0.65)" }}>{error}</code>
        </div>
      )}

      {!loading && !error && !data?.featured && (
        <div style={ERR_BOX}>
          La API respondio OK pero sin datos. Verifica /api/discover/ desde el navegador.
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
const ERR_BOX: React.CSSProperties = {
  margin: "18px 16px",
  padding: "12px 14px",
  background: "rgba(168,88,88,0.12)",
  border: "1px solid rgba(168,88,88,0.25)",
  borderRadius: 10,
  color: "rgba(255,255,255,0.85)",
  fontSize: 13,
  lineHeight: 1.5,
  overflowWrap: "break-word",
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
