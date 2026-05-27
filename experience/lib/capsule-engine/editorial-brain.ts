/**
 * KUDOS · Editorial Brain · Daily Decision Engine.
 *
 *   "Decide which POIs deserve production today, in what tier, and in
 *    what order — within the day's budget."
 *
 * Pipeline · Engine 0 -> 1 -> 3 -> 2 -> composer -> orchestrator.
 *   Engine 0  · LEGEND_REFERENCE allowlist
 *   Engine 1  · structural class (permanent)
 *   Engine 3  · ICONIC RISING (class-mobility · temporal)
 *   Engine 2  · feed rank (daily position)
 *   Composer  · layered home feed (A-A-B-A-C-A-E)
 *
 * This is the LAYER ABOVE the orchestrator. Never calls a video API.
 */
import { computePoiScore,    type PoiScoreInput }            from "./engine-a-poi-score";
import { computeFeedScore,   type FeedScoreInput }           from "./engine-b-feed-score";
import { computeEditorialScore, type EditorialOpportunityInput } from "./engine-c-editorial-score";
import { computePriority,    type EditorialTier, priorityToTier } from "./priority";
import { decideInventoryAction, type InventoryDecision, type InventoryEntry } from "./inventory";
import { classifyLegend,    type LegendClass, type LegendClassInput, type LegendClassOutput } from "./engine-1-legend-class";
import { computeFeedRank,   type FeedRankOutput } from "./engine-2-feed-rank";
import { classifyRising,    type IconicRisingInput, type IconicRisingOutput, type RisingClass } from "./engine-3-iconic-rising";
import { isLegendReference } from "./engine-0-legend-reference";
import { composeHomeFeed,   type FeedSlot, type FeedComposerCandidate } from "./feed-composer";
import type { CapsuleTier } from "./types";

// ─── Inputs ───────────────────────────────────────────────────────────────

export interface BrainCandidate {
  poi_id:              string;
  poi_name:            string;
  poi_signals:         PoiScoreInput;
  momentum_signals:    FeedScoreInput;
  editorial_signals:   EditorialOpportunityInput;
  cultural_significance: number;
  contextual_boost:    number;
  /** Engine 3 historical context · optional · brain defaults to safe values */
  rising_history?: {
    momentum_7d_avg:             number;
    momentum_30d_avg:            number;
    momentum_consistency:        number;
    editorial_trigger_count_30d: number;
    editorial_score_30d_avg:     number;
    curator_nomination:          boolean;
    previous_rising_class?:      RisingClass;
    days_at_current_class?:      number;
  };
}

export interface BrainInput {
  date:                string;
  season:              "spring" | "summer" | "autumn" | "winter";
  global_events:       ReadonlyArray<string>;
  regional_events:     ReadonlyArray<string>;
  budget_today_usd:    number;
  budget_month_usd:    number;
  spent_month_usd:     number;
  candidates:          ReadonlyArray<BrainCandidate>;
  inventory:           ReadonlyArray<InventoryEntry>;
}

// ─── Outputs ──────────────────────────────────────────────────────────────

export interface BrainDecision {
  poi_id:                  string;
  poi_name:                string;
  legend_class:            LegendClass;          // Engine 1 baseline
  /** Engine 3 verdict · class with mobility applied */
  rising_class:            RisingClass;
  /** Engine 3 final · the class composer uses (baseline floor, promotions on top) */
  effective_legend_class:  LegendClass;
  rising_score:            number;
  is_legend_candidate:     boolean;
  structural_score:        number;
  premium_asset_required:  boolean;
  feed_rank_score:         number;
  feed_position_today:     number;
  priority_score:          number;
  editorial_tier:          EditorialTier;
  capsule_tier:            CapsuleTier;
  decision:                InventoryDecision;
  reason:                  string;
  estimated_cost:          number;
  feed_eligible:           boolean;
  legend_reference:        boolean;
  has_editorial_trigger:   boolean;
  editorial_score:         number;
  contextual_boost:        number;
  editorial_trigger_strength: number;
}

