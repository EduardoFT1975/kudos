"use client";
/**
 * KUDOS - PoiActionBar - PROMPT 6/6 (correccion critica).
 *
 * Bottom action bar de POI segun maqueta:
 *   📍 Estuve aqui · 🔖 Guardar · ⊕ Crear capsula · ↗ Compartir · ↗ Ruta
 *
 * El boton central [+] Crear capsula es destacado (circular morado).
 * Los otros 4 son botones discretos arriba de la bottom nav.
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
      <Action icon="◎" label="Estuve aquí" sub="Deja tu huella" onClick={notImpl("Estuve aqui")} />
      <Action icon="🔖" label="Guardar" sub="En tus favoritos" active={!!isSaved} onClick={onSave} />
      <CenterAction onClick={notImpl("Crear capsula")} />
      <Action icon="↗" label="Compartir" sub="Con amigos" onClick={onShare} />
      <Action icon="↗" label="Ruta" sub="Añadir a ruta" onClick={notImpl("Ruta")} />
    </div>
  );
}


function Action({ icon, label, sub, active, onClick }: {
  icon: string; label: string; sub: string; active?: boolean; onClick?: () => void;
}) {
  return (
    <button onClick={onClick} style={ACTION}>
      <span style={{
        ...ICON,
        color: active ? "#C9A961" : "rgba(255,255,255,0.75)",
      }}>{icon}</span>
      <span style={LBL}>{label}</span>
      <span style={SUB}>{sub}</span>
    </button>
  );
}


function CenterAction({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} style={CENTER_WRAP} aria-label="Crear cápsula">
      <span style={CENTER_CIRCLE}>
        <span style={CENTER_PLUS}>+</span>
      </span>
      <span style={CENTER_LBL}>Crear cápsula</span>
      <span style={CENTER_SUB}>Tu perspectiva</span>
    </button>
  );
}


const WRAP: React.CSSProperties = {
  position: "sticky" as const,
  bottom: 80,
  zIndex: 8,
  display: "grid",
  gridTemplateColumns: "repeat(5, 1fr)",
  gap: 4,
  padding: "12px 8px",
  marginTop: 24,
  background: "rgba(10,8,20,0.92)",
  borderTop: "1px solid rgba(255,255,255,0.08)",
  backdropFilter: "blur(12px)",
};
const ACTION: React.CSSProperties = {
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center",
  gap: 2,
  padding: "6px 4px",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  color: "#fff",
  fontFamily: "inherit",
};
const ICON: React.CSSProperties = {
  fontSize: 18,
};
const LBL: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  color: "#fff",
};
const SUB: React.CSSProperties = {
  fontSize: 8,
  color: "rgba(255,255,255,0.45)",
};
const CENTER_WRAP: React.CSSProperties = {
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center",
  gap: 2,
  padding: 0,
  background: "transparent",
  border: "none",
  cursor: "pointer",
  fontFamily: "inherit",
  position: "relative" as const,
  marginTop: -18,
};
const CENTER_CIRCLE: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: "50%",
  background: "linear-gradient(135deg, #8B6BFF 0%, #6e4dd6 100%)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 6px 22px rgba(139,107,255,0.45)",
  border: "3px solid #0a0814",
};
const CENTER_PLUS: React.CSSProperties = {
  fontSize: 22,
  color: "#fff",
  fontWeight: 300,
  lineHeight: 1,
};
const CENTER_LBL: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  color: "#fff",
  marginTop: 4,
};
const CENTER_SUB: React.CSSProperties = {
  fontSize: 8,
  color: "rgba(255,255,255,0.45)",
};
