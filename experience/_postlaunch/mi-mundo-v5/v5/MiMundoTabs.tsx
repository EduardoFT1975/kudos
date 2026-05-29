"use client";
/**
 * KUDOS · MiMundoTabs · T3.2 EJEC Day 16.
 *
 * Header con 3 tabs sobre la pantalla Mi Mundo V2:
 *   1. Mapa cognitivo  -> <PersonalGraph />      (constelacion 7 pilares)
 *   2. Tus shifts      -> <ShiftHistory />       (lista revisitable)
 *   3. Tus lugares     -> <MiMundoV5 />          (version actual con favoritos)
 *
 * El usuario llega por defecto a "Mapa cognitivo" (nuevo Day 15).
 * Persistencia tab en sessionStorage para no perder contexto al navegar.
 */
import * as React from "react";
import { PersonalGraph } from "./PersonalGraph";
import { ShiftHistory } from "./ShiftHistory";
import { MiMundoV5 } from "./MiMundoV5";


type TabId = "graph" | "shifts" | "lugares";

const TABS: { id: TabId; label: string; sublabel: string }[] = [
  { id: "graph",   label: "Mapa cognitivo", sublabel: "7 pilares" },
  { id: "shifts",  label: "Tus shifts",     sublabel: "lo que cambio" },
  { id: "lugares", label: "Tus lugares",    sublabel: "favoritos" },
];


export function MiMundoTabs() {
  const [tab, setTab] = React.useState<TabId>("graph");

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = sessionStorage.getItem("kudos:miMundoTab") as TabId | null;
    if (saved && TABS.some((t) => t.id === saved)) setTab(saved);
  }, []);

  const select = (id: TabId) => {
    setTab(id);
    try { sessionStorage.setItem("kudos:miMundoTab", id); } catch {}
  };

  return (
    <div style={ROOT}>
      <header style={HEADER}>
        <div style={INTRO}>
          <span style={INTRO_LABEL}>MI MUNDO</span>
          <h1 style={INTRO_TITLE}>Lo que has tocado.</h1>
          <p style={INTRO_SUB}>
            Tu mapa personal de descubrimiento. Privado por defecto.
          </p>
        </div>

        <nav style={TABBAR} aria-label="Vistas de Mi Mundo">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => select(t.id)}
                style={{ ...TAB, ...(active ? TAB_ACTIVE : null) }}
              >
                <span style={{ ...TAB_LBL, color: active ? "#fff" : "rgba(255,255,255,0.55)" }}>
                  {t.label}
                </span>
                <span style={TAB_SUB}>{t.sublabel}</span>
                {active && <span style={TAB_UNDER} />}
              </button>
            );
          })}
        </nav>
      </header>

      <main style={MAIN}>
        {tab === "graph"   && <PersonalGraph />}
        {tab === "shifts"  && <ShiftHistory />}
        {tab === "lugares" && <MiMundoV5 />}
      </main>
    </div>
  );
}


// =================== styles ===================

const ROOT: React.CSSProperties = {
  background: "#0a0814", minHeight: "100vh",
  fontFamily: '"Poppins", system-ui, sans-serif',
};
const HEADER: React.CSSProperties = {
  padding: "32px 22px 0",
  borderBottom: "1px solid rgba(255,255,255,0.06)",
};
const INTRO: React.CSSProperties = {
  marginBottom: 22,
};
const INTRO_LABEL: React.CSSProperties = {
  fontSize: 10, letterSpacing: "0.25em",
  color: "rgba(201,169,97,0.85)", fontWeight: 700,
  display: "block", marginBottom: 8,
};
const INTRO_TITLE: React.CSSProperties = {
  margin: 0,
  fontFamily: 'var(--kudos-font-display, "Cormorant Garamond", Georgia, serif)',
  fontSize: 38, fontWeight: 400, color: "#fff",
  letterSpacing: "-0.01em",
};
const INTRO_SUB: React.CSSProperties = {
  margin: "6px 0 0",
  fontSize: 13, color: "rgba(255,255,255,0.55)",
};
const TABBAR: React.CSSProperties = {
  display: "flex", gap: 18,
  overflowX: "auto" as const,
};
const TAB: React.CSSProperties = {
  position: "relative",
  padding: "12px 4px",
  background: "transparent", border: "none",
  cursor: "pointer",
  display: "flex", flexDirection: "column", alignItems: "flex-start",
  whiteSpace: "nowrap" as const,
};
const TAB_ACTIVE: React.CSSProperties = {};
const TAB_LBL: React.CSSProperties = {
  fontSize: 13, fontWeight: 600,
  letterSpacing: "0.02em",
};
const TAB_SUB: React.CSSProperties = {
  fontSize: 10, color: "rgba(255,255,255,0.4)",
  letterSpacing: "0.08em",
  marginTop: 2,
};
const TAB_UNDER: React.CSSProperties = {
  position: "absolute" as const,
  bottom: -1, left: 0, right: 0,
  height: 2, background: "#C9A961",
};
const MAIN: React.CSSProperties = {
  padding: "8px 0 80px",
};
