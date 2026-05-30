/**
 * KUDOS WORLD ENGINE · WorldNode builder · estilo Apple Maps puro
 *
 * Tres tipos de chip · jerarquía Apple-style:
 *   - Tier S = imagen real grande + halo dorado · LEGENDARY
 *   - Tier A = imagen real + borde color categoría · PREMIUM (Museo del Prado)
 *   - Tier B = pictograma color + label · NORMAL POI (Plaza de Chueca)
 *   - Tier C = micro dot (raramente visible)
 *
 * Labels: texto plano sin pill · text-shadow blanco fuerte · estilo Apple.
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
  sizeOverride?: number;
  hasCapsule?: boolean;
}


/** Pictograma SVG por categoría · path blanco sobre fondo color. */
function pictogramFor(category: WorldNodeCategory): string {
  switch (category) {
    case "museum":       return '<path d="M3 21h18v-2H3v2zm2-3h2v-7H5v7zm4 0h2v-7H9v7zm4 0h2v-7h-2v7zm4 0h2v-7h-2v7zM12 3 2 8v2h20V8L12 3z"/>';
    case "castle":       return '<path d="M4 21V10l2-1V6h2v2l2-1V3h2v4l2-1v3l2-1v3l2-1v11H4zm2-2h12V12H6v7z"/>';
    case "religious":    return '<path d="M10 21h4v-7h6v-4h-6V3h-4v7H4v4h6v7z"/>';
    case "megalith":     return '<path d="M4 8h2v10H4V8zm14 0h2v10h-2V8zM3 6c0-1 1-2 2-2h14c1 0 2 1 2 2v1H3V6z"/>';
    case "park":         return '<path d="M12 2c-3 3-5 6-5 9 0 2 1 4 4 4.5V22h2v-6.5c3-.5 4-2.5 4-4.5 0-3-2-6-5-9z"/>';
    case "plaza":        return '<path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z"/>';
    case "monument":     return '<path d="M11 2 9 8v9H7v3h10v-3h-2V8l-2-6h-2zm0 6 1-3 1 3v9h-2V8z"/>';
    case "archaeology":  return '<path d="M4 21V8h2v11H4zm4-2V6h2v13H8zm4 2V4h2v17h-2zm4-3V9h2v9h-2zM3 22h18v1H3v-1z"/>';
    case "palace":       return '<path d="M12 2c-2 0-3 1.5-3 3.5L9 7H7v3H4v11h16V10h-3V7h-2V5.5C15 3.5 14 2 12 2zm-1 9h2v3h-2v-3z"/>';
    case "mystery":      return '<path d="M12 2 2 12l10 10 10-10L12 2zm-1 14h2v2h-2v-2zm0-3v-2c0-1 .5-1.5 1.5-2 1-.5 1.5-1 1.5-2 0-1-1-2-2-2s-2 1-2 2H8c0-2 2-4 4-4s4 2 4 4c0 1.5-1 2-2 2.5-1 .5-1 1-1 1.5h-2z"/>';
  }
}


