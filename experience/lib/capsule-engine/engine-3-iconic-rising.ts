/**
 * KUDOS · Engine 3 · ICONIC RISING.
 *
 * Class-mobility scorer · temporal dimension on top of Engine 1.
 *
 * Engine 1 answers a permanent structural question:
 *   "What is this POI's catalog prestige?" (LEGEND / ICONIC / IMPORTANT / LONGTAIL)
 *
 * Engine 3 answers a different question:
 *   "Is this POI gaining steam over time?"
 *
 * It can PROMOTE a POI up the ladder when sustained signal crosses a threshold,
 * and DEMOTE it back when signal collapses · with hysteresis so the class
 * doesn't flap between two values every other day.
 *
 *   LONGTAIL (struct < 60)  -> RISING_TO_IMPORTANT  if score crosses 50
 *   IMPORTANT (struct 60-79)-> RISING_TO_ICONIC     if score crosses 65
 *   ICONIC (struct 80-91)   -> ICONIC_RISING        if score crosses 75
 *   ICONIC_RISING           -> LEGEND_CANDIDATE     if score crosses 88
 *
 * INVARIANTS:
 *   1. LEGEND_REFERENCE (Engine 0) NEVER moves.
 *      effective_legend_class = LEGEND, period.
 *
 *   2. Engine 1 baseline class is the floor.
 *      Engine 3 can promote UP but never demote BELOW Engine 1's verdict.
 *      A structurally ICONIC POI cannot fall to IMPORTANT just because
 *      momentum dies for two weeks.
 *
 *   3. Hysteresis: UP threshold > DOWN threshold + minimum days-at-class.
 *      Prevents oscillation. Stable POIs stay stable.
 *
 *   4. LEGEND_CANDIDATE is NOT auto-promoted to LEGEND.
 *      It surfaces the POI to the curator review queue for manual
 *      addition to LEGEND_REFERENCE. Engine 0 stays human-curated.
 *
 * RISING SCORE FORMULA (0-100):
 *   0.30 momentum_sustained        (avg of 7d and 30d, weighted toward 30d)
 *   0.15 momentum_consistency      (low variance = high score · anti-spike)
 *   0.25 editorial_strength_30d    (accumulated triggers over 30 days)
 *   0.20 structural_score          (must be in [40, 100] to even qualify)
 *   0.10 curator_nomination_boost  (0 or 1 · editor said "watch this")
 */
import type { LegendClass } from "./engine-1-legend-class";
import { isLegendReference } from "./engine-0-legend-reference";

// ─── Rising class taxonomy ────────────────────────────────────────────────
// These are the POSSIBLE class outcomes Engine 3 can produce. They wrap
// Engine 1's LegendClass with movement state.

export type RisingClass =
  | "STABLE"                  // Engine 1 baseline · no upward movement
  | "RISING_TO_IMPORTANT"     // climbing from LONGTAIL
  | "RISING_TO_ICONIC"        // climbing from IMPORTANT
  | "ICONIC_RISING"           // already ICONIC, gaining momentum · TRENDING_ICONIC eligible
  | "LEGEND_CANDIDATE"        // surfaced for curator review
  | "LEGEND_LOCKED";          // Engine 0 allowlist · cannot move

// ─── Inputs ───────────────────────────────────────────────────────────────

export interface IconicRisingInput {
  poi_id:                          string;
  /** Engine 1 baseline (permanent structural class) */
  baseline_legend_class:           LegendClass;
  /** Engine 1 structural score · 0-100 */
  baseline_structural_score:       number;

  // ── Sustained momentum (Engine B over time) ──────────────────────────
  /** Avg Engine B feed_score over last 7 days · 0-100 */
  momentum_7d_avg:                 number;
  /** Avg Engine B feed_score over last 30 days · 0-100 */
  momentum_30d_avg:                number;
  /**
   * 0-1 · consistency of momentum (1 = perfectly stable signal,
   * 0 = pure spike). Computed by the brain from daily samples.
   */
  momentum_consistency:            number;

