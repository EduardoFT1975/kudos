/**
 * KUDOS WORLD ENGINE · Design Tokens
 *
 * Modo LIGHT · estilo Apple Maps premium con identidad KUDOS:
 *   - Tile cálido Carto Voyager (no Positron · más identidad)
 *   - Chips circulares con imagen real del POI + anillo dorado Tier S
 *   - Texto discreto · gris oscuro fino · sin pills oscuras invasivas
 *
 * "El mapa se siente como un guidebook elegante, no como utility."
 */

// ─── COLORES BASE ─────────────────────────────────────────────────────────

export const WORLD_COLORS = {
  // Fondo del mapa · tonos cálidos claros (NO blanco puro)
  voidDeep:      "#f4efe6",   // crema cálida · loading background
  voidNavy:      "#f7f3ea",   // beige Apple-ish
  voidElevated:  "#ffffff",

  // Terreno
  earthBase:     "#ece4d3",
  earthEdge:     "#d6cdb8",

  // Tier S · sello KUDOS legendary
  legendary:     "#C9A961",
  premium:       "#a78848",

  // Categorías · vivas pero LEGIBLES sobre fondo claro
  museum:        "#7c5fb8",   // lila profundo · museos, galerías
  castle:        "#b07028",   // ámbar oscuro · castillos, fortalezas
  religious:     "#3d6aa3",   // cobalto · iglesias, monasterios
  megalith:      "#5a7d6c",   // verde piedra · dolmen, megalitos
  park:          "#3e8e54",   // verde bosque · parques, naturaleza
  plaza:         "#c08838",   // ámbar cálido · plazas
  monument:      "#8a7a52",   // dorado oscuro · monumentos
  archaeology:   "#9c5333",   // terracota · arqueología
  palace:        "#a8842c",   // dorado real · palacios
  mystery:       "#7c5fb8",

  // Texto sobre fondo claro
  inkPrimary:    "#262220",   // casi negro cálido
  inkSecondary:  "rgba(38,34,32,0.55)",
  inkTertiary:   "rgba(38,34,32,0.32)",

  // Brand discreto
  glowGold:      "rgba(201,169,97,0.32)",
  fogVeil:       "rgba(247,243,234,0.78)",
} as const;


// ─── TIPOS ────────────────────────────────────────────────────────────────

export type WorldNodeTier = "S" | "A" | "B" | "C";

export type WorldNodeCategory =
  | "museum" | "castle" | "religious" | "megalith" | "park"
  | "plaza" | "monument" | "archaeology" | "palace" | "mystery";


// ─── DIMENSIONES POR TIER ─────────────────────────────────────────────────

export const TIER_SIZE: Record<WorldNodeTier, number> = {
  S: 44,
  A: 32,
  B: 14,
  C: 6,
};

export const TIER_OPACITY: Record<WorldNodeTier, number> = {
  S: 1.0,
  A: 0.98,
  B: 0.65,
  C: 0.35,
};

export const TIER_MIN_ZOOM: Record<WorldNodeTier, number> = {
  S: 5,
  A: 10,
  B: 14,
  C: 17,
};

// Densidad estilo Apple Maps · menos es más
export function maxNodesAtZoom(zoom: number): number {
  if (zoom <= 5)  return 12;
  if (zoom <= 7)  return 20;
  if (zoom <= 9)  return 35;
  if (zoom <= 11) return 55;
  if (zoom <= 13) return 80;
  return 120;
}

export const MAX_NODES_RENDERED = 120;
export const VIEWPORT_PADDING_RATIO = 0.25;


// ─── COLOR POR CATEGORÍA ──────────────────────────────────────────────────

export function nodeColorFor(category: WorldNodeCategory, tier: WorldNodeTier): string {
  if (tier === "S") return WORLD_COLORS.legendary;
  switch (category) {
    case "museum":       return WORLD_COLORS.museum;
    case "castle":       return WORLD_COLORS.castle;
    case "religious":    return WORLD_COLORS.religious;
    case "megalith":     return WORLD_COLORS.megalith;
    case "park":         return WORLD_COLORS.park;
    case "plaza":        return WORLD_COLORS.plaza;
    case "monument":     return WORLD_COLORS.monument;
    case "archaeology":  return WORLD_COLORS.archaeology;
    case "palace":       return WORLD_COLORS.palace;
    case "mystery":      return WORLD_COLORS.mystery;
  }
}


// ─── inferCategory · regex sobre tags + name ──────────────────────────────

export function inferCategory(tag: string | undefined): WorldNodeCategory {
  const t = (tag || "").toLowerCase();

  if (/iglesia|church|basilic|catedral|cathedral|monasterio|monastery|abad[ií]a|abbey|ermita|capilla|chapel|convent|mosque|synagog|temple|sanctuar/.test(t))
    return "religious";

  if (/castillo|castle|fortaleza|fortress|alcazar|alc[áa]zar|tower|torre|fort|murall/.test(t))
    return "castle";

  if (/palacio|palace|palau|p[áa]ço/.test(t))
    return "palace";

  if (/dolmen|menhir|m[áa]moa|mamoa|t[úu]mulo|tumulus|megalit|cromlech|cista|petr[óo]glifo|petroglyph/.test(t))
    return "megalith";

  if (/yacimiento|ruina|ruin|archaeolog|arqueol[óo]g|villa romana|teatro romano|anfiteatro|roman|celtic|castro/.test(t))
    return "archaeology";

  if (/parque|park|jard[íi]n|garden|nature|reserva|mountain|mount|monte|sierra|peak|laguna|lago|lake|cascad|waterfall|cueva|cave|playa|beach|mirador|viewpoint/.test(t))
    return "park";

  if (/plaza|square|alameda|paseo|promenad|boulevard/.test(t))
    return "plaza";

  if (/museo|museum|galer[íi]a|gallery|library|biblioteca|teatro|theatre|theater|auditori/.test(t))
    return "museum";

  if (/monumento|monument|estatua|statue|memorial|fuente|fountain|obelisc|cruceiro|cross/.test(t))
    return "monument";

  return "monument";
}


// ─── TILES BASE · Carto Voyager light (cálido · premium) ──────────────────

// Voyager · más cálido que Positron · transmite "guidebook" no "utility"
export const WORLD_TILE_URL =
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png";

export const WORLD_LABELS_URL =
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png";

export const WORLD_TILE_ATTRIB = "© OpenStreetMap · © CARTO";
export const WORLD_TILE_SUBDOMAINS = ["a", "b", "c", "d"];
export const WORLD_TILE_MAX_ZOOM = 19;

// Filtros muy suaves · NO destrozar la legibilidad del tile light
export const WORLD_TILE_FILTER =
  "saturate(0.85) contrast(1.02) brightness(1.0)";

export const WORLD_LABELS_FILTER =
  "saturate(0.7) opacity(0.85)";


// ─── RITMO DE MOVIMIENTO ──────────────────────────────────────────────────

export const RESPIRATION_DURATION_S = 5.4;
export const RESPIRATION_OPACITY_MIN = 0.82;
export const RESPIRATION_OPACITY_MAX = 1.0;
export const FOG_FADE_DURATION_MS = 600;
