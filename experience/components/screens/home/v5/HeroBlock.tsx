"use client";
/**
 * KUDOS HomeFeed v5 · Hero Block (100% mockup GPT-5).
 *
 * Globo terráqueo SVG inline (no dependencias externas) con puntos morados
 * pulsantes en las regiones del mundo + texto evocador rotativo + carrusel.
 */
import * as React from "react";


const PHRASES = [
  ["El mundo está", "lleno de historias", "esperando ser descubiertas"],
  ["Cada lugar es", "una puerta a", "algo más grande"],
  ["Descubre lo que", "tu mapa no te", "cuenta todavía"],
];


// Coordenadas aproximadas de los puntos pulsantes (% sobre el viewbox)
const PULSE_POINTS = [
  { x: 56, y: 33, label: "Europa Occidental", delay: 0 },
  { x: 60, y: 38, label: "Mediterráneo", delay: 0.4 },
  { x: 65, y: 36, label: "Europa Oriental", delay: 0.8 },
  { x: 53, y: 32, label: "Reino Unido", delay: 1.2 },
  { x: 75, y: 44, label: "Asia", delay: 1.6 },
];


export function HeroBlock({ onNavigateToMap }: { onNavigateToMap?: () => void }) {
  const [phraseIdx, setPhraseIdx] = React.useState(0);

  React.useEffect(() => {
    const t = setInterval(() => setPhraseIdx((i) => (i + 1) % PHRASES.length), 6000);
    return () => clearInterval(t);
  }, []);

  const lines = PHRASES[phraseIdx];

  return (
    <div style={WRAP}>
      {/* Background · espacio profundo gradient */}
      <div style={SPACE_BG} />

      {/* Globo terráqueo SVG inline */}
      <div style={GLOBE_WRAP}>
        <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%" }}>
          {/* Halo exterior · atmósfera */}
          <defs>
            <radialGradient id="atm" cx="50%" cy="50%" r="50%">
              <stop offset="65%" stopColor="#4a3a8e" stopOpacity="0" />
              <stop offset="80%" stopColor="#8B6BFF" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#8B6BFF" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="globe-shade" cx="35%" cy="30%" r="75%">
              <stop offset="0%" stopColor="#3a3268" stopOpacity="1" />
              <stop offset="50%" stopColor="#1d1a3e" stopOpacity="1" />
              <stop offset="100%" stopColor="#0a0814" stopOpacity="1" />
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="50" fill="url(#atm)" />
          <circle cx="50" cy="50" r="42" fill="url(#globe-shade)" />

          {/* Continentes · siluetas suaves color tierra muy tenue */}
          <g fill="rgba(220,180,120,0.18)" stroke="rgba(220,180,120,0.32)" strokeWidth="0.15">
            {/* Europa */}
            <path d="M52,28 C55,27 59,28 62,30 C64,32 65,35 63,37 C60,38 56,38 53,36 C51,33 50,30 52,28 Z" />
            {/* África */}
            <path d="M55,40 C58,40 60,43 60,48 C61,53 58,58 54,60 C50,58 49,52 50,46 C51,42 53,40 55,40 Z" />
            {/* Asia */}
            <path d="M64,30 C72,28 78,32 80,38 C82,44 78,48 72,46 C66,44 63,38 64,30 Z" />
            {/* América del Norte */}
            <path d="M22,30 C28,28 35,30 38,34 C40,38 37,42 32,42 C26,40 22,36 22,30 Z" />
            {/* América del Sur */}
            <path d="M32,48 C36,48 38,52 37,58 C35,64 30,66 27,62 C25,57 27,50 32,48 Z" />
          </g>

          {/* Líneas latitud · sutil */}
          <g fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.2">
            <ellipse cx="50" cy="50" rx="42" ry="12" />
            <ellipse cx="50" cy="50" rx="42" ry="20" />
            <ellipse cx="50" cy="50" rx="42" ry="28" />
            <ellipse cx="50" cy="50" rx="42" ry="36" />
          </g>

          {/* Puntos pulsantes */}
          {PULSE_POINTS.map((p, i) => (
            <g key={i} style={{ transformOrigin: `${p.x}px ${p.y}px` }}>
              <circle cx={p.x} cy={p.y} r="0.6" fill="#8B6BFF" opacity="1">
                <animate attributeName="r" values="0.6;1.4;0.6" dur="2.4s" begin={`${p.delay}s`} repeatCount="indefinite" />
              </circle>
              <circle cx={p.x} cy={p.y} r="2" fill="none" stroke="#8B6BFF" strokeWidth="0.3" opacity="0.6">
                <animate attributeName="r" values="0.6;4;0.6" dur="2.4s" begin={`${p.delay}s`} repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.6;0;0.6" dur="2.4s" begin={`${p.delay}s`} repeatCount="indefinite" />
              </circle>
            </g>
          ))}
        </svg>
      </div>

      {/* Texto evocador · esquina inferior izquierda */}
      <div style={CONTENT}>
        <div style={PIN}>
          <span style={PIN_DOT}>◉</span>
          <span style={PIN_TXT}>Cerca de ti</span>
        </div>

        <div style={PHRASE_WRAP} key={phraseIdx}>
          {lines.slice(0, -1).map((l, i) => (
            <div key={i} style={PHRASE_LINE}>{l}</div>
          ))}
          <div style={PHRASE_LAST}>{lines[lines.length - 1]}</div>
        </div>

        <div style={DOTS}>
          {PHRASES.map((_, i) => (
            <span key={i} style={{
              ...DOT,
              width: i === phraseIdx ? 28 : 10,
              background: i === phraseIdx ? "#8B6BFF" : "rgba(255,255,255,0.25)",
            }} />
          ))}
        </div>

        <div style={SWIPE_HINT}>
          <span style={SWIPE_ICON}>👆</span>
          <span style={SWIPE_TXT}>Desliza para explorar</span>
        </div>
      </div>

      {/* Botón flotante · ir al mapa */}
      <button style={FAB} onClick={onNavigateToMap} aria-label="Ir al mapa">
        <span style={{ fontSize: 18, color: "#fff" }}>➤</span>
      </button>
    </div>
  );
}


