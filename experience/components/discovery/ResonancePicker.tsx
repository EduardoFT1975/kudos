"use client";
/**
 * KUDOS HDG · Capa 5 · Emotional Resonance Engine.
 *
 * 5 resonancias canónicas · UNA pulsación · NO like/dislike.
 * Visual: 5 chips circulares con emoji + label · al pulsar marca activo y dispara evento.
 */
import * as React from "react";
import { Track } from "./kudosTelemetry";


export type Resonance = "asombro" | "aprendizaje" | "inspiracion" | "conexion" | "nostalgia";


const RESONANCES: { id: Resonance; emoji: string; label: string; color: string }[] = [
  { id: "asombro",     emoji: "✨", label: "Asombro",      color: "#C9A961" },
  { id: "aprendizaje", emoji: "🧠", label: "Aprendizaje",  color: "#5A8BB8" },
  { id: "inspiracion", emoji: "❤️", label: "Inspiración",  color: "#A85858" },
  { id: "conexion",    emoji: "🌍", label: "Conexión",     color: "#6BA888" },
  { id: "nostalgia",   emoji: "⏳", label: "Nostalgia",    color: "#7A6BA8" },
];


interface Props {
  poiId: string;
  initial?: Resonance | null;
  onChange?: (r: Resonance) => void;
  variant?: "compact" | "full";
}

export function ResonancePicker({ poiId, initial = null, onChange, variant = "full" }: Props) {
  const [active, setActive] = React.useState<Resonance | null>(initial);

  // Cargar resonancia previa de localStorage
  React.useEffect(() => {
    try {
      const k = `kudos:resonance:${poiId}`;
      const stored = localStorage.getItem(k) as Resonance | null;
      if (stored) setActive(stored);
    } catch {}
  }, [poiId]);

  const handle = (r: Resonance) => {
    setActive(r);
    try { localStorage.setItem(`kudos:resonance:${poiId}`, r); } catch {}
    Track.resonance(poiId, r);
    onChange?.(r);
  };

  return (
    <div style={variant === "compact" ? WRAP_COMPACT : WRAP_FULL}>
      {RESONANCES.map((r) => (
        <button
          key={r.id}
          style={{
            ...CHIP,
            background: active === r.id ? r.color : "rgba(255,255,255,0.06)",
            border: active === r.id ? `1px solid ${r.color}` : "1px solid rgba(255,255,255,0.1)",
            color: active === r.id ? "#fff" : "rgba(255,255,255,0.75)",
            transform: active === r.id ? "scale(1.06)" : "scale(1)",
          }}
          onClick={() => handle(r.id)}
          aria-label={r.label}
        >
          <span style={CHIP_EMOJI}>{r.emoji}</span>
          {variant === "full" && <span style={CHIP_LABEL}>{r.label}</span>}
        </button>
      ))}
    </div>
  );
}


const WRAP_FULL: React.CSSProperties = {
  display: "flex", gap: 8, flexWrap: "wrap",
  fontFamily: '"Poppins", system-ui, sans-serif',
};
const WRAP_COMPACT: React.CSSProperties = {
  display: "flex", gap: 6,
};

const CHIP: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "8px 14px",
  borderRadius: 999,
  cursor: "pointer",
  fontSize: 12, fontWeight: 500,
  fontFamily: 'inherit',
  transition: "all 0.2s cubic-bezier(0.22,1,0.36,1)",
};

const CHIP_EMOJI: React.CSSProperties = { fontSize: 14 };
const CHIP_LABEL: React.CSSProperties = {};