  // ── Accumulated editorial signal (Engine C over time) ─────────────────
  /** How many distinct editorial triggers fired over 30d · raw count */
  editorial_trigger_count_30d:     number;
  /** Avg Engine C editorial_score over last 30 days · 0-100 */
  editorial_score_30d_avg:         number;

  // ── Manual curator signal ────────────────────────────────────────────
  /** Editor explicitly nominated this POI as one to watch */
  curator_nomination:              boolean;

  // ── Previous verdict (for hysteresis) ────────────────────────────────
  /** Engine 3 verdict from last run · used for hysteresis */
  previous_rising_class?:          RisingClass;
  /** Days this POI has been at its current rising_class · for stability gate */
  days_at_current_class?:          number;
}

// ─── Output ───────────────────────────────────────────────────────────────

export interface IconicRisingOutput {
  poi_id:                          string;
  rising_class:                    RisingClass;
  /** Composite mobility score · 0-100 */
  rising_score:                    number;
  /**
   * Effective LegendClass to feed downstream (composer, feed-rank).
   * = LEGEND if Engine 0 forced it (LEGEND_REFERENCE)
   * = ICONIC if Engine 3 promoted IMPORTANT -> ICONIC_RISING
   * = baseline_legend_class otherwise.
   */
  effective_legend_class:          LegendClass;
  /**
   * TRUE if rising_class == ICONIC_RISING and this POI should now
   * be eligible for the TRENDING_ICONIC composer slot.
   */
  is_trending_iconic_eligible:     boolean;
  /**
   * TRUE if rising_class == LEGEND_CANDIDATE.
   * Surface to curator review queue for potential Engine 0 promotion.
   */
  is_legend_candidate:             boolean;
  /** Days at the new rising_class (resets to 1 if class changed). */
  days_at_current_class:           number;
  reason:                          string;
  facet_breakdown: {
    momentum_sustained:    number;
    momentum_consistency:  number;
    editorial_strength:    number;
    structural:            number;
    curator:               number;
  };
}

// ─── Constants ────────────────────────────────────────────────────────────

const W = {
  momentum_sustained:    0.30,
  momentum_consistency:  0.15,
  editorial_strength:    0.25,
  structural:            0.20,
  curator:               0.10,
} as const;

// Promotion thresholds (UP) and demotion thresholds (DOWN).
// Gap between UP and DOWN is the hysteresis band.
const THRESHOLDS = {
  to_important_up:        50,
  to_important_down:      40,
  to_iconic_up:           65,
  to_iconic_down:         55,
  to_iconic_rising_up:    75,
  to_iconic_rising_down:  65,
  to_legend_candidate_up: 88,
  to_legend_candidate_down: 80,
} as const;

// Stability gate: minimum days at current class before allowing another move.
// Prevents day-to-day flapping when the underlying score wobbles.
const MIN_DAYS_AT_CLASS = 7;

// Structural floors per target class · Engine 3 cannot promote a POI to
// ICONIC if its structural foundation is too weak.
const STRUCT_FLOOR = {
  RISING_TO_IMPORTANT:  45,
  RISING_TO_ICONIC:     65,
  ICONIC_RISING:        80,
  LEGEND_CANDIDATE:     88,
} as const;

// ═════════════════════════════════════════════════════════════════════════
// MAIN ENTRY
// ═════════════════════════════════════════════════════════════════════════

