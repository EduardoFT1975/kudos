"use client";

import * as React from "react";

export type SilhouetteKind = "colosseum" | "mlk" | "mountain" | "cathedral" | "tower" | "temple" | "city";

export interface SilhouetteProps {
  kind: SilhouetteKind;
  opacity?: number;
  /** Si true · fondo negro completo · solo silueta */
  filled?: boolean;
}

export function Silhouette({ kind, opacity = 0.55, filled = false }: SilhouetteProps) {
  const fill = filled ? "rgba(0,0,0,0.85)" : `rgba(0,0,0,${opacity})`;
  const wrap: React.CSSProperties = {
    position: "absolute", inset: 0, display: "flex",
    alignItems: "flex-end", justifyContent: "center", pointerEvents: "none",
  };
  if (kind === "colosseum") return (
    <div style={wrap}><svg viewBox="0 0 200 80" preserveAspectRatio="xMidYMax meet" style={{ width: "92%" }}>
      <g fill={fill}>
        <path d="M5,80 L5,38 Q5,28 14,24 L24,20 L24,8 L34,2 L42,2 L52,2 L60,2 L70,8 L70,20 L82,20 L82,10 L92,4 L102,4 L112,4 L122,10 L122,20 L134,20 L134,10 L144,4 L154,4 L164,4 L174,10 L174,20 L184,20 L194,24 Q200,28 200,38 L200,80 Z" />
      </g>
    </svg></div>
  );
  if (kind === "mountain") return (
    <div style={wrap}><svg viewBox="0 0 200 80" preserveAspectRatio="xMidYMax meet" style={{ width: "100%" }}>
      <g fill={fill}><path d="M0,80 L40,38 L70,52 L100,18 L140,46 L165,30 L200,55 L200,80 Z" /></g>
    </svg></div>
  );
  if (kind === "cathedral") return (
    <div style={wrap}><svg viewBox="0 0 200 80" preserveAspectRatio="xMidYMax meet" style={{ width: "75%" }}>
      <g fill={fill}>
        <rect x="20" y="40" width="40" height="40" />
        <rect x="140" y="40" width="40" height="40" />
        <rect x="60" y="20" width="80" height="60" />
        <polygon points="20,40 40,20 60,40" />
        <polygon points="140,40 160,20 180,40" />
        <polygon points="60,20 100,0 140,20" />
      </g>
    </svg></div>
  );
  if (kind === "mlk") return (
    <div style={wrap}><svg viewBox="0 0 200 80" preserveAspectRatio="xMidYMax meet" style={{ width: "60%" }}>
      <g fill={fill}>
        <ellipse cx="100" cy="74" rx="46" ry="6" />
        <rect x="76" y="34" width="48" height="42" rx="16" />
        <circle cx="100" cy="22" r="14" />
        <rect x="98" y="2" width="4" height="22" rx="2" />
      </g>
    </svg></div>
  );
  if (kind === "tower") return (
    <div style={wrap}><svg viewBox="0 0 200 80" preserveAspectRatio="xMidYMax meet" style={{ width: "50%" }}>
      <g fill={fill}>
        <polygon points="80,80 86,4 92,0 108,0 114,4 120,80" />
        <rect x="78" y="20" width="44" height="6" />
        <rect x="76" y="50" width="48" height="6" />
      </g>
    </svg></div>
  );
  if (kind === "temple") return (
    <div style={wrap}><svg viewBox="0 0 200 80" preserveAspectRatio="xMidYMax meet" style={{ width: "85%" }}>
      <g fill={fill}>
        <polygon points="20,30 100,4 180,30" />
        <rect x="22" y="30" width="156" height="6" />
        {[30, 55, 80, 105, 130, 155].map((x, i) => (
          <rect key={i} x={x} y={36} width="14" height="38" />
        ))}
        <rect x="18" y="74" width="164" height="6" />
      </g>
    </svg></div>
  );
  // city
  return (
    <div style={wrap}><svg viewBox="0 0 200 80" preserveAspectRatio="xMidYMax meet" style={{ width: "100%" }}>
      <g fill={fill}>
        <rect x="10"  y="40" width="20" height="40" />
        <rect x="34"  y="26" width="14" height="54" />
        <rect x="52"  y="48" width="18" height="32" />
        <rect x="74"  y="18" width="16" height="62" />
        <rect x="94"  y="36" width="14" height="44" />
        <rect x="112" y="22" width="20" height="58" />
        <rect x="136" y="44" width="14" height="36" />
        <rect x="154" y="30" width="18" height="50" />
        <rect x="176" y="46" width="14" height="34" />
      </g>
    </svg></div>
  );
}
