"use client";
/**
 * KUDOS HomeFeed v5 · Carrusel horizontal "Para ti, hoy".
 *
 * Si hay items reales del manifest los muestra · si no, fallback con 3 placeholders
 * del mockup (Atlántida · Biblioteca de Alejandría · Rapa Nui).
 */
import * as React from "react";
import type { CapsuleManifestItem } from "./types";


interface RailItem {
  id: string;
  capsule: CapsuleManifestItem;
}

interface Props {
  title: string;
  items: RailItem[];
  onPlay: (id: string) => void;
  onSeeAll?: () => void;
}


const PLACEHOLDER_CARDS = [
  {
    id: "placeholder-atlantida",
    title: "La Atlántida no era un mito",
    subtitle: "HISTORIA · OCÉANO",
    duration: "15\"",
    gradient: "linear-gradient(135deg, #0d2237 0%, #1f4060 50%, #2a5882 100%)",
    glyph: "🌊",
  },
  {
    id: "placeholder-biblioteca",
    title: "La biblioteca que cambió el mundo",
    subtitle: "ALEJANDRÍA, EGIPTO",
    duration: "30\"",
    gradient: "linear-gradient(135deg, #3a1f0a 0%, #6b3c12 50%, #8b5a2a 100%)",
    glyph: "📜",
  },
  {
    id: "placeholder-rapanui",
    title: "Los secretos de Rapa Nui",
    subtitle: "ISLA DE PASCUA, CHILE",
    duration: "20\"",
    gradient: "linear-gradient(135deg, #3a2438 0%, #6b4258 50%, #b07054 100%)",
    glyph: "🗿",
  },
];


export function StoryRail({ title, items, onPlay, onSeeAll }: Props) {
  return (
    <div style={SECTION}>
      <div style={HEADER}>
        <h3 style={H3}>{title}</h3>
        {onSeeAll && (
          <button style={SEE_ALL} onClick={onSeeAll}>
            <span>Ver todo</span>
            <span style={{ marginLeft: 4 }}>›</span>
          </button>
        )}
      </div>

      <div style={SCROLL}>
        {/* Cápsulas reales (si las hay) */}
        {items.map(({ id, capsule }) => (
          <RealCard key={id} capsule={capsule} onClick={() => onPlay(id)} />
        ))}
        {/* Si no hay 3, completar con placeholders */}
        {items.length < 3 && PLACEHOLDER_CARDS.slice(0, 3 - items.length).map((p) => (
          <PlaceholderCard key={p.id} placeholder={p} />
        ))}
      </div>
    </div>
  );
}


function RealCard({ capsule, onClick }: { capsule: CapsuleManifestItem; onClick: () => void }) {
  const title = capsule.name.length > 32 ? capsule.name.slice(0, 30) + "…" : capsule.name;
  const subtitle = makeSubtitle(capsule.name);
  return (
    <div style={CARD} onClick={onClick}>
      <div style={CARD_HERO}>
        <div style={CARD_OVERLAY} />
        <div style={CARD_DUR}>
          <span>{Math.round(15 + Math.random() * 30)}"</span>
          <span style={{ marginLeft: 4 }}>▶</span>
        </div>
      </div>
      <div style={CARD_BODY}>
        <div style={CARD_TITLE}>{title}</div>
        <div style={CARD_SUBTITLE}>{subtitle}</div>
        <div style={CARD_BAR}><div style={{ ...CARD_BAR_FILL, width: `${Math.random() * 80 + 20}%` }} /></div>
      </div>
    </div>
  );
}


function PlaceholderCard({ placeholder }: { placeholder: typeof PLACEHOLDER_CARDS[0] }) {
  return (
    <div style={{ ...CARD, cursor: "default", opacity: 0.85 }}>
      <div style={{ ...CARD_HERO, background: placeholder.gradient }}>
        <div style={CARD_OVERLAY} />
        <div style={{ ...CARD_DUR, opacity: 0.85 }}>
          <span>{placeholder.duration}</span>
          <span style={{ marginLeft: 4 }}>▶</span>
        </div>
        <div style={CARD_GLYPH}>{placeholder.glyph}</div>
      </div>
      <div style={CARD_BODY}>
        <div style={CARD_TITLE}>{placeholder.title}</div>
        <div style={CARD_SUBTITLE}>{placeholder.subtitle}</div>
        <div style={CARD_BAR}><div style={{ ...CARD_BAR_FILL, width: "30%" }} /></div>
      </div>
    </div>
  );
}


