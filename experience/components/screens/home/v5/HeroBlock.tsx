"use client";
/**
 * KUDOS HomeFeed v5 · Hero Block
 *
 * Texto evocador rotativo sobre fondo cinematográfico de tierra desde el espacio.
 * Versión Phase 1 · sin globo 3D Three.js · imagen estática + texto carrusel.
 * Phase 2: sustituir background por canvas Three.js animado.
 */
import * as React from "react";


const PHRASES = [
  "El mundo está lleno de historias\nesperando ser descubiertas",
  "Cada lugar es una puerta\na algo más grande",
  "Descubre lo que tu mapa\nno te cuenta todavía",
];


export function HeroBlock({ onNavigateToMap }: { onNavigateToMap?: () => void }) {
  const [phraseIdx, setPhraseIdx] = React.useState(0);

  // Rotar frase cada 6s
  React.useEffect(() => {
    const t = setInterval(() => setPhraseIdx((i) => (i + 1) % PHRASES.length), 6000);
    return () => clearInterval(t);
  }, []);

  const phrase = PHRASES[phraseIdx];
  const lines = phrase.split("\n");
  const lastLine = lines.pop()!;
  const headLines = lines;

  return (
    <div style={WRAP}>
      {/* Background · Tierra desde el espacio · Wikimedia gratis */}
      <div style={BG}>
        <div style={BG_GRAD} />
      </div>

      {/* Pin "Cerca de ti" */}
      <div style={PIN}>
        <span style={PIN_DOT}>◉</span>
        <span style={PIN_TXT}>Cerca de ti</span>
      </div>

      {/* Frase rotativa */}
      <div style={PHRASE_WRAP}>
        {headLines.map((l, i) => (
          <div key={`${phraseIdx}-${i}`} style={PHRASE_LINE}>{l}</div>
        ))}
        <div style={PHRASE_LAST}>{lastLine}</div>
      </div>

      {/* Indicadores de carrusel */}
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

      {/* Botón flotante navegar al mapa */}
      <button style={FAB} onClick={onNavigateToMap} aria-label="Ir al mapa">
        <span style={{ fontSize: 18, color: "#fff" }}>➤</span>
      </button>
    </div>
  );
}


const WRAP: React.CSSProperties = {
  position: "relative",
  width: "100%",
  height: 460,
  overflow: "hidden",
  background: "#0a0814",
  color: "#fff",
};

const BG: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  background: 'radial-gradient(circle at 72% 22%, #2a1f55 0%, #0a0814 55%), url("https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/The_Earth_seen_from_Apollo_17.jpg/800px-The_Earth_seen_from_Apollo_17.jpg")',
  backgroundSize: "cover, 60%",
  backgroundPosition: "center, 75% 25%",
  backgroundRepeat: "no-repeat, no-repeat",
  backgroundBlendMode: "screen, normal",
  opacity: 0.85,
};

const BG_GRAD: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  background: "linear-gradient(180deg, rgba(10,8,20,0.0) 50%, rgba(10,8,20,0.95) 100%)",
};

const PIN: React.CSSProperties = {
  position: "absolute",
  top: 168, left: 22, zIndex: 2,
  display: "flex", alignItems: "center", gap: 6,
  fontFamily: '"Poppins", system-ui, sans-serif',
  fontSize: 12,
  color: "rgba(255,255,255,0.65)",
  letterSpacing: "0.04em",
};

const PIN_DOT: React.CSSProperties = { color: "#8B6BFF", fontSize: 11 };
const PIN_TXT: React.CSSProperties = { fontWeight: 500 };

const PHRASE_WRAP: React.CSSProperties = {
  position: "absolute",
  top: 195, left: 22, right: 80,
  zIndex: 2,
  fontFamily: '"Poppins", system-ui, sans-serif',
  fontWeight: 700,
  fontSize: 28,
  lineHeight: 1.18,
  color: "#fff",
  animation: "kudos-fade-in 0.6s ease both",
};

const PHRASE_LINE: React.CSSProperties = {
  letterSpacing: "-0.01em",
};

const PHRASE_LAST: React.CSSProperties = {
  background: "linear-gradient(90deg, #8B6BFF 0%, #E0815A 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  letterSpacing: "-0.01em",
  fontWeight: 700,
};

const DOTS: React.CSSProperties = {
  position: "absolute",
  bottom: 76, left: 22, zIndex: 2,
  display: "flex", gap: 5, alignItems: "center",
};

const DOT: React.CSSProperties = {
  height: 3,
  borderRadius: 999,
  transition: "all 0.4s ease",
};

const SWIPE_HINT: React.CSSProperties = {
  position: "absolute",
  bottom: 46, left: 22, zIndex: 2,
  display: "flex", alignItems: "center", gap: 6,
  fontSize: 12,
  fontFamily: '"Poppins", system-ui, sans-serif',
  color: "rgba(255,255,255,0.55)",
};
const SWIPE_ICON: React.CSSProperties = { fontSize: 13 };
const SWIPE_TXT: React.CSSProperties = { fontWeight: 500 };

const FAB: React.CSSProperties = {
  position: "absolute",
  bottom: 46, right: 22, zIndex: 3,
  width: 48, height: 48,
  borderRadius: "50%",
  border: "none",
  background: "rgba(139,107,255,0.85)",
  color: "#fff",
  cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
  boxShadow: "0 4px 16px rgba(139,107,255,0.55)",
  backdropFilter: "blur(8px)",
};