export interface BrainOutput {
  date:                string;
  decisions:           ReadonlyArray<BrainDecision>;
  generation_queue:    ReadonlyArray<BrainDecision>;
  budget_impact: {
    budget_today_usd:    number;
    planned_spend_today: number;
    remaining_budget:    number;
    rejected_for_budget: number;
  };
  feed_candidates:     ReadonlyArray<{ poi_id: string; poi_name: string; feed_rank_score: number; legend_class: LegendClass; capsule_tier: CapsuleTier }>;
  home_feed:           ReadonlyArray<FeedSlot>;
  home_feed_unfilled:  ReadonlyArray<{ layer: FeedSlot["layer"]; slot: number; reason: string }>;
  home_feed_audit: {
    legend_core_eligible:     number;
    trending_iconic_eligible: number;
    local_magic_eligible:     number;
    editorial_event_eligible: number;
    local_magic_rejected_for_dignity: ReadonlyArray<{ poi_id: string; poi_name: string; reason: string }>;
  };
  /** Engine 3 promotions detected today · for curator review queue */
  rising_promotions:   ReadonlyArray<{ poi_id: string; poi_name: string; from: RisingClass; to: RisingClass; score: number; reason: string }>;
  /** Legend candidates surfaced for Engine 0 manual review */
  legend_review_queue: ReadonlyArray<{ poi_id: string; poi_name: string; rising_score: number; reason: string }>;
  legend_catalog: {
    LEGEND:    number;
    ICONIC:    number;
    IMPORTANT: number;
    LONGTAIL:  number;
  };
  audit: {
    total_candidates:  number;
    tier_A:            number;
    tier_B:            number;
    tier_C:            number;
    tier_D:            number;
    by_decision:       Record<InventoryDecision, number>;
    legend_protected:  number;
  };
}

const TIER_COST: Record<CapsuleTier, number> = {
  tier1_legend:        1.30,
  tier2_image_capsule: 0.20,
  tier3_story_card:    0.07,
  tier4_data_card:     0.00,
};

