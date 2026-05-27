/**
 * KUDOS · Capsule Generation · Continuity Engine (Section 3).
 *
 *   "AI video breaks continuity constantly. KUDOS does not."
 *
 *   This module establishes and maintains the visual continuity contract that
 *   binds shots together across a capsule:
 *
 *     · color continuity      · palette anchors carry forward
 *     · lighting continuity   · time-of-day + softness consistent
 *     · weather continuity    · the world does not change weather mid-capsule
 *     · atmospheric continuity · dust, wind, haze persist
 *     · motion-rhythm continuity · camera vocabulary stays disciplined
 *     · grain/look continuity · same film texture across shots
 *
 *   The ContinuityAnchor is established BEFORE the first shot (from POI
 *   context + emotional mode + era), then UPDATED after each approved shot
 *   based on observed image features. Subsequent shots have anchor clauses
 *   injected into their prompts via prompt-expander.ts.
 */
import type { ShotGrammar } from "../cinematic-language/provider-abstraction";
import type { EmotionalMode } from "../cinematic-language/camera-language";
import type { EnvironmentalMotion } from "../cinematic-language/shot-taxonomy";

// ─── The anchor ──────────────────────────────────────────────────────────

export interface ContinuityAnchor {
  /** 3-5 hex colors anchoring the palette */
  palette_hex:               ReadonlyArray<string>;
  /** Dominant color name · "warm umber", "ash grey", "cool dawn blue" */
  dominant_color:            string;
  /** Lighting descriptor · "warm dusk diffuse", "blue hour overcast", "candle-low" */
  lighting_descriptor:       string;
  /** Weather descriptor · "clear with atmospheric haze", "overcast cool", "dust-laden warm" */
  weather:                   string;
  /** Camera motion signature · "slow monumental drift", "locked memorial", "kinetic urban" */
  motion_signature:          string;
  /** Persistent atmosphere elements · ["dust", "wind"] */
  atmosphere:                ReadonlyArray<EnvironmentalMotion | string>;
  /** Grain profile · "soft documentary", "vintage 16mm", "neutral digital" */
  grain_profile:             string;
  /** Established at shot index (1 = first shot) */
  established_at_shot:       number;
  /** Updated at shot index */
  updated_at_shot:           number;
  /** Continuity strictness · 0-1 · higher = penalize anchor drift harder */
  strictness:                number;
}

// ─── Era-aware palette library ────────────────────────────────────────────

interface PaletteSeed {
  hex:               ReadonlyArray<string>;
  dominant_color:    string;
  lighting:          string;
  weather:           string;
  grain:             string;
}

const ERA_PALETTES: Record<string, PaletteSeed> = {
  "ancient":      { hex: ["#8b6c42", "#c4a36a", "#3d2e1f", "#f0e4cb"], dominant_color: "warm umber", lighting: "warm golden hour diffuse", weather: "clear with atmospheric haze", grain: "soft documentary" },
  "medieval":     { hex: ["#5a4a3e", "#9a8266", "#262019", "#e6dcc4"], dominant_color: "weathered earth", lighting: "cool overcast diffuse", weather: "overcast cool, low cloud", grain: "soft documentary" },
  "modern":       { hex: ["#2a2a30", "#5e6973", "#aeb6bf", "#f4f6f7"], dominant_color: "ash grey", lighting: "neutral daylight", weather: "clear, blue sky", grain: "neutral digital" },
  "contemporary": { hex: ["#1f2a36", "#3d5a78", "#a3b8cc", "#f1f5f9"], dominant_color: "blue grey", lighting: "mixed urban", weather: "clear evening", grain: "neutral digital" },
  "memorial":     { hex: ["#3a3a3a", "#7d7d7d", "#1c1c1c", "#d8d8d8"], dominant_color: "ash grey", lighting: "cool overcast restrained", weather: "overcast", grain: "soft documentary" },
  "showa_memory": { hex: ["#a3614d", "#d8a070", "#3a2a22", "#f0d8b0"], dominant_color: "warm faded amber", lighting: "neon plus tungsten window", weather: "humid evening", grain: "vintage 16mm haze" },
};

// ─── Motion-signature library (matches emotional modes) ──────────────────

