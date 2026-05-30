"use client";
/**
 * KUDOS HomeMap v5 · bottom sheet horizontal con carrusel de POIs cercanos.
 * Al pulsar un POI · se muestra centrado con previas/siguientes a los lados.
 * Desliza horizontal · al click reproduce la cápsula.
 */
import * as React from "react";
import { AddToMyWorldButton } from "@/components/discovery/AddToMyWorldButton";


export interface CarouselPoi {
  id: string;
  name: string;
  image?: string;
  category: string;
  distanceLabel: string;          // "320 m" · "1,2 km" · etc.
  evocativeShort?: string;
}

interface Props {
  pois: CarouselPoi[];
  activeId: string | null;
  hasCapsule: (id: string) => boolean;
  onSelect: (id: string) => void;
  onPlayCapsule: (id: string) => void;
  onSave: (id: string) => void;
  onClose: () => void;
}

export function WorldBottomCarousel({
  pois, activeId, hasCapsule, onSelect, onPlayCapsule, onSave, onClose
}: Props) {
  if (!activeId || pois.length === 0) return null;

  return (
    <div style={WRAP}>
      <div style={DRAG_HANDLE} />
      <div style={SCROLL}>
        {pois.map((poi) => (
          <PoiCard
            key={poi.id}
            poi={poi}
            active={poi.id === activeId}
            hasCapsule={hasCapsule(poi.id)}
            onClick={() => onSelect(poi.id)}
            onPlay={() => onPlayCapsule(poi.id)}
            onSave={() => onSave(poi.id)}
          />
        ))}
      </div>
    </div>
  );
}


function PoiCard({ poi, active, hasCapsule, onClick, onPlay, onSave }: {
  poi: CarouselPoi; active: boolean; hasCapsule: boolean;
  onClick: () => void; onPlay: () => void; onSave: () => void;
}) {
  return (
    <div style={{
      ...CARD,
      opacity: active ? 1 : 0.55,
      transform: active ? "scale(1)" : "scale(0.92)",
    }} onClick={onClick}>
      {/* Hero */}
      <div style={{
        ...HERO,
        backgroundImage: poi.image ? `url("${poi.image}")` : undefined,
      }}>
        <div style={HERO_OVERLAY} />
        <div style={DIST_BADGE}>
          <span style={{ marginRight: 4 }}>◉</span>
          <span>{poi.distanceLabel}</span>
        </div>
        <div style={SAVE_BTN_WRAP} onClick={(e) => e.stopPropagation()}>
          <AddToMyWorldButton poiId={poi.id} poiName={poi.name} variant="compact" />
        </div>
        {hasCapsule && (
          <div style={IMPERDIBLE_BADGE}>
            <span style={{ marginRight: 4 }}>✦</span>
            <span>IMPERDIBLE</span>
          </div>
        )}
      </div>

      <div style={BODY}>
        <h3 style={TITLE}>{poi.name}</h3>
        <p style={DESC}>{poi.evocativeShort}</p>
        <button style={{
          ...CTA,
          background: hasCapsule ? "linear-gradient(135deg, #8B6BFF 0%, #6e4dd6 100%)" : "rgba(139,107,255,0.18)",
          color: hasCapsule ? "#fff" : "rgba(139,107,255,0.85)",
          cursor: hasCapsule ? "pointer" : "not-allowed",
        }} onClick={(e) => { e.stopPropagation(); if (hasCapsule) onPlay(); }}>
          <span style={{ marginRight: 8 }}>▶</span>
          {hasCapsule ? "Ver cápsula" : "Cápsula en preparación"}
        </button>
      </div>
    </div>
  );
}


const WRAP: React.CSSProperties = {
  position: "fixed",
  bottom: 80,            // sobre el bottom nav
  left: 0, right: 0,
  zIndex: 1500,
  pointerEvents: "auto",
  animation: "kudos-sheet-slide-up 0.34s cubic-bezier(0.22,1,0.36,1) both",
};

const DRAG_HANDLE: React.CSSProperties = {
  width: 38, height: 4,
  margin: "0 auto 6px",
  borderRadius: 999,
  background: "rgba(0,0,0,0.18)",
};

const SCROLL: React.CSSProperties = {
  display: "flex",
  gap: 12,
  padding: "0 16px 12px",
  overflowX: "auto",
  scrollbarWidth: "none",
  WebkitOverflowScrolling: "touch",
  scrollSnapType: "x mandatory",
};

const CARD: React.CSSProperties = {
  flexShrink: 0,
  width: 290,
  background: "rgba(15,10,31,0.96)",
  borderRadius: 18,
  overflow: "hidden",
  cursor: "pointer",
  border: "1px solid rgba(139,107,255,0.18)",
  boxShadow: "0 6px 20px rgba(0,0,0,0.28)",
  backdropFilter: "blur(10px)",
  scrollSnapAlign: "center",
  transition: "opacity 0.3s ease, transform 0.3s ease",
  fontFamily: '"Poppins", system-ui, sans-serif',
};

const HERO: React.CSSProperties = {
  position: "relative",
  width: "100%", height: 130,
  background: "linear-gradient(135deg, #2a1542 0%, #1a0f2e 100%)",
  backgroundSize: "cover",
  backgroundPosition: "center",
};
const HERO_OVERLAY: React.CSSProperties = {
  position: "absolute", inset: 0,
  background: "linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(15,10,31,0.55) 100%)",
};

const DIST_BADGE: React.CSSProperties = {
  position: "absolute", top: 10, left: 10,
  display: "inline-flex", alignItems: "center",
  padding: "4px 10px", borderRadius: 999,
  background: "rgba(15,10,31,0.7)",
  fontSize: 10.5, color: "#fff", fontWeight: 500,
  backdropFilter: "blur(6px)",
};

const SAVE_BTN_WRAP: React.CSSProperties = {
  position: "absolute", top: 6, right: 6,
};

const SAVE_BTN: React.CSSProperties = {
  position: "absolute", top: 8, right: 8,
  width: 28, height: 28, borderRadius: "50%",
  background: "rgba(15,10,31,0.7)",
  color: "#fff", border: "none",
  fontSize: 16, cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
  backdropFilter: "blur(6px)",
};

const IMPERDIBLE_BADGE: React.CSSProperties = {
  position: "absolute", bottom: 8, left: 10,
  display: "inline-flex", alignItems: "center",
  padding: "3px 9px", borderRadius: 999,
  background: "rgba(201,169,97,0.85)",
  fontSize: 9.5, color: "#fff", fontWeight: 700,
  letterSpacing: "0.14em",
};

const BODY: React.CSSProperties = {
  padding: "14px 16px 16px",
};
const TITLE: React.CSSProperties = {
  margin: "0 0 4px",
  fontFamily: 'Georgia, "Times New Roman", serif',
  fontWeight: 400,
  fontSize: 22,
  color: "#fff",
  lineHeight: 1.15,
};
const DESC: React.CSSProperties = {
  margin: "4px 0 12px",
  fontSize: 12.5,
  color: "rgba(255,255,255,0.65)",
  lineHeight: 1.4,
  minHeight: 34,
};
const CTA: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: 12,
  border: "none",
  fontSize: 13,
  fontWeight: 600,
  fontFamily: 'inherit',
};
