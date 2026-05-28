/**
 * KUDOS WORLD ENGINE · WorldNode SVG builder
 *
 * Cada nodo se renderiza como CHIP CINEMATOGRÁFICO:
 *   círculo color categoría + pictograma blanco dentro.
 * El label se decide en WorldEngine.tsx (collision detection greedy).
 *
 * Filosofía:
 *   - Tier S = chip dorado + halo respirando
 *   - Tier A = chip color categoría
 *   - Tier B = dot color · sin pictograma
 *   - Tier C = casi invisible
 */

import {
  WORLD_COLORS,
  WorldNodeCategory,
  WorldNodeTier,
  TIER_SIZE,
  TIER_OPACITY,
  nodeColorFor,
  RESPIRATION_DURATION_S,
  RESPIRATION_OPACITY_MIN,
  RESPIRATION_OPACITY_MAX,
} from "./world-tokens";


export interface WorldNodeInput {
  id: string;
  name: string;
  tier: WorldNodeTier;
  category: WorldNodeCategory;
  isActive?: boolean;
  showLabel?: boolean;  // collision detection lo decide en WorldEngine
}


/**
 * Pictograma SVG (path blanco sobre fondo color) por categoría.
 * Coordenadas en viewBox 24x24 · centrado. fill="white" se aplica fuera.
 */
function pictogramFor(category: WorldNodeCategory): string {
  switch (category) {
    case "museum":
      // columnata griega · 4 columnas + frontón
      return '<path d="M3 21h18v-2H3v2zm2-3h2v-7H5v7zm4 0h2v-7H9v7zm4 0h2v-7h-2v7zm4 0h2v-7h-2v7zM12 3 2 8v2h20V8L12 3z"/>';
    case "castle":
      // torre con almenas
      return '<path d="M4 21V10l2-1V6h2v2l2-1V3h2v4l2-1v3l2-1v3l2-1v11H4zm2-2h12V12H6v7z"/>';
    case "religious":
      // cruz cristiana
      return '<path d="M10 21h4v-7h6v-4h-6V3h-4v7H4v4h6v7z"/>';
    case "megalith":
      // dolmen · 2 piedras + losa
      return '<path d="M4 8h2v10H4V8zm14 0h2v10h-2V8zM3 6c0-1 1-2 2-2h14c1 0 2 1 2 2v1H3V6z"/>';
    case "park":
      // árbol
      return '<path d="M12 2c-3 3-5 6-5 9 0 2 1 4 4 4.5V22h2v-6.5c3-.5 4-2.5 4-4.5 0-3-2-6-5-9z"/>';
    case "plaza":
      // plano de plaza · cuadrícula
      return '<path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z"/>';
    case "monument":
      // obelisco / estatua
      return '<path d="M11 2 9 8v9H7v3h10v-3h-2V8l-2-6h-2zm0 6 1-3 1 3v9h-2V8z"/>';
    case "archaeology":
      // ruinas · columnas rotas
      return '<path d="M4 21V8h2v11H4zm4-2V6h2v13H8zm4 2V4h2v17h-2zm4-3V9h2v9h-2zM3 22h18v1H3v-1z"/>';
    case "palace":
      // palacio · cúpula + alas
      return '<path d="M12 2c-2 0-3 1.5-3 3.5L9 7H7v3H4v11h16V10h-3V7h-2V5.5C15 3.5 14 2 12 2zm-1 9h2v3h-2v-3z"/>';
    case "mystery":
      // signo de interrogación romboide
      return '<path d="M12 2 2 12l10 10 10-10L12 2zm-1 14h2v2h-2v-2zm0-3v-2c0-1 .5-1.5 1.5-2 1-.5 1.5-1 1.5-2 0-1-1-2-2-2s-2 1-2 2H8c0-2 2-4 4-4s4 2 4 4c0 1.5-1 2-2 2.5-1 .5-1 1-1 1.5h-2z"/>';
  }
}


/**
 * Construye el HTML del chip · color BG categoría + pictograma blanco.
 */