const MOTION_SIGNATURES: Record<EmotionalMode, string> = {
  restrained_reverence:  "locked memorial, no motion",
  monumental_awe:        "slow monumental drift, breathing camera",
  sacred_emergence:      "patient reveal, geological slow",
  kinetic_observational: "kinetic urban handheld, lived energy",
  intimate_documentary:  "eye-level disciplined handheld",
  archival_dream:        "soft drift, dust in light, memory pacing",
  geopolitical_grave:    "locked witness, restrained",
  pilgrimage_steady:     "forward persistent, weathered horizon",
  celebratory_radiant:   "warm gathering, candid disciplined",
};

// ═══════════════════════════════════════════════════════════════════════════
// ESTABLISH
// ═══════════════════════════════════════════════════════════════════════════

export interface EstablishInput {
  emotional_mode:     EmotionalMode;
  era?:               string;
  poi_id:             string;
  /** Optional override for the strictness · 0-1 */
  strictness?:        number;
}

export function establishContinuity(input: EstablishInput): ContinuityAnchor {
  const seed = ERA_PALETTES[input.era ?? "contemporary"] ?? ERA_PALETTES.contemporary;
  const motion_signature = MOTION_SIGNATURES[input.emotional_mode];
  return {
    palette_hex:          seed.hex,
    dominant_color:       seed.dominant_color,
    lighting_descriptor:  seed.lighting,
    weather:              seed.weather,
    motion_signature,
    atmosphere:           defaultAtmosphereFor(input.emotional_mode),
    grain_profile:        seed.grain,
    established_at_shot:  1,
    updated_at_shot:      1,
    strictness:           input.strictness ?? defaultStrictness(input.emotional_mode),
  };
}

function defaultStrictness(m: EmotionalMode): number {
  switch (m) {
    case "restrained_reverence":
    case "geopolitical_grave":      return 0.95;
    case "sacred_emergence":
    case "monumental_awe":          return 0.85;
    case "archival_dream":          return 0.80;
    case "intimate_documentary":    return 0.75;
    case "pilgrimage_steady":       return 0.70;
    case "kinetic_observational":   return 0.55;
    case "celebratory_radiant":     return 0.55;
  }
}