export function classifyRising(input: IconicRisingInput): IconicRisingOutput {
  // ── Engine 0 short-circuit · LEGEND_REFERENCE is immovable ───────────
  if (isLegendReference(input.poi_id)) {
    return {
      poi_id: input.poi_id,
      rising_class: "LEGEND_LOCKED",
      rising_score: 100,
      effective_legend_class: "LEGEND",
      is_trending_iconic_eligible: false,
      is_legend_candidate: false,
      days_at_current_class: input.days_at_current_class ?? 0,
      reason: "LEGEND_REFERENCE · Engine 0 forces LEGEND · mobility frozen",
      facet_breakdown: {
        momentum_sustained: 0, momentum_consistency: 0,
        editorial_strength: 0, structural: 0, curator: 0,
      },
    };
  }

  // ── Compute rising_score ─────────────────────────────────────────────
  const momentum_sustained = clamp01(
    0.4 * (input.momentum_7d_avg / 100) + 0.6 * (input.momentum_30d_avg / 100)
  );
  const momentum_consistency = clamp01(input.momentum_consistency);
  // editorial strength · cap at 1 · trigger_count contributes diminishing returns
  const trig_count_norm = Math.min(1, input.editorial_trigger_count_30d / 8);
  const editorial_strength = clamp01(
    0.6 * (input.editorial_score_30d_avg / 100) + 0.4 * trig_count_norm
  );
  const structural = clamp01(input.baseline_structural_score / 100);
  const curator = input.curator_nomination ? 1 : 0;

  const facet_breakdown = {
    momentum_sustained:   Math.round(momentum_sustained * W.momentum_sustained * 100),
    momentum_consistency: Math.round(momentum_consistency * W.momentum_consistency * 100),
    editorial_strength:   Math.round(editorial_strength * W.editorial_strength * 100),
    structural:           Math.round(structural * W.structural * 100),
    curator:              Math.round(curator * W.curator * 100),
  };
  const rising_score = Math.min(100, Math.round(
    momentum_sustained   * W.momentum_sustained * 100
  + momentum_consistency * W.momentum_consistency * 100
  + editorial_strength   * W.editorial_strength * 100
  + structural           * W.structural * 100
  + curator              * W.curator * 100
  ));

  // ── Determine target class with hysteresis ───────────────────────────
  const prev = input.previous_rising_class ?? "STABLE";
  const daysAtPrev = input.days_at_current_class ?? 0;

  // Stability gate: can only change class if we have been at the current
  // class long enough. Exception: first-time classification (daysAtPrev=0)
  // is allowed to land at the right class immediately.
  const canMoveClass = daysAtPrev === 0 || daysAtPrev >= MIN_DAYS_AT_CLASS;

  // Target class candidate based on score + structural floor.
  // We compute what the class WOULD be on naked score, then apply hysteresis.
  const target = naiveTargetClass(rising_score, input.baseline_structural_score, input.baseline_legend_class);

  let rising_class: RisingClass;
  if (!canMoveClass) {
    // Stick with previous class until stability gate clears
    rising_class = prev;
  } else {
    // Apply hysteresis · only move if we cross the relevant gap
    rising_class = applyHysteresis(prev, target, rising_score);
  }

  const days_at_current_class = (rising_class === prev) ? daysAtPrev + 1 : 1;

  const effective_legend_class = computeEffectiveClass(input.baseline_legend_class, rising_class);

  const is_trending_iconic_eligible = rising_class === "ICONIC_RISING" || rising_class === "LEGEND_CANDIDATE";
  const is_legend_candidate         = rising_class === "LEGEND_CANDIDATE";

  const reason = buildReason(rising_class, rising_score, daysAtPrev, prev, target);

  return {
    poi_id: input.poi_id,
    rising_class,
    rising_score,
    effective_legend_class,
    is_trending_iconic_eligible,
    is_legend_candidate,
    days_at_current_class,
    reason,
    facet_breakdown,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function naiveTargetClass(
  score: number,
  struct: number,
  baseline: LegendClass,
): RisingClass {
  // LEGEND baseline · already at the top non-allowlist class. Only candidate path.
  if (baseline === "LEGEND") {
    if (score >= THRESHOLDS.to_legend_candidate_up && struct >= STRUCT_FLOOR.LEGEND_CANDIDATE) return "LEGEND_CANDIDATE";
    return "STABLE";
  }
  if (baseline === "ICONIC") {
    if (score >= THRESHOLDS.to_legend_candidate_up && struct >= STRUCT_FLOOR.LEGEND_CANDIDATE) return "LEGEND_CANDIDATE";
    if (score >= THRESHOLDS.to_iconic_rising_up    && struct >= STRUCT_FLOOR.ICONIC_RISING)    return "ICONIC_RISING";
    return "STABLE";
  }
  if (baseline === "IMPORTANT") {
    if (score >= THRESHOLDS.to_iconic_up           && struct >= STRUCT_FLOOR.RISING_TO_ICONIC) return "RISING_TO_ICONIC";
    return "STABLE";
  }
  // LONGTAIL baseline
  if (score >= THRESHOLDS.to_important_up && struct >= STRUCT_FLOOR.RISING_TO_IMPORTANT) return "RISING_TO_IMPORTANT";
  return "STABLE";
}

function applyHysteresis(prev: RisingClass, target: RisingClass, score: number): RisingClass {
  // If target is the same as prev, no movement.
  if (target === prev) return prev;

  // Promote-up vs demote-down: rank the classes.
  const rank: Record<RisingClass, number> = {
    STABLE: 0,
    RISING_TO_IMPORTANT: 1,
    RISING_TO_ICONIC:    2,
    ICONIC_RISING:       3,
    LEGEND_CANDIDATE:    4,
    LEGEND_LOCKED:       99,
  };

  if (rank[target] > rank[prev]) {
    // Moving UP · already verified by naiveTargetClass that UP threshold crossed
    return target;
  } else {
    // Moving DOWN · only demote if we are clearly below the DOWN threshold
    // of the previous class. This is the hysteresis band.
    const downThreshold = getDownThreshold(prev);
    if (score < downThreshold) {
      // Drop ONE class at a time, not all the way to STABLE in one step
      return demoteOneStep(prev);
    }
    return prev; // hold in the hysteresis band
  }
}

function getDownThreshold(c: RisingClass): number {
  switch (c) {
    case "RISING_TO_IMPORTANT": return THRESHOLDS.to_important_down;
    case "RISING_TO_ICONIC":    return THRESHOLDS.to_iconic_down;
    case "ICONIC_RISING":       return THRESHOLDS.to_iconic_rising_down;
    case "LEGEND_CANDIDATE":    return THRESHOLDS.to_legend_candidate_down;
    default:                    return 0;
  }
}

function demoteOneStep(c: RisingClass): RisingClass {
  switch (c) {
    case "LEGEND_CANDIDATE":    return "ICONIC_RISING";
    case "ICONIC_RISING":       return "STABLE";
    case "RISING_TO_ICONIC":    return "STABLE";
    case "RISING_TO_IMPORTANT": return "STABLE";
    default:                    return "STABLE";
  }
}

function computeEffectiveClass(baseline: LegendClass, rising: RisingClass): LegendClass {
  // Engine 1 is the FLOOR · Engine 3 only promotes UP.
  switch (rising) {
    case "LEGEND_LOCKED":       return "LEGEND";
    case "LEGEND_CANDIDATE":    return baseline === "ICONIC" || baseline === "LEGEND" ? baseline : "ICONIC";
    case "ICONIC_RISING":       return "ICONIC";
    case "RISING_TO_ICONIC":    return "ICONIC";
    case "RISING_TO_IMPORTANT": return baseline === "LONGTAIL" ? "IMPORTANT" : baseline;
    case "STABLE":              return baseline;
  }
}

function buildReason(
  rising_class: RisingClass,
  score: number,
  daysAtPrev: number,
  prev: RisingClass,
  target: RisingClass,
): string {
  if (rising_class === "LEGEND_LOCKED") {
    return "LEGEND_REFERENCE · immutable · effective=LEGEND";
  }
  if (rising_class !== prev) {
    return `class changed ${prev} -> ${rising_class} · rising_score=${score} · crossed UP threshold (daysAtPrev=${daysAtPrev})`;
  }
  if (target !== prev && daysAtPrev < MIN_DAYS_AT_CLASS) {
    return `held ${prev} for stability · target was ${target} but daysAtPrev=${daysAtPrev} < ${MIN_DAYS_AT_CLASS}`;
  }
  if (target !== prev) {
    return `held ${prev} in hysteresis band · rising_score=${score} did not cross DOWN threshold ${getDownThreshold(prev)}`;
  }
  return `held ${prev} · target unchanged · rising_score=${score}`;
}

function clamp01(n: number): number { return Math.max(0, Math.min(1, n)); }

// ─── For test introspection ──────────────────────────────────────────────
export const _THRESHOLDS_FOR_TEST = THRESHOLDS;
export const _MIN_DAYS_AT_CLASS_FOR_TEST = MIN_DAYS_AT_CLASS;
