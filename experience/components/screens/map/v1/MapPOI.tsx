"use client";
/**
 * KUDOS - MapPOI - PROMPT 3/6.
 *
 * POI flotante sobre imagen aerea. Halo radial por tier:
 *   - A: dorado grande con corazon luminoso
 *   - B: morado medio con corazon claro
 *   - C: tenue, sin label si zoom-out (MVP siempre con label)
 *
 * No usa Leaflet ni lib de mapas. Posicion absoluta % izq/top.
 */
import * as React from "react";
import { useRouter } from "next/navigation";
import type { MapPOI as MapPOIType, MapTier } from "./romaMock";


interface Props {
  poi: MapPOIType;
}


function tierStyle(tier: MapTier): {
  halo: string;
  core: string;
  size: number;
  glowSize: number;
} {
  if (tier === "A") {
    return {
      halo: "radial-gradient(circle, rgba(255,215,150,0.55) 0%, rgba(201,169,97,0.3) 40%, rgba(201,169,97,0) 70%)",
      core: "linear-gradient(135deg, #ffe4a0 0%, #C9A961 100%)",
      size: 42,
      glowSize: 130,
    };
  }
  if (tier === "B") {
    return {
      halo: "radial-gradient(circle, rgba(199,123,255,0.45) 0%, rgba(139,107,255,0.22) 40%, rgba(139,107,255,0) 70%)",
      core: "linear-gradient(135deg, #c7a5ff 0%, #8B6BFF 100%)",
      size: 28,
      glowSize: 100,
    };
  }
  return {
    halo: "radial-gradient(circle, rgba(160,140,210,0.25) 0%, rgba(139,107,255,0.1) 40%, rgba(139,107,255,0) 70%)",
    core: "linear-gradient(135deg, #b8a8d6 0%, #6c5d92 100%)",
    size: 18,
    glowSize: 70,
  };
}


export function MapPOI({ poi }: Props) {
  const router = useRouter();
  const s = tierStyle(poi.tier);

  const labelOffsetX = poi.tier === "A" ? 30 : 22;

  return (
    <button
      onClick={() => router.push(`/poi/${poi.poi_id}`)}
      style={{
        ...WRAP,
        left: `${poi.x_pct}%`,
        top: `${poi.y_pct}%`,
      }}
      aria-label={poi.name}
    >
      {/* halo */}
      <span
        style={{
          ...HALO,
          width: s.glowSize,
          height: s.glowSize,
          background: s.halo,
        }}
      />
      {/* core dot */}
      <span
        style={{
          ...CORE,
          width: s.size,
          height: s.size,
          background: s.core,
        }}
      />
      {/* light beam vertical para Tier A */}
      {poi.tier === "A" && <span style={BEAM_A} />}
      {poi.tier === "B" && <span style={BEAM_B} />}

      {/* label */}
      <span
        style={{
          ...LABEL_WRAP,
          left: labelOffsetX,
        }}
      >
        <span style={{
          ...LABEL_NAME,
          fontSize: poi.tier === "A" ? 16 : poi.tier === "B" ? 13 : 11,
          color: "#fff",
        }}>
          {poi.name}
        </span>
        {poi.label_below && (
          <span style={LABEL_BELOW}>{poi.label_below}</span>
        )}
      </span>
    </button>
  );
}


// ============== styles ==============

const WRAP: React.CSSProperties = {
  position: "absolute",
  transform: "translate(-50%, -50%)",
  border: "none",
  background: "transparent",
  padding: 0,
  cursor: "pointer",
  zIndex: 5,
  // hover/touch friendly
  WebkitTapHighlightColor: "transparent",
};

const HALO: React.CSSProperties = {
  position: "absolute",
  left: "50%",
  top: "50%",
  transform: "translate(-50%, -50%)",
  borderRadius: "50%",
  pointerEvents: "none",
  zIndex: 0,
};

const CORE: React.CSSProperties = {
  position: "relative",
  display: "inline-block",
  borderRadius: "50%",
  zIndex: 2,
  boxShadow: "0 0 14px rgba(255,255,255,0.45), inset 0 0 8px rgba(255,255,255,0.25)",
};

const BEAM_A: React.CSSProperties = {
  position: "absolute",
  left: "50%",
  top: "50%",
  transform: "translate(-50%, -100%)",
  width: 2,
  height: 220,
  background:
    "linear-gradient(180deg, rgba(255,215,150,0.0) 0%, rgba(255,215,150,0.55) 50%, rgba(255,215,150,0.8) 100%)",
  pointerEvents: "none",
  zIndex: 1,
};

const BEAM_B: React.CSSProperties = {
  position: "absolute",
  left: "50%",
  top: "50%",
  transform: "translate(-50%, -100%)",
  width: 1,
  height: 140,
  background:
    "linear-gradient(180deg, rgba(199,123,255,0.0) 0%, rgba(199,123,255,0.45) 50%, rgba(199,123,255,0.7) 100%)",
  pointerEvents: "none",
  zIndex: 1,
};

const LABEL_WRAP: React.CSSProperties = {
  position: "absolute",
  top: "50%",
  transform: "translateY(-50%)",
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "flex-start",
  whiteSpace: "nowrap" as const,
  pointerEvents: "none",
  zIndex: 6,
};

const LABEL_NAME: React.CSSProperties = {
  fontFamily: 'var(--kudos-font-display, "Cormorant Garamond", Georgia, serif)',
  fontWeight: 500,
  textShadow: "0 1px 6px rgba(0,0,0,0.85)",
  letterSpacing: "-0.005em",
  lineHeight: 1,
};

const LABEL_BELOW: React.CSSProperties = {
  marginTop: 3,
  fontSize: 10,
  color: "rgba(255,255,255,0.75)",
  textShadow: "0 1px 4px rgba(0,0,0,0.85)",
  letterSpacing: "0.04em",
  fontFamily: '"Poppins", system-ui, sans-serif',
};
