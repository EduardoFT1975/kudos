"use client";
/**
 * KUDOS - PoiHero - PROMPT 4/6 + SPRINT FINAL #1.
 *
 * REDISEÑO: imagen full-bleed dominante (no banner lateral).
 * Hero alto, foto cinematográfica, overlay sutil SOLO en la parte inferior
 * donde van los textos. Imagen primero. Emocion primero.
 */
import * as React from "react";
import { useRouter } from "next/navigation";


interface Props {
  poiId: string;
  name: string;
  category: string;
  country: string;
  flag?: string;
  shortDescription?: string;
  imageUrl?: string;
  rating?: number;
  ratingsCount?: number;
  tags?: string[];
  onShare?: () => void;
  onSave?: () => void;
  isSaved?: boolean;
}


export function PoiHero({
  poiId,
  name,
  category,
  country,
  flag,
  shortDescription,
  imageUrl,
  rating = 4.9,
  ratingsCount = 1248,
  tags,
  onShare,
  onSave,
  isSaved,
}: Props) {
  const router = useRouter();
  const _defaultTags = tags && tags.length > 0 ? tags : ["Historia", "Arquitectura", "Imperio"];

  return (
    <section style={ROOT}>
      {/* Imagen full-bleed, fondo absoluto */}
      <div
        style={{
          ...BG,
          backgroundImage: imageUrl
            ? `url(${imageUrl})`
            : "linear-gradient(135deg, #2a1542, #1a0f2e)",
        }}
        aria-hidden
      />

      {/* Gradient overlay SOLO en la parte inferior para legibilidad de los textos */}
      <div style={GRADIENT_OVERLAY} aria-hidden />

      {/* Top bar transparente sobre la imagen */}
      <header style={TOPBAR}>
        <button onClick={() => router.back()} style={TOP_BACK} aria-label="Volver">
          <span style={ARROW}>‹</span>
        </button>
        <div style={TOP_RIGHT_ICONS}>
          <button onClick={onShare} style={TOP_ICON_BTN} aria-label="Compartir">
            <ShareIcon />
          </button>
          <button onClick={onSave} style={TOP_ICON_BTN} aria-label="Guardar">
            <SaveIcon filled={!!isSaved} />
          </button>
          <button style={TOP_ICON_BTN} aria-label="Más">
            <MoreIcon />
          </button>
        </div>
      </header>

      {/* Contenido inferior sobre el gradient */}
      <div style={CONTENT}>
        <span style={EYEBROW}>{(category || "Lugar").toUpperCase()}</span>
        <h1 style={TITLE}>{name}</h1>

        <div style={META_ROW}>
          <span style={COUNTRY}>
            {flag && <span style={FLAG}>{flag}</span>} {country}
          </span>
          <span style={DOT}>·</span>
          <span style={RATING}>
            <span style={STAR}>★</span> {rating.toFixed(1)}
          </span>
          <span style={RATINGS_COUNT}>{ratingsCount.toLocaleString("es-ES")} valoraciones</span>
        </div>

        {shortDescription && (
          <p style={SHORT_DESC}>{shortDescription}</p>
        )}

        <div style={TAGS}>
          {_defaultTags.slice(0, 3).map((t) => (
            <span key={t} style={CHIP}>{t}</span>
          ))}
        </div>
      </div>
    </section>
  );
}


function ShareIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M12 3v13M7 8l5-5 5 5M5 21h14" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function SaveIcon({ filled }: { filled?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M6 3h12v18l-6-4-6 4z"
        stroke="#fff"
        strokeWidth="1.6"
        strokeLinejoin="round"
        fill={filled ? "#C9A961" : "none"}
      />
    </svg>
  );
}
function MoreIcon() {
  return (
    <svg width="4" height="18" viewBox="0 0 4 18" fill="none">
      <circle cx="2" cy="2" r="1.5" fill="#fff" />
      <circle cx="2" cy="9" r="1.5" fill="#fff" />
      <circle cx="2" cy="16" r="1.5" fill="#fff" />
    </svg>
  );
}


