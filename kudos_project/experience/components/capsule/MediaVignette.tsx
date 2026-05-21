"use client";

/**
 * KUDOS Experience · <MediaVignette />
 *
 * SVG art vignettes para el media strip. NO photos; arte vectorial
 * estilizado que evoca cada concepto arquitectónico. Cinematográfico
 * sin riesgo de imágenes rotas, peso < 1KB cada uno.
 */
import * as React from "react";
import type { MediaKind } from "@/lib/capsules";

export function MediaVignette({ kind, accent = "var(--kudos-accent)" }: { kind: MediaKind; accent?: string }) {
  switch (kind) {
    case "arch":
      return <ArchVignette accent={accent} />;
    case "column":
      return <ColumnVignette accent={accent} />;
    case "aerial":
      return <AerialVignette accent={accent} />;
    case "vomitoria":
      return <VomitoriaVignette accent={accent} />;
    case "section":
    case "abstract":
    default:
      return <AbstractVignette accent={accent} />;
  }
}

// ---------------------------------------------------------------------------
// Arch · arco romano modular (los 80 arcos del Coliseo).
// ---------------------------------------------------------------------------
function ArchVignette({ accent }: { accent: string }) {
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" aria-hidden>
      <defs>
        <linearGradient id="mv-arch" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={accent} stopOpacity="0.45" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Arcos repetidos · serie modular */}
      <g fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.6">
        {[20, 50, 80].map((cx) => (
          <path key={cx} d={`M ${cx - 12} 80 L ${cx - 12} 50 A 12 12 0 0 1 ${cx + 12} 50 L ${cx + 12} 80 Z`} />
        ))}
      </g>
      {/* Halo central */}
      <ellipse cx="50" cy="60" rx="40" ry="22" fill="url(#mv-arch)" />
      {/* Suelo */}
      <line x1="0" y1="80" x2="100" y2="80" stroke="rgba(255,255,255,0.25)" strokeWidth="0.5" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Column · cuatro órdenes superpuestos.
// ---------------------------------------------------------------------------
function ColumnVignette({ accent }: { accent: string }) {
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" aria-hidden>
      <defs>
        <radialGradient id="mv-col" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={accent} stopOpacity="0.35" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="100" height="100" fill="url(#mv-col)" />
      {/* Columna central con 4 segmentos · órdenes superpuestos */}
      <g fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.7">
        {/* Capitel toscano */}
        <rect x="42" y="14" width="16" height="3" />
        <rect x="44" y="17" width="12" height="3" />
        {/* Fuste */}
        <line x1="46" y1="20" x2="46" y2="86" />
        <line x1="54" y1="20" x2="54" y2="86" />
        {/* Marcas de órdenes (4 horizontal divisions) */}
        {[34, 50, 66, 82].map((y) => (
          <line key={y} x1="40" y1={y} x2="60" y2={y} strokeWidth="0.4" />
        ))}
        {/* Base */}
        <rect x="42" y="86" width="16" height="3" />
        <rect x="40" y="89" width="20" height="3" />
      </g>
      {/* Suelo */}
      <line x1="0" y1="92" x2="100" y2="92" stroke="rgba(255,255,255,0.25)" strokeWidth="0.5" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Aerial · planta elíptica (188 × 156 m).
// ---------------------------------------------------------------------------
function AerialVignette({ accent }: { accent: string }) {
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" aria-hidden>
      <defs>
        <radialGradient id="mv-aer" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={accent} stopOpacity="0.45" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="100" height="100" fill="url(#mv-aer)" />
      {/* Anillos concéntricos · niveles del anfiteatro */}
      <g fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.5">
        <ellipse cx="50" cy="50" rx="42" ry="34" />
        <ellipse cx="50" cy="50" rx="34" ry="28" />
        <ellipse cx="50" cy="50" rx="26" ry="22" />
        <ellipse cx="50" cy="50" rx="18" ry="14" />
      </g>
      {/* Arena central */}
      <ellipse cx="50" cy="50" rx="10" ry="6" fill={accent} fillOpacity="0.18" stroke="rgba(255,255,255,0.6)" strokeWidth="0.4" />
      {/* Eje mayor · escala */}
      <line x1="6" y1="50" x2="94" y2="50" stroke="rgba(255,255,255,0.15)" strokeWidth="0.3" strokeDasharray="1 2" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Vomitoria · 80 pasillos radiales de evacuación.
// ---------------------------------------------------------------------------
function VomitoriaVignette({ accent }: { accent: string }) {
  // Generamos 24 radios (simplificación de los 80) en abanico.
  const radii = Array.from({ length: 24 }, (_, i) => (i / 24) * Math.PI * 2);
  return (
    <svg viewBox="-50 -50 100 100" className="absolute inset-0 size-full" aria-hidden>
      <defs>
        <radialGradient id="mv-vom" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={accent} stopOpacity="0.45" />
          <stop offset="80%" stopColor={accent} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="-50" y="-50" width="100" height="100" fill="url(#mv-vom)" />
      {/* Radios */}
      <g stroke="rgba(255,255,255,0.42)" strokeWidth="0.4">
        {radii.map((a, i) => {
          const x1 = Math.cos(a) * 8;
          const y1 = Math.sin(a) * 8;
          const x2 = Math.cos(a) * 42;
          const y2 = Math.sin(a) * 42;
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
        })}
      </g>
      {/* Anillos */}
      <g fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.5">
        <circle r="8" />
        <circle r="22" />
        <circle r="36" />
        <circle r="44" />
      </g>
      {/* Centro · arena */}
      <circle r="5" fill={accent} fillOpacity="0.25" stroke="rgba(255,255,255,0.55)" strokeWidth="0.4" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Fallback abstracto.
// ---------------------------------------------------------------------------
function AbstractVignette({ accent }: { accent: string }) {
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" aria-hidden>
      <defs>
        <radialGradient id="mv-abs" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={accent} stopOpacity="0.4" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="100" height="100" fill="url(#mv-abs)" />
      <g fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.5">
        <circle cx="50" cy="50" r="32" />
        <circle cx="50" cy="50" r="22" />
        <circle cx="50" cy="50" r="12" />
      </g>
    </svg>
  );
}
