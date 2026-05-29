"use client";
/**
 * KUDOS Home V2 · DiscoveryChain.
 *
 * "Donde te lleva esto" -- 3 POIs vinculados al Core del dia.
 * Card horizontal scrollable. Cada card es minimal: nombre + 1 linea + flecha.
 *
 * MVP: cadenas hardcoded por Core (3 POIs Omega/S relacionados conceptualmente).
 * V1: se reemplaza por lectura de /api/pois/{id}/related cuando backend este listo.
 */
import * as React from "react";
import { useRouter } from "next/navigation";


interface ChainItem {
  poi_id: string;
  name: string;
  hint: string;
}


// Cadenas curadas manualmente. Cada Core lleva a 3 POIs relacionados conceptualmente
// dentro de la jerarquia Omega/S de KUDOS.
const CHAIN_BY_CORE: Record<string, ChainItem[]> = {
  // OLDUVAI -> origen biologico
  "wd-Q174045": [
    { poi_id: "wd-Q1090052", name: "Gobekli Tepe",     hint: "Cuando los humanos empezaron a reunirse." },
    { poi_id: "wd-Q189780",  name: "Lascaux",          hint: "Cuando los humanos empezaron a pintar." },
    { poi_id: "wd-Q42797",   name: "Galapagos",        hint: "Cuando entendimos como llegamos a ser asi." },
  ],
  // GOBEKLI -> significado proto-civilizacional
  "wd-Q1090052": [
    { poi_id: "wd-Q189780", name: "Lascaux",       hint: "El ritual mas antiguo conservado." },
    { poi_id: "wd-Q1218",   name: "Jerusalen",     hint: "Donde el ritual sigue dividiendo y uniendo." },
    { poi_id: "wd-Q176330", name: "Hiroshima",     hint: "Cuando el ritual humano se hizo memorial." },
  ],
  // LASCAUX -> belleza original
  "wd-Q189780": [
    { poi_id: "wd-Q174045",  name: "Olduvai Gorge",  hint: "Las manos que pintarian, antes de pintar." },
    { poi_id: "wd-Q1090052", name: "Gobekli Tepe",   hint: "El primer arte ya organizado." },
    { poi_id: "wd-Q1218",    name: "Jerusalen",      hint: "Cuando el arte se hizo sagrado." },
  ],
  // JERUSALEN -> creencia
  "wd-Q1218": [
    { poi_id: "wd-Q1090052", name: "Gobekli Tepe",  hint: "Donde la creencia colectiva empezo." },
    { poi_id: "wd-Q42797",   name: "Galapagos",     hint: "Donde la ciencia desafio la creencia." },
    { poi_id: "wd-Q1737",    name: "Apollo 11",     hint: "Donde lo trascendente se hizo fisico." },
  ],
  // GALAPAGOS -> conocimiento
  "wd-Q42797": [
    { poi_id: "wd-Q174045", name: "Olduvai Gorge", hint: "Lo que Darwin no llego a ver." },
    { poi_id: "wd-Q1737",   name: "Apollo 11",     hint: "Lo que la ciencia hizo posible despues." },
    { poi_id: "wd-Q176330", name: "Hiroshima",     hint: "Lo que la ciencia tambien puede romper." },
  ],
  // APOLLO 11 -> exploracion
  "wd-Q1737": [
    { poi_id: "wd-Q42797",  name: "Galapagos",     hint: "Exploracion sin salir del planeta." },
    { poi_id: "wd-Q174045", name: "Olduvai Gorge", hint: "El primer paso, hace 2 millones de anos." },
    { poi_id: "wd-Q176330", name: "Hiroshima",     hint: "La otra cara del poder humano." },
  ],
  // HIROSHIMA -> memoria
  "wd-Q176330": [
    { poi_id: "wd-Q1218",    name: "Jerusalen",     hint: "Donde el conflicto humano se hace permanente." },
    { poi_id: "wd-Q1090052", name: "Gobekli Tepe",  hint: "Donde lo humano se hizo monumento." },
    { poi_id: "wd-Q1737",    name: "Apollo 11",     hint: "Lo que la misma tecnologia hizo de noble." },
  ],
};


const CORE_BY_DAY = [
  "wd-Q174045", "wd-Q1090052", "wd-Q189780", "wd-Q1218",
  "wd-Q42797",  "wd-Q1737",    "wd-Q176330",
];


function getCoreIdForToday(): string {
  const d = new Date().getDay();
  const idx = d === 0 ? 6 : d - 1;
  return CORE_BY_DAY[idx];
}


export function DiscoveryChain() {
  const router = useRouter();
  const coreId = React.useMemo(getCoreIdForToday, []);
  const items = CHAIN_BY_CORE[coreId] || [];

  if (items.length === 0) return null;

  return (
    <section style={WRAP}>
      <header style={HEAD}>
        <span style={LABEL}>DONDE TE LLEVA ESTO</span>
        <h3 style={TITLE}>Tres lugares que continuan la historia.</h3>
      </header>

      <div style={ROW}>
        {items.map((it) => (
          <button
            key={it.poi_id}
            style={CARD}
            onClick={() => router.push(`/poi/${it.poi_id}`)}
            aria-label={`Explorar ${it.name}`}
          >
            <div style={CARD_NAME}>{it.name}</div>
            <div style={CARD_HINT}>{it.hint}</div>
            <div style={CARD_ARROW}>›</div>
          </button>
        ))}
      </div>
    </section>
  );
}


const WRAP: React.CSSProperties = {
  padding: "24px 16px 12px",
};

const HEAD: React.CSSProperties = {
  marginBottom: 14,
  padding: "0 8px",
};

const LABEL: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: "0.22em",
  color: "rgba(201,169,97,0.85)",
  fontWeight: 600,
  display: "block",
  marginBottom: 6,
};

const TITLE: React.CSSProperties = {
  fontFamily: 'var(--kudos-font-display, "Cormorant Garamond", Georgia, serif)',
  fontSize: 18,
  fontWeight: 500,
  color: "rgba(255,255,255,0.92)",
  margin: 0,
  letterSpacing: "-0.005em",
};

const ROW: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexDirection: "column",
};

const CARD: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gridTemplateRows: "auto auto",
  rowGap: 4,
  columnGap: 14,
  alignItems: "center",
  padding: "16px 18px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 14,
  cursor: "pointer",
  color: "#fff",
  fontFamily: "inherit",
  textAlign: "left" as const,
  transition: "background 160ms",
};

const CARD_NAME: React.CSSProperties = {
  gridRow: "1 / 2",
  gridColumn: "1 / 2",
  fontSize: 15,
  fontWeight: 600,
  color: "#fff",
};

const CARD_HINT: React.CSSProperties = {
  gridRow: "2 / 3",
  gridColumn: "1 / 2",
  fontSize: 12,
  color: "rgba(255,255,255,0.62)",
  fontStyle: "italic",
  lineHeight: 1.35,
};

const CARD_ARROW: React.CSSProperties = {
  gridRow: "1 / 3",
  gridColumn: "2 / 3",
  fontSize: 28,
  color: "rgba(201,169,97,0.75)",
  fontWeight: 300,
};
