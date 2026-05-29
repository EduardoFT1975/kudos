"use client";
/**
 * KUDOS · Flower Mark · signature symbol.
 * Anillo dorado con 6 pétalos concéntricos · usado en bottom nav central +
 * share modal + headers · marca de identidad.
 *
 * Inspired by Greek/Mediterranean radial motifs · evoca antigüedad + descubrimiento.
 */
import * as React from "react";


interface Props {
  size?: number;
  variant?: "gold" | "white" | "dark";
  glow?: boolean;
}

export function KudosFlowerLogo({ size = 32, variant = "gold", glow = false }: Props) {
  const id = React.useId();
  const gradId = `kflower-${id}`;
  const colors = {
    gold:  { stroke: "#C9A961", glow: "rgba(201,169,97,0.55)" },
    white: { stroke: "#ffffff", glow: "rgba(255,255,255,0.4)" },
    dark:  { stroke: "#1f1b18", glow: "rgba(31,27,24,0.18)" },
  }[variant];

  return (
    <svg width={size} height={size} viewBox="0 0 64 64"
         style={{ display: "block", filter: glow ? `drop-shadow(0 0 8px ${colors.glow})` : undefined }}>
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={colors.stroke} stopOpacity="1" />
          <stop offset="100%" stopColor={colors.stroke} stopOpacity="0.7" />
        </linearGradient>
      </defs>

      {/* Anillo externo */}
      <circle cx="32" cy="32" r="29" fill="none"
              stroke={`url(#${gradId})`} strokeWidth="1.5" opacity="0.85" />

      {/* 6 pétalos · elipses rotadas */}
      {[0, 60, 120, 180, 240, 300].map((angle, i) => (
        <ellipse
          key={i}
          cx="32" cy="32" rx="9" ry="20"
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth="1.5"
          opacity="0.7"
          transform={`rotate(${angle} 32 32)`}
        />
      ))}

      {/* Centro · círculo lleno pequeño */}
      <circle cx="32" cy="32" r="4" fill={colors.stroke} opacity="0.9" />
    </svg>
  );
}
