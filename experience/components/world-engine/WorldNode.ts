/**
 * KUDOS WORLD ENGINE · WorldNode SVG builder
 *
 * Genera el SVG inline de un World Node según su tier + categoría.
 * NO es un componente React · es un constructor de strings HTML
 * porque los markers de Leaflet viven en divIcon (escapa al render React).
 *
 * Filosofía:
 *   - Tier S = LEGENDARY · doble anillo + glow respirando + label permanente
 *   - Tier A = PREMIUM   · anillo simple + pulso contextual + label permanente
 *   - Tier B = CONTEXT   · dot transparente sin movimiento · label sólo hover
 *   - Tier C = LONG TAIL · marca minimal
 *
 * "Cada nodo debe sentirse como una puerta a algo más grande"
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
}


/**
 * Forma geométrica de la silueta según categoría.
 */
function categoryShape(category: WorldNodeCategory): string {
  switch (category) {
    case "history":
      return `<circle cx="50" cy="50" r="40" />`;
    case "nature":
      return `<path d="M50,10 C72,10 90,28 90,50 C90,72 72,90 50,90 C28,90 10,72 10,50 C10,28 28,10 50,10 Z" />`;
    case "event":
      return `<path d="M50,8 L86,30 L86,70 L50,92 L14,70 L14,30 Z" />`;
    case "mystery":
      return `<path d="M50,8 L92,50 L50,92 L8,50 Z" />`;
    case "science":
      return `<path d="M28,10 L72,10 L90,28 L90,72 L72,90 L28,90 L10,72 L10,28 Z" />`;
    case "social":
      return `<circle cx="50" cy="50" r="32" />`;
  }
}


/**
 * Construye el HTML completo del marker según tier.
 * IMPORTANTE: data-name vive en .kudos-node (no en wrapper externo)
 * para que el CSS ::after lo lea correctamente.
 */
