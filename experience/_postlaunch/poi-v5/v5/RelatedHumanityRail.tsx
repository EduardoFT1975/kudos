"use client";
/**
 * KUDOS POI Node V2 · RelatedHumanityRail · T3.2 EJEC Day 4.
 *
 * 3 POIs vinculados al POI actual.
 * Hint: "Donde te lleva esto".
 *
 * Estrategia:
 *   - Si es Core, usa cadena hardcoded de DiscoveryChain (consistencia)
 *   - Si es Omega/S, intenta /data/relationships/index.json (manifest existente)
 *   - Si no hay nada, render null (no rompe)
 *
 * Tracking: relationship_followed al hacer click.
 */
import * as React from "react";
import { useRouter } from "next/navigation";


interface RelatedItem {
  poi_id: string;
  name: string;
  hint?: string;
}


// Cadenas Core importadas de DiscoveryChain (consistencia editorial)
const CORE_CHAINS: Record<string, RelatedItem[]> = {
  "wd-Q174045": [
    { poi_id: "wd-Q1090052", name: "Gobekli Tepe",  hint: "Cuando los humanos empezaron a reunirse." },
    { poi_id: "wd-Q189780",  name: "Lascaux",       hint: "Cuando los humanos empezaron a pintar." },
    { poi_id: "wd-Q42797",   name: "Galapagos",     hint: "Cuando entendimos como llegamos a ser asi." },
  ],
  "wd-Q1090052": [
    { poi_id: "wd-Q189780", name: "Lascaux",   hint: "El ritual mas antiguo conservado." },
    { poi_id: "wd-Q1218",   name: "Jerusalen", hint: "Donde el ritual sigue dividiendo y uniendo." },
    { poi_id: "wd-Q176330", name: "Hiroshima", hint: "Cuando el ritual humano se hizo memorial." },
  ],
  "wd-Q189780": [
    { poi_id: "wd-Q174045",  name: "Olduvai Gorge", hint: "Las manos que pintarian, antes de pintar." },
    { poi_id: "wd-Q1090052", name: "Gobekli Tepe",  hint: "El primer arte ya organizado." },
    { poi_id: "wd-Q1218",    name: "Jerusalen",     hint: "Cuando el arte se hizo sagrado." },
  ],
  "wd-Q1218": [
    { poi_id: "wd-Q1090052", name: "Gobekli Tepe", hint: "Donde la creencia colectiva empezo." },
    { poi_id: "wd-Q42797",   name: "Galapagos",    hint: "Donde la ciencia desafio la creencia." },
    { poi_id: "wd-Q1737",    name: "Apollo 11",    hint: "Donde lo trascendente se hizo fisico." },
  ],
  "wd-Q42797": [
    { poi_id: "wd-Q174045", name: "Olduvai Gorge", hint: "Lo que Darwin no llego a ver." },
    { poi_id: "wd-Q1737",   name: "Apollo 11",     hint: "Lo que la ciencia hizo posible despues." },
    { poi_id: "wd-Q176330", name: "Hiroshima",     hint: "Lo que la ciencia tambien puede romper." },
  ],
  "wd-Q1737": [
    { poi_id: "wd-Q42797",  name: "Galapagos",     hint: "Exploracion sin salir del planeta." },
    { poi_id: "wd-Q174045", name: "Olduvai Gorge", hint: "El primer paso, hace 2 millones de anos." },
    { poi_id: "wd-Q176330", name: "Hiroshima",     hint: "La otra cara del poder humano." },
  ],
  "wd-Q176330": [
    { poi_id: "wd-Q1218",    name: "Jerusalen",    hint: "Donde el conflicto humano se hace permanente." },
    { poi_id: "wd-Q1090052", name: "Gobekli Tepe", hint: "Donde lo humano se hizo monumento." },
    { poi_id: "wd-Q1737",    name: "Apollo 11",    hint: "Lo que la misma tecnologia hizo de noble." },
  ],
};


const API = process.env.NEXT_PUBLIC_KUDOS_API_URL || "";


export function RelatedHumanityRail({ poiId }: { poiId: string }) {
  const router = useRouter();
  const [items, setItems] = React.useState<RelatedItem[]>([]);

  React.useEffect(() => {
    // 1. Si es Core, usa cadena editorial hardcoded
    if (CORE_CHAINS[poiId]) {
      setItems(CORE_CHAINS[poiId]);
      return;
    }
    // 2. Si no, intenta /data/relationships/index.json (offline manifest)
    fetch("/data/relationships/index.json", { cache: "force-cache" })
      .then((r) => r.ok ? r.json() : null)
      .then((j) => {
        const rels: any[] = (j && j.relationships && j.relationships[poiId]) || [];
        const mapped: RelatedItem[] = rels.slice(0, 3).map((r) => ({
          poi_id: r.id,
          name: String(r.id).replace(/^wd-Q/, "POI "),
        }));
        setItems(mapped);
      })
      .catch(() => setItems([]));
  }, [poiId]);

  if (items.length === 0) return null;

  const handleClick = (target_id: string) => {
    if (typeof window !== "undefined" && API) {
      const sid = sessionStorage.getItem("kudos:session") || "anon-" + Date.now();
      void fetch(`${API}/api/telemetry/event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sid,
          event_type: "relationship_followed",
          poi_id: poiId,
          payload: { target_id },
        }),
        credentials: "include",
        keepalive: true,
      }).catch(() => {});
    }
    // Si el target es Core, ir a /core/[id]; si no, a /poi/[id]
    const isCore = target_id in CORE_CHAINS;
    router.push(isCore ? `/core/${target_id}` : `/poi/${target_id}`);
  };

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
            onClick={() => handleClick(it.poi_id)}
            aria-label={`Explorar ${it.name}`}
          >
            <div style={NAME}>{it.name}</div>
            {it.hint && <div style={HINT}>{it.hint}</div>}
            <div style={ARROW}>›</div>
          </button>
        ))}
      </div>
    </section>
  );
}


const WRAP: React.CSSProperties = { padding: "24px 16px 12px" };
const HEAD: React.CSSProperties = { marginBottom: 14, padding: "0 8px" };
const LABEL: React.CSSProperties = {
  fontSize: 10, letterSpacing: "0.22em",
  color: "rgba(201,169,97,0.85)", fontWeight: 600,
  display: "block", marginBottom: 6,
};
const TITLE: React.CSSProperties = {
  fontFamily: 'var(--kudos-font-display, "Cormorant Garamond", Georgia, serif)',
  fontSize: 18, fontWeight: 500,
  color: "rgba(255,255,255,0.92)", margin: 0,
  letterSpacing: "-0.005em",
};
const ROW: React.CSSProperties = {
  display: "flex", gap: 10, flexDirection: "column",
};
const CARD: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gridTemplateRows: "auto auto",
  rowGap: 4, columnGap: 14,
  alignItems: "center",
  padding: "14px 18px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 14,
  cursor: "pointer",
  color: "#fff",
  fontFamily: "inherit",
  textAlign: "left" as const,
};
const NAME: React.CSSProperties = {
  gridRow: "1 / 2", gridColumn: "1 / 2",
  fontSize: 14, fontWeight: 600,
};
const HINT: React.CSSProperties = {
  gridRow: "2 / 3", gridColumn: "1 / 2",
  fontSize: 12, color: "rgba(255,255,255,0.55)",
  fontStyle: "italic", lineHeight: 1.4,
};
const ARROW: React.CSSProperties = {
  gridRow: "1 / 3", gridColumn: "2 / 3",
  fontSize: 24, color: "rgba(201,169,97,0.75)",
  fontWeight: 300,
};
