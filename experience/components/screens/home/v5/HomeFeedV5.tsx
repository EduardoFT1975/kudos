"use client";
/**
 * KUDOS - HomeFeedV5 - PROMPT 2/6 Discover MVP (rectificado segun maqueta real).
 *
 * Bloques (en orden, alineados a maqueta):
 *   1. DiscoverHero       (mundo nocturno + titulo multi-slide + locate btn)
 *   2. FeaturedCapsule    (full-image hero "DESTACADO")
 *   3. Para ti, hoy       (rail horizontal con ForYouCard)
 *   4. Historias que conectan epocas (rail horizontal TimelineEpochCard)
 *
 * NO contiene (CONGELADO, archivos preservados):
 *   - CoreDelDia.tsx
 *   - HumanQuestionCard.tsx
 *   - DiscoveryChain.tsx
 *   - MemoryPrompt
 *
 * Datos: GET /api/discover/
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

  React.useEffect(() => {
    if (typeof window === "undefined" || !API) {
      setError("API no configurada");
      return;
    }
    fetch(`${API}/api/discover/`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j) => setData(j))
      .catch((e) => setError(String(e?.message || e)));
  }, []);

  const goLocate = () => router.push("/world");

  return (
    <div style={ROOT}>
      <DiscoverHero onLocate={goLocate} />

      {error && (
        <div style={ERR_BOX}>
          No hemos podido cargar el feed. Reintenta en un momento.
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
