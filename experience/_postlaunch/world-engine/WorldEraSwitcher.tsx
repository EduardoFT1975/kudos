"use client";
/**
 * KUDOS HomeMap v5 · switcher temporal "Hoy / Año 80 d.C."
 * Phase 1: visual placeholder · NO cambia dataset todavía (Phase futura).
 */
import * as React from "react";


interface Props {
  era: "now" | "past";
  pastLabel?: string;
  onChange: (e: "now" | "past") => void;
}

export function WorldEraSwitcher({ era, pastLabel = "Año 80 d.C.", onChange }: Props) {
  return (
    <div style={WRAP}>
      <button style={{
        ...PILL,
        background: era === "now" ? "rgba(255,255,255,0.95)" : "transparent",
        color: era === "now" ? "#1f1b18" : "rgba(31,27,24,0.6)",
        fontWeight: era === "now" ? 600 : 500,
      }} onClick={() => onChange("now")}>
        <span style={ICON}>☀</span>
        <span>Hoy</span>
      </button>
      <button style={{
        ...PILL,
        background: era === "past" ? "rgba(255,255,255,0.95)" : "transparent",
        color: era === "past" ? "#1f1b18" : "rgba(31,27,24,0.6)",
        fontWeight: era === "past" ? 600 : 500,
      }} onClick={() => {
        onChange("past");
        // Phase 1 placeholder · toast informativo
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("kudos:toast", {
            detail: "Viajar al pasado · próximamente"
          }));
        }
      }}>
        <span style={ICON}>🏛</span>
        <span>{pastLabel}</span>
      </button>
    </div>
  );
}


const WRAP: React.CSSProperties = {
  position: "absolute",
  top: 14,
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: 1000,
  display: "flex",
  gap: 4,
  padding: 4,
  background: "rgba(0,0,0,0.08)",
  borderRadius: 999,
  border: "1px solid rgba(0,0,0,0.06)",
  backdropFilter: "blur(8px)",
  fontFamily: '"Poppins", system-ui, sans-serif',
};

const PILL: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "7px 16px",
  borderRadius: 999,
  border: "none",
  fontSize: 12,
  cursor: "pointer",
  transition: "background 0.2s ease",
};

const ICON: React.CSSProperties = { fontSize: 13 };
