/**
 * KUDOS WORLD ENGINE · WorldNode SVG builder
 *
 * Genera el SVG inline de un World Node según su tier + categoría.
 * NO es un componente React · es un constructor de strings HTML
 * porque los markers de Leaflet viven en divIcon (escapa al render React).
 *
 * Filosofía:
 *   - Tier S = LEGENDARY · doble anillo + glow respirando
 *   - Tier A = PREMIUM   · anillo simple + pulso contextual
 *   - Tier B = CONTEXT   · dot transparente sin movimiento
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
 * Devuelve un `<path d="...">` SVG centrado en 50,50 con radio 40.
 */
function categoryShape(category: WorldNodeCategory): string {
  switch (category) {
    case "history":
      // Círculo perfecto · atemporalidad
      return `<circle cx="50" cy="50" r="40" />`;

    case "nature":
      // Orgánico · círculo con sutil ondulación
      return `<path d="M50,10 C72,10 90,28 90,50 C90,72 72,90 50,90 C28,90 10,72 10,50 C10,28 28,10 50,10 Z" />`;

    case "event":
      // Hexágono suave · impacto humano
      return `<path d="M50,8 L86,30 L86,70 L50,92 L14,70 L14,30 Z" />`;

    case "mystery":
      // Rombo suave · anomalía
      return `<path d="M50,8 L92,50 L50,92 L8,50 Z" />`;

    case "science":
      // Octágono · inteligencia geométrica
      return `<path d="M28,10 L72,10 L90,28 L90,72 L72,90 L28,90 L10,72 L10,28 Z" />`;

    case "social":
      // Orbital · actividad humana (círculo con anillo externo)
      return `<circle cx="50" cy="50" r="32" />`;
  }
}


/**
 * Construye el HTML completo del marker según tier.
 */
export function buildWorldNodeHTML(node: WorldNodeInput): string {
  const { id, name, tier, category, isActive } = node;
  const color = nodeColorFor(category, tier);
  const baseSize = TIER_SIZE[tier];
  const size = isActive ? Math.round(baseSize * 1.4) : baseSize;
  const opacity = isActive ? 1.0 : TIER_OPACITY[tier];

  // Tier S · LEGENDARY · doble anillo dorado · glow ámbar · respiración
  if (tier === "S") {
    return `
      <div class="kudos-node kudos-node-s" data-id="${id}" data-tier="S"
           style="width:${size}px;height:${size}px;opacity:${opacity};">
        <svg viewBox="0 0 100 100" width="${size}" height="${size}" aria-label="${escapeXml(name)}">
          <defs>
            <radialGradient id="aura-${id}" cx="50%" cy="50%" r="50%">
              <stop offset="40%" stop-color="${color}" stop-opacity="0.0"/>
              <stop offset="70%" stop-color="${color}" stop-opacity="0.15"/>
              <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="48" fill="url(#aura-${id})" class="kudos-node-aura"/>
          <g class="kudos-node-shape" fill="none" stroke="${color}" stroke-width="1.6">
            <circle cx="50" cy="50" r="38" stroke-opacity="0.85"/>
            <circle cx="50" cy="50" r="30" stroke-opacity="0.45"/>
          </g>
          <circle cx="50" cy="50" r="6" fill="${color}" class="kudos-node-core"/>
        </svg>
      </div>`;
  }

  // Tier A · PREMIUM · anillo simple del color de la categoría · pulso suave
  if (tier === "A") {
    return `
      <div class="kudos-node kudos-node-a" data-id="${id}" data-tier="A"
           style="width:${size}px;height:${size}px;opacity:${opacity};">
        <svg viewBox="0 0 100 100" width="${size}" height="${size}" aria-label="${escapeXml(name)}">
          <g fill="none" stroke="${color}" stroke-width="2">
            ${categoryShape(category).replace("/>", " stroke-opacity=\"0.85\"/>")}
          </g>
          <circle cx="50" cy="50" r="6" fill="${color}" opacity="0.85"/>
        </svg>
      </div>`;
  }

  // Tier B · CONTEXT · dot color sin movimiento
  if (tier === "B") {
    return `
      <div class="kudos-node kudos-node-b" data-id="${id}" data-tier="B"
           style="width:${size}px;height:${size}px;opacity:${opacity};">
        <svg viewBox="0 0 100 100" width="${size}" height="${size}" aria-label="${escapeXml(name)}">
          <circle cx="50" cy="50" r="22" fill="${color}" opacity="0.55"/>
          <circle cx="50" cy="50" r="10" fill="${color}"/>
        </svg>
      </div>`;
  }

  // Tier C · LONG TAIL · marca casi invisible (raramente visible)
  return `
    <div class="kudos-node kudos-node-c" data-id="${id}" data-tier="C"
         style="width:${size}px;height:${size}px;opacity:${opacity};">
      <svg viewBox="0 0 100 100" width="${size}" height="${size}" aria-label="${escapeXml(name)}">
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
 * CSS global que inyectamos en el container Leaflet para
 * dar vida (respiración) sin JS por marker.
 */
export const WORLD_NODE_CSS = `
  /* World Engine · CSS de vida */
  .kudos-node {
    display:flex; align-items:center; justify-content:center;
    pointer-events:auto; cursor:pointer;
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
    0%, 100% { opacity: 0.78; }
    50%      { opacity: 1; }
  }
  .kudos-node-a circle { animation: kudos-pulse-a ${RESPIRATION_DURATION_S * 1.6}s ease-in-out infinite; }

  /* Sin animación en B/C · "el mundo respira pero no grita" */
  @media (prefers-reduced-motion: reduce) {
    .kudos-node * { animation: none !important; }
    .kudos-node:hover { transform: none !important; }
  }

  /* Labels contextuales · sólo al hover · NO saturan el mapa */
  .kudos-node[data-tier="S"]::after,
  .kudos-node[data-tier="A"]::after {
    content: attr(data-name);
    position: absolute;
    top: 100%; left: 50%; transform: translateX(-50%);
    margin-top: 8px;
    padding: 4px 10px;
    background: rgba(7, 9, 18, 0.92);
    border: 1px solid rgba(232, 228, 213, 0.18);
    border-radius: 999px;
    font-family: "Poppins", system-ui, sans-serif;
    font-size: 10.5px;
    font-weight: 600;
    color: ${WORLD_COLORS.inkPrimary};
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s ease;
  }
  .kudos-node:hover::after { opacity: 1; }
`;
