"use client";
/**
 * KUDOS - MapMVP - PROMPT 3/6.
 *
 * Pantalla /world reescrita como ILUSION VISUAL CINEMATOGRAFICA.
 * NO usa Leaflet ni Mapbox. Es:
 *   - imagen aerea Roma nocturna full-screen
 *   - overlay morado oscuro KUDOS
 *   - POIs flotantes posicionados absolute con halos por tier
 *   - triangulo morado = ubicacion user
 *   - controles UI superpuestos
 *   - carousel inferior con 3 cards (Coliseo imperdible)
 *
 * El selector temporal Hoy/80 d.C. es FAKE: cambia background y filtra POIs.
 */
import * as React from "react";
import {
  ROMA_POIS,
  ROMA_BOTTOM_CARDS,
  MAP_BG,
  type MapEra,
  type MapCategory,
} from "./romaMock";
import { MapPOI } from "./MapPOI";
import { MapBottomCarousel } from "./MapBottomCarousel";
import {
  LocationBadge,
  TimeSelector,
  LayersToggle,
  SideButtons,
  WeatherWidget,
  UserTriangle,
} from "./MapControls";


export function MapMVP() {
  const [era, setEra] = React.useState<MapEra>("hoy");
  const [filter, setFilter] = React.useState<MapCategory | null>(null);

  const visiblePois = React.useMemo(
    () =>
      ROMA_POIS.filter(
        (p) =>
          p.visible_in.includes(era) &&
          (filter === null || p.category === filter)
      ),
    [era, filter]
  );

  return (
    <div style={ROOT}>
      {/* === Fondo cinematografico === */}
      <div
        style={{
          ...BG,
          backgroundImage: `linear-gradient(180deg, rgba(10,8,20,0.55) 0%, rgba(10,8,20,0.35) 40%, rgba(10,8,20,0.78) 100%), url(${era === "hoy" ? MAP_BG.hoy : MAP_BG.ancient})`,
          filter: era === "ancient" ? "sepia(0.45) brightness(0.85) hue-rotate(-15deg)" : "none",
        }}
        aria-hidden
      />

      {/* === Glow morado KUDOS layer === */}
      <div style={GLOW_OVERLAY} aria-hidden />

      {/* === Top controles === */}
      <header style={TOPBAR}>
        <button style={SEARCH_BTN} aria-label="Buscar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="#fff" strokeWidth="1.7" />
            <path d="M21 21l-4-4" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        </button>
        <div style={TOP_TITLE}>KUDOS</div>
        <button style={AVATAR_BTN} aria-label="Perfil" />
      </header>

      <TimeSelector era={era} onChange={setEra} />

      <LocationBadge city="Roma" country="Italia" />

      <div style={LAYERS_POS}>
        <LayersToggle />
      </div>

      <SideButtons />

      {/* === POIs flotantes === */}
      <div style={POIS_LAYER}>
        {visiblePois.map((p) => (
          <MapPOI key={p.id} poi={p} />
        ))}
        <UserTriangle x_pct={50} y_pct={56} />
      </div>

      {/* === Filtros flotantes (mini) === */}
      <div style={FILTER_POS}>
        <FilterChips active={filter} onChange={setFilter} />
      </div>

      {/* === Weather widget === */}
      <WeatherWidget />

      {/* === Carousel inferior === */}
      <MapBottomCarousel cards={ROMA_BOTTOM_CARDS} />
    </div>
  );
}


// Inline filter chips (4 categorias)
function FilterChips({
  active,
  onChange,
}: {
  active: MapCategory | null;
  onChange: (c: MapCategory | null) => void;
}) {
  const items: { id: MapCategory; label: string }[] = [
    { id: "historia",   label: "Historia" },
    { id: "cultura",    label: "Cultura" },
    { id: "arte",       label: "Arte" },
    { id: "naturaleza", label: "Naturaleza" },
  ];
  return (
    <div style={FC_WRAP}>
      {items.map((f) => {
        const isActive = active === f.id;
        return (
          <button
            key={f.id}
            onClick={() => onChange(isActive ? null : f.id)}
            style={{
              ...FC_CHIP,
              ...(isActive ? FC_CHIP_ACTIVE : null),
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

const ROOT: React.CSSProperties = {
  position: "relative",
  width: "100%",
  height: "100vh",
  background: "#0a0814",
  overflow: "hidden",
  fontFamily: '"Poppins", system-ui, sans-serif',
};

const BG: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  backgroundSize: "cover",
  backgroundPosition: "center",
  zIndex: 0,
};

const GLOW_OVERLAY: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  background:
    "radial-gradient(ellipse at 65% 50%, rgba(139,107,255,0.18) 0%, rgba(10,8,20,0) 60%)",
  zIndex: 1,
  pointerEvents: "none",
};

const TOPBAR: React.CSSProperties = {
  position: "absolute",
  top: 20,
  left: 0,
  right: 0,
  zIndex: 25,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0 22px",
  pointerEvents: "auto",
};

const SEARCH_BTN: React.CSSProperties = {
  width: 38,
  height: 38,
  borderRadius: "50%",
  background: "rgba(15,10,31,0.7)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "#fff",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  backdropFilter: "blur(10px)",
};

const TOP_TITLE: React.CSSProperties = {
  fontSize: 14,
  letterSpacing: "0.32em",
  fontWeight: 700,
  color: "#fff",
  textShadow: "0 1px 6px rgba(0,0,0,0.55)",
};

const AVATAR_BTN: React.CSSProperties = {
  width: 38,
  height: 38,
  borderRadius: "50%",
  background: "linear-gradient(135deg, #8B6BFF 0%, #E0815A 100%)",
  border: "2px solid rgba(255,255,255,0.15)",
  cursor: "pointer",
};

const POIS_LAYER: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 3,
  pointerEvents: "none" as const, // los botones internos hacen pointerEvents auto
};

const LAYERS_POS: React.CSSProperties = {
  position: "absolute",
  top: 76,
  right: 22,
  zIndex: 15,
};

const FILTER_POS: React.CSSProperties = {
  position: "absolute",
  top: 170,
  left: 22,
  zIndex: 14,
};

const FC_WRAP: React.CSSProperties = {
  display: "flex",
  gap: 6,
  flexWrap: "wrap" as const,
  maxWidth: 260,
};

const FC_CHIP: React.CSSProperties = {
  padding: "5px 11px",
  background: "rgba(0,0,0,0.55)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "rgba(255,255,255,0.85)",
  fontSize: 10,
  fontWeight: 500,
  borderRadius: 999,
  cursor: "pointer",
  backdropFilter: "blur(10px)",
};

const FC_CHIP_ACTIVE: React.CSSProperties = {
  background: "rgba(139,107,255,0.85)",
  color: "#fff",
  border: "1px solid #8B6BFF",
};
