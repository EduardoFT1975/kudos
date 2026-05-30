"use client";
/**
 * KUDOS - PoiTimeline - PROMPT 4/6.
 *
 * Bloque 4 de la pantalla POI MVP.
 * Timeline visual simple: pills horizontales (fechas activas) + 5 imágenes con label.
 * NO motor temporal. Datos hardcoded por POI con fallback genérico.
 */
import * as React from "react";


export interface TimelineMilestone {
  era: string;        // "80 d.C." | "1500" | "Hoy"
  label: string;      // "En su máximo esplendor"
  image_url?: string;
}


interface Props {
  poiId: string;
  poiImageUrl?: string;
  milestones?: TimelineMilestone[];
}


// Fallback genérico cuando un POI no tiene timeline hardcoded
const TIMELINE_BY_POI: Record<string, TimelineMilestone[]> = {
  "wd-Q10285": [
    { era: "80 d.C.",  label: "En su máximo esplendor" },
    { era: "120 d.C.", label: "Tras las modificaciones" },
    { era: "1500",     label: "Piedra para otras obras" },
    { era: "1800",     label: "Descubrimiento romántico" },
    { era: "Hoy",      label: "Patrimonio mundial" },
  ],
  "wd-Q12892": [
    { era: "1238",  label: "Inicio de la Alhambra" },
    { era: "1350",  label: "Edad de oro nazarí" },
    { era: "1492",  label: "Caída de Granada" },
    { era: "1830",  label: "Redescubrimiento romántico" },
    { era: "Hoy",   label: "Patrimonio UNESCO" },
  ],
  "wd-Q131013": [
    { era: "447 a.C.", label: "Construcción del Partenón" },
    { era: "267 d.C.", label: "Invasión hérula" },
    { era: "1456",     label: "Conquista otomana" },
    { era: "1834",     label: "Restauración" },
    { era: "Hoy",      label: "Cuna de la civilización" },
  ],
};

const GENERIC_TIMELINE: TimelineMilestone[] = [
  { era: "Origen",        label: "Construcción y nacimiento" },
  { era: "Apogeo",        label: "Su mejor momento" },
  { era: "Declive",       label: "Transformaciones" },
  { era: "Redescubrimiento", label: "Vuelve a la luz" },
  { era: "Hoy",           label: "Tu visita" },
];


