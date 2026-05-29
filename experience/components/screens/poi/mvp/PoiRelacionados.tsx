"use client";
/**
 * KUDOS - PoiRelacionados - PROMPT 4/6.
 *
 * Bloque 6 de POI MVP.
 * Rail horizontal con mínimo 6 POIs relacionados.
 * Cada card: imagen + título + distancia/categoría + bookmark icon.
 * Click abre nuevo POI (sin cambiar de ruta padre).
 */
import * as React from "react";
import { useRouter } from "next/navigation";


export interface RelatedItem {
  poi_id: string;
  name: string;
  image_url?: string;
  distance_label?: string;
  category?: string;
}


interface Props {
  items: RelatedItem[];
}


export function PoiRelacionados({ items }: Props) {
  const router = useRouter();
  if (!items || items.length === 0) return null;

  return (
    <section style={WRAP}>
      <header style={HEAD}>
        <h2 style={TITLE}>Cápsulas relacionadas</h2>
        <button style={SEE_ALL}>
          Ver todas <span style={{ color: "#8B6BFF" }}>›</span>
        </button>
      </header>

      <div style={SCROLL}>
        <div style={INNER}>
          {items.map((it) => (
            <button
              key={it.poi_id}
              onClick={() => router.push(`/poi/${it.poi_id}`)}
              style={CARD}
              aria-label={it.name}
            >
              <div
                style={{
                  ...HERO,
                  backgroundImage: it.image_url
                    ? `linear-gradient(180deg, rgba(0,0,0,0) 50%, rgba(10,8,20,0.7) 100%), url(${it.image_url})`
                    : "linear-gradient(135deg, #2a1542, #1a0f2e)",
                }}
              >
                <span style={BOOKMARK} aria-hidden>⌘</span>
              </div>
              <div style={BODY}>
                <div style={NAME}>{it.name}</div>
                {it.distance_label && <div style={DIST}>{it.distance_label}</div>}
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}


// ============== styles ==============

const WRAP: React.CSSProperties = { padding: "26px 0 6px" };
const HEAD: React.CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  padding: "0 16px 14px",
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
const SCROLL: React.CSSProperties = {
  overflowX: "auto" as const,
  WebkitOverflowScrolling: "touch" as const,
  paddingBottom: 6,
};
const INNER: React.CSSProperties = {
  display: "flex",
  gap: 10,
  padding: "0 16px",
  width: "max-content",
};
const CARD: React.CSSProperties = {
  width: 168,
  flexShrink: 0,
  background: "rgba(15,10,31,0.5)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 12,
  overflow: "hidden",
  cursor: "pointer",
  padding: 0,
  textAlign: "left" as const,
};
const HERO: React.CSSProperties = {
  position: "relative",
  width: "100%",
  height: 110,
  backgroundSize: "cover",
  backgroundPosition: "center",
};
const BOOKMARK: React.CSSProperties = {
  position: "absolute",
  top: 8,
  right: 8,
  width: 26,
  height: 26,
  borderRadius: 6,
  background: "rgba(0,0,0,0.55)",
  color: "#fff",
  fontSize: 11,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};
const BODY: React.CSSProperties = { padding: "10px 12px" };
const NAME: React.CSSProperties = {
  fontFamily: 'var(--kudos-font-display, "Cormorant Garamond", Georgia, serif)',
  fontSize: 14,
  fontWeight: 500,
  color: "#fff",
  lineHeight: 1.2,
};
const DIST: React.CSSProperties = {
  marginTop: 4,
  fontSize: 11,
  color: "rgba(255,255,255,0.55)",
};
