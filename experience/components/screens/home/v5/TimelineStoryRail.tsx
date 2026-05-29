"use client";
/**
 * KUDOS · TimelineStoryRail · Home Feed v5
 *
 * "Historias que conectan épocas" — el bloque de profundidad narrativa
 * que faltaba en HomeFeed según auditoría CTO.
 * Renderiza cards horizontales con época, hook y POI vinculado.
 * Click → /poi/{id}?narrative={type}
 */
import * as React from "react";
import { useRouter } from "next/navigation";


interface StoryItem {
  era: string;
  era_label: string;
  hook: string;
  narrative_type: string;
  poi_id?: string;
  bg_gradient: string;
  icon: string;
}


// Curaduría manual · 8 hilos temporales que conectan épocas con POIs reales
const TIMELINE_STORIES: StoryItem[] = [
  {
    era: "80 d.C.",
    era_label: "Esplendor Imperial",
    hook: "Cuando los espectáculos llenaban el Coliseo y Roma era la capital del mundo conocido.",
    narrative_type: "Lost World",
    poi_id: "wd-Q10285",
    bg_gradient: "linear-gradient(135deg, #6e4dd6 0%, #c95858 100%)",
    icon: "🏛",
  },
  {
    era: "1238",
    era_label: "Nace la Alhambra",
    hook: "Geometría, agua y luz se conjuran en la última corte nazarí.",
    narrative_type: "Hidden Truth",
    poi_id: "wd-Q12892",
    bg_gradient: "linear-gradient(135deg, #C9A961 0%, #8B6BFF 100%)",
    icon: "✶",
  },
  {
    era: "447 a.C.",
    era_label: "Atenas inventa el cielo",
    hook: "La Acrópolis se levanta y con ella nace una forma nueva de ser humano.",
    narrative_type: "Transformation",
    poi_id: "wd-Q131013",
    bg_gradient: "linear-gradient(135deg, #4080c8 0%, #8B6BFF 100%)",
    icon: "⚖",
  },
  {
    era: "1163",
    era_label: "París levanta su catedral",
    hook: "Ocho siglos después, la piedra de Notre-Dame sigue cantando.",
    narrative_type: "Human Story",
    poi_id: "wd-Q2981",
    bg_gradient: "linear-gradient(135deg, #6e4dd6 0%, #4080c8 100%)",
    icon: "✟",
  },
  {
    era: "1882",
    era_label: "Gaudí empieza la Sagrada",
    hook: "Una obra que cruza siglos. El templo que todavía no ha terminado de nacer.",
    narrative_type: "Present Connection",
    poi_id: "wd-Q12506",
    bg_gradient: "linear-gradient(135deg, #E0815A 0%, #6e4dd6 100%)",
    icon: "✦",
  },
  {
    era: "1889",
    era_label: "El hierro toca el cielo",
    hook: "La Torre Eiffel era provisional. Aprendió a quedarse.",
    narrative_type: "Mystery",
    poi_id: "wd-Q243",
    bg_gradient: "linear-gradient(135deg, #4a9d5f 0%, #C9A961 100%)",
    icon: "🗼",
  },
];


export function TimelineStoryRail() {
  const router = useRouter();

  function open(s: StoryItem) {
    if (s.poi_id) router.push(`/poi/${s.poi_id}`);
  }

  return (
    <section style={WRAP}>
      <div style={HEAD}>
        <div>
          <h2 style={TITLE}>Historias que conectan épocas</h2>
          <p style={SUB}>El tiempo cuenta historias. Cada lugar, una puerta a otro siglo.</p>
        </div>
        <a style={SEE_ALL} href="/world">Ver mapa del tiempo ›</a>
      </div>

      <div style={RAIL}>
        {TIMELINE_STORIES.map((s, i) => (
          <button key={i} style={CARD} onClick={() => open(s)}>
            <div style={{ ...HERO, background: s.bg_gradient }}>
              <span style={ICON}>{s.icon}</span>
              <span style={ERA_PILL}>{s.era}</span>
            </div>
            <div style={BODY}>
              <div style={ERA_LBL}>{s.era_label}</div>
              <div style={HOOK}>{s.hook}</div>
              <div style={TYPE_TAG}>{s.narrative_type}</div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}


const WRAP: React.CSSProperties = {
  padding: "24px 18px 8px",
};
const HEAD: React.CSSProperties = {
  display: "flex", justifyContent: "space-between", alignItems: "flex-end",
  marginBottom: 14, gap: 8,
};
const TITLE: React.CSSProperties = {
  fontFamily: 'var(--kudos-font-display, "Cormorant Garamond", serif)',
  fontSize: 22, fontWeight: 600, color: "#fff", margin: 0,
  letterSpacing: "-0.01em",
};
const SUB: React.CSSProperties = {
  fontSize: 12, color: "rgba(255,255,255,0.55)", margin: "4px 0 0",
};
const SEE_ALL: React.CSSProperties = {
  fontSize: 12, color: "#8B6BFF", textDecoration: "none",
  whiteSpace: "nowrap", paddingTop: 8,
};
const RAIL: React.CSSProperties = {
  display: "flex", gap: 12, overflowX: "auto" as const,
  paddingBottom: 8, scrollbarWidth: "none" as any,
};
const CARD: React.CSSProperties = {
  flex: "0 0 auto", width: 220, minWidth: 220,
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 14, overflow: "hidden" as const,
  cursor: "pointer", textAlign: "left" as const,
  padding: 0, color: "#fff", fontFamily: "inherit",
  transition: "transform 200ms, border-color 200ms",
};
const HERO: React.CSSProperties = {
  position: "relative", height: 110,
  display: "flex", alignItems: "center", justifyContent: "center",
};
const ICON: React.CSSProperties = {
  fontSize: 36, opacity: 0.85,
  filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.35))",
};
const ERA_PILL: React.CSSProperties = {
  position: "absolute", top: 10, left: 10,
  padding: "3px 9px", borderRadius: 999,
  background: "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)",
  fontSize: 10, letterSpacing: "0.06em", color: "#fff",
  fontWeight: 600,
};
const BODY: React.CSSProperties = {
  padding: "12px 14px 14px",
};
const ERA_LBL: React.CSSProperties = {
  fontFamily: 'var(--kudos-font-display, "Cormorant Garamond", serif)',
  fontSize: 16, fontWeight: 600, color: "#fff",
  marginBottom: 6, letterSpacing: "-0.01em",
};
const HOOK: React.CSSProperties = {
  fontSize: 12, color: "rgba(255,255,255,0.7)",
  lineHeight: 1.45, marginBottom: 10,
  display: "-webkit-box" as any,
  WebkitLineClamp: 3, WebkitBoxOrient: "vertical" as any,
  overflow: "hidden" as const,
};
const TYPE_TAG: React.CSSProperties = {
  display: "inline-block",
  padding: "3px 8px", borderRadius: 6,
  background: "rgba(139,107,255,0.15)",
  border: "1px solid rgba(139,107,255,0.35)",
  fontSize: 10, color: "#8B6BFF",
  fontWeight: 600, letterSpacing: "0.03em",
};
