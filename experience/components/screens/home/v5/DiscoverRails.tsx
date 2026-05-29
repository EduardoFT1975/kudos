"use client";
/**
 * KUDOS - DiscoverRails - PROMPT 2/6 (rectificado segun maqueta real).
 *
 *   - HorizontalRail    : seccion con label + rail scroll horizontal
 *   - ForYouCard        : tarjeta "Para ti, hoy" (foto + duracion + titulo serif
 *                          + categoria dorada + barra progreso pequena)
 *   - TimelineEpochCard : tarjeta GRANDE "Historias que conectan epocas" con
 *                          imagen compuesta + titulo serif + timeline horizontal
 *                          de 5 puntos cronologicos
 */
import * as React from "react";
import { useRouter } from "next/navigation";


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


function formatDuration(s: number): string {
  if (s < 60) return `${s}"`;
  const min = Math.floor(s / 60);
  const sec = s % 60;
  return sec === 0 ? `${min}'` : `${min}'${sec}"`;
}


// ===================== HorizontalRail =====================

export function HorizontalRail({
  title,
  seeAll,
  children,
}: {
  title: string;
  seeAll?: () => void;
  children: React.ReactNode;
}) {
  return (
    <section style={RAIL_WRAP}>
      <header style={RAIL_HEAD}>
        <h3 style={RAIL_TITLE}>{title}</h3>
        {seeAll && (
          <button onClick={seeAll} style={SEE_ALL}>
            Ver todo &nbsp;<span style={{ color: "#8B6BFF" }}>›</span>
          </button>
        )}
      </header>
      <div style={RAIL_SCROLL}>
        <div style={RAIL_INNER}>{children}</div>
      </div>
    </section>
  );
}


// ===================== ForYouCard =====================

export function ForYouCard({ card, progress }: { card: DiscoverCard; progress?: number }) {
  const router = useRouter();
  const cat = (card.category || "lugar").toUpperCase();
  const loc = (card.location || "").toUpperCase();
  return (
    <button
      onClick={() => router.push(`/poi/${card.poi_id}?play=1`)}
      style={CARD}
      aria-label={card.title}
    >
      <div
        style={{
          ...CARD_HERO,
          backgroundImage: card.image_url
            ? `linear-gradient(180deg, rgba(0,0,0,0) 35%, rgba(0,0,0,0.92) 100%), url(${card.image_url})`
            : "linear-gradient(135deg, #2a1542, #1a0f2e)",
        }}
      >
        <span style={CARD_DURATION}>
          {formatDuration(card.duration_s)} <span style={CARD_PLAY}>▶</span>
        </span>
        <div style={CARD_TITLE_OVER}>{card.title}</div>
      </div>
      <div style={CARD_FOOT}>
        <div style={CARD_CAT}>
          {cat} <span style={DOT_SEP}>·</span> {loc}
        </div>
        {typeof progress === "number" && (
          <div style={PROGRESS_TRACK}>
            <div style={{ ...PROGRESS_FILL, width: `${Math.min(100, progress)}%` }} />
          </div>
        )}
      </div>
    </button>
  );
}


// ===================== TimelineEpochCard =====================

const DEFAULT_EPOCHS = ["117 d.C.", "800 d.C.", "1453 d.C.", "1750 d.C.", "Hoy"];