function defaultAtmosphereFor(m: EmotionalMode): ReadonlyArray<EnvironmentalMotion> {
  switch (m) {
    case "restrained_reverence":  return ["light_shifting", "shadow_creeping", "candle_flame"];
    case "monumental_awe":        return ["dust", "wind_in_cloth", "light_shifting"];
    case "sacred_emergence":      return ["dust", "light_shifting", "wind_in_cloth"];
    case "kinetic_observational": return ["metro_or_traffic_far", "distant_crowd", "light_shifting"];
    case "intimate_documentary":  return ["light_shifting", "wind_in_cloth", "shadow_creeping"];
    case "archival_dream":        return ["dust", "smoke_or_haze", "light_shifting"];
    case "geopolitical_grave":    return ["wind_in_cloth", "shadow_creeping", "light_shifting"];
    case "pilgrimage_steady":     return ["wind_in_cloth", "dust", "footsteps"];
    case "celebratory_radiant":   return ["candle_flame", "distant_crowd", "light_shifting"];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// UPDATE · merge observed features after a shot is approved
// ═══════════════════════════════════════════════════════════════════════════

export interface ObservedShotFeatures {
  shot_index:          number;
  /** Top-N dominant hex colors observed in the rendered frame */
  observed_palette:    ReadonlyArray<string>;
  /** Mean luminance 0-100 · for lighting drift detection */
  mean_luminance:      number;
  /** Color stddev · proxy for grain consistency */
  color_variance:      number;
}

export function updateAnchorWithObservation(
  anchor:    ContinuityAnchor,
  observed:  ObservedShotFeatures,
): ContinuityAnchor {
  // Blend observed palette gently into the anchor (alpha=0.10 · stay close to established)
  const alpha = 0.10;
  const blended_palette = anchor.palette_hex.map((hex, i) => {
    const obs = observed.observed_palette[i];
    return obs ? blendHex(hex, obs, alpha) : hex;
  });

  return {
    ...anchor,
    palette_hex:     blended_palette,
    updated_at_shot: observed.shot_index,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// INJECT · enrich a ShotGrammar with continuity clauses before prompt expansion
// ═══════════════════════════════════════════════════════════════════════════

export function injectContinuityIntoGrammar(grammar: ShotGrammar, anchor: ContinuityAnchor): ShotGrammar {
  // Continuity anchors are passed to the prompt expander separately, so the
  // grammar object itself is returned unchanged. This function exists to
  // provide a single integration point and audit hook if we ever want to
  // mutate grammar fields based on anchor (e.g. force lighting descriptor).
  return grammar;
}

// ═══════════════════════════════════════════════════════════════════════════
// SCORE · compute continuity drift score between anchor and observed shot
// ═══════════════════════════════════════════════════════════════════════════

export interface DriftScore {
  /** 0-1 · higher = better continuity */
  score:             number;
  /** Plain-English reasons for drift */
  drift_reasons:     ReadonlyArray<string>;
}

export function scoreContinuity(
  anchor:    ContinuityAnchor,
  observed:  ObservedShotFeatures,
): DriftScore {
  const drift_reasons: string[] = [];

  // Palette drift · compare top-3 anchor vs observed
  const anchorTop3 = anchor.palette_hex.slice(0, 3);
  const observedTop3 = observed.observed_palette.slice(0, 3);
  const palette_distance = avgPaletteDistance(anchorTop3, observedTop3);
  if (palette_distance > 0.25) drift_reasons.push(`palette drift ${(palette_distance * 100).toFixed(0)}%`);

  // Luminance drift · anchor lighting implies a luminance band
  const target_lum = lightingToLuminanceBand(anchor.lighting_descriptor);
  const lum_drift = Math.abs(observed.mean_luminance - target_lum.midpoint) / 50;
  if (lum_drift > 0.40) drift_reasons.push(`luminance drift ${observed.mean_luminance.toFixed(1)} vs target ${target_lum.midpoint}`);

  // Combined score
  const palette_score = 1 - Math.min(1, palette_distance / 0.5);
  const luminance_score = 1 - Math.min(1, lum_drift);
  const combined = palette_score * 0.6 + luminance_score * 0.4;

  // Strictness gate · in strict modes drift penalizes harder
  const strict_penalty = (1 - combined) * anchor.strictness;
  const score = Math.max(0, 1 - strict_penalty);

  return { score, drift_reasons };
}

// ─── Color math helpers ──────────────────────────────────────────────────

function blendHex(a: string, b: string, alpha: number): string {
  const ar = parseInt(a.slice(1, 3), 16), ag = parseInt(a.slice(3, 5), 16), ab = parseInt(a.slice(5, 7), 16);
  const br = parseInt(b.slice(1, 3), 16), bg = parseInt(b.slice(3, 5), 16), bb = parseInt(b.slice(5, 7), 16);
  const r = Math.round(ar * (1 - alpha) + br * alpha);
  const g = Math.round(ag * (1 - alpha) + bg * alpha);
  const bc = Math.round(ab * (1 - alpha) + bb * alpha);
  return "#" + [r, g, bc].map(v => v.toString(16).padStart(2, "0")).join("");
}

function avgPaletteDistance(a: ReadonlyArray<string>, b: ReadonlyArray<string>): number {
  if (a.length === 0 || b.length === 0) return 1;
  const n = Math.min(a.length, b.length);
  let total = 0;
  for (let i = 0; i < n; i++) total += hexDistance(a[i], b[i]);
  return total / n;
}

function hexDistance(a: string, b: string): number {
  // Normalized euclidean distance in RGB · 0 = identical, 1 = max
  if (!a.startsWith("#") || !b.startsWith("#")) return 1;
  const ar = parseInt(a.slice(1, 3), 16), ag = parseInt(a.slice(3, 5), 16), ab = parseInt(a.slice(5, 7), 16);
  const br = parseInt(b.slice(1, 3), 16), bg = parseInt(b.slice(3, 5), 16), bb = parseInt(b.slice(5, 7), 16);
  const d = Math.sqrt((ar - br) ** 2 + (ag - bg) ** 2 + (ab - bb) ** 2);
  return Math.min(1, d / 442);  // 442 ≈ sqrt(3 * 255²)
}

function lightingToLuminanceBand(descriptor: string): { midpoint: number; range: number } {
  const s = descriptor.toLowerCase();
  if (s.includes("golden hour") || s.includes("warm dusk")) return { midpoint: 55, range: 15 };
  if (s.includes("blue hour"))                              return { midpoint: 35, range: 12 };
  if (s.includes("overcast"))                               return { midpoint: 45, range: 10 };
  if (s.includes("neon"))                                   return { midpoint: 40, range: 18 };
  if (s.includes("candle") || s.includes("low"))            return { midpoint: 22, range: 12 };
  if (s.includes("daylight") || s.includes("dawn"))         return { midpoint: 60, range: 14 };
  return { midpoint: 50, range: 18 };
}
