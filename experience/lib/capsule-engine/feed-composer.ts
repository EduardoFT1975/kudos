/**
 * KUDOS · Feed Composer V4 · Layered Editorial Home Feed.
 *
 *   Layer A · LEGEND_CORE       · 3-4 slots · LEGEND_REFERENCE protected prestige
 *   Layer B · TRENDING_ICONIC   · 1 slot    · ICONIC or ICONIC_RISING (Engine 3)
 *   Layer C · LOCAL_MAGIC       · 1 slot    · "hidden gem nearby worthy of KUDOS"
 *   Layer E · EDITORIAL_EVENT   · 1 slot    · historical/cultural trigger fired today
 *
 *   Layer schedule: A-A-B-A-C-A-E
 *
 * V4 (P22 · Engine 3 wiring):
 *   · TRENDING_ICONIC accepts both Engine 1 ICONIC and Engine 3 ICONIC_RISING.
 *     A non-legend POI sustaining momentum can now fill slot #3 instead of
 *     forcing a LEGEND fallback every day.
 *
 * V3 (P21): LOCAL_MAGIC does not gate on capsule_tier. Editorial dignity
 *           and production cost are independent axes.
 *
 * V2 (P20): LOCAL_MAGIC structural floor 40; EDITORIAL_EVENT includes
 *           LEGEND_REFERENCE if historical trigger fires; LONGTAIL excluded.
 */
import type { CapsuleTier } from "./types";
import type { LegendClass } from "./engine-1-legend-class";

export interface FeedComposerCandidate {
  poi_id:               string;
  poi_name:             string;
  /** Engine 3 effective class · composer uses this for slot filling */
  legend_class:         LegendClass;
  /** Engine 1 baseline · before Engine 3 mobility · audit only */
  baseline_legend_class: LegendClass;
  /** TRUE if Engine 3 promoted this POI above STABLE (RISING_TO_ICONIC, ICONIC_RISING, or LEGEND_CANDIDATE) */
  is_engine_3_promoted: boolean;
  legend_reference:     boolean;
  feed_rank_score:      number;
  structural_score:     number;
  editorial_score:      number;
  contextual_boost:     number;
  capsule_tier:         CapsuleTier;
  has_editorial_trigger: boolean;
  editorial_trigger_strength: number;
}

export type FeedLayer =
  | "LEGEND_CORE"
  | "TRENDING_ICONIC"
  | "LOCAL_MAGIC"
  | "EDITORIAL_EVENT";

export interface FeedSlot {
  slot:            number;
  layer:           FeedLayer;
  poi_id:          string;
  poi_name:        string;
  legend_class:    LegendClass;
  feed_rank_score: number;
  capsule_tier:    CapsuleTier;
  layer_score:     number;
  reason:          string;
}

const DEFAULT_LAYER_ORDER: ReadonlyArray<FeedLayer> = [
  "LEGEND_CORE",
  "LEGEND_CORE",
  "TRENDING_ICONIC",
  "LEGEND_CORE",
  "LOCAL_MAGIC",
  "LEGEND_CORE",
  "EDITORIAL_EVENT",
];

const TRENDING_ICONIC_MIN_RANK     = 70;
const LOCAL_MAGIC_MIN_CONTEXTUAL   = 60;
const LOCAL_MAGIC_MIN_STRUCTURAL   = 40;
const EDITORIAL_EVENT_MIN_TRIGGER  = 30;

export interface ComposeInput {
  candidates: ReadonlyArray<FeedComposerCandidate>;
  layer_order?: ReadonlyArray<FeedLayer>;
}

export interface ComposeOutput {
  slots:           ReadonlyArray<FeedSlot>;
  unfilled_layers: ReadonlyArray<{ layer: FeedLayer; slot: number; reason: string }>;
  audit: {
    legend_core_eligible:     number;
    trending_iconic_eligible: number;
    local_magic_eligible:     number;
    editorial_event_eligible: number;
    local_magic_rejected_for_dignity: ReadonlyArray<{ poi_id: string; poi_name: string; reason: string }>;
  };
}