export function TimelineEpochCard({ item }: { item: TimelineItem }) {
  const router = useRouter();
  // Activamos el punto central por defecto
  const activeIdx = 2;

  return (
    <article style={TL_CARD}>
      <button
        onClick={() => router.push(`/poi/${item.from.poi_id}`)}
        style={{
          ...TL_HERO,
          backgroundImage: item.from.image_url
            ? `linear-gradient(90deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.6) 100%), url(${item.from.image_url}), url(${item.to.image_url || ""})`
            : "linear-gradient(135deg, #2a1542, #1a0f2e)",
        }}
        aria-label={`${item.from.title} a ${item.to.title}`}
      >
        <span style={TL_DURATION}>
          60" <span style={CARD_PLAY}>▶</span>
        </span>
        <div style={TL_TITLE_OVER}>
          <div style={TL_TITLE}>
            De {item.from.title} a {item.to.title}
          </div>
          <div style={TL_SUB}>{item.bridge}</div>
        </div>
      </button>

      {/* Timeline horizontal */}
      <div style={TIMELINE_ROW}>
        <div style={TIMELINE_TRACK} />
        <div style={TIMELINE_POINTS}>
          {DEFAULT_EPOCHS.map((ep, i) => (
            <div key={i} style={TIMELINE_POINT_WRAP}>
              <span
                style={{
                  ...TIMELINE_DOT,
                  ...(i === activeIdx ? TIMELINE_DOT_ACTIVE : null),
                }}
              />
              <span
                style={{
                  ...TIMELINE_LABEL,
                  color: i === activeIdx ? "#8B6BFF" : "rgba(255,255,255,0.55)",
                  fontWeight: i === activeIdx ? 700 : 400,
                }}
              >
                {ep}
              </span>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}


// ============== styles ==============

const RAIL_WRAP: React.CSSProperties = { padding: "28px 0 6px" };
const RAIL_HEAD: React.CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  padding: "0 16px 14px",
};
const RAIL_TITLE: React.CSSProperties = {
  margin: 0,
  fontFamily: 'var(--kudos-font-display, "Cormorant Garamond", Georgia, serif)',
  fontSize: 22,
  fontWeight: 500,
  color: "#fff",
  letterSpacing: "-0.005em",
};
const SEE_ALL: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "rgba(255,255,255,0.75)",
  fontSize: 13,
  cursor: "pointer",
  fontFamily: "inherit",
};
const RAIL_SCROLL: React.CSSProperties = {
  overflowX: "auto" as const,
  overflowY: "hidden" as const,
  WebkitOverflowScrolling: "touch" as const,
  paddingBottom: 6,
};
const RAIL_INNER: React.CSSProperties = {
  display: "flex",
  gap: 12,
  padding: "0 16px",
  width: "max-content",
};

// ForYouCard
const CARD: React.CSSProperties = {
  display: "block",
  width: 200,
  flexShrink: 0,
  background: "rgba(15,10,31,0.4)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 14,
  overflow: "hidden",
  cursor: "pointer",
  padding: 0,
  textAlign: "left" as const,
};
const CARD_HERO: React.CSSProperties = {
  position: "relative",
  width: "100%",
  height: 230,
  backgroundSize: "cover",
  backgroundPosition: "center",
  padding: 10,
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
};
const CARD_DURATION: React.CSSProperties = {
  alignSelf: "flex-end",
  padding: "4px 10px",
  background: "rgba(0,0,0,0.6)",
  color: "#fff",
  fontSize: 11,
  fontWeight: 600,
  borderRadius: 999,
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
};
const CARD_PLAY: React.CSSProperties = {
  fontSize: 9,
};
const CARD_TITLE_OVER: React.CSSProperties = {
  fontFamily: 'var(--kudos-font-display, "Cormorant Garamond", Georgia, serif)',
  fontSize: 19,
  fontWeight: 500,
  color: "#fff",
  lineHeight: 1.2,
  letterSpacing: "-0.005em",
};
const CARD_FOOT: React.CSSProperties = {
  padding: "10px 12px 12px",
};
const CARD_CAT: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: "0.15em",
  color: "rgba(201,169,97,0.85)",
  fontWeight: 700,
  marginBottom: 8,
};
const DOT_SEP: React.CSSProperties = {
  margin: "0 6px",
  opacity: 0.6,
};
const PROGRESS_TRACK: React.CSSProperties = {
  width: 60,
  height: 2,
  background: "rgba(255,255,255,0.12)",
  borderRadius: 1,
};
const PROGRESS_FILL: React.CSSProperties = {
  height: "100%",
  background: "#8B6BFF",
  borderRadius: 1,
};

// TimelineEpochCard
const TL_CARD: React.CSSProperties = {
  width: "calc(100vw - 32px)",
  maxWidth: 560,
  flexShrink: 0,
  background: "rgba(15,10,31,0.4)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 16,
  overflow: "hidden",
};
const TL_HERO: React.CSSProperties = {
  position: "relative",
  width: "100%",
  height: 220,
  backgroundSize: "cover",
  backgroundPosition: "center",
  border: "none",
  padding: 16,
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  cursor: "pointer",
  textAlign: "left" as const,
};
const TL_DURATION: React.CSSProperties = {
  alignSelf: "flex-end",
  padding: "5px 12px",
  background: "rgba(0,0,0,0.55)",
  color: "#fff",
  fontSize: 12,
  fontWeight: 600,
  borderRadius: 999,
};
const TL_TITLE_OVER: React.CSSProperties = {};
const TL_TITLE: React.CSSProperties = {
  fontFamily: 'var(--kudos-font-display, "Cormorant Garamond", Georgia, serif)',
  fontSize: 24,
  fontWeight: 500,
  color: "#fff",
  lineHeight: 1.15,
  letterSpacing: "-0.005em",
};
const TL_SUB: React.CSSProperties = {
  marginTop: 6,
  fontSize: 12,
  color: "rgba(255,255,255,0.7)",
  fontFamily: '"Poppins", system-ui, sans-serif',
};
const TIMELINE_ROW: React.CSSProperties = {
  position: "relative",
  padding: "22px 16px 18px",
};
const TIMELINE_TRACK: React.CSSProperties = {
  position: "absolute",
  top: 31,
  left: "5%",
  right: "5%",
  height: 1,
  background: "linear-gradient(90deg, rgba(255,255,255,0.06), rgba(255,255,255,0.18), rgba(255,255,255,0.06))",
};
const TIMELINE_POINTS: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  position: "relative",
};
const TIMELINE_POINT_WRAP: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 8,
};
const TIMELINE_DOT: React.CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: "50%",
  background: "rgba(255,255,255,0.3)",
  border: "2px solid #0a0814",
};
const TIMELINE_DOT_ACTIVE: React.CSSProperties = {
  width: 14,
  height: 14,
  background: "#8B6BFF",
  boxShadow: "0 0 0 3px rgba(139,107,255,0.25)",
};
const TIMELINE_LABEL: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: "0.04em",
  fontFamily: '"Poppins", system-ui, sans-serif',
};
