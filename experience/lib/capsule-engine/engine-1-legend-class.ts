/**
 * KUDOS · Engine 1 · Legend Core Classification.
 *
 * Structural. Permanent. Brand-protective.
 *
 * This engine decides whether a POI is part of the KUDOS legend catalog,
 * and whether it requires a premium asset regardless of daily momentum.
 *
 *   LEGEND     · structural_score >= 92 · always premium · never archived
 *   ICONIC     ·                  80-91 · premium possible (editorial decision)
 *   IMPORTANT  ·                  60-79 · story/image only
 *   LONGTAIL   ·                  < 60  · text/metadata only
 *
 * Examples of LEGEND: Coliseo, Machu Picchu, Petra, Taj Mahal, Pirámides,
 * Acrópolis, Notre Dame, Sagrada Familia, Angkor Wat, Statue of Liberty.
 *
 * RULE OF THE BRAND:
 *   A LEGEND never loses premium status. Even if its momentum is zero
 *   on a Tuesday in February, the premium capsule must exist and be
 *   served to anyone who asks. This is the KUDOS catalog promise.
 */
import type { PoiScoreInput } from "./engine-a-poi-score";
import { isLegendReference, getLegendReferenceEntry } from "./engine-0-legend-reference";

export type LegendClass = "LEGEND" | "ICONIC" | "IMPORTANT" | "LONGTAIL";

export interface LegendClassOutput {
  poi_id:                  string;
  structural_score:        number;             // 0-100 (same scale as Engine A)
  legend_class:            LegendClass;
  premium_asset_required:  boolean;            // true → tier1 always
  never_downgrade:         boolean;            // true → archive forbidden
  reason:                  string;
  facet_breakdown:         Record<string, number>;
}

// ─── Calibrated weights (sum = 100) ───────────────────────────────────────
// Tilted toward iconicity + historical importance vs Engine A · this engine
// is about *catalog prestige*, not visitor counts.
const WEIGHTS = {
  historical_importance:         18,
  unesco_weight:                 14,
  iconicity:                     14,
  uniqueness:                    11,
  visual_storytelling_potential: 10,
  emotional_resonance:           10,
  global_search_volume:           8,
  tourism_relevance:              6,
  geographic_value:               5,
  cultural_significance:          4,
} as const;
const WEIGHT_SUM = Object.values(WEIGHTS).reduce((a, b) => a + b, 0); // 100

export interface LegendClassInput extends PoiScoreInput {
  poi_id:                   string;
  poi_name:                 string;
  /** 0-1 · UNESCO / civilizational pivot · used in addition to PoiScoreInput */
  cultural_significance:    number;
}

export function classifyLegend(input: LegendClassInput): LegendClassOutput {
  // ── Engine 0 short-circuit · LEGEND_REFERENCE protects civilizational POIs ──
  if (isLegendReference(input.poi_id)) {
    const ref = getLegendReferenceEntry(input.poi_id)!;
    return {
      poi_id: input.poi_id,
      structural_score: 100,
      legend_class: "LEGEND",
      premium_asset_required: true,
      never_downgrade: true,
      reason: `LEGEND_REFERENCE [${ref.curator} · ${ref.added}] ${ref.rationale} · forced LEGEND regardless of scoring`,
      facet_breakdown: { engine_0_override: 100 },
    };
  }

  const facets: Array<[keyof typeof WEIGHTS, number]> = [
    ["historical_importance",        input.historical_importance],
    ["unesco_weight",                 input.unesco_weight],
    ["iconicity",                     input.iconicity],
    ["uniqueness",                    input.uniqueness],
    ["visual_storytelling_potential", input.visual_storytelling_potential],
    ["emotional_resonance",           input.emotional_resonance],
    ["global_search_volume",          input.global_search_volume],
    ["tourism_relevance",             input.tourism_relevance],
    ["geographic_value",              input.geographic_value],
    ["cultural_significance",         input.cultural_significance],
  ];

  const facet_breakdown: Record<string, number> = {};
  let raw = 0;
  for (const [key, val01] of facets) {
    const v = clamp01(val01);
    const contribution = v * WEIGHTS[key];
    facet_breakdown[key] = Math.round(contribution * 10) / 10;
    raw += contribution;
  }
  const structural_score = Math.round(raw); // already on 0-100 scale because weights sum to 100

  const legend_class: LegendClass =
    structural_score >= 92 ? "LEGEND"
    : structural_score >= 80 ? "ICONIC"
    : structural_score >= 60 ? "IMPORTANT"
    : "LONGTAIL";

  const premium_asset_required = legend_class === "LEGEND";
  const never_downgrade        = legend_class === "LEGEND";

  const reason =
    legend_class === "LEGEND"
      ? `Structural ${structural_score} ≥ 92 → LEGEND catalog · premium capsule MUST exist · archive forbidden`
      : legend_class === "ICONIC"
      ? `Structural ${structural_score} in [80,92) → ICONIC · premium production allowed if editorial decision warrants it`
      : legend_class === "IMPORTANT"
      ? `Structural ${structural_score} in [60,80) → IMPORTANT · story + image only · no premium video`
      : `Structural ${structural_score} < 60 → LONGTAIL · metadata only · can be archived if momentum dies`;

  return {
    poi_id: input.poi_id,
    structural_score,
    legend_class,
    premium_asset_required,
    never_downgrade,
    reason,
    facet_breakdown,
  };
}

// ─── Compile-time assertion that weights sum to 100 ──────────────────────
if (WEIGHT_SUM !== 100) {
  // eslint-disable-next-line no-console
  console.warn(`[engine-1-legend-class] weights sum to ${WEIGHT_SUM} (expected 100)`);
}

function clamp01(n: number): number { return Math.max(0, Math.min(1, n)); }

export const _WEIGHT_SUM_FOR_TEST = WEIGHT_SUM;

// ─── Reference catalog (calibration anchors) ─────────────────────────────
// Editor-curated baseline · used to validate weight calibration against
// human intuition. If Engine 1 ever scores Coliseo < 92, weights are wrong.
export const LEGEND_REFERENCE: ReadonlyArray<{ poi_id: string; expected: LegendClass }> = [
  { poi_id: "coliseo",          expected: "LEGEND"    },
  { poi_id: "machu",            expected: "LEGEND"    },
  { poi_id: "athens",           expected: "LEGEND"    },
  { poi_id: "petra",            expected: "LEGEND"    },
  { poi_id: "taj-mahal",        expected: "LEGEND"    },
  { poi_id: "pyramids-giza",    expected: "LEGEND"    },
  { poi_id: "notre",            expected: "LEGEND"    },
  { poi_id: "sagrada-familia",  expected: "LEGEND"    },
  { poi_id: "torre-eiffel",     expected: "LEGEND"    },
  { poi_id: "angkor-wat",       expected: "LEGEND"    },

  { poi_id: "alhambra",         expected: "ICONIC"    },
  { poi_id: "hagia-sofia",      expected: "ICONIC"    },
  { poi_id: "mlk",              expected: "ICONIC"    },
  { poi_id: "sacsayhuaman",     expected: "ICONIC"    },

  { poi_id: "santiagomateo",    expected: "IMPORTANT" },
  { poi_id: "pontevedra-medieval", expected: "IMPORTANT" },
  { poi_id: "tokyo-showa",      expected: "IMPORTANT" },

  { poi_id: "areoso",           expected: "LONGTAIL"  },
];