// ============== styles ==============

const ROOT: React.CSSProperties = {
  position: "relative",
  width: "100%",
  height: "75vh",
  minHeight: 520,
  maxHeight: 720,
  background: "#0a0814",
  overflow: "hidden",
};

const BG: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  backgroundSize: "cover",
  backgroundPosition: "center",
  zIndex: 0,
};

const GRADIENT_OVERLAY: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 1,
  background: "linear-gradient(180deg, rgba(10,8,20,0.15) 0%, rgba(10,8,20,0) 30%, rgba(10,8,20,0.45) 65%, rgba(10,8,20,0.92) 100%)",
  pointerEvents: "none",
};

const TOPBAR: React.CSSProperties = {
  position: "relative",
  zIndex: 3,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "20px 22px",
};

const TOP_BACK: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: "50%",
  background: "rgba(0,0,0,0.4)",
  border: "1px solid rgba(255,255,255,0.18)",
  color: "#fff",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  backdropFilter: "blur(8px)",
};
const ARROW: React.CSSProperties = { fontSize: 22, lineHeight: 1, marginTop: -2 };

const TOP_RIGHT_ICONS: React.CSSProperties = {
  display: "inline-flex",
  gap: 8,
};
const TOP_ICON_BTN: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: "50%",
  background: "rgba(0,0,0,0.4)",
  border: "1px solid rgba(255,255,255,0.18)",
  color: "#fff",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  backdropFilter: "blur(8px)",
};

const CONTENT: React.CSSProperties = {
  position: "absolute",
  bottom: 0,
  left: 0,
  right: 0,
  zIndex: 2,
  padding: "30px 22px 32px",
  maxWidth: 720,
};
const EYEBROW: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: "0.28em",
  fontWeight: 700,
  color: "rgba(201,169,97,0.95)",
  display: "block",
  marginBottom: 10,
  textShadow: "0 2px 8px rgba(0,0,0,0.55)",
};
const TITLE: React.CSSProperties = {
  fontFamily: 'var(--kudos-font-display, "Cormorant Garamond", Georgia, serif)',
  fontSize: 56,
  lineHeight: 1.0,
  fontWeight: 500,
  letterSpacing: "-0.015em",
  color: "#fff",
  margin: 0,
  textShadow: "0 2px 14px rgba(0,0,0,0.6)",
};
const META_ROW: React.CSSProperties = {
  marginTop: 14,
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 13,
  flexWrap: "wrap" as const,
};
const COUNTRY: React.CSSProperties = {
  color: "rgba(255,255,255,0.92)",
  textShadow: "0 1px 4px rgba(0,0,0,0.6)",
};
const FLAG: React.CSSProperties = { fontSize: 14, marginRight: 4 };
const DOT: React.CSSProperties = { color: "rgba(255,255,255,0.45)" };
const RATING: React.CSSProperties = { color: "#C9A961", fontWeight: 600 };
const STAR: React.CSSProperties = { color: "#C9A961" };
const RATINGS_COUNT: React.CSSProperties = {
  color: "rgba(255,255,255,0.7)",
  textShadow: "0 1px 4px rgba(0,0,0,0.6)",
};

const SHORT_DESC: React.CSSProperties = {
  margin: "16px 0 14px",
  fontSize: 15,
  lineHeight: 1.55,
  color: "rgba(255,255,255,0.92)",
  fontFamily: 'Georgia, "Times New Roman", serif',
  fontStyle: "italic",
  maxWidth: 540,
  textShadow: "0 1px 6px rgba(0,0,0,0.55)",
};

const TAGS: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap" as const,
  marginTop: 8,
};
const CHIP: React.CSSProperties = {
  padding: "6px 13px",
  background: "rgba(255,255,255,0.14)",
  border: "1px solid rgba(255,255,255,0.22)",
  borderRadius: 999,
  fontSize: 11,
  color: "#fff",
  backdropFilter: "blur(6px)",
};
