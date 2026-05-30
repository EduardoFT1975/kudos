"use client";
/**
 * KUDOS - PoiActionBar - SPRINT FINAL #4 (menos invasiva).
 *
 * Bar inferior sutil con 5 acciones. Estilo: glass-blur, transparente,
 * iconos discretos, NO domina la pantalla. Solo emerge cuando el usuario
 * ha leido la pagina.
 */
import * as React from "react";


interface Props {
  poiId: string;
  poiName: string;
  isSaved?: boolean;
  onSave?: () => void;
  onShare?: () => void;
}


export function PoiActionBar({ poiId, poiName, isSaved, onSave, onShare }: Props) {
  const notImpl = (what: string) => () => alert(`"${what}" - proximamente`);

  return (
    <div style={WRAP}>
      <Action icon="◎" label="Estuve" onClick={notImpl("Estuve aqui")} />
      <Action icon={isSaved ? "♥" : "♡"} label="Guardar" active={!!isSaved} onClick={onSave} />
      <CenterAction onClick={notImpl("Crear capsula")} />
      <Action icon="↗" label="Compartir" onClick={onShare} />
      <Action icon="→" label="Ruta" onClick={notImpl("Ruta")} />
    </div>
  );
}


function Action({ icon, label, active, onClick }: {
  icon: string; label: string; active?: boolean; onClick?: () => void;
}) {
  return (
    <button onClick={onClick} style={ACTION}>
      <span style={{
        ...ICON,
        color: active ? "#C9A961" : "rgba(255,255,255,0.85)",
      }}>{icon}</span>
      <span style={LBL}>{label}</span>
    </button>
  );
}


function CenterAction({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} style={CENTER_WRAP} aria-label="Crear capsula">
      <span style={CENTER_CIRCLE}>
        <span style={CENTER_PLUS}>+</span>
      </span>
    </button>
  );
}


// ============== styles (menos invasivo) ==============

const WRAP: React.CSSProperties = {
  position: "sticky" as const,
  bottom: 92,
  zIndex: 8,
  display: "grid",
  gridTemplateColumns: "repeat(5, 1fr)",
  gap: 2,
  padding: "8px 12px 10px",
  marginTop: 22,
  marginLeft: 16,
  marginRight: 16,
  background: "rgba(10,8,20,0.65)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 999,
  backdropFilter: "blur(14px)",
  boxShadow: "0 8px 28px rgba(0,0,0,0.45)",
};
const ACTION: React.CSSProperties = {
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center",
  gap: 2,
  padding: "4px 2px",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  color: "#fff",
  fontFamily: "inherit",
};
const ICON: React.CSSProperties = {
  fontSize: 16,
};
const LBL: React.CSSProperties = {
  fontSize: 9,
  color: "rgba(255,255,255,0.7)",
  letterSpacing: "0.04em",
};

const CENTER_WRAP: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
  background: "transparent",
  border: "none",
  cursor: "pointer",
  fontFamily: "inherit",
  position: "relative" as const,
  marginTop: -16,
};
const CENTER_CIRCLE: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: "50%",
  background: "linear-gradient(135deg, #8B6BFF 0%, #6e4dd6 100%)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 4px 18px rgba(139,107,255,0.45)",
  border: "2px solid rgba(10,8,20,0.85)",
};
const CENTER_PLUS: React.CSSProperties = {
  fontSize: 20,
  color: "#fff",
  fontWeight: 300,
  lineHeight: 1,
};
