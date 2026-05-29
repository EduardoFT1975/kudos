"use client";
/**
 * KUDOS - PoiCapsule - PROMPT 4/6.
 *
 * Bloque 2 de la pantalla POI MVP.
 * Cápsula destacada: video mp4 si existe en /capsules/{poi_id}/capsule.mp4,
 * sino imagen Wikidata. Play overlay + duración + título corto.
 */
import * as React from "react";


interface Props {
  poiId: string;
  imageUrl?: string;
  durationS?: number;
  shortTitle?: string;
  autoPlay?: boolean;
}


export function PoiCapsule({
  poiId,
  imageUrl,
  durationS = 15,
  shortTitle = "La grandeza del momento",
  autoPlay,
}: Props) {
  const [playing, setPlaying] = React.useState(false);
  const [videoError, setVideoError] = React.useState(false);
  const videoUrl = `/capsules/${poiId}/capsule.mp4`;

  React.useEffect(() => {
    if (autoPlay) setPlaying(true);
  }, [autoPlay]);

  return (
    <section style={WRAP}>
      <header style={HEAD}>
        <span style={LABEL}>CÁPSULA DESTACADA</span>
      </header>

      <article style={CARD}>
        <div
          style={{
            ...HERO,
            backgroundImage: imageUrl
              ? `linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(10,8,20,0.55) 100%), url(${imageUrl})`
              : "linear-gradient(135deg, #2a1542, #1a0f2e)",
          }}
        >
          {!playing && (
            <>
              <span style={DURATION_TOP}>{formatDuration(durationS)}</span>
              <button
                onClick={() => setPlaying(true)}
                style={PLAY_OVERLAY}
                aria-label="Reproducir cápsula"
              >
                <PlayIcon />
              </button>
              <div style={TITLE_BOTTOM}>{shortTitle}</div>
            </>
          )}

          {playing && !videoError && (
            <video
              src={videoUrl}
              controls
              autoPlay
              playsInline
              style={VIDEO}
              onError={() => setVideoError(true)}
            />
          )}

          {playing && videoError && (
            <div style={ERROR_OVERLAY}>
              <p style={ERROR_TEXT}>El video aún no está disponible para este lugar.</p>
              <button onClick={() => setPlaying(false)} style={ERROR_BTN}>
                Volver
              </button>
            </div>
          )}
        </div>
      </article>
    </section>
  );
}


function PlayIcon() {
  return (
    <svg width="42" height="42" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="11" fill="rgba(139,107,255,0.92)" stroke="#fff" strokeWidth="1" />
      <path d="M9.5 8l7 4-7 4z" fill="#fff" />
    </svg>
  );
}

function formatDuration(s: number): string {
  if (s < 60) return `00:${String(s).padStart(2, "0")}`;
  const min = Math.floor(s / 60);
  const sec = s % 60;
  return `${min}:${String(sec).padStart(2, "0")}`;
}


// ============== styles ==============

const WRAP: React.CSSProperties = { padding: "26px 16px 6px" };
const HEAD: React.CSSProperties = { marginBottom: 12 };
const LABEL: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: "0.25em",
  fontWeight: 700,
  color: "rgba(201,169,97,0.85)",
};
const CARD: React.CSSProperties = {
  background: "rgba(15,10,31,0.5)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 16,
  overflow: "hidden",
};
const HERO: React.CSSProperties = {
  position: "relative",
  width: "100%",
  height: 280,
  backgroundSize: "cover",
  backgroundPosition: "center",
};
const DURATION_TOP: React.CSSProperties = {
  position: "absolute",
  top: 14,
  left: 14,
  padding: "5px 11px",
  background: "rgba(139,107,255,0.85)",
  color: "#fff",
  fontSize: 11,
  fontWeight: 600,
  borderRadius: 999,
};
const PLAY_OVERLAY: React.CSSProperties = {
  position: "absolute",
  left: "50%",
  top: "50%",
  transform: "translate(-50%, -50%)",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  padding: 0,
};
const TITLE_BOTTOM: React.CSSProperties = {
  position: "absolute",
  bottom: 14,
  left: 16,
  right: 16,
  fontFamily: 'var(--kudos-font-display, "Cormorant Garamond", Georgia, serif)',
  fontSize: 18,
  fontWeight: 500,
  color: "#fff",
  textShadow: "0 1px 6px rgba(0,0,0,0.7)",
};
const VIDEO: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  background: "#000",
};
const ERROR_OVERLAY: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  background: "rgba(10,8,20,0.85)",
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center",
  justifyContent: "center",
  gap: 16,
  padding: 24,
};
const ERROR_TEXT: React.CSSProperties = {
  fontSize: 14,
  color: "rgba(255,255,255,0.8)",
  textAlign: "center" as const,
  margin: 0,
};
const ERROR_BTN: React.CSSProperties = {
  padding: "8px 18px",
  background: "rgba(139,107,255,0.85)",
  color: "#fff",
  border: "none",
  borderRadius: 999,
  fontSize: 12,
  cursor: "pointer",
};
