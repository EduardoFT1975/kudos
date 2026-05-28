/**
 * KUDOS WORLD ENGINE · Design Tokens
 *
 * Paleta cinematográfica + categorías pictográficas estilo Apple Maps.
 * Color vivo pero NUNCA neón gamer. Cada categoría tiene
 * pictograma + tono propio que se reconoce de un vistazo.
 */

// ─── COLORES BASE ─────────────────────────────────────────────────────────

export const WORLD_COLORS = {
  // Fondo · espacio profundo
  voidDeep:      "#070912",
  voidNavy:      "#0a0e1f",
  voidElevated:  "#101428",

  // Terreno
  earthBase:     "#1a1d2e",
  earthEdge:     "#2a2d40",

  // Tier S (universal legendary · siempre dorado)
  legendary:     "#C9A961",
  premium:       "#E8DBB0",

  // Categorías · vivas, NO neón
  museum:        "#9F7BC9",   // lila profundo · museos, galerías, arte
  castle:        "#D6963F",   // ámbar oscuro · castillos, fortalezas
  religious:     "#6E94CC",   // azul cobalto suave · iglesias, monasterios
  megalith:      "#88A28A",   // piedra musgo · dolmen, menhir, túmulo
  park:          "#7BBF8F",   // verde bosque · parques, jardines, naturaleza
  plaza:         "#E0B062",   // ámbar cálido · plazas, alamedas
  monument:      "#E8DBB0",   // crema · monumentos, estatuas, fuentes
  archaeology:   "#C28266",   // terracota · yacimientos, ruinas
  palace:        "#D4B569",   // dorado real · palacios
  mystery:       "#9F7BC9",   // alias museum para legacy

  // Texto
  inkPrimary:    "#E8E4D5",
  inkSecondary:  "rgba(232,228,213,0.55)",
  inkTertiary:   "rgba(232,228,213,0.32)",

  // Estados invisibles
  fogVeil:       "rgba(7,9,18,0.78)",
  glowGold:      "rgba(201,169,97,0.32)",
} as const;


// ─── TIPOS ────────────────────────────────────────────────────────────────

export type WorldNodeTier = "S" | "A" | "B" | "C";

export type WorldNodeCategory =
  | "museum"
  | "castle"
  | "religious"
  | "megalith"
  | "park"
  | "plaza"
  | "monument"
  | "archaeology"
  | "palace"
  | "mystery";


// ─── DIMENSIONES POR TIER ─────────────────────────────────────────────────

export const TIER_SIZE: Record<WorldNodeTier, number> = {
  S: 38,   // pictograma grande + label permanente
  A: 26,   // pictograma medio + label permanente si cabe
  B: 14,   // dot color · label sólo hover
  C: 6,    // marca casi invisible
};

export const TIER_OPACITY: Record<WorldNodeTier, number> = {
  S: 1.0,
  A: 0.95,
  B: 0.55,
  C: 0.3,
};

// Fog of discovery · zoom mínimo por tier (BRUTAL · respira mucho más)
export const TIER_MIN_ZOOM: Record<WorldNodeTier, number> = {
  S: 5,
  A: 10,    // antes 8 · ahora sólo desde región
  B: 14,    // antes 13 · sólo en calle alta
  C: 17,    // muy raramente visible
};

// Cap DINÁMICO · "menos es más" · estilo Apple Maps
export function maxNodesAtZoom(zoom: number): number {
  if (zoom <= 5)  return 12;    // Mundo · puñado de Tier S
  if (zoom <= 7)  return 20;    // Continente · selección extrema
  if (zoom <= 9)  return 35;    // País/región · curado
  if (zoom <= 11) return 55;    // Ciudad · densidad moderada
  if (zoom <= 13) return 80;    // Distrito
  return 120;                   // Barrio/calle · máximo
}

// Cap absoluto · hard limit
export const MAX_NODES_RENDERED = 120;

// Padding de viewport para precarga
export const VIEWPORT_PADDING_RATIO = 0.25;


// ─── COLOR POR CATEGORÍA ──────────────────────────────────────────────────

export function nodeColorFor(category: WorldNodeCategory, tier: WorldNodeTier): string {
  // Tier S siempre dorado · "esto es legendary"
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


// ─── DEDUCIR CATEGORÍA DESDE TAGS WIKIDATA/OSM REALES ─────────────────────

export function inferCategory(tag: string | undefined): WorldNodeCategory {
  const t = (tag || "").toLowerCase();

  // Religious primero · iglesia/catedral/monasterio son la mayoría en España
  if (/iglesia|church|basilic|catedral|cathedral|monasterio|monastery|abad[ií]a|abbey|ermita|capilla|chapel|convent|mosque|synagog|temple|sanctuar/.test(t))
    return "religious";

  // Castillo/fortaleza
  if (/castillo|castle|fortaleza|fortress|alcazar|alc[áa]zar|tower|torre|fort|murall/.test(t))
    return "castle";

  // Palacio
  if (/palacio|palace|palau|p[áa]ço/.test(t))
    return "palace";

  // Megalitos
  if (/dolmen|menhir|m[áa]moa|mamoa|t[úu]mulo|tumulus|megalit|cromlech|cista|petr[óo]glifo|petroglyph/.test(t))
    return "megalith";

  // Arqueología
  if (/yacimiento|ruina|ruin|archaeolog|arqueol[óo]g|villa romana|teatro romano|anfiteatro|roman|celtic|castro/.test(t))
    return "archaeology";

  // Parque / naturaleza
  if (/parque|park|jard[íi]n|garden|nature|reserva|mountain|mount|monte|sierra|peak|laguna|lago|lake|cascad|waterfall|cueva|cave|playa|beach|mirador|viewpoint/.test(t))
    return "park";

  // Plaza / espacio social
  if (/plaza|square|alameda|paseo|promenad|boulevard/.test(t))
    return "plaza";

  // Museo / cultura
  if (/museo|museum|galer[íi]a|gallery|library|biblioteca|teatro|theatre|theater|auditori/.test(t))
    return "museum";

  // Monumento (default cultural)
  if (/monumento|monument|estatua|statue|memorial|fuente|fountain|obelisc|cruceiro|cross/.test(t))
    return "monument";

  // Fallback: monument neutro
  return "monument";
}


// ─── TILES BASE ───────────────────────────────────────────────────────────

export const WORLD_TILE_URL =
  "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png";

export const WORLD_LABELS_URL =
  "https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png";

export const WORLD_TILE_ATTRIB = "© OpenStreetMap · © CARTO";
export const WORLD_TILE_SUBDOMAINS = ["a", "b", "c", "d"];
export const WORLD_TILE_MAX_ZOOM = 19;

export const WORLD_TILE_FILTER =
  "brightness(0.92) contrast(1.05) saturate(0.55) hue-rotate(-15deg)";

export const WORLD_LABELS_FILTER =
  "brightness(1.1) saturate(0.4) opacity(0.65)";


// ─── RITMO DE MOVIMIENTO ──────────────────────────────────────────────────

export const RESPIRATION_DURATION_S = 5.4;
export const RESPIRATION_OPACITY_MIN = 0.78;
export const RESPIRATION_OPACITY_MAX = 1.0;
export const FOG_FADE_DURATION_MS = 600;