export function PoiTimeline({ poiId, poiImageUrl, milestones }: Props) {
  const data = milestones || TIMELINE_BY_POI[poiId] || GENERIC_TIMELINE;
  const [active, setActive] = React.useState(0);

  return (
    <section style={WRAP}>
      <header style={HEAD}>
        <h2 style={TITLE}>Explorar en el tiempo</h2>
        <button style={SEE_ALL}>
          Ver timeline completo <span style={{ color: "#8B6BFF" }}>›</span>
        </button>
      </header>

      <div style={PILLS}>
        {data.map((m, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            style={{
              ...PILL,
              ...(i === active ? PILL_ACTIVE : null),
            }}
          >
            {m.era}
          </button>
        ))}
      </div>

      <div style={GALLERY}>
        {data.map((m, i) => {
          const baseImg = m.image_url || poiImageUrl;
          const eraFilter = filterForEra(m.era, i === active);
          return (
            <div key={i} style={{ ...GALLERY_CARD, ...(i === active ? GALLERY_CARD_ACTIVE : null) }}>
              <div
                style={{
                  ...GALLERY_HERO,
                  backgroundImage: baseImg
                    ? `linear-gradient(180deg, rgba(0,0,0,0.0) 45%, rgba(10,8,20,0.88) 100%), url(${baseImg})`
                    : "linear-gradient(135deg, #2a1542, #1a0f2e)",
                  filter: eraFilter,
                  border: i === active
                    ? "1px solid rgba(201,169,97,0.45)"
                    : "1px solid rgba(255,255,255,0.06)",
                  boxShadow: i === active
                    ? "0 6px 22px rgba(201,169,97,0.18)"
                    : "0 2px 10px rgba(0,0,0,0.35)",
                }}
              >
                <span style={GALLERY_ERA}>{m.era}</span>
                {!baseImg && <span style={GALLERY_ICON_FALLBACK}>◐</span>}
              </div>
              <div style={GALLERY_LABEL}>{m.label}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}


// ============== styles ==============

const WRAP: React.CSSProperties = {
  padding: "26px 16px 12px",
};
const HEAD: React.CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  marginBottom: 14,
};
const TITLE: React.CSSProperties = {
  fontFamily: 'var(--kudos-font-display, "Cormorant Garamond", Georgia, serif)',
  fontSize: 22,
  fontWeight: 500,
  color: "#fff",
  margin: 0,
};
const SEE_ALL: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "rgba(255,255,255,0.7)",
  fontSize: 12,
  cursor: "pointer",
  fontFamily: "inherit",
};
const PILLS: React.CSSProperties = {
  display: "flex",
  gap: 8,
  overflowX: "auto" as const,
  WebkitOverflowScrolling: "touch" as const,
  paddingBottom: 4,
  marginBottom: 14,
};
const PILL: React.CSSProperties = {
  padding: "6px 14px",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  color: "rgba(255,255,255,0.7)",
  fontSize: 12,
  fontWeight: 500,
  borderRadius: 999,
  cursor: "pointer",
  whiteSpace: "nowrap" as const,
  flexShrink: 0,
};
const PILL_ACTIVE: React.CSSProperties = {
  background: "rgba(139,107,255,0.85)",
  border: "1px solid #8B6BFF",
  color: "#fff",
};

const GALLERY: React.CSSProperties = {
  display: "flex",
  gap: 10,
  overflowX: "auto" as const,
  WebkitOverflowScrolling: "touch" as const,
  paddingBottom: 6,
};
const GALLERY_CARD: React.CSSProperties = {
  flexShrink: 0,
  width: 150,
};
const GALLERY_CARD_ACTIVE: React.CSSProperties = {
  // marker visual
};
const GALLERY_HERO: React.CSSProperties = {
  position: "relative",
  width: "100%",
  height: 130,
  borderRadius: 12,
  overflow: "hidden",
  backgroundSize: "cover",
  backgroundPosition: "center",
  border: "1px solid rgba(255,255,255,0.06)",
  transition: "filter 320ms ease, box-shadow 320ms ease, border 320ms ease",
};
const GALLERY_ERA: React.CSSProperties = {
  position: "absolute",
  bottom: 8,
  left: 10,
  fontSize: 12,
  fontWeight: 700,
  color: "#fff",
  textShadow: "0 1px 4px rgba(0,0,0,0.7)",
};
const GALLERY_LABEL: React.CSSProperties = {
  marginTop: 6,
  fontSize: 11,
  color: "rgba(255,255,255,0.75)",
  lineHeight: 1.3,
};
const GALLERY_ICON_FALLBACK: React.CSSProperties = {
  position: "absolute" as const,
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  fontSize: 28,
  color: "rgba(255,255,255,0.45)",
};

function filterForEra(era: string, isActive: boolean): string {
  const e = era.toLowerCase();
  if (e.includes("hoy")) return isActive ? "none" : "brightness(0.85)";
  if (e.includes("a.c.") || e.includes("ac")) return isActive ? "sepia(0.6) saturate(1.15) brightness(1.05)" : "sepia(0.5) brightness(0.78)";
  if (e.includes("d.c.") || e.includes("dc")) return isActive ? "sepia(0.45) hue-rotate(-8deg)" : "sepia(0.4) brightness(0.78)";
  if (/1[3-6]\d{2}/.test(e)) return isActive ? "grayscale(0.55) sepia(0.35) brightness(0.92)" : "grayscale(0.7) brightness(0.7)";
  if (/1[7-9]\d{2}/.test(e)) return isActive ? "sepia(0.5) contrast(1.08) brightness(0.96)" : "sepia(0.5) brightness(0.75)";
  return isActive ? "none" : "sepia(0.3) brightness(0.82)";
}
