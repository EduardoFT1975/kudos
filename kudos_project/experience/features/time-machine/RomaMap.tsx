"use client";

/**
 * KUDOS Experience · <RomaMap />
 *
 * Canvas estilizado de Roma. NO es un mapa geográfico — es una
 * representación atmosférica del centro histórico que cambia de carácter
 * con la era activa.
 *
 *   ╭───── halo era-tinted ──────╮
 *   │   ╭ murallas (anillos) ╮   │
 *   │   │   ╮  Tíber          │   │     · hotspots (HotspotMarker)
 *   │   │  ╱                  │   │
 *   │   ╰  · 7 colinas       ╯   │
 *   ╰────────────────────────────╯
 *
 * Los hotspots se posicionan absolutos sobre el SVG; sus opacidades
 * dependen de la era activa.
 */
import * as React from "react";
import { motion } from "framer-motion";
import { mapDepthReveal } from "@/motion/temporal";
import { HotspotMarker } from "./HotspotMarker";
import type { Era, Hotspot } from "@/lib/timeline/types";

export interface RomaMapProps {
  era: Era;
  hotspots: Hotspot[];
  openHotspotId: string | null;
  onOpen: (id: string) => void;
}

export function RomaMap({ era, hotspots, openHotspotId, onOpen }: RomaMapProps) {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-10 grid place-items-center"
      aria-label={`Mapa cinematográfico de Roma · ${era.name}`}
    >
      <motion.div
        variants={mapDepthReveal}
        initial="hidden"
        animate="visible"
        className="relative aspect-square w-[min(86vmin,920px)]"
      >
        {/* SVG atmosférico de Roma. */}
        <RomaSvg eraGlow={era.glow_color} />

        {/* Hotspots overlay (escala 0..100 del SVG). */}
        <div className="absolute inset-0 pointer-events-none">
          {hotspots.map((h) => (
            <HotspotMarker
              key={h.id}
              hotspot={h}
              visible={h.appears_in.includes(era.id)}
              isOpen={openHotspotId === h.id}
              onOpen={onOpen}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RomaSvg · ilustración abstracta (sin assets externos)
// ---------------------------------------------------------------------------
function RomaSvg({ eraGlow }: { eraGlow: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className="absolute inset-0 size-full"
      aria-hidden
    >
      <defs>
        <radialGradient id="rm-halo" cx="50%" cy="48%" r="55%">
          <stop offset="0%" stopColor={eraGlow} stopOpacity="0.28" />
          <stop offset="55%" stopColor={eraGlow} stopOpacity="0.06" />
          <stop offset="100%" stopColor={eraGlow} stopOpacity="0" />
        </radialGradient>
        <filter id="rm-soft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="0.5" />
        </filter>
        <filter id="rm-soft-strong" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.2" />
        </filter>
      </defs>

      {/* Halo era-tinted. */}
      <rect x="0" y="0" width="100" height="100" fill="url(#rm-halo)" />

      {/* Murallas concéntricas (sugerencia · 4 anillos). */}
      <g
        stroke="rgba(255,255,255,0.10)"
        strokeWidth="0.18"
        fill="none"
        filter="url(#rm-soft)"
      >
        <ellipse cx="48" cy="46" rx="44" ry="40" />
        <ellipse cx="48" cy="46" rx="34" ry="30" />
        <ellipse cx="48" cy="46" rx="24" ry="22" />
        <ellipse cx="48" cy="46" rx="14" ry="13" />
      </g>

      {/* Río Tíber · S-curve que cruza Roma. */}
      <path
        d="M 26 -2
           C 22 18, 32 28, 28 42
           C 24 56, 34 64, 30 80
           C 27 92, 36 96, 32 104"
        stroke="rgba(125, 211, 252, 0.22)"
        strokeWidth="1.4"
        fill="none"
        filter="url(#rm-soft-strong)"
      />
      <path
        d="M 26 -2
           C 22 18, 32 28, 28 42
           C 24 56, 34 64, 30 80
           C 27 92, 36 96, 32 104"
        stroke="rgba(125, 211, 252, 0.10)"
        strokeWidth="3"
        fill="none"
        filter="url(#rm-soft-strong)"
      />

      {/* Siete colinas · circulitos tenues (sin marca topográfica precisa). */}
      <g fill="rgba(255,255,255,0.045)" filter="url(#rm-soft)">
        <circle cx="48" cy="50" r="3.2" />
        <circle cx="53" cy="46" r="2.6" />
        <circle cx="50" cy="56" r="2.9" />
        <circle cx="43" cy="44" r="2.4" />
        <circle cx="56" cy="48" r="2.1" />
        <circle cx="46" cy="58" r="2.2" />
        <circle cx="58" cy="52" r="1.9" />
      </g>

      {/* Rosa de los vientos · norte abstracto, sutil. */}
      <g
        transform="translate(88, 12)"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="0.2"
        fill="none"
      >
        <circle cx="0" cy="0" r="3" />
        <line x1="0" y1="-3" x2="0" y2="3" />
        <line x1="-3" y1="0" x2="3" y2="0" />
        <text
          x="0"
          y="-4.2"
          textAnchor="middle"
          fontSize="2.4"
          fill="rgba(255,255,255,0.45)"
          fontFamily="ui-monospace, monospace"
        >
          N
        </text>
      </g>
    </svg>
  );
}