function makeSubtitle(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("alhambra")) return "GRANADA · HISTORIA";
  if (n.includes("sagrada familia")) return "BARCELONA · ARTE";
  if (n.includes("acrópolis")) return "ATENAS · FILOSOFÍA";
  if (n.includes("coliseo")) return "ROMA · IMPERIO";
  if (n.includes("foro romano")) return "ROMA · POLÍTICA";
  if (n.includes("notre-dame")) return "PARÍS · FE";
  if (n.includes("eiffel")) return "PARÍS · INGENIERÍA";
  if (n.includes("pompeya")) return "NÁPOLES · MEMORIA";
  return "DESCUBRE · HISTORIA";
}


const SECTION: React.CSSProperties = { padding: "12px 0 4px" };
const HEADER: React.CSSProperties = {
  display: "flex", alignItems: "baseline", justifyContent: "space-between",
  padding: "12px 22px 10px",
};
const H3: React.CSSProperties = {
  margin: 0,
  fontFamily: 'Georgia, "Times New Roman", serif',
  fontSize: 26, fontWeight: 400, color: "#fff",
  letterSpacing: "-0.005em",
};
const SEE_ALL: React.CSSProperties = {
  background: "transparent", border: "none", color: "#8B6BFF",
  fontSize: 12, cursor: "pointer", padding: 4,
  fontFamily: '"Poppins", system-ui, sans-serif',
};

const SCROLL: React.CSSProperties = {
  display: "flex", gap: 12, padding: "4px 16px 14px",
  overflowX: "auto", scrollbarWidth: "none",
  WebkitOverflowScrolling: "touch",
};

const CARD: React.CSSProperties = {
  flexShrink: 0, width: 200, cursor: "pointer",
  background: "#0f0a1f", borderRadius: 18, overflow: "hidden",
  border: "1px solid rgba(139,107,255,0.1)",
};

const CARD_HERO: React.CSSProperties = {
  position: "relative", width: "100%", height: 240,
  background: "linear-gradient(135deg, #2a1542 0%, #1a0f2e 100%)",
  backgroundSize: "cover", backgroundPosition: "center",
};
const CARD_OVERLAY: React.CSSProperties = {
  position: "absolute", inset: 0,
  background: "linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(15,10,31,0.55) 100%)",
};
const CARD_DUR: React.CSSProperties = {
  position: "absolute", top: 10, right: 10,
  display: "flex", alignItems: "center",
  padding: "4px 10px", borderRadius: 999,
  background: "rgba(15,10,31,0.85)",
  fontSize: 11, fontWeight: 600, color: "#fff",
  fontFamily: '"Poppins", system-ui, sans-serif',
  backdropFilter: "blur(4px)",
};
const CARD_GLYPH: React.CSSProperties = {
  position: "absolute", top: "40%", left: "50%",
  transform: "translate(-50%, -50%)",
  fontSize: 56, opacity: 0.4,
};

const CARD_BODY: React.CSSProperties = {
  padding: "14px 16px 16px",
  fontFamily: '"Poppins", system-ui, sans-serif',
};
const CARD_TITLE: React.CSSProperties = {
  fontSize: 15, fontWeight: 600, color: "#fff",
  lineHeight: 1.3, marginBottom: 8,
  fontFamily: 'Georgia, "Times New Roman", serif',
  fontWeight: 400,
};
const CARD_SUBTITLE: React.CSSProperties = {
  fontSize: 10, fontWeight: 600, color: "#8B6BFF",
  letterSpacing: "0.14em",
};
const CARD_BAR: React.CSSProperties = {
  height: 3, marginTop: 12,
  background: "rgba(139,107,255,0.18)",
  borderRadius: 999, overflow: "hidden",
};
const CARD_BAR_FILL: React.CSSProperties = {
  height: "100%",
  background: "linear-gradient(90deg, #8B6BFF, #6e4dd6)",
  borderRadius: 999,
};
