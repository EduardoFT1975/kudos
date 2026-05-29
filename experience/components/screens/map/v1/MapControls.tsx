"use client";
/**
 * KUDOS - MapControls - PROMPT 3/6.
 *
 * Componentes auxiliares de UI sobre el mapa cinematografico:
 *   - LocationBadge   : "ESTAS EN Roma · Italia" arriba izquierda
 *   - TimeSelector    : pill central con "Hoy" y "Año 80 d.C." (fake, solo visual)
 *   - LayersToggle    : icono capas arriba derecha
 *   - SideButtons     : 3 botones derecha (navegacion / target / sliders)
 *   - WeatherWidget   : "🌙 18°C Despejado" abajo izquierda
 *   - MapFilters      : 4 chips horizontales (Historia/Cultura/Arte/Naturaleza) - opcional MVP
 *   - UserTriangle    : triangulo morado animado = ubicacion usuario
 */
import * as React from "react";
import type { MapEra, MapCategory } from "./romaMock";
import { FILTERS } from "./romaMock";


// ===================== LocationBadge =====================

export function LocationBadge({ city, country }: { city: string; country: string }) {
  return (
    <div style={LB_WRAP}>
      <span style={LB_LABEL}>ESTÁS EN</span>
      <div style={LB_NAME}>{city}</div>
      <div style={LB_SUB}>
        {country} <span style={LB_CARET}>▾</span>
      </div>
    </div>
  );
}


// ===================== TimeSelector =====================

export function TimeSelector({
  era,
  onChange,
}: {
  era: MapEra;
  onChange: (e: MapEra) => void;
}) {
  return (
    <div style={TS_WRAP}>
      <button
        onClick={() => onChange("hoy")}
        style={{
          ...TS_PILL,
          ...(era === "hoy" ? TS_PILL_ACTIVE : null),
        }}
      >
        <span style={TS_ICON}>☀</span> Hoy
      </button>
      <button
        onClick={() => onChange("ancient")}
        style={{
          ...TS_PILL,
          ...(era === "ancient" ? TS_PILL_ACTIVE : null),
        }}
      >
        <span style={TS_ICON}>🏛</span> Año 80 d.C.
      </button>
    </div>
  );
}


// ===================== LayersToggle =====================

export function LayersToggle() {
  return (
    <button style={CIRCLE_BTN} aria-label="Capas">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M2 17l10 5 10-5" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M2 12l10 5 10-5" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    </button>
  );
}


// ===================== SideButtons =====================

export function SideButtons() {
  return (
    <div style={SIDE_STACK}>
      <button style={CIRCLE_BTN} aria-label="Navegar">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L4 22l8-4 8 4z" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      </button>
      <button style={CIRCLE_BTN} aria-label="Mi ubicación">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="#fff" strokeWidth="1.5" />
          <circle cx="12" cy="12" r="3" fill="#fff" />
          <path d="M12 1v4M12 19v4M1 12h4M19 12h4" stroke="#fff" strokeWidth="1.5" />
        </svg>
      </button>
      <button style={CIRCLE_BTN} aria-label="Filtros">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M3 6h18M6 12h12M10 18h4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}


// ===================== WeatherWidget =====================

export function WeatherWidget() {
  return (
    <div style={WW_WRAP}>
      <span style={WW_ICON}>🌙</span>
      <div style={WW_BODY}>
        <div style={WW_TEMP}>18°C</div>
        <div style={WW_LABEL}>Despejado</div>
      </div>
    </div>
  );
}


// ===================== UserTriangle =====================

export function UserTriangle({ x_pct, y_pct }: { x_pct: number; y_pct: number }) {
  return (
    <div
      style={{
        ...UT_WRAP,
        left: `${x_pct}%`,
        top: `${y_pct}%`,
      }}
      aria-hidden
    >
      <span style={UT_HALO} />
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L4 22l8-4 8 4z" fill="#8B6BFF" stroke="#fff" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
    </div>
  );
}


// ===================== MapFilters =====================

export function MapFilters({
  active,
  onChange,
}: {
  active: MapCategory | null;
  onChange: (c: MapCategory | null) => void;
}) {
  return (
    <div style={MF_WRAP}>
      {FILTERS.map((f) => {
        const isActive = active === f.id;
        return (
          <button
            key={f.id}
            onClick={() => onChange(isActive ? null : f.id)}
            style={{
              ...MF_CHIP,
              ...(isActive ? MF_CHIP_ACTIVE : null),
            }}
          >
            {f.label}
          </button>
        );
      })}
    </div>
  );
}


// ============== styles ==============

const LB_WRAP: React.CSSProperties = {
  position: "absolute",
  top: 70,
  left: 22,
  zIndex: 15,
};
const LB_LABEL: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: "0.22em",
  color: "rgba(255,255,255,0.55)",
  fontWeight: 600,
};
const LB_NAME: React.CSSProperties = {
  marginTop: 4,
  fontFamily: 'var(--kudos-font-display, "Cormorant Garamond", Georgia, serif)',
  fontSize: 38,
  fontWeight: 400,
  color: "#fff",
  letterSpacing: "-0.01em",
  textShadow: "0 2px 12px rgba(0,0,0,0.55)",
  lineHeight: 1,
};
const LB_SUB: React.CSSProperties = {
  marginTop: 6,
  fontSize: 13,
  color: "rgba(255,255,255,0.65)",
  fontFamily: '"Poppins", system-ui, sans-serif',
};
const LB_CARET: React.CSSProperties = {
  fontSize: 10,
  marginLeft: 4,
  opacity: 0.7,
};

