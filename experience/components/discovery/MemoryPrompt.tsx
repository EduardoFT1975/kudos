"use client";
/**
 * KUDOS HDG · Capa 4 · Memory Engine.
 *
 * Cuando el usuario abre la app y tiene saves >90 días sin revisar,
 * aparece un toast/sheet sutil:
 *   "Guardaste el Coliseo hace 4 meses · ¿sigue siendo importante?"
 * 3 botones: ✓ Sí · ✗ Ya no · ↻ Revisitar
 */
import * as React from "react";
import { Track } from "./kudosTelemetry";


export interface StaleSave {
  saveId: string;
  poiId: string;
  poiName: string;
  monthsAgo: number;
  image?: string;
}


interface Props {
  staleSave: StaleSave | null;
  onResponse: (response: "still_relevant" | "released" | "want_to_revisit") => void;
  onDismiss: () => void;
}

export function MemoryPrompt({ staleSave, onResponse, onDismiss }: Props) {
  if (!staleSave) return null;

  const handle = (r: "still_relevant" | "released" | "want_to_revisit") => {
    if (r === "still_relevant") Track.memoryConfirmed(staleSave.poiId);
    else if (r === "released") Track.memoryReleased(staleSave.poiId);
    else Track.memoryRevisited(staleSave.poiId);
    onResponse(r);
  };

  return (
    <div style={WRAP}>
      <button style={CLOSE} onClick={onDismiss} aria-label="Cerrar">×</button>
      <div style={INNER}>
        <div style={THUMB} />
        <div style={CONTENT}>
          <div style={PROMPT_LBL}>Hace {staleSave.monthsAgo} {staleSave.monthsAgo === 1 ? "mes" : "meses"} guardaste</div>
          <div style={POI_NAME}>{staleSave.poiName}</div>
          <div style={QUESTION}>¿Sigue siendo importante?</div>
          <div style={BTNS}>
            <button style={BTN_YES} onClick={() => handle("still_relevant")}>
              <span>✓</span> Sí
            </button>
            <button style={BTN_NO} onClick={() => handle("released")}>
              <span>✗</span> Ya no
            </button>
            <button style={BTN_REVISIT} onClick={() => handle("want_to_revisit")}>
              <span>↻</span> Revisitar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


const WRAP: React.CSSProperties = {
  position: "fixed",
  bottom: 96,            // sobre el bottom nav
  left: 16, right: 16,
  zIndex: 5500,
  background: "rgba(15,10,31,0.96)",
  border: "1px solid rgba(139,107,255,0.32)",
  borderRadius: 18,
  padding: "16px 18px",
  fontFamily: '"Poppins", system-ui, sans-serif',
  color: "#fff",
  boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
  backdropFilter: "blur(10px)",
  animation: "kudos-sheet-slide-up 0.4s cubic-bezier(0.22,1,0.36,1) both",
};

const CLOSE: React.CSSProperties = {
  position: "absolute", top: 8, right: 10,
  background: "transparent", border: "none",
  color: "rgba(255,255,255,0.5)",
  fontSize: 16, cursor: "pointer", padding: 6,
};

const INNER: React.CSSProperties = {
  display: "flex", gap: 14, alignItems: "center",
};
const THUMB: React.CSSProperties = {
  width: 56, height: 56, borderRadius: 12,
  background: "linear-gradient(135deg, #2a1542, #1a0f2e)",
  flexShrink: 0,
};

const CONTENT: React.CSSProperties = { flex: 1 };
const PROMPT_LBL: React.CSSProperties = {
  fontSize: 11, color: "rgba(255,255,255,0.55)",
};
const POI_NAME: React.CSSProperties = {
  fontSize: 14, fontWeight: 700, color: "#fff", marginTop: 2,
};
const QUESTION: React.CSSProperties = {
  fontSize: 12, color: "rgba(255,255,255,0.85)", marginTop: 8,
  fontStyle: "italic" as const,
};
const BTNS: React.CSSProperties = {
  display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap",
};
const BTN_BASE: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 5,
  padding: "7px 12px", borderRadius: 999,
  fontSize: 11.5, fontWeight: 600,
  border: "1px solid rgba(255,255,255,0.1)",
  cursor: "pointer",
  fontFamily: 'inherit',
};
const BTN_YES: React.CSSProperties = {
  ...BTN_BASE,
  background: "rgba(107,168,136,0.22)",
  color: "#6BA888",
};
const BTN_NO: React.CSSProperties = {
  ...BTN_BASE,
  background: "rgba(168,88,88,0.18)",
  color: "#C88080",
};
const BTN_REVISIT: React.CSSProperties = {
  ...BTN_BASE,
  background: "rgba(139,107,255,0.22)",
  color: "#8B6BFF",
};
