"use client";
/**
 * KUDOS HomeMap v5 · selector ciudad arriba-izq tipografía serif gigante.
 * "Roma" grande + "Italia ▼" pequeño debajo · click abre dropdown ciudades.
 */
import * as React from "react";
import { CITY_PRESETS, type CityPreset } from "./WorldSearch";


interface Props {
  city: string;
  country: string;
  onSelect: (c: CityPreset) => void;
}

export function WorldCityPicker({ city, country, onSelect }: Props) {
  const [open, setOpen] = React.useState(false);
  const wrapRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={wrapRef} style={WRAP}>
      <div style={LABEL}>ESTÁS EN</div>
      <h1 style={CITY}>{city}</h1>
      <button style={COUNTRY_BTN} onClick={() => setOpen(!open)}>
        <span>{country}</span>
        <span style={ARROW}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={DROPDOWN}>
          {CITY_PRESETS.map((c) => (
            <div key={c.name} style={ITEM} onClick={() => {
              onSelect(c);
              setOpen(false);
            }}>
              {c.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


const WRAP: React.CSSProperties = {
  position: "absolute",
  top: 70, left: 22,
  zIndex: 1000,
  color: "#1f1b18",
  fontFamily: '"Poppins", system-ui, sans-serif',
};

const LABEL: React.CSSProperties = {
  fontSize: 9.5,
  fontWeight: 700,
  letterSpacing: "0.22em",
  color: "rgba(31,27,24,0.5)",
  marginBottom: 4,
};

const CITY: React.CSSProperties = {
  margin: 0,
  fontFamily: 'Georgia, "Times New Roman", serif',
  fontWeight: 400,
  fontSize: 38,
  lineHeight: 1.05,
  letterSpacing: "-0.015em",
  color: "#1f1b18",
  textShadow: "0 1px 8px rgba(255,255,255,0.95)",
};

const COUNTRY_BTN: React.CSSProperties = {
  marginTop: 2,
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  background: "transparent",
  border: "none",
  fontFamily: 'Georgia, "Times New Roman", serif',
  fontSize: 16,
  color: "rgba(31,27,24,0.7)",
  cursor: "pointer",
  padding: 0,
  textShadow: "0 1px 6px rgba(255,255,255,0.9)",
};

const ARROW: React.CSSProperties = {
  fontSize: 9,
  color: "rgba(31,27,24,0.5)",
};

const DROPDOWN: React.CSSProperties = {
  marginTop: 8,
  background: "rgba(255,255,255,0.98)",
  borderRadius: 12,
  border: "1px solid rgba(0,0,0,0.06)",
  boxShadow: "0 6px 24px rgba(0,0,0,0.16)",
  padding: "6px 0",
  minWidth: 200,
  maxHeight: 320,
  overflowY: "auto",
  backdropFilter: "blur(10px)",
  fontFamily: '"Poppins", system-ui, sans-serif',
};

const ITEM: React.CSSProperties = {
  padding: "9px 16px",
  fontSize: 13,
  fontWeight: 500,
  color: "#1f1b18",
  cursor: "pointer",
};
