/**
 * KUDOS WORLD ENGINE · Design Tokens
 *
 * Paleta fundacional según brand book ADN 1000M:
 *   "premium · elegante · calmado · cinematográfico"
 *   "nunca neón excesivo · nunca colores gamer · nunca UI infantil"
 *
 * NO usar fuera de /world. Lo viejo (#6C3CFF/#FF3CAC/etc.) queda en
 * el panel del fundador y en /mapa como demo; /world es categoría nueva.
 */

// ─── COLORES BASE (máximo 6-7 dominantes) ──────────────────────────────────

export const WORLD_COLORS = {
  // Fondo · espacio profundo donde respira el planeta
  voidDeep:      "#070912",  // negro azulado · espacio
  voidNavy:      "#0a0e1f",  // navy profundo · base del mapa
  voidElevated:  "#101428",  // navy elevado · cards y paneles

  // Terreno · gris cálido (NO competitivo con nodos)
  earthBase:     "#1a1d2e",  // tile dark cinematográfico
  earthEdge:     "#2a2d40",  // bordes muy sutiles

  // Acentos significantes · UNO por tipo
  legendary:     "#C9A961",  // dorado suave · Tier S · "esto importa"
  history:       "#5A8BB8",  // azul profundo desaturado · historia/cultura
  nature:        "#6BA888",  // verde oscuro orgánico · naturaleza
  tragedy:       "#A85858",  // rojo desaturado · tragedia/conflicto
  mystery:       "#7A6BA8",  // morado profundo · misterio/anomalía
  warmWhite:     "#F5E8C7",  // blanco cálido · información universal
  premium:       "#E8DBB0",  // crema · highlights premium

  // Texto
  inkPrimary:    "#E8E4D5",  // blanco hueso para legibilidad calmada
  inkSecondary:  "rgba(232,228,213,0.55)",
  inkTertiary:   "rgba(232,228,213,0.32)",

  // Estados invisibles
  fogVeil:       "rgba(7,9,18,0.78)",  // velo sobre zonas no descubiertas
  glowGold:      "rgba(201,169,97,0.32)",
} as const;


// ─── TIPOS DE WORLD NODE ───────────────────────────────────────────────────

export type WorldNodeTier = "S" | "A" | "B" | "C";

export type WorldNodeCategory =
  | "history"     // círculo perfecto
  | "nature"      // orgánico
  | "event"       // hexágono suave (eventos/tragedia)
  | "mystery"     // rombo suave
  | "science"     // nodo geométrico (octágono)
  | "social";     // orbital


// ─── DIMENSIONES POR TIER ──────────────────────────────────────────────────

export const TIER_SIZE: Record<WorldNodeTier, number> = {
  S: 44,   // grande pero elegante · doble anillo + respiración
  A: 24,   // medio · anillo simple + pulso lento
  B: 6,    // muy pequeño · dot tenue · NO saturar
  C: 3,    // invisible casi · aparece sólo con zoom muy alto
};

export const TIER_OPACITY: Record<WorldNodeTier, number> = {
  S: 1.0,
  A: 0.92,
  B: 0.45,  // más transparente · "casi inexistente"
  C: 0.25,
};

// Fog of discovery · zoom mínimo por tier
// "El mundo NO se muestra completamente. SE DESCUBRE."
export const TIER_MIN_ZOOM: Record<WorldNodeTier, number> = {
  S: 3,    // visible desde nivel continental (mundo elegante · sólo iconos)
  A: 7,    // visible desde nivel país/región
  B: 12,   // visible sólo en zoom de ciudad (NO antes · respira)
  C: 15,   // visible sólo en zoom de calle
};

// Cap absoluto · "densidad inteligente · el mapa debe respirar"
// Aunque haya 50k POIs en bbox, NUNCA renderizamos más de N.
// Prioridad: Tier S > A > B > C, después cercanía al centro.
export const MAX_NODES_RENDERED = 600;

// Margen extra del viewport para precarga · evita popping al hacer pan
export const VIEWPORT_PADDING_RATIO = 0.3;  // 30% extra alrededor


// ─── COLOR POR CATEGORÍA ───────────────────────────────────────────────────

export function nodeColorFor(category: WorldNodeCategory, tier: WorldNodeTier): string {
  // Tier S siempre dorado · "esto es legendary"
  if (tier === "S") return WORLD_COLORS.legendary;
  // Resto · color contextual de la categoría
  switch (category) {
    case "history":  return WORLD_COLORS.history;
    case "nature":   return WORLD_COLORS.nature;
    case "event":    return WORLD_COLORS.tragedy;
    case "mystery":  return WORLD_COLORS.mystery;
    case "science":  return WORLD_COLORS.warmWhite;
    case "social":   return WORLD_COLORS.premium;
  }
}


// ─── DEDUCIR CATEGORÍA DESDE TAGS LEGACY ───────────────────────────────────
// Mientras el dataset usa categorías viejas ("monumento", "museo"…)

export function inferCategory(tag: string | undefined): WorldNodeCategory {
  const t = (tag || "").toLowerCase();
  if (t.includes("natural") || t.includes("park") || t.includes("mount") || t.includes("water")) return "nature";
  if (t.includes("museo") || t.includes("museum") || t.includes("ciencia") || t.includes("library")) return "science";
  if (t.includes("evento") || t.includes("event") || t.includes("battle") || t.includes("trage")) return "event";
  if (t.includes("misterio") || t.includes("mystery")) return "mystery";
  if (t.includes("social") || t.includes("plaza") || t.includes("square")) return "social";
  return "history";  // default · la mayoría son históricos
}


// ─── TILES BASE ────────────────────────────────────────────────────────────
// Carto "dark_nolabels" · gratis sin API key · cinematográfico

export const WORLD_TILE_URL =
  "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png";

export const WORLD_TILE_ATTRIB =
  "© OpenStreetMap · © CARTO";

export const WORLD_TILE_SUBDOMAINS = ["a", "b", "c", "d"];

export const WORLD_TILE_MAX_ZOOM = 19;

// Filtro CSS extra para inclinar la base hacia navy KUDOS sin perder detalle
export const WORLD_TILE_FILTER =
  "brightness(0.95) contrast(1.05) saturate(0.55) hue-rotate(-15deg)";


// ─── RITMO DE MOVIMIENTO ───────────────────────────────────────────────────
// "respiración contextual · NO animaciones agresivas"

export const RESPIRATION_DURATION_S = 5.4;   // duración del ciclo de respiración tier S/A
export const RESPIRATION_OPACITY_MIN = 0.78; // pulso entre estos dos valores
export const RESPIRATION_OPACITY_MAX = 1.0;

export const FOG_FADE_DURATION_MS = 600;     // cuánto tarda un nodo en aparecer/desaparecer