export function composeHomeFeed(input: ComposeInput): ComposeOutput {
  const layer_order = input.layer_order ?? DEFAULT_LAYER_ORDER;

  const legendPool = input.candidates
    .filter(c => c.legend_reference || c.legend_class === "LEGEND")
    .slice()
    .sort((a, b) => b.feed_rank_score - a.feed_rank_score);

  // ── TRENDING_ICONIC pool · V4.1 ────────────────────────────────────
  // Two paths into this pool:
  //   1. Engine 3 promotion path · trust the rising engine (sustained 30-day
  //      signal already vetted) · NO additional daily-rank gate, since rising
  //      is by definition a slower signal than the daily feed_rank.
  //   2. Engine 1 baseline ICONIC path · structurally ICONIC POIs need to
  //      ALSO pass a daily heat gate (feed_rank >= TRENDING_ICONIC_MIN_RANK)
  //      because they have no temporal vetting from Engine 3.
  // Never includes LEGEND_REFERENCE (those have their own slot).
  const iconicPool = input.candidates
    .filter(c => {
      if (c.legend_reference) return false;
      if (c.is_engine_3_promoted) return true;
      if (c.legend_class === "ICONIC" && c.feed_rank_score >= TRENDING_ICONIC_MIN_RANK) return true;
      return false;
    })
    .slice()
    .sort((a, b) => b.feed_rank_score - a.feed_rank_score);

  const localMagicRejected: { poi_id: string; poi_name: string; reason: string }[] = [];
  const localPool = input.candidates
    .filter(c => {
      if (c.legend_reference) return false;
      const reasons: string[] = [];
      if (c.structural_score < LOCAL_MAGIC_MIN_STRUCTURAL) {
        reasons.push(`structural ${c.structural_score} < ${LOCAL_MAGIC_MIN_STRUCTURAL}`);
      }
      if (c.contextual_boost < LOCAL_MAGIC_MIN_CONTEXTUAL) {
        reasons.push(`contextual ${c.contextual_boost} < ${LOCAL_MAGIC_MIN_CONTEXTUAL}`);
      }
      if (reasons.length === 0) return true;
      if (c.contextual_boost >= LOCAL_MAGIC_MIN_CONTEXTUAL) {
        localMagicRejected.push({ poi_id: c.poi_id, poi_name: c.poi_name, reason: reasons.join(" · ") });
      }
      return false;
    })
    .slice()
    .sort((a, b) => localMagicScore(b) - localMagicScore(a));

  const editorialEventPool = input.candidates
    .filter(c =>
      c.has_editorial_trigger
      && c.editorial_trigger_strength >= EDITORIAL_EVENT_MIN_TRIGGER
      && c.legend_class !== "LONGTAIL"
    )
    .slice()
    .sort((a, b) => editorialEventScore(b) - editorialEventScore(a));

  const used = new Set<string>();
  const slots: FeedSlot[] = [];
  const unfilled: { layer: FeedLayer; slot: number; reason: string }[] = [];

  for (let i = 0; i < layer_order.length; i++) {
    const layer = layer_order[i];
    const slot  = i + 1;
    const pick  = take(layer, used,
      { legendPool, iconicPool, localPool, editorialEventPool });

    if (!pick.candidate) {
      const fallback = legendPool.find(c => !used.has(c.poi_id));
      if (fallback) {
        used.add(fallback.poi_id);
        slots.push({
          slot, layer, poi_id: fallback.poi_id, poi_name: fallback.poi_name,
          legend_class: fallback.legend_class, feed_rank_score: fallback.feed_rank_score,
          capsule_tier: fallback.capsule_tier,
          layer_score: fallback.feed_rank_score,
          reason: `[FALLBACK ${pick.reason}] filled with LEGEND ${fallback.poi_name}`,
        });
      } else {
        unfilled.push({ layer, slot, reason: pick.reason });
      }
      continue;
    }
    used.add(pick.candidate.poi_id);
    slots.push({
      slot, layer,
      poi_id: pick.candidate.poi_id, poi_name: pick.candidate.poi_name,
      legend_class: pick.candidate.legend_class,
      feed_rank_score: pick.candidate.feed_rank_score,
      capsule_tier: pick.candidate.capsule_tier,
      layer_score: pick.layer_score,
      reason: pick.reason,
    });
  }

  return {
    slots,
    unfilled_layers: unfilled,
    audit: {
      legend_core_eligible:     legendPool.length,
      trending_iconic_eligible: iconicPool.length,
      local_magic_eligible:     localPool.length,
      editorial_event_eligible: editorialEventPool.length,
      local_magic_rejected_for_dignity: localMagicRejected,
    },
  };
}

function localMagicScore(c: FeedComposerCandidate): number {
  return 0.50 * c.contextual_boost
       + 0.30 * c.feed_rank_score
       + 0.20 * c.structural_score;
}

function editorialEventScore(c: FeedComposerCandidate): number {
  return 0.50 * c.editorial_trigger_strength
       + 0.25 * c.editorial_score
       + 0.25 * c.feed_rank_score;
}

interface Pools {
  legendPool:         ReadonlyArray<FeedComposerCandidate>;
  iconicPool:         ReadonlyArray<FeedComposerCandidate>;
  localPool:          ReadonlyArray<FeedComposerCandidate>;
  editorialEventPool: ReadonlyArray<FeedComposerCandidate>;
}

function take(
  layer: FeedLayer,
  used:  Set<string>,
  pools: Pools,
): { candidate: FeedComposerCandidate | null; reason: string; layer_score: number } {
  let pool: ReadonlyArray<FeedComposerCandidate>;
  let reasonPrefix: string;
  let scoreFn: (c: FeedComposerCandidate) => number;
  switch (layer) {
    case "LEGEND_CORE":
      pool = pools.legendPool;
      reasonPrefix = "LEGEND · brand-protected slot";
      scoreFn = (c) => c.feed_rank_score;
      break;
    case "TRENDING_ICONIC":
      pool = pools.iconicPool;
      reasonPrefix = `ICONIC or ICONIC_RISING · feed_rank >= ${TRENDING_ICONIC_MIN_RANK}`;
      scoreFn = (c) => c.feed_rank_score;
      break;
    case "LOCAL_MAGIC":
      pool = pools.localPool;
      reasonPrefix = `hidden gem · structural >= ${LOCAL_MAGIC_MIN_STRUCTURAL} · contextual >= ${LOCAL_MAGIC_MIN_CONTEXTUAL}`;
      scoreFn = localMagicScore;
      break;
    case "EDITORIAL_EVENT":
      pool = pools.editorialEventPool;
      reasonPrefix = `editorial event · historical/cultural trigger strength >= ${EDITORIAL_EVENT_MIN_TRIGGER}`;
      scoreFn = editorialEventScore;
      break;
  }
  const pick = pool.find(c => !used.has(c.poi_id));
  if (!pick) return { candidate: null, reason: `no eligible candidate for ${layer}`, layer_score: 0 };
  const score = scoreFn(pick);
  return {
    candidate: pick,
    reason: `${reasonPrefix} · score=${Math.round(score)} (feed_rank=${pick.feed_rank_score}, struct=${pick.structural_score}, contextual=${pick.contextual_boost}, trigger=${Math.round(pick.editorial_trigger_strength)}${pick.is_engine_3_promoted ? ", iconic_rising" : ""})`,
    layer_score: score,
  };
}
