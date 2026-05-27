/**
 * KUDOS · Engine A · POI Importance Score (structural, slow-changing).
 *
 * Output range 0-100. Persisted in DB · refreshed quarterly.
 *
 * Inputs are explicit numeric facets · no LLM call (deterministic, auditable).
 * Weight sum = 100 so each facet input is a 0-1 normalized score.
 */
export interface PoiScoreInput {
  /** 0-1 · How important historically (UNESCO, civilizational pivot, etc.) */
  historical_importance:        number;
  /** 0-1 · UNESCO World Heritage / Intangible · 1 if listed, 0.5 if tentative */
  unesco_weight:                number;
  /** 0-1 · Normalized Google global search volume vs the top POI in catalog */
  global_search_volume:         number;
  /** 0-1 · Visitors/year normalized · 1 = 5M+ visitors/year */
  tourism_relevance:            number;
  /** 0-1 · Editor rating of visual storytelling potential */
  visual_storytelling_potential: number;
  /** 0-1 · Editor rating of emotional resonance · is there a story worth telling? */
  emotional_resonance:          number;
  /** 0-1 · How unique vs others in the catalog · 1 = nothing else like it */
  uniqueness:                   number;
  /** 0-1 · Iconicity · would a non-specialist recognize the silhouette? */
  iconicity:                    number;
  /** 0-1 · Geographic value · captures a region/era not yet represented */
  geographic_value:             number;
}

/**
 * Weights sum to 100. Tuned for "Legend tier" calibration:
 *   Coliseo / Machu / Acropolis / Sagrada Familia / Petra → 90+
 *   Alhambra / Hagia Sofía / Notre-Dame / Pompeii         → 80-90
 *   Regional gems (Pontevedra medieval, Areoso)            → 50-70
 *   Local chains, generic squares                          → <40
 */
export const WEIGHTS = {
  historical_importance:         15,
  unesco_weight:                  8,
  global_search_volume:          15,
  tourism_relevance:             10,
  visual_storytelling_potential: 14,
  emotional_resonance:           14,
  uniqueness:                    10,
  iconicity:                      9,
  geographic_value:               5,
} as const;

export function computePoiScore(input: PoiScoreInput): { poi_score: number; breakdown: Record<string, number> } {
  const breakdown: Record<string, number> = {};
  let total = 0;
  for (const k of Object.keys(WEIGHTS) as Array<keyof typeof WEIGHTS>) {
    const v = clamp01(input[k]);
    const contrib = v * WEIGHTS[k];
    breakdown[k] = Number(contrib.toFixed(2));
    total += contrib;
  }
  return { poi_score: Math.round(total), breakdown };
}

function clamp01(n: number): number {
  if (typeof n !== "number" || isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

/**
 * Curated reference scores for catalog calibration.
 * If a POI doesn't appear here, score it manually using the input facets above.
 */
export const CALIBRATION_REFERENCE: Record<string, number> = {
  "coliseo":            98,
  "machu":              96,
  "athens":             94,
  "sagrada-familia":    91,
  "petra":              90,
  "alhambra":           88,
  "hagia-sofia":        87,
  "notre":              86,
  "torre-eiffel":       85,
  "tokyo-showa":        72,
  "santiagomateo":      79,
  "mlk":                82,
  "sacsayhuaman":       80,
  "pontevedra-medieval": 58,
  "areoso":             64,
};