export function buildWorldNodeHTML(node: WorldNodeInput): string {
  const { id, name, tier, category, image, isActive, showLabel, sizeOverride, hasCapsule } = node;
  const color = nodeColorFor(category, tier);
  const baseSize = sizeOverride ?? TIER_SIZE[tier];
  const size = isActive ? Math.round(baseSize * 1.35) : baseSize;
  const opacity = isActive ? 1.0 : TIER_OPACITY[tier];
  const safeName = escapeXml(name);
  const labelClass = showLabel ? "with-label" : "";
  const safeImage = image ? escapeXml(image) : "";

  const hasImage = !!safeImage && (tier === "S" || tier === "A");
  const imgUrl = hasImage && safeImage.includes("Special:FilePath")
    ? `${safeImage}?width=140`
    : safeImage;
  const innerImg = hasImage
    ? `<img src="${imgUrl}" alt="${safeName}" loading="lazy"
            onerror="this.parentElement.classList.add('img-failed')"
            style="width:100%;height:100%;border-radius:50%;object-fit:cover;display:block;" />`
    : "";

  // Tier S · halo dorado + double-ring + imagen
  if (tier === "S") {
    return `
      <div class="kudos-chip kudos-chip-s ${labelClass} ${hasCapsule ? "has-capsule" : ""}" data-id="${id}" data-tier="S" data-name="${safeName}"
           style="width:${size}px;height:${size}px;opacity:${opacity};">
        <div class="kudos-chip-halo"></div>
        <div class="kudos-chip-outer-ring"
             style="background:${WORLD_COLORS.legendary};
                    box-shadow:0 2px 12px rgba(201,169,97,0.55), 0 1px 3px rgba(0,0,0,0.18);">
          <div class="kudos-chip-inner-ring" style="background:#ffffff;">
            <div class="kudos-chip-body" style="background:${hasImage ? '#fff' : color};">
              ${innerImg}
            </div>
          </div>
        </div>
      </div>`;
  }

  // Tier A · imagen real + double-ring color categoría
  if (tier === "A") {
    return `
      <div class="kudos-chip kudos-chip-a ${labelClass} ${hasCapsule ? "has-capsule" : ""}" data-id="${id}" data-tier="A" data-name="${safeName}"
           style="width:${size}px;height:${size}px;opacity:${opacity};">
        <div class="kudos-chip-outer-ring"
             style="background:${color};
                    box-shadow:0 1px 6px rgba(0,0,0,0.22);">
          <div class="kudos-chip-inner-ring" style="background:#ffffff;">
            <div class="kudos-chip-body" style="background:${hasImage ? '#fff' : color};">
              ${innerImg}
            </div>
          </div>
        </div>
      </div>`;
  }

  // Tier B · POI NORMAL Apple-style · pictograma blanco sobre color categoría + label
  if (tier === "B") {
    return `
      <div class="kudos-chip kudos-chip-b ${labelClass} ${hasCapsule ? "has-capsule" : ""}" data-id="${id}" data-tier="B" data-name="${safeName}"
           style="width:${size}px;height:${size}px;opacity:${opacity};">
        <div class="kudos-chip-pict-bg" style="background:${color};">
          <svg viewBox="0 0 24 24" width="${size * 0.6}" height="${size * 0.6}" aria-label="${safeName}" fill="white">
            ${pictogramFor(category)}
          </svg>
        </div>
      </div>`;
  }

  // Tier C · micro dot
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
 * CSS · labels estilo Apple Maps puro · texto plano sin pill.
 */
export const WORLD_NODE_CSS = `
  .kudos-chip {
    position: relative;
    display: flex; align-items: center; justify-content: center;
    pointer-events: auto; cursor: pointer;
    transition: opacity 0.4s ease, transform 0.22s cubic-bezier(0.22,1,0.36,1);
  }
  .kudos-chip:hover { transform: scale(1.15); z-index: 99999 !important; }

  /* z-index hover · marker container Leaflet · resuelve label tapado */
  .leaflet-marker-icon.kudos-world-node:hover {
    z-index: 99999 !important;
  }

  /* Anillo externo color categoría (Tier A) o dorado (Tier S) */
  .kudos-chip-outer-ring {
    width: 100%; height: 100%;
    border-radius: 50%;
    padding: 2px;
    display: flex; align-items: center; justify-content: center;
  }
  .kudos-chip-s .kudos-chip-outer-ring { padding: 2.8px; }

  /* Anillo blanco interno aislador */
  .kudos-chip-inner-ring {
    width: 100%; height: 100%;
    border-radius: 50%;
    padding: 1.5px;
    display: flex; align-items: center; justify-content: center;
  }

  /* Body contiene la imagen */
  .kudos-chip-body {
    width: 100%; height: 100%;
    border-radius: 50%;
    overflow: hidden;
    display: flex; align-items: center; justify-content: center;
  }
  .kudos-chip-body.img-failed > img { display: none !important; }

  /* Tier B · pictograma sobre fondo color · borde blanco fino */
  .kudos-chip-pict-bg {
    width: 100%; height: 100%;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    border: 1.5px solid rgba(255,255,255,0.85);
    box-shadow: 0 1px 4px rgba(0,0,0,0.22);
  }

  /* Halo respirando Tier S · NIGHT cinematico: dorado vibrante + capa morada externa */
  .kudos-chip-halo {
    position: absolute; inset: -65%; border-radius: 50%;
    z-index: -1;
    background:
      radial-gradient(circle, ${WORLD_COLORS.glowGold} 0%, transparent 45%),
      radial-gradient(circle, ${WORLD_COLORS.glowPurple} 30%, transparent 75%);
    filter: blur(2px);
    animation: kudos-halo-breathe ${RESPIRATION_DURATION_S}s ease-in-out infinite;
  }

  /* Halo sutil tambien en Tier A (para que se sientan vivos) */
  .kudos-chip-a::before {
    content: "";
    position: absolute; inset: -25%; border-radius: 50%;
    z-index: -1;
    background: radial-gradient(circle, rgba(139,107,255,0.22) 0%, transparent 65%);
    animation: kudos-halo-breathe 6.5s ease-in-out infinite;
    pointer-events: none;
  }
  @keyframes kudos-halo-breathe {
    0%, 100% { opacity: ${RESPIRATION_OPACITY_MIN}; transform: scale(0.96); }
    50%      { opacity: ${RESPIRATION_OPACITY_MAX}; transform: scale(1.08); }
  }

  /* Dot Tier C */
  .kudos-chip-dot {
    width: 70%; height: 70%; border-radius: 50%;
    border: 1.5px solid rgba(255,255,255,0.65);
    box-shadow: 0 1px 3px rgba(0,0,0,0.25);
  }

  /* Stagger entrance · fade-in + scale al aparecer */
  @keyframes kudos-chip-entrance {
    from { opacity: 0; transform: scale(0.6) translateY(8px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }
  .kudos-chip {
    animation: kudos-chip-entrance 0.42s cubic-bezier(0.22,1,0.36,1) both;
  }

  /* Float sutil Tier S · ±1.5px en 7s */
  @keyframes kudos-chip-float {
    0%, 100% { transform: translateY(0); }
    50%      { transform: translateY(-1.5px); }
  }
  .kudos-chip-s {
    animation: kudos-chip-entrance 0.42s cubic-bezier(0.22,1,0.36,1) both,
               kudos-chip-float 7s ease-in-out 0.5s infinite;
  }

  /* Hover lift */
  .kudos-chip:hover .kudos-chip-outer-ring,
  .kudos-chip:hover .kudos-chip-pict-bg {
    box-shadow: 0 4px 16px rgba(0,0,0,0.35), 0 2px 6px rgba(0,0,0,0.2) !important;
  }

  @media (prefers-reduced-motion: reduce) {
    .kudos-chip, .kudos-chip * { animation: none !important; }
    .kudos-chip:hover { transform: none !important; }
  }


  /* Badge ▶ sutil en chips con cápsula disponible · G1 */
  .kudos-chip.has-capsule::before {
    content: "▶";
    position: absolute;
    top: -3px; right: -3px;
    width: 16px; height: 16px;
    border-radius: 50%;
    background: #C9A961;
    color: white;
    font-size: 8px;
    line-height: 16px;
    text-align: center;
    box-shadow: 0 1px 4px rgba(201,169,97,0.65);
    z-index: 10;
    pointer-events: none;
  }

  /* ─── LABELS · estilo APPLE MAPS · texto plano sin pill ────────────── */

  .kudos-chip::after {
    content: attr(data-name);
    position: absolute;
    top: 100%; left: 50%; transform: translateX(-50%);
    margin-top: 4px;
    padding: 0;
    background: transparent;
    border: none;
    box-shadow: none;
    font-family: var(--kudos-font-display, "Cormorant Garamond", Georgia, serif);
    font-weight: 500;
    color: rgba(245, 240, 232, 0.95);
    text-shadow: 0 0 4px rgba(0,0,0,0.95),
                 0 0 3px rgba(0,0,0,0.85),
                 0 1px 3px rgba(0,0,0,0.75);
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.25s ease;
    max-width: 140px;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 13px;
    letter-spacing: 0.005em;
  }

  /* Tier S · permanente · dorado luminoso · serif editorial */
  .kudos-chip.with-label[data-tier="S"]::after {
    opacity: 1;
    font-size: 14px;
    font-weight: 600;
    color: rgba(224, 184, 111, 0.98);
    letter-spacing: -0.01em;
  }
  /* Tier A · permanente · blanco cálido fino */
  .kudos-chip.with-label[data-tier="A"]::after {
    opacity: 1;
    font-size: 12.5px;
    color: rgba(245, 240, 232, 0.92);
  }
  /* Tier B · permanente · blanco fino más sutil */
  .kudos-chip.with-label[data-tier="B"]::after {
    opacity: 1;
    font-size: 11px;
    font-weight: 500;
    color: rgba(245, 240, 232, 0.78);
  }
  /* Hover label · cualquier tier */
  .kudos-chip:hover::after {
    opacity: 1;
  }
`;
