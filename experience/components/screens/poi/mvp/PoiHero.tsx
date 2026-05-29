"use client";
/**
 * KUDOS - PoiHero - PROMPT 4/6.
 *
 * Bloque 1 de la pantalla POI MVP.
 * Banner superior segun maqueta:
 *   - Imagen hero a la derecha (fondo)
 *   - Eyebrow categoria morado/dorado
 *   - Titulo serif gigante
 *   - Pais con bandera + rating fake
 *   - Descripcion corta (short_description)
 *   - 3 chips de tags
 *   - Top bar: Volver / Compartir / Guardar / Más
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
      <div
        style={{
          ...BG,
          backgroundImage: imageUrl
            ? `linear-gradient(90deg, rgba(10,8,20,0.92) 0%, rgba(10,8,20,0.62) 45%, rgba(10,8,20,0.15) 100%), url(${imageUrl})`
            : "linear-gradient(135deg, #2a1542, #1a0f2e)",
        }}
        aria-hidden
      />

      {/* Top bar */}
      <header style={TOPBAR}>
        <button
          onClick={() => router.back()}
          style={TOP_BTN_LEFT}
          aria-label="Volver"
        >
          <span style={ARROW}>◀</span> Volver
        </button>
        <div style={TOP_LOGO}>KUDOS</div>
        <div style={TOP_RIGHT}>
          <button onClick={onShare} style={TOP_BTN_ICON} aria-label="Compartir">
            <ShareIcon />
            <span style={TOP_BTN_LABEL}>Compartir</span>
          </button>
          <button onClick={onSave} style={TOP_BTN_ICON} aria-label="Guardar">
            <SaveIcon filled={!!isSaved} />
            <span style={TOP_BTN_LABEL}>{isSaved ? "Guardado" : "Guardar"}</span>
          </button>
          <button style={TOP_BTN_ICON} aria-label="Más">
            <MoreIcon />
            <span style={TOP_BTN_LABEL}>Más</span>
          </button>
        </div>
      </header>

      {/* Contenido principal */}
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

      {/* Bottom-right meta */}
      <div style={DISTANCE_BOX}>
        <div style={DIST_LINE}>
          <span style={DIST_LABEL}>Estás a 320 m</span>
          <span style={DIST_ARROW}>↗</span>
        </div>
        <div style={OPEN_LINE}>Abierto ahora · 8:30 - 19:00</div>
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
  minHeight: 480,
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
const TOPBAR: React.CSSProperties = {
  position: "relative",
  zIndex: 2,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "18px 22px",
};
const TOP_BTN_LEFT: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "rgba(255,255,255,0.85)",
  fontSize: 13,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  fontFamily: "inherit",
};
const ARROW: React.CSSProperties = { fontSize: 11 };
const TOP_LOGO: React.CSSProperties = {
  fontSize: 14,
  letterSpacing: "0.32em",
  fontWeight: 700,
  color: "#fff",
};
const TOP_RIGHT: React.CSSProperties = {
  display: "inline-flex",
  gap: 18,
};
const TOP_BTN_ICON: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "#fff",
  cursor: "pointer",
  display: "inline-flex",
  flexDirection: "column" as const,
  alignItems: "center",
  gap: 3,
  fontFamily: "inherit",
};
const TOP_BTN_LABEL: React.CSSProperties = {
  fontSize: 10,
  color: "rgba(255,255,255,0.7)",
};

const CONTENT: React.CSSProperties = {
  position: "relative",
  zIndex: 2,
  padding: "20px 22px 30px",
  maxWidth: 620,
};
const EYEBROW: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: "0.25em",
  fontWeight: 700,
  color: "rgba(139,107,255,0.95)",
  display: "block",
  marginBottom: 8,
};
const TITLE: React.CSSProperties = {
  fontFamily: 'var(--kudos-font-display, "Cormorant Garamond", Georgia, serif)',
  fontSize: 52,
  lineHeight: 1.05,
  fontWeight: 500,
  letterSpacing: "-0.01em",
  color: "#fff",
  margin: 0,
};
const META_ROW: React.CSSProperties = {
  marginTop: 12,
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 13,
};
const COUNTRY: React.CSSProperties = {
  color: "rgba(255,255,255,0.92)",
};
const FLAG: React.CSSProperties = { fontSize: 14 };
const DOT: React.CSSProperties = {
  color: "rgba(255,255,255,0.4)",
};
const RATING: React.CSSProperties = {
  color: "#C9A961",
  fontWeight: 600,
};
const STAR: React.CSSProperties = { color: "#C9A961" };
const RATINGS_COUNT: React.CSSProperties = {
  color: "rgba(255,255,255,0.65)",
};

const SHORT_DESC: React.CSSProperties = {
  margin: "18px 0 14px",
  fontSize: 14,
  lineHeight: 1.6,
  color: "rgba(255,255,255,0.85)",
  fontFamily: '"Poppins", system-ui, sans-serif',
  maxWidth: 540,
};

const TAGS: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap" as const,
  marginTop: 6,
};
const CHIP: React.CSSProperties = {
  padding: "5px 12px",
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 999,
  fontSize: 11,
  color: "rgba(255,255,255,0.85)",
};

const DISTANCE_BOX: React.CSSProperties = {
  position: "absolute",
  right: 22,
  bottom: 22,
  zIndex: 2,
  textAlign: "right" as const,
};
const DIST_LINE: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
};
const DIST_LABEL: React.CSSProperties = {
  fontSize: 12,
  color: "rgba(255,255,255,0.85)",
};
const DIST_ARROW: React.CSSProperties = {
  width: 26,
  height: 26,
  borderRadius: "50%",
  background: "rgba(139,107,255,0.8)",
  color: "#fff",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 12,
};
const OPEN_LINE: React.CSSProperties = {
  marginTop: 4,
  fontSize: 11,
  color: "rgba(255,255,255,0.55)",
};
