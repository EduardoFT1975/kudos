/**
 * KUDOS · Capsule Engine · Tier Router + Cost Governor.
 *
 * Decides which production tier each POI deserves before a single API call
 * is made. This is the spending firewall.
 */
import type { CapsuleRequest, CapsuleTier, TierDecision } from "./types";

// ─── Tier cost / latency tables (Q2 2025 production estimates) ────────────

const TIER_PROFILE: Record<CapsuleTier, {
  estimated_cost_usd:  number;
  estimated_latency_s: number;
  appears_in_feed:     TierDecision["appears_in_feed"];
}> = {
  tier1_legend:        { estimated_cost_usd: 1.30, estimated_latency_s: 143, appears_in_feed: "home_premium"    },
  tier2_image_capsule: { estimated_cost_usd: 0.20, estimated_latency_s: 28,  appears_in_feed: "poi_contextual" },
  tier3_story_card:    { estimated_cost_usd: 0.07, estimated_latency_s: 12,  appears_in_feed: "card_only"      },
  tier4_data_card:     { estimated_cost_usd: 0.00, estimated_latency_s: 0,   appears_in_feed: "metadata_only"  },
};

// ─── Cost governor caps (per-environment) ────────────────────────────────

export interface GovernorPolicy {
  max_cost_per_capsule_usd:  number;   // hard cap per single capsule
  daily_budget_usd:          number;   // soft cap aggregated per day
  monthly_budget_usd:        number;
  allow_tier1_for_score_lt:  number;   // override: never run tier 1 below this score even if requested
}

export const DEFAULT_GOVERNOR: GovernorPolicy = {
  max_cost_per_capsule_usd:  1.60,
  daily_budget_usd:          50,
  monthly_budget_usd:        500,
  allow_tier1_for_score_lt:  90,
};

// ─── Core decision ───────────────────────────────────────────────────────

export function decideTier(req: CapsuleRequest): CapsuleTier {
  const s = clamp(req.poi_score, 0, 100);
  if (s >= 90) return "tier1_legend";
  if (s >= 70) return "tier2_image_capsule";
  if (s >= 40) return "tier3_story_card";
  return "tier4_data_card";
}

export function reasonFor(tier: CapsuleTier, score: number): string {
  switch (tier) {
    case "tier1_legend":
      return `Score ${score} ≥ 90 · POI legendario · full AI video pipeline justified`;
    case "tier2_image_capsule":
      return `Score ${score} in [70,90) · POI relevante · stills + ffmpeg motion (no video gen)`;
    case "tier3_story_card":
      return `Score ${score} in [40,70) · POI secundario · 1 hero image + narrative card`;
    case "tier4_data_card":
      return `Score ${score} < 40 · POI marginal · metadata-only · no media generation`;
  }
}

export interface GovernorVerdict {
  allowed:      boolean;
  reason:       string;
  effective_tier: CapsuleTier;   // may be downgraded from requested
}

/**
 * Apply governor rules. May DOWNGRADE the tier (never upgrade) if:
 *   - cost would exceed per-capsule cap
 *   - global daily/monthly budget exceeded (caller passes current spend)
 *   - score is below tier1 threshold but tier1 was demanded
 *
 * Never silent · always returns a verdict with reason.
 */
export function governorVerdict(
  requested_tier: CapsuleTier,
  req:            CapsuleRequest,
  policy:         GovernorPolicy = DEFAULT_GOVERNOR,
  current_spend:  { daily_usd: number; monthly_usd: number } = { daily_usd: 0, monthly_usd: 0 },
): GovernorVerdict {
  const profile = TIER_PROFILE[requested_tier];

  // Rule 1 · per-capsule hard cap
  if (profile.estimated_cost_usd > policy.max_cost_per_capsule_usd) {
    return {
      allowed: true,
      reason: `Downgraded · tier cost $${profile.estimated_cost_usd} > per-capsule cap $${policy.max_cost_per_capsule_usd}`,
      effective_tier: downgrade(requested_tier),
    };
  }

  // Rule 2 · score override (no tier1 for low-score)
  if (requested_tier === "tier1_legend" && req.poi_score < policy.allow_tier1_for_score_lt) {
    return {
      allowed: true,
      reason: `Downgraded · score ${req.poi_score} < policy.allow_tier1_for_score_lt (${policy.allow_tier1_for_score_lt})`,
      effective_tier: "tier2_image_capsule",
    };
  }

  // Rule 3 · daily budget
  if (current_spend.daily_usd + profile.estimated_cost_usd > policy.daily_budget_usd) {
    return {
      allowed: requested_tier !== "tier1_legend",   // hard stop only for the most expensive tier
      reason: `${requested_tier === "tier1_legend" ? "Rejected" : "Allowed under daily"} · daily ${current_spend.daily_usd.toFixed(2)} + ${profile.estimated_cost_usd.toFixed(2)} > $${policy.daily_budget_usd}`,
      effective_tier: requested_tier === "tier1_legend" ? "tier2_image_capsule" : requested_tier,
    };
  }

  // Rule 4 · monthly budget
  if (current_spend.monthly_usd + profile.estimated_cost_usd > policy.monthly_budget_usd) {
    return {
      allowed: false,
      reason: `Rejected · monthly $${current_spend.monthly_usd.toFixed(2)} + $${profile.estimated_cost_usd.toFixed(2)} > $${policy.monthly_budget_usd}`,
      effective_tier: "tier4_data_card",
    };
  }

  return {
    allowed: true,
    reason: "Within all policy caps",
    effective_tier: requested_tier,
  };
}

// ─── Full decision (one-shot) ─────────────────────────────────────────────

export function decide(
  req:           CapsuleRequest,
  policy:        GovernorPolicy = DEFAULT_GOVERNOR,
  current_spend: { daily_usd: number; monthly_usd: number } = { daily_usd: 0, monthly_usd: 0 },
): TierDecision & { allowed: boolean; governor_reason: string } {
  const requested = decideTier(req);
  const verdict = governorVerdict(requested, req, policy, current_spend);
  const final = verdict.effective_tier;
  const profile = TIER_PROFILE[final];
  const why = reasonFor(final, req.poi_score) + (final !== requested ? ` · ${verdict.reason}` : "");
  return {
    tier:                final,
    score:               req.poi_score,
    reason:              why,
    estimated_cost_usd:  profile.estimated_cost_usd,
    estimated_latency_s: profile.estimated_latency_s,
    appears_in_feed:     profile.appears_in_feed,
    allowed:             verdict.allowed,
    governor_reason:     verdict.reason,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}
function downgrade(t: CapsuleTier): CapsuleTier {
  switch (t) {
    case "tier1_legend":        return "tier2_image_capsule";
    case "tier2_image_capsule": return "tier3_story_card";
    case "tier3_story_card":    return "tier4_data_card";
    case "tier4_data_card":     return "tier4_data_card";
  }
}