export function buildWorldNodeHTML(node: WorldNodeInput): string {
  const { id, name, tier, category, isActive } = node;
  const color = nodeColorFor(category, tier);
  const baseSize = TIER_SIZE[tier];
  const size = isActive ? Math.round(baseSize * 1.4) : baseSize;
  const opacity = isActive ? 1.0 : TIER_OPACITY[tier];
  const safeName = escapeXml(name);

  // Tier S · LEGENDARY · doble anillo dorado + glow + respiración + label permanente
  if (tier === "S") {
    return `
      <div class="kudos-node kudos-node-s" data-id="${id}" data-tier="S" data-name="${safeName}"
           style="width:${size}px;height:${size}px;opacity:${opacity};">
        <svg viewBox="0 0 100 100" width="${size}" height="${size}" aria-label="${safeName}">
          <defs>
            <radialGradient id="aura-${id}" cx="50%" cy="50%" r="50%">
              <stop offset="40%" stop-color="${color}" stop-opacity="0.0"/>
              <stop offset="70%" stop-color="${color}" stop-opacity="0.22"/>
              <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="48" fill="url(#aura-${id})" class="kudos-node-aura"/>
          <g class="kudos-node-shape" fill="none" stroke="${color}" stroke-width="2.2">
            <circle cx="50" cy="50" r="38" stroke-opacity="0.95"/>
            <circle cx="50" cy="50" r="30" stroke-opacity="0.55"/>
          </g>
          <circle cx="50" cy="50" r="8" fill="${color}" class="kudos-node-core"/>
        </svg>
      </div>`;
  }

  // Tier A · PREMIUM · anillo simple del color de la categoría · pulso + label permanente
  if (tier === "A") {
    return `
      <div class="kudos-node kudos-node-a" data-id="${id}" data-tier="A" data-name="${safeName}"
           style="width:${size}px;height:${size}px;opacity:${opacity};">
        <svg viewBox="0 0 100 100" width="${size}" height="${size}" aria-label="${safeName}">
          <g fill="none" stroke="${color}" stroke-width="2.5">
            ${categoryShape(category).replace("/>", " stroke-opacity=\"0.92\"/>")}
          </g>
          <circle cx="50" cy="50" r="7" fill="${color}" opacity="0.95"/>
        </svg>
      </div>`;
  }

  // Tier B · CONTEXT · dot color sin movimiento · label sólo hover
  if (tier === "B") {
    return `
      <div class="kudos-node kudos-node-b" data-id="${id}" data-tier="B" data-name="${safeName}"
           style="width:${size}px;height:${size}px;opacity:${opacity};">
        <svg viewBox="0 0 100 100" width="${size}" height="${size}" aria-label="${safeName}">
          <circle cx="50" cy="50" r="22" fill="${color}" opacity="0.55"/>
          <circle cx="50" cy="50" r="10" fill="${color}"/>
        </svg>
      </div>`;
  }

  // Tier C · LONG TAIL · marca casi invisible
  return `
    <div class="kudos-node kudos-node-c" data-id="${id}" data-tier="C" data-name="${safeName}"
         style="width:${size}px;height:${size}px;opacity:${opacity};">
      <svg viewBox="0 0 100 100" width="${size}" height="${size}" aria-label="${safeName}">
        <circle cx="50" cy="50" r="40" fill="${color}" opacity="0.35"/>
      </svg>
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
 * CSS global que inyectamos en el container Leaflet.
 *
 * Cambios clave para orientabilidad:
 *   - Tier S y A: label PERMANENTE (no sólo hover) · ves "Coliseo" sin clicar
 *   - Tier B: label sólo en hover (sigue siendo context)
 *   - Sombra suave sobre los labels para legibilidad en cualquier fondo
 */
export const WORLD_NODE_CSS = `
  /* World Engine · CSS de vida */
  .kudos-node {
    display:flex; align-items:center; justify-content:center;
    pointer-events:auto; cursor:pointer;
    position: relative;
    transition: opacity ${0.6}s ease, transform 0.25s cubic-bezier(0.22,1,0.36,1);
  }
  .kudos-node:hover { transform: scale(1.18); z-index: 1000 !important; }

  /* Respiración para Tier S (legendary) */
  @keyframes kudos-respiration-s {
    0%, 100% { opacity: ${RESPIRATION_OPACITY_MIN}; }
    50%      { opacity: ${RESPIRATION_OPACITY_MAX}; }
  }
  .kudos-node-s .kudos-node-aura {
    transform-origin: 50% 50%;
    animation: kudos-respiration-s ${RESPIRATION_DURATION_S}s ease-in-out infinite;
  }

  /* Pulso muy lento para Tier A */
  @keyframes kudos-pulse-a {
    0%, 100% { opacity: 0.82; }
    50%      { opacity: 1; }
  }
  .kudos-node-a circle { animation: kudos-pulse-a ${RESPIRATION_DURATION_S * 1.6}s ease-in-out infinite; }

  @media (prefers-reduced-motion: reduce) {
    .kudos-node * { animation: none !important; }
    .kudos-node:hover { transform: none !important; }
  }

  /* ─── LABELS ─────────────────────────────────────────────────── */

  /* Base · pill cinematográfica · legible sobre cualquier fondo */
  .kudos-node::after {
    content: attr(data-name);
    position: absolute;
    top: 100%; left: 50%; transform: translateX(-50%);
    margin-top: 7px;
    padding: 3px 9px;
    background: rgba(7, 9, 18, 0.88);
    border: 1px solid rgba(232, 228, 213, 0.18);
    border-radius: 999px;
    font-family: "Poppins", system-ui, sans-serif;
    font-weight: 600;
    color: ${WORLD_COLORS.inkPrimary};
    white-space: nowrap;
    text-shadow: 0 1px 2px rgba(0,0,0,0.8);
    box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.25s ease;
  }

  /* Tier S · label PERMANENTE · dorado tenue */
  .kudos-node[data-tier="S"]::after {
    font-size: 11.5px;
    opacity: 1;
    color: ${WORLD_COLORS.legendary};
    border-color: rgba(201, 169, 97, 0.42);
    background: rgba(7, 9, 18, 0.92);
  }

  /* Tier A · label PERMANENTE · blanco hueso · más pequeño */
  .kudos-node[data-tier="A"]::after {
    font-size: 10.5px;
    opacity: 0.92;
  }

  /* Tier B · label sólo hover (sigue siendo context) */
  .kudos-node[data-tier="B"]:hover::after,
  .kudos-node[data-tier="C"]:hover::after {
    opacity: 1;
    font-size: 10px;
  }
`;
