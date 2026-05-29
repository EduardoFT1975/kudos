"use client";
/**
 * KUDOS · Panel lateral Capas + Filtros.
 *
 * Mobile: off-canvas drawer (cerrado por defecto · hamburger arriba-izq).
 * Desktop (≥980px): visible siempre · pegado a izquierda.
 *
 * CAPAS (cosmético MVP · todas ON por defecto):
 *   Presente · Historia · Experiencia · Comercio · Amigos
 *
 * FILTROS (activos · afecta categorías visibles):
 *   Todo · Monumentos · Museos · Naturaleza · Yacimientos · Religiosos
 */
import * as React from "react";
import type { WorldNodeCategory } from "./world-tokens";


// Mapeo Filtro UI → categorías visibles
export const FILTER_TO_CATEGORIES: Record<string, Set<WorldNodeCategory> | null> = {
  todo: null,   // null = todas
  monumentos: new Set<WorldNodeCategory>(["monument", "palace", "plaza"]),
  museos: new Set<WorldNodeCategory>(["museum"]),
  naturaleza: new Set<WorldNodeCategory>(["park"]),
  yacimientos: new Set<WorldNodeCategory>(["archaeology", "megalith"]),
  religiosos: new Set<WorldNodeCategory>(["religious"]),
  castillos: new Set<WorldNodeCategory>(["castle", "palace"]),
};


interface CapaItem { id: string; label: string; icon: string; }
const CAPAS: CapaItem[] = [
  { id: "presente",    label: "Presente",    icon: "◉" },
  { id: "historia",    label: "Historia",    icon: "🏛" },
  { id: "experiencia", label: "Experiencia", icon: "✦" },
  { id: "comercio",    label: "Comercio",    icon: "◊" },
  { id: "amigos",      label: "Amigos",      icon: "◍" },
];

interface FilterItem { id: string; label: string; icon: string; }
const FILTROS: FilterItem[] = [
  { id: "todo",        label: "Todo",        icon: "●" },
  { id: "monumentos",  label: "Monumentos",  icon: "▲" },
  { id: "museos",      label: "Museos",      icon: "▣" },
  { id: "naturaleza",  label: "Naturaleza",  icon: "❀" },
  { id: "yacimientos", label: "Yacimientos", icon: "⫯" },
  { id: "religiosos",  label: "Religiosos",  icon: "✚" },
  { id: "castillos",   label: "Castillos",   icon: "♜" },
];


interface Props {
  activeLayers: Set<string>;
  onToggleLayer: (id: string) => void;
  activeFilter: string;
  onSelectFilter: (id: string) => void;
}

export function WorldHud({ activeLayers, onToggleLayer, activeFilter, onSelectFilter }: Props) {
  const [open, setOpen] = React.useState(typeof window !== "undefined" && window.innerWidth >= 980);

  return (
    <>
      {/* Hamburger trigger (siempre visible) */}
      <button
        style={HAMBURGER}
        onClick={() => setOpen(!open)}
        aria-label="Abrir capas y filtros"
      >
        {open ? "✕" : "☰"}
      </button>

      {/* Panel */}
      <div style={{
        ...PANEL,
        transform: open ? "translateX(0)" : "translateX(-110%)",
      }}>
        <Section title="Capas">
          {CAPAS.map((c) => {
            const on = activeLayers.has(c.id);
            return (
              <Row key={c.id} icon={c.icon} label={c.label}
                   active={on} onClick={() => onToggleLayer(c.id)}
                   ind={on ? "👁" : "·"} variant="toggle"
              />
            );
          })}
        </Section>

        <Section title="Filtros">
          {FILTROS.map((f) => {
            const on = activeFilter === f.id;
            return (
              <Row key={f.id} icon={f.icon} label={f.label}
                   active={on} onClick={() => onSelectFilter(f.id)}
                   ind={on ? "●" : "○"} variant="radio"
              />
            );
          })}
        </Section>
      </div>
    </>
  );
}


function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={SECTION}>
      <div style={SECTION_TITLE}>{title}</div>
      {children}
    </div>
  );
}


function Row({ icon, label, ind, active, onClick, variant }: {
  icon: string; label: string; ind: string;
  active: boolean; onClick: () => void;
  variant: "toggle" | "radio";
}) {
  return (
    <div onClick={onClick} style={{
      ...ROW,
      color: active ? "#1f1b18" : "#888",
      fontWeight: active ? 600 : 500,
    }}>
      <span style={ROW_ICON}>{icon}</span>
      <span style={ROW_LABEL}>{label}</span>
      <span style={{
        ...ROW_IND,
        color: active ? "#C9A961" : "#bbb",
      }}>{ind}</span>
    </div>
  );
}


const HAMBURGER: React.CSSProperties = {
  position: "absolute",
  top: 14,
  left: 14,
  zIndex: 2000,
  width: 36,
  height: 36,
  borderRadius: 10,
  background: "rgba(255,255,255,0.95)",
  border: "1px solid rgba(0,0,0,0.08)",
  fontSize: 17,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#1f1b18",
  boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
};

const PANEL: React.CSSProperties = {
  position: "absolute",
  top: 60,
  left: 14,
  bottom: 60,
  width: 220,
  zIndex: 1500,
  background: "rgba(255,255,255,0.96)",
  borderRadius: 16,
  border: "1px solid rgba(0,0,0,0.06)",
  boxShadow: "0 4px 20px rgba(0,0,0,0.14)",
  padding: "14px 4px",
  overflow: "hidden auto",
  fontFamily: '"Poppins", system-ui, sans-serif',
  transition: "transform 0.32s cubic-bezier(0.22,1,0.36,1)",
  backdropFilter: "blur(10px)",
};

const SECTION: React.CSSProperties = { marginBottom: 14 };

const SECTION_TITLE: React.CSSProperties = {
  padding: "4px 16px 8px",
  fontSize: 10,
  letterSpacing: "0.18em",
  fontWeight: 700,
  color: "#888",
  textTransform: "uppercase" as const,
  borderBottom: "1px solid rgba(0,0,0,0.05)",
  marginBottom: 6,
};

const ROW: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "8px 14px",
  fontSize: 12.5,
  cursor: "pointer",
  borderRadius: 8,
  margin: "0 4px",
  transition: "background 0.15s ease",
};

const ROW_ICON: React.CSSProperties = { fontSize: 14, width: 16, textAlign: "center" as const };
const ROW_LABEL: React.CSSProperties = { flex: 1 };
const ROW_IND: React.CSSProperties = { fontSize: 12 };