export function buildWorldNodeHTML(node: WorldNodeInput): string {
  const { id, name, tier, category, isActive, showLabel } = node;
  const color = nodeColorFor(category, tier);
  const baseSize = TIER_SIZE[tier];
  const size = isActive ? Math.round(baseSize * 1.4) : baseSize;
  const opacity = isActive ? 1.0 : TIER_OPACITY[tier];
  const safeName = escapeXml(name);
  const labelClass = showLabel ? "with-label" : "";

  // Tier S · CHIP LEGENDARY · halo dorado respirando + pictograma blanco
  if (tier === "S") {
    return `
      <div class="kudos-chip kudos-chip-s ${labelClass}" data-id="${id}" data-tier="S" data-name="${safeName}"
           style="width:${size}px;height:${size}px;opacity:${opacity};">
        <div class="kudos-chip-halo" style="background: radial-gradient(circle, ${WORLD_COLORS.glowGold} 0%, transparent 65%);"></div>
        <div class="kudos-chip-body" style="background:${color}; border-color:rgba(255,255,255,0.4);">
          <svg viewBox="0 0 24 24" width="${size * 0.55}" height="${size * 0.55}" aria-label="${safeName}" fill="white">
            ${pictogramFor(category)}
          </svg>
        </div>
      </div>`;
  }

  // Tier A · CHIP PREMIUM · color categoría + pictograma blanco
  if (tier === "A") {
    return `
      <div class="kudos-chip kudos-chip-a ${labelClass}" data-id="${id}" data-tier="A" data-name="${safeName}"
           style="width:${size}px;height:${size}px;opacity:${opacity};">
        <div class="kudos-chip-body" style="background:${color}; border-color:rgba(255,255,255,0.3);">
          <svg viewBox="0 0 24 24" width="${size * 0.6}" height="${size * 0.6}" aria-label="${safeName}" fill="white">
            ${pictogramFor(category)}
          </svg>
        </div>
      </div>`;
  }

  // Tier B · DOT color · sin pictograma · label sólo hover
  if (tier === "B") {
    return `
      <div class="kudos-chip kudos-chip-b" data-id="${id}" data-tier="B" data-name="${safeName}"
           style="width:${size}px;height:${size}px;opacity:${opacity};">
        <div class="kudos-chip-dot" style="background:${color};"></div>
      </div>`;
  }

  // Tier C · casi invisible
  return `
    <div class="kudos-chip kudos-chip-c" data-id="${id}" data-tier="C" data-name="${safeName}"
         style="width:${size}px;height:${size}px;opacity:${opacity};">
      <div class="kudos-chip-dot" style="background:${color}; opacity:0.5;"></div>
    </div>`;
}


function escapeXml(s: string): string {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}


/**
 * CSS global · chips estilo Apple Maps.
 * Labels solo visibles cuando WorldEngine.tsx pone clase .with-label
 * (decisión collision-detection greedy en pixel space).
 */
export const WORLD_NODE_CSS = `
  .kudos-chip {
    position: relative;
    display: flex; align-items: center; justify-content: center;
    pointer-events: auto; cursor: pointer;
    transition: opacity 0.4s ease, transform 0.22s cubic-bezier(0.22,1,0.36,1);
  }
  .kudos-chip:hover { transform: scale(1.18); z-index: 1000 !important; }

  /* Chip body · círculo color categoría con borde sutil + sombra */
  .kudos-chip-body {
    width: 100%; height: 100%;
    border-radius: 50%;
    border: 1.5px solid rgba(255,255,255,0.3);
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 2px 8px rgba(0,0,0,0.45);
  }

  /* Halo respirando para Tier S */
  .kudos-chip-halo {
    position: absolute; inset: -55%; border-radius: 50%;
    z-index: -1;
    animation: kudos-halo-breathe ${RESPIRATION_DURATION_S}s ease-in-out infinite;
  }
  @keyframes kudos-halo-breathe {
    0%, 100% { opacity: ${RESPIRATION_OPACITY_MIN}; transform: scale(0.96); }
    50%      { opacity: ${RESPIRATION_OPACITY_MAX}; transform: scale(1.06); }
  }

  /* Dot simple para Tier B/C */
  .kudos-chip-dot {
    width: 70%; height: 70%; border-radius: 50%;
    border: 1px solid rgba(255,255,255,0.18);
  }

  @media (prefers-reduced-motion: reduce) {
    .kudos-chip * { animation: none !important; }
    .kudos-chip:hover { transform: none !important; }
  }

  /* ─── LABELS · sólo cuando .with-label (collision detection lo añade) ── */

  .kudos-chip::after {
    content: attr(data-name);
    position: absolute;
    top: 100%; left: 50%; transform: translateX(-50%);
    margin-top: 6px;
    padding: 3px 10px;
    background: rgba(7, 9, 18, 0.92);
    border: 1px solid rgba(232, 228, 213, 0.22);
    border-radius: 999px;
    font-family: "Poppins", system-ui, sans-serif;
    font-weight: 600;
    color: ${WORLD_COLORS.inkPrimary};
    white-space: nowrap;
    text-shadow: 0 1px 2px rgba(0,0,0,0.8);
    box-shadow: 0 2px 8px rgba(0,0,0,0.45);
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.25s ease;
    max-width: 200px;
    overflow: hidden; text-overflow: ellipsis;
  }

  /* Sólo aparece con clase .with-label o en hover */
  .kudos-chip.with-label[data-tier="S"]::after {
    opacity: 1;
    font-size: 11.5px;
    color: ${WORLD_COLORS.legendary};
    border-color: rgba(201, 169, 97, 0.45);
  }
  .kudos-chip.with-label[data-tier="A"]::after {
    opacity: 0.95;
    font-size: 10.5px;
  }
  .kudos-chip:hover::after {
    opacity: 1;
    font-size: 11px;
  }
`;
