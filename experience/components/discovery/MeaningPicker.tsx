"use client";
/**
 * KUDOS HDG · Capa 3 · Meaning Capture Engine.
 *
 * Modal pequeño que aparece DESPUÉS de "Añadir a Mi Mundo".
 * Pregunta opcional: "¿Por qué te importa?"
 * 5 motivaciones · una pulsación · skip permitido.
 */
import * as React from "react";
import { Track } from "./kudosTelemetry";


export type Motivation = "me_inspira" | "quiero_visitarlo" | "quiero_aprender" | "me_emociona" | "me_recuerda_algo";


const MOTIVATIONS: { id: Motivation; emoji: string; label: string }[] = [
  { id: "me_inspira",      emoji: "✨", label: "Me inspira" },
  { id: "quiero_visitarlo",emoji: "✈️", label: "Quiero visitarlo" },
  { id: "quiero_aprender", emoji: "📚", label: "Quiero aprender" },
  { id: "me_emociona",     emoji: "❤️", label: "Me emociona" },
  { id: "me_recuerda_algo",emoji: "🌀", label: "Me recuerda algo" },
];


interface Props {
  open: boolean;
  poiId: string;
  poiName?: string;
  onConfirm: (motivation: Motivation | null) => void;
  onClose: () => void;
}

export function MeaningPicker({ open, poiId, poiName, onConfirm, onClose }: Props) {
  if (!open) return null;

  const handle = (m: Motivation | null) => {
    if (m) Track.motivationCaptured(poiId, m);
    onConfirm(m);
  };

  return (
    <div style={BACKDROP} onClick={onClose}>
      <div style={SHEET} onClick={(e) => e.stopPropagation()}>
        <div style={ICON_HEAD}>🌍</div>
        <h3 style={TITLE}>Añadido a Mi Mundo</h3>
        {poiName && <p style={SUB_POI}>{poiName}</p>}
        <p style={SUB}>¿Por qué te importa? <em style={{ color: "rgba(255,255,255,0.4)" }}>(opcional)</em></p>

        <div style={MOTS}>
          {MOTIVATIONS.map((m) => (
            <button key={m.id} style={MOT_CHIP} onClick={() => handle(m.id)}>
              <span style={{ fontSize: 14 }}>{m.emoji}</span>
              <span>{m.label}</span>
            </button>
          ))}
        </div>

        <button style={SKIP_BTN} onClick={() => handle(null)}>
          Saltar
        </button>
      </div>
    </div>
  );
}


const BACKDROP: React.CSSProperties = {
  position: "fixed", inset: 0, zIndex: 7500,
  background: "rgba(0,0,0,0.6)",
  display: "flex", alignItems: "center", justifyContent: "center",
  padding: 16,
  backdropFilter: "blur(6px)",
  animation: "kudos-sheet-fade 0.2s ease both",
};

const SHEET: React.CSSProperties = {
  width: "100%", maxWidth: 360,
  background: "#0f0a1f",
  borderRadius: 22,
  padding: "26px 22px 22px",
  border: "1px solid rgba(139,107,255,0.18)",
  color: "#fff",
  fontFamily: '"Poppins", system-ui, sans-serif',
  textAlign: "center" as const,
  animation: "kudos-sheet-slide-up 0.28s cubic-bezier(0.22,1,0.36,1) both",
};

const ICON_HEAD: React.CSSProperties = {
  fontSize: 30, marginBottom: 8,
};
const TITLE: React.CSSProperties = {
  margin: "0 0 4px",
  fontSize: 17, fontWeight: 700, color: "#fff",
};
const SUB_POI: React.CSSProperties = {
  margin: "0 0 14px", fontSize: 13, color: "#8B6BFF",
};
const SUB: React.CSSProperties = {
  margin: "10px 0 16px",
  fontSize: 12.5, color: "rgba(255,255,255,0.65)",
};

const MOTS: React.CSSProperties = {
  display: "flex", flexDirection: "column", gap: 8,
  marginBottom: 14,
};
const MOT_CHIP: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 10,
  padding: "12px 16px",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 14,
  color: "#fff",
  fontSize: 13, fontWeight: 500,
  cursor: "pointer", textAlign: "left" as const,
  fontFamily: 'inherit',
  transition: "background 0.2s ease",
};
const SKIP_BTN: React.CSSProperties = {
  background: "transparent", border: "none",
  color: "rgba(255,255,255,0.4)",
  fontSize: 12, cursor: "pointer", padding: "4px 8px",
  fontFamily: 'inherit',
};