export function runEditorialBrain(input: BrainInput): BrainOutput {
  const scored = input.candidates.map(c => {
    const legend = classifyLegend({
      ...c.poi_signals,
      poi_id:                c.poi_id,
      poi_name:              c.poi_name,
      cultural_significance: c.cultural_significance,
    });
    const a  = computePoiScore(c.poi_signals);
    const b  = computeFeedScore(c.momentum_signals);
    const ec = computeEditorialScore(c.editorial_signals);

    // ── Engine 3 · class mobility ──────────────────────────────────────
    // If history isn't provided, use safe defaults that produce a STABLE verdict.
    const hist = c.rising_history ?? {
      momentum_7d_avg:             b.feed_score,
      momentum_30d_avg:            b.feed_score,
      momentum_consistency:        0.5,
      editorial_trigger_count_30d: 0,
      editorial_score_30d_avg:     ec.editorial_score,
      curator_nomination:          false,
    };
    const rising = classifyRising({
      poi_id:                      c.poi_id,
      baseline_legend_class:       legend.legend_class,
      baseline_structural_score:   legend.structural_score,
      momentum_7d_avg:             hist.momentum_7d_avg,
      momentum_30d_avg:            hist.momentum_30d_avg,
      momentum_consistency:        hist.momentum_consistency,
      editorial_trigger_count_30d: hist.editorial_trigger_count_30d,
      editorial_score_30d_avg:     hist.editorial_score_30d_avg,
      curator_nomination:          hist.curator_nomination,
      previous_rising_class:       hist.previous_rising_class,
      days_at_current_class:       hist.days_at_current_class,
    });

    const p  = computePriority({
      poi_id:          c.poi_id,
      poi_score:       a.poi_score,
      momentum_score:  b.feed_score,
      editorial_score: ec.editorial_score,
    });
    const fr = computeFeedRank({
      poi_id:           c.poi_id,
      feed_score:       b.feed_score,
      structural_score: legend.structural_score,
      editorial_score:  ec.editorial_score,
      contextual_boost: c.contextual_boost,
      // IMPORTANT: feed-rank consumes the EFFECTIVE class so a promoted
      // POI gets its rank gates raised the same day.
      legend_class:     rising.effective_legend_class,
    });
    return { candidate: c, legend, rising, a, b, ec, p, fr };
  });

  const ranked = scored
    .slice()
    .sort((a, b) => b.fr.feed_rank_score - a.fr.feed_rank_score);
  const positionByPoi: Record<string, number> = {};
  ranked.forEach((r, i) => { positionByPoi[r.candidate.poi_id] = i + 1; });

  let legend_protected = 0;
  const decisions: BrainDecision[] = scored.map(s => {
    // BRAND-PROTECT: LEGEND always gets tier1_legend (whether by Engine 1 or
    // by Engine 3 promotion that landed at effective_legend_class=LEGEND).
    const effective_class = s.rising.effective_legend_class;
    const effective_capsule_tier: CapsuleTier =
      effective_class === "LEGEND" ? "tier1_legend" : s.p.capsule_tier;
    const effective_editorial_tier: EditorialTier =
      effective_class === "LEGEND" ? "A" : s.p.editorial_tier;

    const inv = decideInventoryAction({
      poi_id:                 s.candidate.poi_id,
      requested_tier:         effective_editorial_tier,
      current_priority_score: s.p.priority_score,
      current_editorial_tier: effective_editorial_tier,
      legend_class:           effective_class,
      inventory:              input.inventory,
      today:                  input.date,
    });
    if (effective_class === "LEGEND" && inv.reason.includes("LEGEND POIs are NEVER archived")) {
      legend_protected++;
    }

    const triggers = s.ec.triggers.length ? ` · triggers: ${s.ec.triggers.join(",")}` : "";
    const reason = `[${effective_class} · base=${s.legend.legend_class} · rising=${s.rising.rising_class} · struct ${s.legend.structural_score} · feed_rank ${s.fr.feed_rank_score} · rise ${s.rising.rising_score} · pri ${s.p.priority_score}] ${inv.reason}${triggers}`;

    return {
      poi_id:                 s.candidate.poi_id,
      poi_name:               s.candidate.poi_name,
      legend_class:           s.legend.legend_class,
      rising_class:           s.rising.rising_class,
      effective_legend_class: effective_class,
      rising_score:           s.rising.rising_score,
      is_legend_candidate:    s.rising.is_legend_candidate,
      structural_score:       s.legend.structural_score,
      premium_asset_required: effective_class === "LEGEND",
      feed_rank_score:        s.fr.feed_rank_score,
      feed_position_today:    positionByPoi[s.candidate.poi_id],
      priority_score:         s.p.priority_score,
      editorial_tier:         effective_editorial_tier,
      capsule_tier:           effective_capsule_tier,
      decision:               inv.decision,
      reason,
      estimated_cost:         inv.decision === "reuse" || inv.decision === "archive" ? 0 : TIER_COST[effective_capsule_tier],
      feed_eligible:          s.fr.eligible_for_premium_feed,
      legend_reference:       isLegendReference(s.candidate.poi_id),
      has_editorial_trigger:  s.ec.triggers.length > 0,
      editorial_score:        s.ec.editorial_score,
      contextual_boost:       s.candidate.contextual_boost,
      editorial_trigger_strength: computeEditorialTriggerStrength(s.ec.breakdown),
    };
  });

  const legendRank: Record<LegendClass, number> = { LEGEND: 4, ICONIC: 3, IMPORTANT: 2, LONGTAIL: 1 };
  const candidatesToProduce = decisions
    .filter(d => d.decision === "generate" || d.decision === "refresh")
    .slice()
    .sort((a, b) => {
      const rb = legendRank[b.effective_legend_class] - legendRank[a.effective_legend_class];
      if (rb !== 0) return rb;
      return b.feed_rank_score - a.feed_rank_score;
    });

  const queue: BrainDecision[] = [];
  let spent = 0;
  let rejected_for_budget = 0;
  const remainingMonth = Math.max(0, input.budget_month_usd - input.spent_month_usd);
  const dailyCap = Math.min(input.budget_today_usd, remainingMonth);

  for (const d of candidatesToProduce) {
    if (spent + d.estimated_cost <= dailyCap) {
      queue.push(d);
      spent += d.estimated_cost;
    } else {
      if (d.capsule_tier === "tier1_legend" && spent + TIER_COST.tier2_image_capsule <= dailyCap) {
        const down = { ...d,
          capsule_tier: "tier2_image_capsule" as CapsuleTier,
          editorial_tier: "B" as EditorialTier,
          estimated_cost: TIER_COST.tier2_image_capsule,
          reason: d.reason + " · downgraded to B by daily budget",
          feed_eligible: false,
        };
        queue.push(down);
        spent += down.estimated_cost;
      } else {
        rejected_for_budget++;
      }
    }
  }

  const feed_candidates = decisions
    .filter(d => d.feed_eligible)
    .slice()
    .sort((a, b) => b.feed_rank_score - a.feed_rank_score)
    .map(d => ({
      poi_id:           d.poi_id,
      poi_name:         d.poi_name,
      feed_rank_score:  d.feed_rank_score,
      legend_class:     d.effective_legend_class,
      capsule_tier:     d.capsule_tier,
    }));

  // ── Layered home feed composition · uses EFFECTIVE class from Engine 3 ──
  const composerCandidates: FeedComposerCandidate[] = decisions.map(d => ({
    poi_id:                d.poi_id,
    poi_name:              d.poi_name,
    legend_class:          d.effective_legend_class,
    baseline_legend_class: d.legend_class,
    is_engine_3_promoted:  d.rising_class === "RISING_TO_ICONIC" || d.rising_class === "ICONIC_RISING" || d.rising_class === "LEGEND_CANDIDATE",
    legend_reference:      d.legend_reference,
    feed_rank_score:       d.feed_rank_score,
    structural_score:      d.structural_score,
    editorial_score:       d.editorial_score,
    contextual_boost:      d.contextual_boost,
    capsule_tier:          d.capsule_tier,
    has_editorial_trigger: d.has_editorial_trigger,
    editorial_trigger_strength: d.editorial_trigger_strength,
  }));
  const composed = composeHomeFeed({ candidates: composerCandidates });

  // ── Engine 3 audit · promotions and legend review queue ───────────────
  const rising_promotions = scored
    .filter(s => s.rising.rising_class !== "STABLE"
              && s.rising.rising_class !== "LEGEND_LOCKED"
              && (s.candidate.rising_history?.previous_rising_class ?? "STABLE") !== s.rising.rising_class)
    .map(s => ({
      poi_id:   s.candidate.poi_id,
      poi_name: s.candidate.poi_name,
      from:     s.candidate.rising_history?.previous_rising_class ?? "STABLE",
      to:       s.rising.rising_class,
      score:    s.rising.rising_score,
      reason:   s.rising.reason,
    }));

  const legend_review_queue = decisions
    .filter(d => d.is_legend_candidate)
    .map(d => ({
      poi_id:       d.poi_id,
      poi_name:     d.poi_name,
      rising_score: d.rising_score,
      reason:       d.reason,
    }));

  const legend_catalog = {
    LEGEND:    decisions.filter(d => d.effective_legend_class === "LEGEND").length,
    ICONIC:    decisions.filter(d => d.effective_legend_class === "ICONIC").length,
    IMPORTANT: decisions.filter(d => d.effective_legend_class === "IMPORTANT").length,
    LONGTAIL:  decisions.filter(d => d.effective_legend_class === "LONGTAIL").length,
  };

  const audit = {
    total_candidates: decisions.length,
    tier_A: decisions.filter(d => d.editorial_tier === "A").length,
    tier_B: decisions.filter(d => d.editorial_tier === "B").length,
    tier_C: decisions.filter(d => d.editorial_tier === "C").length,
    tier_D: decisions.filter(d => d.editorial_tier === "D").length,
    by_decision: {
      generate: decisions.filter(d => d.decision === "generate").length,
      refresh:  decisions.filter(d => d.decision === "refresh").length,
      reuse:    decisions.filter(d => d.decision === "reuse").length,
      archive:  decisions.filter(d => d.decision === "archive").length,
    } as Record<InventoryDecision, number>,
    legend_protected,
  };

  return {
    date:                input.date,
    decisions,
    generation_queue:    queue,
    budget_impact: {
      budget_today_usd:    input.budget_today_usd,
      planned_spend_today: round2(spent),
      remaining_budget:    round2(dailyCap - spent),
      rejected_for_budget,
    },
    feed_candidates,
    home_feed:           composed.slots,
    home_feed_unfilled:  composed.unfilled_layers,
    home_feed_audit:     composed.audit,
    rising_promotions,
    legend_review_queue,
    legend_catalog,
    audit,
  };
}

function round2(n: number): number { return Math.round(n * 100) / 100; }

function computeEditorialTriggerStrength(breakdown: Record<string, number>): number {
  const historical =
      (breakdown.anniversary  ?? 0)
    + (breakdown.geopolitical ?? 0)
    + (breakdown.cultural     ?? 0);
  const MAX = 22 + 9 + 10;
  return Math.round(Math.min(100, (historical / MAX) * 100));
}

export { priorityToTier };
