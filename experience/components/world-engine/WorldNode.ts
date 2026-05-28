/**
 * KUDOS WORLD ENGINE · WorldNode SVG builder
 *
 * EL BORDE ES EL LENGUAJE.
 * - Si hay imagen real del POI → círculo con imagen + border color categoría
 * - Si no hay imagen          → círculo color plano + border categoría
 * Tier S lleva además anillo dorado externo con halo respirando.
 * Pictogramas eliminados (eran redundantes con la imagen real).
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
  image?: string;
  isActive?: boolean;
  showLabel?: boolean;
}


/**
 * Construye un chip · imagen real (si hay) o círculo color plano.
 * El BORDE comunica la categoría.
 */
export function buildWorldNodeHTML(node: WorldNodeInput): string {
  const { id, name, tier, category, image, isActive, showLabel } = node;
  const color = nodeColorFor(category, tier);
  const baseSize = TIER_SIZE[tier];
  const size = isActive ? Math.round(baseSize * 1.4) : baseSize;
  const opacity = isActive ? 1.0 : TIER_OPACITY[tier];
  const safeName = escapeXml(name);
  const labelClass = showLabel ? "with-label" : "";
  const safeImage = image ? escapeXml(image) : "";

  // Wikimedia FilePath → redimensión a 120px (rápida)
  const hasImage = !!safeImage && tier !== "B" && tier !== "C";
  const imgUrl = hasImage && safeImage.includes("Special:FilePath")
    ? `${safeImage}?width=120`
    : safeImage;

  const innerImg = hasImage
    ? `<img src="${imgUrl}" alt="${safeName}" loading="lazy"
            onerror="this.parentElement.classList.add('img-failed')"
            style="width:100%;height:100%;border-radius:50%;object-fit:cover;display:block;" />`
    : "";

  // Tier S · anillo dorado externo + imagen o color plano · halo
  if (tier === "S") {
    return `
      <div class="kudos-chip kudos-chip-s ${labelClass}" data-id="${id}" data-tier="S" data-name="${safeName}"
           style="width:${size}px;height:${size}px;opacity:${opacity};">
        <div class="kudos-chip-halo"></div>
        <div class="kudos-chip-body"
             style="background:${hasImage ? '#fff' : color};
                    border:2.5px solid ${WORLD_COLORS.legendary};
                    box-shadow:0 2px 10px rgba(201,169,97,0.45), 0 1px 3px rgba(0,0,0,0.15);">
          ${innerImg}
        </div>
      </div>`;
  }

  // Tier A · imagen o color plano + border color categoría
  if (tier === "A") {
    return `
      <div class="kudos-chip kudos-chip-a ${labelClass}" data-id="${id}" data-tier="A" data-name="${safeName}"
           style="width:${size}px;height:${size}px;opacity:${opacity};">
        <div class="kudos-chip-body"
             style="background:${hasImage ? '#fff' : color};
                    border:2.2px solid ${color};
                    box-shadow:0 1px 6px rgba(0,0,0,0.18);">
          ${innerImg}
        </div>
      </div>`;
  }

  // Tier B · dot color · sin imagen (rápido)
  if (tier === "B") {
    return `
      <div class="kudos-chip kudos-chip-b" data-id="${id}" data-tier="B" data-name="${safeName}"
           style="width:${size}px;height:${size}px;opacity:${opacity};">
        <div class="kudos-chip-dot" style="background:${color};"></div>
      </div>`;
  }

  // Tier C
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
 * CSS global · chips claros, labels ultra-discretos.
 * Cuando la imagen falla, .img-failed cambia el fondo a color categoría.
 */
export const WORLD_NODE_CSS = `
  .kudos-chip {
    position: relative;
    display: flex; align-items: center; justify-content: center;
    pointer-events: auto; cursor: pointer;
    transition: opacity 0.4s ease, transform 0.22s cubic-bezier(0.22,1,0.36,1);
  }
  .kudos-chip:hover { transform: scale(1.15); z-index: 1000 !important; }

  .kudos-chip-body {
    width: 100%; height: 100%;
    border-radius: 50%;
    overflow: hidden;
    display: flex; align-items: center; justify-content: center;
  }
  /* Si la <img> falla · el body queda con el color de la categoría
     (ya fijado inline) · cubre todo el círculo */
  .kudos-chip-body.img-failed > img { display: none !important; }

  /* Halo respirando Tier S */
  .kudos-chip-halo {
    position: absolute; inset: -50%; border-radius: 50%;
    z-index: -1;
    background: radial-gradient(circle, ${WORLD_COLORS.glowGold} 0%, transparent 60%);
    animation: kudos-halo-breathe ${RESPIRATION_DURATION_S}s ease-in-out infinite;
  }
  @keyframes kudos-halo-breathe {
    0%, 100% { opacity: ${RESPIRATION_OPACITY_MIN}; transform: scale(0.96); }
    50%      { opacity: ${RESPIRATION_OPACITY_MAX}; transform: scale(1.08); }
  }

  /* Dot simple Tier B/C */
  .kudos-chip-dot {
    width: 70%; height: 70%; border-radius: 50%;
    border: 1.5px solid rgba(255,255,255,0.65);
    box-shadow: 0 1px 3px rgba(0,0,0,0.25);
  }

  @media (prefers-reduced-motion: reduce) {
    .kudos-chip * { animation: none !important; }
    .kudos-chip:hover { transform: none !important; }
  }

  /* ─── LABELS · ultra-discretos sobre fondo claro ─────────────────────── */

  .kudos-chip::after {
    content: attr(data-name);
    position: absolute;
    top: 100%; left: 50%; transform: translateX(-50%);
    margin-top: 5px;
    padding: 2px 8px;
    background: rgba(255, 255, 255, 0.92);
    border: 1px solid rgba(0,0,0,0.08);
    border-radius: 999px;
    font-family: "Poppins", system-ui, sans-serif;
    font-weight: 500;
    color: ${WORLD_COLORS.inkPrimary};
    white-space: nowrap;
    text-shadow: none;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.25s ease;
    max-width: 180px;
    overflow: hidden; text-overflow: ellipsis;
  }

  /* Tier S · label permanente · dorado discreto */
  .kudos-chip.with-label[data-tier="S"]::after {
    opacity: 1;
    font-size: 11px;
    font-weight: 600;
    color: ${WORLD_COLORS.premium};
    border-color: rgba(201, 169, 97, 0.35);
  }
  /* Tier A · label permanente · gris oscuro fino */
  .kudos-chip.with-label[data-tier="A"]::after {
    opacity: 0.94;
    font-size: 10px;
  }
  /* B/C · sólo hover · fino */
  .kudos-chip:hover::after {
    opacity: 1;
    font-size: 10.5px;
  }
`;
