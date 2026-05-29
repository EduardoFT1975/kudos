"use client";
/**
 * KUDOS - DiscoverHero - PROMPT 2/6 (rectificado segun maqueta real).
 *
 * Hero superior de /inicio con:
 *  - Imagen mundo nocturno (puntos morados constelacion)
 *  - "Cerca de ti" label con pin
 *  - Titulo serif split blanco / morado
 *  - Barra de progreso multi-slide
 *  - Boton location circular morado
 *  - "Desliza para explorar"
 */
import * as React from "react";


const SLIDES = [
  {
    intro: "blanco",
    primary: "El mundo está lleno de historias",
    accent: "esperando ser descubiertas",
  },
  {
    intro: "blanco",
    primary: "Cada lugar es una puerta",
    accent: "a una historia que cambió el mundo",
  },
  {
    intro: "blanco",
    primary: "Descubre el mapa",
    accent: "que conecta épocas",
  },
];


export function DiscoverHero({ onLocate }: { onLocate?: () => void }) {
  const [slide, setSlide] = React.useState(0);

  React.useEffect(() => {
    const iv = setInterval(() => setSlide((s) => (s + 1) % SLIDES.length), 5000);
    return () => clearInterval(iv);
  }, []);

  const current = SLIDES[slide];

  return (
    <section style={ROOT}>
      <div style={BG_GLOBE} aria-hidden>
        <NightWorldSVG />
      </div>

      <div style={CONTENT}>
        <div style={NEAR}>
          <span style={NEAR_PIN}>◉</span>
          <span style={NEAR_TXT}>Cerca de ti</span>
        </div>

        <h1 style={TITLE}>
          <span style={TITLE_PRIMARY}>{current.primary}</span>
          <br />
          <span style={TITLE_ACCENT}>{current.accent}</span>
        </h1>

        <div style={PROGRESS_ROW}>
          {SLIDES.map((_, i) => (
            <span
              key={i}
              style={{
                ...PROGRESS_BAR,
                background: i === slide ? "#fff" : "rgba(255,255,255,0.18)",
              }}
            />
          ))}
        </div>

        <p style={SWIPE}>
          <span style={SWIPE_ICON}>◐</span> Desliza para explorar
        </p>
      </div>

      <button onClick={onLocate} style={LOCATE_BTN} aria-label="Ubicar mi posición">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2L4 22l8-4 8 4z"
            stroke="#fff"
            strokeWidth="1.8"
            strokeLinejoin="round"
            fill="rgba(255,255,255,0.15)"
          />
        </svg>
      </button>
    </section>
  );
}


/** SVG estilizado de "mundo nocturno con dots morados" — sin asset externo. */
function NightWorldSVG() {
  return (
    <svg
      viewBox="0 0 800 400"
      preserveAspectRatio="xMidYMid slice"
      width="100%"
      height="100%"
      style={{ display: "block" }}
    >
      <defs>
        <radialGradient id="g1" cx="60%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#3a2a6e" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#0a0814" stopOpacity="1" />
        </radialGradient>
        <radialGradient id="dot" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#C77BFF" stopOpacity="1" />
          <stop offset="40%" stopColor="#8B6BFF" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#8B6BFF" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="800" height="400" fill="url(#g1)" />
      {/* "Continente" estilizado tipo silueta Europa-África */}
      <path
        d="M520,90 C560,80 600,110 610,150 C625,200 600,250 560,260 C540,270 530,310 510,330 C490,350 460,340 450,310 C440,280 470,250 460,220 C450,180 480,140 520,90 Z"
        fill="rgba(255,255,255,0.04)"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth="0.5"
      />
      {/* dots morados de "ciudades vivas" */}
      {[
        [540, 130], [560, 170], [510, 200], [580, 220], [530, 250],
        [600, 180], [490, 280], [550, 300], [620, 230], [470, 180],
      ].map(([cx, cy], i) => (
        <g key={i}>
          <circle cx={cx} cy={cy} r={18} fill="url(#dot)" />
          <circle cx={cx} cy={cy} r={2} fill="#fff" opacity={0.9} />
        </g>
      ))}
    </svg>
  );
}


// ============== styles ==============

const ROOT: React.CSSProperties = {
  position: "relative",
  width: "100%",
  minHeight: 420,
  background: "#0a0814",
  overflow: "hidden",
};
const BG_GLOBE: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 0,
  opacity: 0.95,
};
const CONTENT: React.CSSProperties = {
  position: "relative",
  zIndex: 1,
  padding: "30px 22px 28px",
  maxWidth: 720,
};
const NEAR: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  marginBottom: 18,
};
const NEAR_PIN: React.CSSProperties = {
  color: "#8B6BFF",
  fontSize: 10,
};
const NEAR_TXT: React.CSSProperties = {
  fontSize: 12,
  color: "rgba(255,255,255,0.7)",
  letterSpacing: "0.04em",
};
const TITLE: React.CSSProperties = {
  fontFamily: 'var(--kudos-font-display, "Cormorant Garamond", Georgia, serif)',
  fontSize: 34,
  lineHeight: 1.15,
  fontWeight: 400,
  letterSpacing: "-0.01em",
  margin: 0,
};
const TITLE_PRIMARY: React.CSSProperties = {
  color: "#fff",
};
const TITLE_ACCENT: React.CSSProperties = {
  color: "#8B6BFF",
};
const PROGRESS_ROW: React.CSSProperties = {
  display: "flex",
  gap: 6,
  margin: "24px 0 14px",
};
const PROGRESS_BAR: React.CSSProperties = {
  width: 32,
  height: 3,
  borderRadius: 2,
  transition: "background 300ms",
};
const SWIPE: React.CSSProperties = {
  margin: 0,
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  fontSize: 13,
  color: "rgba(255,255,255,0.55)",
  letterSpacing: "0.02em",
};
const SWIPE_ICON: React.CSSProperties = {
  fontSize: 14,
  color: "rgba(255,255,255,0.45)",
};
const LOCATE_BTN: React.CSSProperties = {
  position: "absolute",
  right: 22,
  bottom: 28,
  zIndex: 2,
  width: 54,
  height: 54,
  borderRadius: "50%",
  background: "linear-gradient(135deg, #8B6BFF 0%, #6e4dd6 100%)",
  border: "none",
  cursor: "pointer",
  boxShadow: "0 8px 28px rgba(139,107,255,0.45)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};