const WRAP: React.CSSProperties = {
  position: "relative", width: "100%", height: 520,
  overflow: "hidden", background: "#050308",
};

const SPACE_BG: React.CSSProperties = {
  position: "absolute", inset: 0,
  background: "radial-gradient(circle at 70% 25%, #1a1438 0%, #0a0814 50%, #050308 100%)",
};

const GLOBE_WRAP: React.CSSProperties = {
  position: "absolute",
  top: -120, right: -180,
  width: 600, height: 600,
  opacity: 0.95,
};

const CONTENT: React.CSSProperties = {
  position: "absolute",
  bottom: 56, left: 22, right: 80,
  color: "#fff",
};

const PIN: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 6,
  marginBottom: 12,
  fontFamily: '"Poppins", system-ui, sans-serif',
  fontSize: 12, letterSpacing: "0.04em",
  color: "rgba(255,255,255,0.7)",
};
const PIN_DOT: React.CSSProperties = { color: "#8B6BFF", fontSize: 11 };
const PIN_TXT: React.CSSProperties = { fontWeight: 500 };

const PHRASE_WRAP: React.CSSProperties = {
  fontFamily: 'Georgia, "Times New Roman", serif',
  fontWeight: 400,
  fontSize: 30, lineHeight: 1.18,
  letterSpacing: "-0.01em",
  animation: "kudos-fade-in 0.6s ease both",
  marginBottom: 18,
};
const PHRASE_LINE: React.CSSProperties = { color: "#fff" };
const PHRASE_LAST: React.CSSProperties = {
  background: "linear-gradient(90deg, #B197FF 0%, #8B6BFF 100%)",
  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
  fontWeight: 500,
};

const DOTS: React.CSSProperties = {
  display: "flex", gap: 5, alignItems: "center", marginBottom: 14,
};
const DOT: React.CSSProperties = {
  height: 3, borderRadius: 999,
  transition: "all 0.4s ease",
};

const SWIPE_HINT: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 6,
  fontSize: 12,
  fontFamily: '"Poppins", system-ui, sans-serif',
  color: "rgba(255,255,255,0.55)",
};
const SWIPE_ICON: React.CSSProperties = { fontSize: 13 };
const SWIPE_TXT: React.CSSProperties = { fontWeight: 500 };

const FAB: React.CSSProperties = {
  position: "absolute", bottom: 220, right: 22,
  width: 48, height: 48, borderRadius: "50%",
  border: "none",
  background: "rgba(139,107,255,0.92)",
  color: "#fff", cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
  boxShadow: "0 4px 16px rgba(139,107,255,0.55)",
  backdropFilter: "blur(8px)",
};
