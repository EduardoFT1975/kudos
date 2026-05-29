"use client";
/**
 * KUDOS - FeaturedCapsule - PROMPT 2/6 (rectificado segun maqueta real).
 *
 * Full-image hero card (estilo Netflix banner):
 *  - Imagen grande del POI
 *  - "✦ DESTACADO" label dorado top-left
 *  - Badge duracion top-right con ▶ icon
 *  - Titulo serif grande (2 lineas)
 *  - Linea separadora dorada + "POI, PAÍS" en uppercase
 *  - Descripcion 2 lineas
 *  - "+ Guardar para después" CTA (icono pill morado)
 */
import * as React from "react";
import { useRouter } from "next/navigation";
import { AddToMyWorldButton } from "@/components/discovery/AddToMyWorldButton";


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


function formatDuration(s: number): string {
  if (s < 60) return `${s}"`;
  const min = Math.floor(s / 60);
  const sec = s % 60;
  return sec === 0 ? `${min}'` : `${min}'${sec}"`;
}


export function FeaturedCapsule({ card }: { card: DiscoverCard }) {
  const router = useRouter();
  const openPoi = () => router.push(`/poi/${card.poi_id}?play=1`);

  return (
    <section style={WRAP}>
      <article
        style={{
          ...CARD,
          backgroundImage: card.image_url
            ? `linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(10,8,20,0.75) 70%, rgba(10,8,20,0.95) 100%), url(${card.image_url})`
            : "linear-gradient(135deg, #2a1542, #1a0f2e)",
        }}
      >
        <div style={TOP_BAR}>
          <span style={DESTACADO}>
            <span style={STAR}>✦</span> DESTACADO
          </span>
          <button onClick={openPoi} style={DURATION_PILL} aria-label="Reproducir">
            {formatDuration(card.duration_s)}{" "}
            <span style={PLAY_ICON}>▶</span>
          </button>
        </div>

        <div style={BOTTOM}>
          <h2 style={TITLE}>{card.title}</h2>
          <div style={SEP_ROW}>
            <span style={SEP_LINE} />
            <span style={LOC}>{(card.location || "").toUpperCase()}</span>
          </div>
          <p style={DESC}>{card.evocative}</p>

          <div style={SAVE_ROW}>
            <AddToMyWorldButton
              poiId={card.poi_id}
              poiName={card.title}
              variant="compact"
              showMeaningPicker={false}
            />
            <span style={SAVE_LABEL}>Guardar para después</span>
          </div>
        </div>
      </article>
    </section>
  );
}


// ============== styles ==============

const WRAP: React.CSSProperties = {
  padding: "10px 16px 8px",
};
const CARD: React.CSSProperties = {
  position: "relative",
  width: "100%",
  height: 380,
  borderRadius: 18,
  overflow: "hidden",
  backgroundSize: "cover",
  backgroundPosition: "center",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  padding: 18,
};
const TOP_BAR: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
};
const DESTACADO: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontSize: 11,
  letterSpacing: "0.24em",
  fontWeight: 700,
  color: "rgba(201,169,97,0.95)",
};
const STAR: React.CSSProperties = {
  color: "#C9A961",
  fontSize: 14,
};
const DURATION_PILL: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 12px",
  background: "rgba(0,0,0,0.55)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 999,
  color: "#fff",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
};
const PLAY_ICON: React.CSSProperties = {
  color: "#fff",
  fontSize: 10,
};

const BOTTOM: React.CSSProperties = {};
const TITLE: React.CSSProperties = {
  fontFamily: 'var(--kudos-font-display, "Cormorant Garamond", Georgia, serif)',
  fontSize: 32,
  lineHeight: 1.15,
  fontWeight: 500,
  color: "#fff",
  margin: "0 0 10px",
  letterSpacing: "-0.005em",
};
const SEP_ROW: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  marginBottom: 10,
};
const SEP_LINE: React.CSSProperties = {
  width: 28,
  height: 2,
  background: "#C9A961",
};
const LOC: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.18em",
  color: "rgba(255,255,255,0.85)",
};
const DESC: React.CSSProperties = {
  fontFamily: '"Poppins", system-ui, sans-serif',
  fontSize: 13,
  lineHeight: 1.55,
  color: "rgba(255,255,255,0.85)",
  margin: "0 0 18px",
  maxWidth: 520,
};
const SAVE_ROW: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 12,
};
const SAVE_LABEL: React.CSSProperties = {
  fontSize: 13,
  color: "rgba(255,255,255,0.8)",
};
