"use client";
/**
 * KUDOS - PoiDatosClave - PROMPT 4/6.
 *
 * Bloque 5 de POI MVP.
 * Tarjeta con datos clave estructurados. Lista plana label/value
 * con icono pequeño. Si un valor falta, simplemente no se muestra.
 */
import * as React from "react";


export interface DataItem {
  icon?: string;
  label: string;
  value: string;
}


interface Props {
  items: DataItem[];
}


export function PoiDatosClave({ items }: Props) {
  if (!items || items.length === 0) return null;
  return (
    <section style={WRAP}>
      <header style={HEAD}>
        <h2 style={TITLE}>Datos clave</h2>
      </header>

      <div style={LIST}>
        {items.map((it, i) => (
          <div key={i} style={ITEM}>
            <span style={ICON}>{it.icon || "·"}</span>
            <div style={BODY}>
              <div style={LABEL}>{it.label}</div>
              <div style={VALUE}>{it.value}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}


// ============== styles ==============

const WRAP: React.CSSProperties = { padding: "26px 16px 6px" };
const HEAD: React.CSSProperties = { marginBottom: 14 };
const TITLE: React.CSSProperties = {
  fontFamily: 'var(--kudos-font-display, "Cormorant Garamond", Georgia, serif)',
  fontSize: 22,
  fontWeight: 500,
  color: "#fff",
  margin: 0,
};
const LIST: React.CSSProperties = {
  background: "rgba(15,10,31,0.5)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 14,
  padding: "10px 16px",
};
const ITEM: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 14,
  padding: "12px 0",
  borderTop: "1px solid rgba(255,255,255,0.05)",
};
const ICON: React.CSSProperties = {
  fontSize: 16,
  color: "rgba(139,107,255,0.85)",
  marginTop: 2,
  flexShrink: 0,
};
const BODY: React.CSSProperties = { flex: 1 };
const LABEL: React.CSSProperties = {
  fontSize: 11,
  color: "rgba(255,255,255,0.55)",
  letterSpacing: "0.04em",
};
const VALUE: React.CSSProperties = {
  marginTop: 2,
  fontSize: 14,
  color: "#fff",
  fontWeight: 500,
};
