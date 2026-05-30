/**
 * KUDOS WORLD ENGINE · Design Tokens · T7.1 NIGHT CINEMATIC
 *
 * Modo NIGHT · estética KUDOS cinematográfica:
 *   - Tile Carto Voyager con filtro nocturno morado profundo (validado en HomeMapPanel)
 *   - Texto claro sobre fondo oscuro
 *   - Halos vibrantes dorados + morados
 *   - Categorías mantienen identidad cromática pero con luminosidad aumentada
 *
 * "El mundo iluminado por historias."
 *
 * Para volver al modo Apple Light original: ver _postlaunch/world-engine/world-tokens.ts
 */

// ─── COLORES BASE ─────────────────────────────────────────────────────────

export const WORLD_COLORS = {
  // Fondo del mapa · tonos profundos nocturnos
  voidDeep:      "#0a0814",   // negro morado profundo · loading background
  voidNavy:      "#14102a",   // morado oscuro principal
  voidElevated:  "#1f1840",   // elevación tipo sheet/card

  // Terreno (no muy usado · tiles cubren)
  earthBase:     "#1a1430",
  earthEdge:     "#2a1f4a",

  // Tier S · sello KUDOS legendary (más vibrante sobre fondo oscuro)
  legendary:     "#E0B86F",   // dorado más luminoso
  premium:       "#C9A961",

  // Categorías · saturación reforzada para fondo oscuro
  museum:        "#a987ff",   // lila luminoso
  castle:        "#e09545",   // ámbar cálido
  religious:     "#6da8e8",   // cobalto luminoso
  megalith:      "#85b89c",   // verde piedra claro
  park:          "#5fcb7a",   // verde bosque vibrante
  plaza:         "#e8ad5c",   // ámbar dorado
  monument:      "#c9b275",   // dorado neutro
  archaeology:   "#d97658",   // terracota viva
  palace:        "#e0b657",   // dorado real
  mystery:       "#c99dff",   // lila místico

  // Texto sobre fondo oscuro
  inkPrimary:    "#f5f0e8",   // blanco cálido
  inkSecondary:  "rgba(245,240,232,0.75)",
  inkTertiary:   "rgba(245,240,232,0.5)",

  // Brand vibrante
  glowGold:      "rgba(224,184,111,0.55)",
  glowPurple:    "rgba(139,107,255,0.35)",
  fogVeil:       "rgba(10,8,20,0.55)",
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
  B: 22,    // suficiente para pictograma + label permanente
  C: 6,
};

export const TIER_OPACITY: Record<WorldNodeTier, number> = {
  S: 1.0,
  A: 0.98,
  B: 0.92,    // antes 0.65 · ahora full POI Apple-style
  C: 0.35,
};

export const TIER_MIN_ZOOM: Record<WorldNodeTier, number> = {
  S: 5,
  A: 10,
  B: 12,    // antes 14 · ahora aparece en zoom de ciudad-distrito (Apple-style)
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


// ─── TAMAÑO DEL CHIP ESCALA CON EL ZOOM ───────────────────────────────────
// Apple-style · cuanto más cerca estás, más grande se ve el POI porque
// no compite con otros (la densidad ya está acotada por maxNodesAtZoom).
// baseSize × factor = size final.
export function sizeFactorForZoom(zoom: number): number {
  if (zoom <= 7)  return 0.78;
  if (zoom <= 9)  return 0.90;
  if (zoom <= 11) return 1.00;
  if (zoom <= 13) return 1.15;
  if (zoom <= 15) return 1.30;
  return 1.45;                  // zoom 16-19 · vista calle/edificio
}


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


// ─── TILES BASE · CartoDB Dark Matter · NOCTURNO NATIVO KUDOS ─────────────

// T6.4.C · El tile Voyager es neutro y hue-rotate no produce morado real.
// Cambiamos a dark_nolabels que viene oscuro de fabrica. Aplicamos tinte
// morado sutil con filtro hue-rotate suave (ahora si funciona porque el
// tile dark tiene grises que toman color al rotar el hue).
export const WORLD_TILE_URL =
  "https://{s}.basemaps.cartocdn.com/rastertiles/dark_nolabels/{z}/{x}/{y}{r}.png";

export const WORLD_LABELS_URL =
  "https://{s}.basemaps.cartocdn.com/rastertiles/dark_only_labels/{z}/{x}/{y}{r}.png";

export const WORLD_TILE_ATTRIB = "© OpenStreetMap · © CARTO";
export const WORLD_TILE_SUBDOMAINS = ["a", "b", "c", "d"];
export const WORLD_TILE_MAX_ZOOM = 19;

// Tinte morado KUDOS sobre tile dark · ahora si visible
export const WORLD_TILE_FILTER =
  "hue-rotate(225deg) saturate(1.4) brightness(0.95) contrast(1.05)";

// Labels claros · el tile dark_only_labels ya viene en blanco, solo ajuste
export const WORLD_LABELS_FILTER =
  "hue-rotate(225deg) saturate(0.6) opacity(0.7)";


// ─── RITMO DE MOVIMIENTO ──────────────────────────────────────────────────

export const RESPIRATION_DURATION_S = 5.4;
export const RESPIRATION_OPACITY_MIN = 0.82;
export const RESPIRATION_OPACITY_MAX = 1.0;
export const FOG_FADE_DURATION_MS = 600;
