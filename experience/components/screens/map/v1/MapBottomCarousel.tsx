"use client";
/**
 * KUDOS - MapBottomCarousel - PROMPT 3/6.
 *
 * Carousel inferior con 3 cards flotantes (peek a izquierda y derecha).
 * Card central: imperdible (gradiente + chip ✦ IMPERDIBLE + CTA "Ver capsula").
 * Cards laterales: peek con sombra suave.
 */
import * as React from "react";
import { useRouter } from "next/navigation";
import type { MapBottomCard } from "./romaMock";


interface Props {
  cards: MapBottomCard[];
}


export function MapBottomCarousel({ cards }: Props) {
  const router = useRouter();

  return (
    <div style={CAROUSEL_WRAP}>
      <div style={INNER}>
        {cards.map((c) => (
          <article
            key={c.poi_id}
            style={{
              ...CARD,
              ...(c.imperdible ? CARD_HIGHLIGHTED : null),
            }}
          >
            <div style={CARD_TOP}>
              <span style={DURATION_PILL}>
                <span style={CLOCK}>◷</span> {c.distance_label}
              </span>
              <button style={SAVE_ICON} aria-label="Guardar">⌘</button>
            </div>

            <div
              style={{
                ...HERO,
                backgroundImage: c.image_url
                  ? `linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.55) 100%), url(${c.image_url})`
                  : "linear-gradient(135deg, #2a1542, #1a0f2e)",
              }}
            >
              {c.imperdible && (
                <div style={IMPERDIBLE_CHIP}>
                  <span style={STAR}>✦</span> IMPERDIBLE
                </div>
              )}
              <h3 style={NAME}>{c.name}</h3>
            </div>

            <div style={BODY}>
              <p style={DESC}>{c.evocative}</p>
              {c.imperdible && (
                <button
                  onClick={() => router.push(`/poi/${c.poi_id}?play=1`)}
                  style={CTA_PRIMARY}
                >
                  ▶ &nbsp;Ver cápsula
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}


// ============== styles ==============

const CAROUSEL_WRAP: React.CSSProperties = {
  position: "absolute",
  left: 0,
  right: 0,
  bottom: 86,    // espacio para bottom nav
  zIndex: 20,
  paddingBottom: 8,
};

const INNER: React.CSSProperties = {
  display: "flex",
  gap: 14,
  overflowX: "auto" as const,
  WebkitOverflowScrolling: "touch" as const,
  padding: "0 22px",
  scrollSnapType: "x mandatory" as const,
};

const CARD: React.CSSProperties = {
  flexShrink: 0,
  width: 260,
  background: "rgba(15,10,31,0.85)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 18,
  overflow: "hidden",
  backdropFilter: "blur(14px)",
  boxShadow: "0 16px 40px rgba(0,0,0,0.45)",
  scrollSnapAlign: "center" as const,
};

const CARD_HIGHLIGHTED: React.CSSProperties = {
  width: 300,
  background: "rgba(15,10,31,0.92)",
  border: "1px solid rgba(201,169,97,0.32)",
  boxShadow: "0 20px 50px rgba(0,0,0,0.6), 0 0 28px rgba(201,169,97,0.18)",
};

const CARD_TOP: React.CSSProperties = {
  position: "absolute",
  top: 10,
  left: 12,
  right: 12,
  display: "flex",
  justifyContent: "space-between",
  zIndex: 4,
};

const DURATION_PILL: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  padding: "4px 10px",
  background: "rgba(0,0,0,0.55)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 999,
  color: "#fff",
  fontSize: 11,
  fontWeight: 600,
};

const CLOCK: React.CSSProperties = { fontSize: 10 };

const SAVE_ICON: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 8,
  background: "rgba(0,0,0,0.55)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "#fff",
  fontSize: 12,
  cursor: "pointer",
};

const HERO: React.CSSProperties = {
  position: "relative",
  height: 160,
  backgroundSize: "cover",
  backgroundPosition: "center",
  display: "flex",
  alignItems: "flex-end",
  padding: 14,
};

const IMPERDIBLE_CHIP: React.CSSProperties = {
  position: "absolute",
  top: 60,
  left: 14,
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "3px 9px",
  background: "rgba(201,169,97,0.22)",
  border: "1px solid rgba(201,169,97,0.5)",
  borderRadius: 999,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.18em",
  color: "#C9A961",
};

const STAR: React.CSSProperties = { color: "#C9A961", fontSize: 11 };

const NAME: React.CSSProperties = {
  margin: 0,
  fontFamily: 'var(--kudos-font-display, "Cormorant Garamond", Georgia, serif)',
  fontSize: 26,
  fontWeight: 500,
  color: "#fff",
  textShadow: "0 1px 6px rgba(0,0,0,0.7)",
  letterSpacing: "-0.005em",
};

const BODY: React.CSSProperties = {
  padding: "14px 16px 16px",
};

const DESC: React.CSSProperties = {
  fontSize: 13,
  lineHeight: 1.55,
  color: "rgba(255,255,255,0.78)",
  margin: 0,
};

const CTA_PRIMARY: React.CSSProperties = {
  marginTop: 14,
  width: "100%",
  padding: "11px 14px",
  background: "linear-gradient(135deg, #8B6BFF 0%, #6e4dd6 100%)",
  color: "#fff",
  border: "none",
  borderRadius: 12,
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: "0.04em",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};
