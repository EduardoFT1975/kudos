"use client";
/**
 * KUDOS - PoiTabs - PROMPT 6/6 (correccion critica).
 *
 * Tabs horizontales arriba de POI segun maqueta:
 *   ◉ Resumen · 🏛 Historia · ⏱ Explorar en el tiempo · ⏱ Experiencias · ⓘ Info practica · 💬 Conversar con KUDOS
 *
 * Cada tab hace scroll suave a su seccion ancla. NO cambia de pantalla.
 * "Experiencias" e "Info practica" son no-MVP, abren modal "proximamente".
 */
import * as React from "react";


type TabId = "resumen" | "historia" | "tiempo" | "experiencias" | "info" | "mind";


const TABS: { id: TabId; label: string; icon: string; anchor?: string }[] = [
  { id: "resumen",      label: "Resumen",            icon: "◉",  anchor: "#poi-capsule" },
  { id: "historia",     label: "Historia",           icon: "🏛", anchor: "#poi-historia" },
  { id: "tiempo",       label: "Explorar en el tiempo", icon: "⏱", anchor: "#poi-timeline" },
  { id: "experiencias", label: "Experiencias",       icon: "✦",  anchor: undefined },
  { id: "info",         label: "Info práctica",      icon: "ⓘ",  anchor: undefined },
  { id: "mind",         label: "Conversar con KUDOS", icon: "💬", anchor: "#poi-mind" },
];


export function PoiTabs() {
  const [active, setActive] = React.useState<TabId>("resumen");

  const onTab = (t: typeof TABS[number]) => {
    setActive(t.id);
    if (t.anchor && typeof window !== "undefined") {
      const el = document.querySelector(t.anchor);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        alert(`Sección "${t.label}" próximamente disponible.`);
      }
    } else {
      alert(`Sección "${t.label}" próximamente disponible.`);
    }
  };

  return (
    <nav style={WRAP} aria-label="Secciones POI">
      <div style={SCROLL}>
        {TABS.map((t) => {
          const isActive = active === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onTab(t)}
              style={{
                ...TAB,
                ...(isActive ? TAB_ACTIVE : null),
              }}
            >
              <span style={{ ...TAB_ICON, color: isActive ? "#8B6BFF" : "rgba(255,255,255,0.55)" }}>
                {t.icon}
              </span>
              <span style={TAB_LABEL}>{t.label}</span>
              {isActive && <span style={UNDER} />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}


const WRAP: React.CSSProperties = {
  borderBottom: "1px solid rgba(255,255,255,0.06)",
  background: "rgba(10,8,20,0.85)",
  backdropFilter: "blur(10px)",
  position: "sticky",
  top: 0,
  zIndex: 10,
};
const SCROLL: React.CSSProperties = {
  display: "flex",
  overflowX: "auto" as const,
  WebkitOverflowScrolling: "touch" as const,
  padding: "0 16px",
  gap: 4,
};
const TAB: React.CSSProperties = {
  position: "relative" as const,
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "14px 12px",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  color: "rgba(255,255,255,0.7)",
  fontSize: 13,
  fontFamily: "inherit",
  whiteSpace: "nowrap" as const,
  flexShrink: 0,
};
const TAB_ACTIVE: React.CSSProperties = {
  color: "#fff",
  fontWeight: 600,
};
const TAB_ICON: React.CSSProperties = {
  fontSize: 14,
};
const TAB_LABEL: React.CSSProperties = {};
const UNDER: React.CSSProperties = {
  position: "absolute" as const,
  bottom: 0,
  left: 8,
  right: 8,
  height: 2,
  background: "#8B6BFF",
  borderRadius: 2,
};
