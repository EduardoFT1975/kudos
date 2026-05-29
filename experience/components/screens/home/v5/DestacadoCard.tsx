"use client";
/**
 * KUDOS HomeFeed v5 · Destacado Card
 * Card hero con la cápsula destacada del día.
 */
import * as React from "react";
import { AddToMyWorldButton } from "@/components/discovery/AddToMyWorldButton";
import type { CapsuleManifestItem } from "./types";


interface Props {
  capsuleId: string | null;
  capsule: CapsuleManifestItem | null;
  onPlay?: () => void;
  onSave?: () => void;
}

export function DestacadoCard({ capsuleId, capsule, onPlay, onSave }: Props) {
  // Modo "sin cápsula real" · placeholder elegante
  if (!capsule || !capsuleId) return <DestacadoPlaceholder />;

  const evocativeTitle = makeEvocativeTitle(capsule.name);
  const location = makeLocation(capsule.name);
  const desc = makeDescription(capsule.name);

  return (
    <div style={WRAP} onClick={onPlay}>
      <div style={HERO}>
        <div style={HERO_OVERLAY} />
        <div style={BADGE_TOP}>
          <span style={BADGE_ICON}>✦</span>
          <span style={BADGE_TXT}>DESTACADO</span>
        </div>
        <div style={DUR_TOP}>
          <span>45"</span>
          <span style={{ marginLeft: 4 }}>▶</span>
        </div>
      </div>

      <div style={BODY}>
        <h2 style={TITLE}>{evocativeTitle}</h2>
        <div style={LOCATION}>
          <span style={LOCATION_DASH}>——</span>
          <span style={LOCATION_TXT}>{location}</span>
        </div>
        <p style={DESC}>{desc}</p>

        <div onClick={(e) => e.stopPropagation()}>
          <AddToMyWorldButton
            poiId={capsuleId || "unknown"}
            poiName={capsule?.name}
            variant="primary"
          />
        </div>
      </div>
    </div>
  );
}


function DestacadoPlaceholder() {
  return (
    <div style={{ ...WRAP, cursor: "default" }}>
      <div style={{ ...HERO, background: "linear-gradient(135deg, #1a0f2e 0%, #2a1542 50%, #1a0f2e 100%)" }}>
        <div style={HERO_OVERLAY} />
        <div style={BADGE_TOP}>
          <span style={BADGE_ICON}>✦</span>
          <span style={BADGE_TXT}>EN PREPARACIÓN</span>
        </div>
      </div>
      <div style={BODY}>
        <h2 style={TITLE}>Las primeras cápsulas están llegando</h2>
        <div style={LOCATION}>
          <span style={LOCATION_DASH}>——</span>
          <span style={LOCATION_TXT}>EL MUNDO TE ESPERA</span>
        </div>
        <p style={DESC}>
          Estamos componiendo las cápsulas inaugurales · Coliseo, Alhambra, Acrópolis · te avisaremos cuando estén listas para descubrir.
        </p>
      </div>
    </div>
  );
}


// Heurísticas evocadoras (Phase 1 · sin LLM)
function makeEvocativeTitle(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("alhambra")) return "Donde Al-Ándalus guardó su último suspiro";
  if (n.includes("sagrada familia")) return "Una catedral aún sin terminar después de 140 años";
  if (n.includes("acrópolis") || n.includes("acropolis")) return "La piedra que enseñó a Europa a pensar";
  if (n.includes("coliseo") || n.includes("colosseum")) return "Donde 50.000 voces decidían quién vivía";
  if (n.includes("foro romano")) return "El centro de un imperio que decidió el mundo";
  if (n.includes("notre-dame") || n.includes("notre dame")) return "La piedra que sobrevivió a su propio incendio";
  if (n.includes("eiffel")) return "El hierro que iba a derribarse después de 20 años";
  if (n.includes("pompeya") || n.includes("pompeii")) return "La ciudad que el tiempo congeló en una mañana";
  if (n.includes("torre de londres")) return "Mil años de poder, prisión y leyenda";
  return name;
}

function makeLocation(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("alhambra")) return "GRANADA, ESPAÑA";
  if (n.includes("sagrada familia")) return "BARCELONA, ESPAÑA";
  if (n.includes("acrópolis")) return "ATENAS, GRECIA";
  if (n.includes("coliseo")) return "ROMA, ITALIA";
  if (n.includes("foro romano")) return "ROMA, ITALIA";
  if (n.includes("notre-dame")) return "PARÍS, FRANCIA";
  if (n.includes("eiffel")) return "PARÍS, FRANCIA";
  if (n.includes("pompeya")) return "NÁPOLES, ITALIA";
  if (n.includes("torre de londres")) return "LONDRES, UK";
  return "DESCUBRE EL LUGAR";
}

