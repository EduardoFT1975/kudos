"use client";
/**
 * KUDOS HomeFeed v5 · Carrusel horizontal "Para ti, hoy"
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

export function StoryRail({ title, items, onPlay, onSeeAll }: Props) {
  if (items.length === 0) return null;

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
        {items.map(({ id, capsule }) => (
          <RailCard key={id} capsule={capsule} onClick={() => onPlay(id)} />
        ))}
      </div>
    </div>
  );
}


function RailCard({ capsule, onClick }: { capsule: CapsuleManifestItem; onClick: () => void }) {
  const title = makeShortTitle(capsule.name);
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
        <div style={CARD_BAR} />
      </div>
    </div>
  );
}

function makeShortTitle(name: string): string {
  if (name.length <= 32) return name;
  return name.slice(0, 30) + "...";
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


const SECTION: React.CSSProperties = { padding: "8px 0 4px" };
const HEADER: React.CSSProperties = {
  display: "flex", alignItems: "baseline", justifyContent: "space-between",
  padding: "12px 22px 10px",
};
const H3: React.CSSProperties = {
  margin: 0, fontSize: 17, fontWeight: 700, color: "#fff",
  fontFamily: '"Poppins", system-ui, sans-serif',
  letterSpacing: "-0.005em",
};
const SEE_ALL: React.CSSProperties = {
  background: "transparent", border: "none", color: "rgba(255,255,255,0.55)",
  fontSize: 12, cursor: "pointer", padding: 4,
  fontFamily: '"Poppins", system-ui, sans-serif',
};

const SCROLL: React.CSSProperties = {
  display: "flex", gap: 12, padding: "4px 16px 14px",
  overflowX: "auto", scrollbarWidth: "none",
  WebkitOverflowScrolling: "touch",
};

const CARD: React.CSSProperties = {
  flexShrink: 0, width: 160, cursor: "pointer",
  background: "#0f0a1f", borderRadius: 14, overflow: "hidden",
  border: "1px solid rgba(139,107,255,0.1)",
};

const CARD_HERO: React.CSSProperties = {
  position: "relative", width: "100%", height: 200,
  background: 'linear-gradient(135deg, #2a1542 0%, #1a0f2e 100%)',
  backgroundSize: "cover",
};
const CARD_OVERLAY: React.CSSProperties = {
  position: "absolute", inset: 0,
  background: "linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(15,10,31,0.55) 100%)",
};
const CARD_DUR: React.CSSProperties = {
  position: "absolute", top: 8, right: 8,
  display: "flex", alignItems: "center",
  padding: "3px 8px", borderRadius: 999,
  background: "rgba(15,10,31,0.75)",
  fontSize: 10, fontWeight: 600, color: "#fff",
  fontFamily: '"Poppins", system-ui, sans-serif',
  backdropFilter: "blur(4px)",
};
const CARD_BODY: React.CSSProperties = {
  padding: "12px 14px 14px",
  fontFamily: '"Poppins", system-ui, sans-serif',
};
const CARD_TITLE: React.CSSProperties = {
  fontSize: 13, fontWeight: 600, color: "#fff",
  lineHeight: 1.3, marginBottom: 4,
};
const CARD_SUBTITLE: React.CSSProperties = {
  fontSize: 9, fontWeight: 600, color: "#8B6BFF",
  letterSpacing: "0.14em",
};
const CARD_BAR: React.CSSProperties = {
  height: 2.5, marginTop: 10,
  background: "rgba(139,107,255,0.18)",
  borderRadius: 999, overflow: "hidden",
};
