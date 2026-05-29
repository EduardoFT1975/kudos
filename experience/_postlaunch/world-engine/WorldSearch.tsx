"use client";
/**
 * KUDOS · Search bar + city picker · arriba centrado.
 * MVP: 14 ciudades top hardcoded. Futuro: Nominatim geocoding.
 */
import * as React from "react";


export interface CityPreset {
  name: string;
  lat: number;
  lng: number;
  zoom: number;
}

export const CITY_PRESETS: CityPreset[] = [
  { name: "Roma, Italia",        lat: 41.9028, lng: 12.4964, zoom: 14 },
  { name: "Madrid, España",      lat: 40.4168, lng: -3.7038, zoom: 13 },
  { name: "Barcelona, España",   lat: 41.3851, lng: 2.1734,  zoom: 13 },
  { name: "París, Francia",      lat: 48.8566, lng: 2.3522,  zoom: 13 },
  { name: "Londres, UK",         lat: 51.5074, lng: -0.1278, zoom: 13 },
  { name: "Lisboa, Portugal",    lat: 38.7223, lng: -9.1393, zoom: 13 },
  { name: "Atenas, Grecia",      lat: 37.9838, lng: 23.7275, zoom: 14 },
  { name: "Estambul, Turquía",   lat: 41.0082, lng: 28.9784, zoom: 13 },
  { name: "Granada, España",     lat: 37.1773, lng: -3.5986, zoom: 14 },
  { name: "Florencia, Italia",   lat: 43.7696, lng: 11.2558, zoom: 14 },
  { name: "Praga, R. Checa",     lat: 50.0755, lng: 14.4378, zoom: 13 },
  { name: "Tokio, Japón",        lat: 35.6762, lng: 139.6503, zoom: 12 },
  { name: "Kioto, Japón",        lat: 35.0116, lng: 135.7681, zoom: 13 },
  { name: "Berlín, Alemania",    lat: 52.5200, lng: 13.4050, zoom: 12 },
];


interface Props {
  onSelect: (city: CityPreset) => void;
  currentCity?: string;
}

export function WorldSearch({ onSelect, currentCity = "Explora el mundo" }: Props) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const wrapRef = React.useRef<HTMLDivElement | null>(null);

  // Cerrar al click fuera
  React.useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const filtered = query.trim()
    ? CITY_PRESETS.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
    : CITY_PRESETS;

  return (
    <div ref={wrapRef} style={WRAP}>
      <div style={PILL} onClick={() => setOpen(true)}>
        <span style={ICON}>⌕</span>
        {open ? (
          <input
            autoFocus
            placeholder="Buscar lugares, ciudades..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={INPUT}
          />
        ) : (
          <span style={LABEL}>{currentCity}</span>
        )}
        <span style={ARROW}>{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div style={DROPDOWN}>
          {filtered.length === 0 && (
            <div style={EMPTY}>Sin resultados para "{query}"</div>
          )}
          {filtered.map((c) => (
            <div key={c.name} style={ITEM} onClick={() => {
              onSelect(c);
              setOpen(false);
              setQuery("");
            }}>
              <span style={ITEM_ICON}>◉</span>
              <span style={ITEM_NAME}>{c.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


const WRAP: React.CSSProperties = {
  position: "absolute",
  top: 14,
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: 1000,
  width: "min(360px, calc(100% - 110px))",
  fontFamily: '"Poppins", system-ui, sans-serif',
};

const PILL: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 14px",
  background: "rgba(255,255,255,0.95)",
  borderRadius: 999,
  border: "1px solid rgba(0,0,0,0.08)",
  boxShadow: "0 2px 10px rgba(0,0,0,0.12)",
  cursor: "pointer",
  backdropFilter: "blur(8px)",
};

const ICON: React.CSSProperties = { fontSize: 16, color: "#666" };
const LABEL: React.CSSProperties = { flex: 1, fontSize: 13, fontWeight: 500, color: "#1f1b18" };
const ARROW: React.CSSProperties = { fontSize: 9, color: "#888" };
const INPUT: React.CSSProperties = {
  flex: 1, border: "none", outline: "none", background: "transparent",
  fontFamily: 'inherit', fontSize: 13, fontWeight: 500, color: "#1f1b18",
};

const DROPDOWN: React.CSSProperties = {
  marginTop: 6,
  background: "rgba(255,255,255,0.98)",
  borderRadius: 14,
  border: "1px solid rgba(0,0,0,0.06)",
  boxShadow: "0 4px 20px rgba(0,0,0,0.16)",
  overflow: "hidden",
  maxHeight: 380,
  overflowY: "auto",
  backdropFilter: "blur(10px)",
};

const ITEM: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 10,
  padding: "10px 16px",
  cursor: "pointer",
  fontSize: 13,
  color: "#1f1b18",
  borderBottom: "1px solid rgba(0,0,0,0.04)",
};

const ITEM_ICON: React.CSSProperties = { fontSize: 11, color: "#C9A961" };
const ITEM_NAME: React.CSSProperties = { flex: 1, fontWeight: 500 };
const EMPTY: React.CSSProperties = {
  padding: "16px", fontSize: 12, color: "#888", textAlign: "center" as const,
};