const TS_WRAP: React.CSSProperties = {
  position: "absolute",
  top: 22,
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: 15,
  display: "inline-flex",
  gap: 4,
  padding: 4,
  background: "rgba(0,0,0,0.55)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 999,
  backdropFilter: "blur(12px)",
};
const TS_PILL: React.CSSProperties = {
  padding: "8px 16px",
  background: "transparent",
  border: "none",
  color: "rgba(255,255,255,0.75)",
  fontSize: 12,
  fontWeight: 500,
  borderRadius: 999,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  whiteSpace: "nowrap" as const,
};
const TS_PILL_ACTIVE: React.CSSProperties = {
  background: "rgba(255,255,255,0.15)",
  color: "#fff",
};
const TS_ICON: React.CSSProperties = { fontSize: 12, opacity: 0.9 };

const CIRCLE_BTN: React.CSSProperties = {
  width: 42,
  height: 42,
  borderRadius: "50%",
  background: "rgba(15,10,31,0.7)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "#fff",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  backdropFilter: "blur(10px)",
  flexShrink: 0,
};

const SIDE_STACK: React.CSSProperties = {
  position: "absolute",
  right: 18,
  top: "45%",
  transform: "translateY(-50%)",
  zIndex: 15,
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const WW_WRAP: React.CSSProperties = {
  position: "absolute",
  bottom: 270,
  left: 22,
  zIndex: 15,
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
  padding: "8px 14px",
  background: "rgba(0,0,0,0.55)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 14,
  backdropFilter: "blur(12px)",
};
const WW_ICON: React.CSSProperties = { fontSize: 16 };
const WW_BODY: React.CSSProperties = {};
const WW_TEMP: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: "#fff",
};
const WW_LABEL: React.CSSProperties = {
  fontSize: 10,
  color: "rgba(255,255,255,0.6)",
};

const UT_WRAP: React.CSSProperties = {
  position: "absolute",
  transform: "translate(-50%, -50%)",
  zIndex: 4,
  pointerEvents: "none",
};
const UT_HALO: React.CSSProperties = {
  position: "absolute",
  left: "50%",
  top: "50%",
  width: 70,
  height: 70,
  borderRadius: "50%",
  background:
    "radial-gradient(circle, rgba(139,107,255,0.45) 0%, rgba(139,107,255,0.18) 50%, rgba(139,107,255,0) 75%)",
  transform: "translate(-50%, -50%)",
  pointerEvents: "none",
};

const MF_WRAP: React.CSSProperties = {
  position: "absolute",
  top: 76,
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: 14,
  display: "flex",
  gap: 6,
  flexWrap: "wrap" as const,
  justifyContent: "center",
  maxWidth: "calc(100% - 40px)",
};
const MF_CHIP: React.CSSProperties = {
  padding: "6px 12px",
  background: "rgba(0,0,0,0.5)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "rgba(255,255,255,0.85)",
  fontSize: 11,
  fontWeight: 500,
  borderRadius: 999,
  cursor: "pointer",
  backdropFilter: "blur(10px)",
};
const MF_CHIP_ACTIVE: React.CSSProperties = {
  background: "rgba(139,107,255,0.85)",
  color: "#fff",
  border: "1px solid #8B6BFF",
};
