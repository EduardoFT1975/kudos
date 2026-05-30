"use client";
/**
 * KUDOS · CreatePoiModal · T7.3
 *
 * Modal para crear un POI personal en una coordenada concreta.
 * El usuario decide el nombre. La categoría es opcional.
 * Se guarda en localStorage como source: "user".
 *
 * Triggered por: long-press en mapa (WorldEngine).
 */

import * as React from "react";
import { saveUserPoi, type UniversalPOI } from "@/lib/poi/universalPoi";


interface Props {
  lat: number;
  lng: number;
  onClose: () => void;
  onCreated: (poi: UniversalPOI) => void;
}


const CATEGORIES = [
  { id: "memory",     label: "Recuerdo" },
  { id: "food",       label: "Comer" },
  { id: "nature",     label: "Naturaleza" },
  { id: "viewpoint",  label: "Mirador" },
  { id: "home",       label: "Hogar" },
  { id: "study",      label: "Estudio" },
  { id: "other",      label: "Otro" },
];


export function CreatePoiModal({ lat, lng, onClose, onCreated }: Props) {
  const [name, setName] = React.useState("");
  const [category, setCategory] = React.useState<string>("memory");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const poi = saveUserPoi({
      name: trimmed,
      lat,
      lng,
      category,
    });
    onCreated(poi);
  };

  return (
    <>
      <div style={BACKDROP} onClick={onClose} aria-hidden />
      <section style={MODAL} role="dialog" aria-labelledby="create-poi-title">
        <button onClick={onClose} style={CLOSE_BTN} aria-label="Cerrar">×</button>

        <h2 id="create-poi-title" style={TITLE}>Marca este lugar</h2>
        <p style={SUB}>
          Solo tú sabrás que está aquí. Nadie más lo verá.
        </p>

        <form onSubmit={handleSubmit}>
          <label style={LABEL}>
            <span style={LABEL_TXT}>¿Cómo lo llamas?</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="La banca del parque, casa abuela..."
              style={INPUT}
              autoFocus
              maxLength={80}
            />
          </label>

          <div style={LABEL_TXT}>¿Qué es para ti?</div>
          <div style={CHIPS_ROW}>
            {CATEGORIES.map((cat) => (
              <button
                type="button"
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                style={{
                  ...CHIP,
                  ...(category === cat.id ? CHIP_ACTIVE : null),
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div style={COORDS}>
            <span style={COORDS_ICON}>◉</span>
            {lat.toFixed(5)}, {lng.toFixed(5)}
          </div>

          <div style={ACTIONS}>
            <button type="button" onClick={onClose} style={CANCEL_BTN}>
              Cancelar
            </button>
            <button type="submit" disabled={!name.trim()} style={{
              ...PRIMARY_BTN,
              opacity: name.trim() ? 1 : 0.4,
              cursor: name.trim() ? "pointer" : "default",
            }}>
              Dejar huella aquí
            </button>
          </div>
        </form>
      </section>
    </>
  );
}


// ─── ESTILOS ──────────────────────────────────────────────────────────────

const BACKDROP: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.6)",
  zIndex: 9995,
  backdropFilter: "blur(3px)",
};

const MODAL: React.CSSProperties = {
  position: "fixed",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "min(420px, calc(100vw - 32px))",
  maxHeight: "85vh",
  overflowY: "auto",
  zIndex: 9996,
  background: "linear-gradient(180deg, #1f1840 0%, #14102a 100%)",
  borderRadius: 18,
  padding: "28px 26px 26px",
  color: "#f5f0e8",
  fontFamily: '"Poppins", system-ui, sans-serif',
  border: "1px solid rgba(139,107,255,0.32)",
  boxShadow: "0 24px 60px rgba(0,0,0,0.72)",
};

const CLOSE_BTN: React.CSSProperties = {
  position: "absolute",
  top: 14,
  right: 16,
  width: 30,
  height: 30,
  borderRadius: "50%",
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "#fff",
  fontSize: 20,
  lineHeight: 1,
  cursor: "pointer",
};

const TITLE: React.CSSProperties = {
  fontFamily: 'var(--kudos-font-display, "Cormorant Garamond", Georgia, serif)',
  fontSize: 28,
  fontWeight: 500,
  margin: "0 0 6px",
  color: "#fff",
  lineHeight: 1.1,
};

const SUB: React.CSSProperties = {
  margin: "0 0 22px",
  fontSize: 13,
  color: "rgba(245,240,232,0.7)",
  lineHeight: 1.45,
};

const LABEL: React.CSSProperties = {
  display: "block",
  marginBottom: 18,
};

const LABEL_TXT: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  fontWeight: 600,
  color: "rgba(245,240,232,0.65)",
  marginBottom: 8,
};

const INPUT: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.14)",
  borderRadius: 10,
  color: "#fff",
  fontSize: 15,
  fontFamily: "inherit",
  outline: "none",
  boxSizing: "border-box",
};

const CHIPS_ROW: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap" as const,
  gap: 6,
  marginBottom: 18,
};

const CHIP: React.CSSProperties = {
  padding: "6px 12px",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 999,
  color: "rgba(245,240,232,0.75)",
  fontSize: 12,
  fontFamily: "inherit",
  cursor: "pointer",
};

const CHIP_ACTIVE: React.CSSProperties = {
  background: "rgba(139,107,255,0.85)",
  border: "1px solid #8B6BFF",
  color: "#fff",
};

const COORDS: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "5px 10px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 8,
  fontSize: 11,
  fontFamily: "monospace",
  color: "rgba(245,240,232,0.6)",
  marginBottom: 22,
};

const COORDS_ICON: React.CSSProperties = {
  color: "#8B6BFF",
  fontSize: 10,
};

const ACTIONS: React.CSSProperties = {
  display: "flex",
  gap: 10,
  justifyContent: "flex-end",
};

const CANCEL_BTN: React.CSSProperties = {
  padding: "10px 18px",
  background: "transparent",
  border: "1px solid rgba(255,255,255,0.18)",
  color: "rgba(245,240,232,0.8)",
  borderRadius: 999,
  fontSize: 13,
  fontFamily: "inherit",
  cursor: "pointer",
};

const PRIMARY_BTN: React.CSSProperties = {
  padding: "10px 22px",
  background: "linear-gradient(135deg, #8B6BFF 0%, #6e4dd6 100%)",
  border: "none",
  color: "#fff",
  borderRadius: 999,
  fontSize: 13,
  fontWeight: 600,
  fontFamily: "inherit",
  boxShadow: "0 4px 16px rgba(139,107,255,0.45)",
};
