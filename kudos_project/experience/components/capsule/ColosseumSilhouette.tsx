"use client";

/**
 * KUDOS Experience · <ColosseumSilhouette />
 *
 * Silueta abstracta del Coliseo en el horizonte del Hero. Forma elíptica
 * con arcos verticales sugeridos y lado izquierdo más roto (evoca la
 * famosa fachada parcialmente colapsada).
 *
 * Sin pretensión de literalidad — pretensión: evocar contemplación.
 */
import * as React from "react";

export function ColosseumSilhouette({
  className = "",
  accent = "rgba(167, 139, 250, 0.65)",
}: {
  className?: string;
  accent?: string;
}) {
  return (
    <svg
      viewBox="0 0 1000 320"
      preserveAspectRatio="xMidYEnd slice"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id="cs-fade" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#040614" stopOpacity="0" />
          <stop offset="60%" stopColor="#040614" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#040614" stopOpacity="0.95" />
        </linearGradient>
        <radialGradient id="cs-glow" cx="50%" cy="100%" r="80%">
          <stop offset="0%" stopColor={accent} stopOpacity="0.45" />
          <stop offset="60%" stopColor={accent} stopOpacity="0.08" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </radialGradient>
        <filter id="cs-soft" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="1.4" />
        </filter>
      </defs>

      {/* Halo bajo el horizonte */}
      <rect x="0" y="0" width="1000" height="320" fill="url(#cs-glow)" />

      {/* Suelo · línea sutil */}
      <line
        x1="0"
        y1="280"
        x2="1000"
        y2="280"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth="1"
      />

      {/* Silueta principal · elipse irregular suspendida sobre el horizonte */}
      <g fill="rgba(0, 0, 0, 0.78)" stroke="rgba(255, 255, 255, 0.22)" strokeWidth="0.8">
        {/* Outer profile — Coliseo elíptico visto en perspectiva, con borde izquierdo derribado */}
        <path d="
          M 280 280
          Q 270 260, 285 235
          Q 295 218, 320 200
          L 355 195
          Q 360 175, 380 160
          L 420 150
          Q 440 138, 480 132
          L 540 130
          Q 600 132, 660 140
          Q 705 148, 730 165
          Q 745 180, 745 200
          Q 745 218, 740 240
          L 738 270
          Q 738 278, 745 280
          L 280 280 Z
        " />
      </g>

      {/* Arcos verticales sugeridos · serie modular */}
      <g
        fill="none"
        stroke="rgba(255, 255, 255, 0.12)"
        strokeWidth="0.6"
        filter="url(#cs-soft)"
      >
        {Array.from({ length: 22 }).map((_, i) => {
          const x = 320 + i * 19;
          // Algunos arcos son “rotos” cerca del extremo izquierdo
          const broken = i < 3 ? i * 0.4 : 0;
          return (
            <path
              key={i}
              d={`M ${x} ${260 - broken * 6}
                 L ${x} ${210}
                 A 8 6 0 0 1 ${x + 12} ${210}
                 L ${x + 12} ${260 - broken * 4}`}
            />
          );
        })}
      </g>

      {/* Top crown · pequeño levantamiento central */}
      <path
        d="M 480 130 Q 510 118, 540 130"
        fill="none"
        stroke="rgba(255, 255, 255, 0.18)"
        strokeWidth="0.6"
      />

      {/* Cielo→horizonte fade · asegura legibilidad arriba */}
      <rect x="0" y="0" width="1000" height="320" fill="url(#cs-fade)" />
    </svg>
  );
}