function makeDescription(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("alhambra")) return "El último rey nazarí lloró aquí. Su madre le dijo: «Llora como una mujer lo que no supiste defender como un hombre».";
  if (n.includes("sagrada familia")) return "Gaudí dijo: «Mi cliente no tiene prisa». Lleva en construcción desde 1882.";
  if (n.includes("acrópolis")) return "Por aquí caminaron Sócrates y Platón. La democracia empezó a 200 metros de aquí.";
  if (n.includes("coliseo")) return "El anfiteatro más grande del Imperio. En sus 80 entradas cabían 50.000 espectadores en 15 minutos.";
  if (n.includes("foro romano")) return "Aquí César fue asesinado, aquí nació la república. Cada piedra recuerda un imperio.";
  return "Una historia esperando que la escuches.";
}


const WRAP: React.CSSProperties = {
  margin: "16px",
  background: "#0f0a1f",
  borderRadius: 22,
  overflow: "hidden",
  cursor: "pointer",
  border: "1px solid rgba(139,107,255,0.12)",
  boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
};

const HERO: React.CSSProperties = {
  position: "relative",
  width: "100%",
  height: 220,
  background: 'linear-gradient(135deg, #1a0f2e 0%, #2a1542 100%), url("https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Machu_Picchu%2C_Peru.jpg/800px-Machu_Picchu%2C_Peru.jpg")',
  backgroundSize: "cover, cover",
  backgroundPosition: "center, center",
  backgroundBlendMode: "soft-light, normal",
};

const HERO_OVERLAY: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  background: "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(15,10,31,0.6) 100%)",
};

const BADGE_TOP: React.CSSProperties = {
  position: "absolute",
  top: 14, left: 14,
  display: "flex", alignItems: "center", gap: 5,
  background: "rgba(15,10,31,0.7)",
  border: "1px solid rgba(201,169,97,0.45)",
  padding: "5px 11px",
  borderRadius: 999,
  fontFamily: '"Poppins", system-ui, sans-serif',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.16em",
  color: "#C9A961",
  backdropFilter: "blur(6px)",
};

const BADGE_ICON: React.CSSProperties = { fontSize: 11 };
const BADGE_TXT: React.CSSProperties = {};

const DUR_TOP: React.CSSProperties = {
  position: "absolute",
  top: 14, right: 14,
  display: "flex", alignItems: "center",
  padding: "5px 11px",
  borderRadius: 999,
  background: "rgba(15,10,31,0.75)",
  fontFamily: '"Poppins", system-ui, sans-serif',
  fontSize: 12,
  fontWeight: 600,
  color: "#fff",
  backdropFilter: "blur(6px)",
};

const BODY: React.CSSProperties = {
  padding: "18px 20px 22px",
  fontFamily: '"Poppins", system-ui, sans-serif',
};

const TITLE: React.CSSProperties = {
  margin: "0 0 8px",
  fontSize: 24,
  fontWeight: 700,
  lineHeight: 1.2,
  color: "#fff",
  letterSpacing: "-0.01em",
};

const LOCATION: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 8,
  margin: "8px 0 12px",
};
const LOCATION_DASH: React.CSSProperties = { color: "#C9A961", letterSpacing: "-0.15em" };
const LOCATION_TXT: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: "0.18em",
  color: "#C9A961",
};

const DESC: React.CSSProperties = {
  margin: 0,
  fontSize: 14,
  lineHeight: 1.5,
  color: "rgba(255,255,255,0.72)",
  fontWeight: 400,
};

const SAVE_BTN: React.CSSProperties = {
  marginTop: 16,
  display: "flex", alignItems: "center", gap: 8,
  padding: "10px 16px",
  background: "rgba(139,107,255,0.18)",
  border: "1px solid rgba(139,107,255,0.35)",
  borderRadius: 999,
  fontFamily: '"Poppins", system-ui, sans-serif',
  fontSize: 12,
  fontWeight: 500,
  color: "#fff",
  cursor: "pointer",
};
const SAVE_ICON: React.CSSProperties = {
  width: 22, height: 22, borderRadius: "50%",
  background: "#8B6BFF",
  display: "flex", alignItems: "center", justifyContent: "center",
  fontSize: 14, color: "#fff",
};
