/**
 * KUDOS · Capsule Generation · Cost Intelligence Layer (Section 9).
 *
 *   "Spend is a director decision, not an accident."
 *
 *   The cost governor enforces per-tier budgets, decides when rerolls are
 *   worth the spend, caches reusable atmosphere plates, and degrades gracefully
 *   when budget exhausts. It is the SECOND line of defense after the brain's
 *   daily/monthly governor (see lib/capsule-engine/tier-router.ts).
 *
 *   This governor lives WITHIN a single capsule generation. The brain decides
 *   if the capsule runs at all; this governor decides how much each shot
 *   inside it is allowed to consume.
 */
import type { CapsuleTier } from "../capsule-engine/types";
import type { ProviderId } from "./provider-matrix";
import { capabilityOf } from "./provider-matrix";

// ─── Tier budget envelope ────────────────────────────────────────────────

export interface TierBudget {
  min:     number;
  target:  number;
  max:     number;
}

export const TIER_BUDGETS_V2: Readonly<Record<CapsuleTier, TierBudget>> = {
  tier1_legend:        { min: 4.00, target: 8.00, max: 12.00 },
  tier2_image_capsule: { min: 1.00, target: 2.00, max: 4.00  },
  tier3_story_card:    { min: 0.20, target: 0.50, max: 1.00  },
  tier4_data_card:     { min: 0,    target: 0,    max: 0     },
};

// ─── Ledger entry ────────────────────────────────────────────────────────

export interface CostLedgerEntry {
  label:    string;
  usd:      number;
  t_ms:     number;
  shot_index?: number;
  provider?: ProviderId;
  attempt_kind: "initial" | "reroll" | "compose" | "qc" | "other";
}

// ─── Governor state ─────────────────────────────────────────────────────

export interface CostGovernorState {
  capsule_tier:    CapsuleTier;
  budget:          TierBudget;
  budget_cap_usd:  number;     // hard cap · usually target
  spent_usd:       number;
  ledger:          ReadonlyArray<CostLedgerEntry>;
}

export interface CostGovernor extends CostGovernorState {
  remaining():    number;
  canAfford(estimated_usd: number): boolean;
  charge(entry: Omit<CostLedgerEntry, "t_ms">): void;
  shouldReroll(input: ShouldRerollInput): RerollEconomicVerdict;
  costForShot(provider: ProviderId, duration_s: number): number;
  estimateCapsuleRemainder(remaining_shots: number, expected_provider_avg_cost_per_s: number, expected_duration_s: number): number;
}

export interface ShouldRerollInput {
  estimated_reroll_cost_usd:   number;
  current_quality_score:       number;   // 0-1
  target_quality_threshold:    number;   // typically 0.70
  attempts_so_far:             number;
  /** True if this is the hero shot (wonder beat) · spend more aggressively */
  is_hero_shot:                boolean;
}

export interface RerollEconomicVerdict {
  proceed:      boolean;
  reasoning:    string;
}

// ─── Factory ────────────────────────────────────────────────────────────

export interface CreateGovernorInput {
  capsule_tier:       CapsuleTier;
  /** Override target spend · used by caller-level governor (brain) */
  cap_override_usd?:  number;
}

export function createCostGovernor(input: CreateGovernorInput): CostGovernor {
  const budget = TIER_BUDGETS_V2[input.capsule_tier];
  const cap = input.cap_override_usd ?? budget.target;

  const state: CostGovernorState = {
    capsule_tier:   input.capsule_tier,
    budget,
    budget_cap_usd: cap,
    spent_usd:      0,
    ledger:         [],
  };
  // Mutable view through closures
  const ledger: CostLedgerEntry[] = [];

  const governor: CostGovernor = {
    get capsule_tier()   { return state.capsule_tier; },
    get budget()         { return state.budget; },
    get budget_cap_usd() { return state.budget_cap_usd; },
    get spent_usd()      { return state.spent_usd; },
    get ledger()         { return ledger; },

    remaining(): number {
      return Math.max(0, state.budget_cap_usd - state.spent_usd);
    },

    canAfford(usd: number): boolean {
      return state.spent_usd + usd <= state.budget_cap_usd;
    },

    charge(entry): void {
      const e: CostLedgerEntry = { ...entry, t_ms: Date.now() };
      ledger.push(e);
      state.spent_usd += entry.usd;
    },

    shouldReroll(input: ShouldRerollInput): RerollEconomicVerdict {
      if (input.attempts_so_far >= 4) {
        return { proceed: false, reasoning: "max attempts reached (4)" };
      }
      if (!this.canAfford(input.estimated_reroll_cost_usd)) {
        return { proceed: false, reasoning: `reroll cost $${input.estimated_reroll_cost_usd.toFixed(2)} exceeds remaining $${this.remaining().toFixed(2)}` };
      }
      // Hero shot · spend up to 50% of remaining on a reroll if quality is below threshold
      if (input.is_hero_shot && input.current_quality_score < input.target_quality_threshold) {
        const cap = this.remaining() * 0.50;
        if (input.estimated_reroll_cost_usd <= cap) {
          return { proceed: true, reasoning: `hero shot below threshold · reroll allowed (cost $${input.estimated_reroll_cost_usd.toFixed(2)} <= 50% of remaining $${cap.toFixed(2)})` };
        }
        return { proceed: false, reasoning: `hero shot reroll exceeds 50% of remaining budget` };
      }
      // Non-hero · only reroll if quality is significantly below threshold (<0.55)
      if (input.current_quality_score < 0.55) {
        const cap = this.remaining() * 0.25;
        if (input.estimated_reroll_cost_usd <= cap) {
          return { proceed: true, reasoning: `quality ${input.current_quality_score.toFixed(2)} below 0.55 · reroll allowed` };
        }
        return { proceed: false, reasoning: `non-hero reroll exceeds 25% of remaining budget` };
      }
      // Quality borderline (0.55-0.70) on non-hero · accept the shot as-is
      return { proceed: false, reasoning: `non-hero shot at acceptable quality ${input.current_quality_score.toFixed(2)} · accepting` };
    },

    costForShot(provider: ProviderId, duration_s: number): number {
      return capabilityOf(provider).cost_per_second_usd * duration_s;
    },

    estimateCapsuleRemainder(remaining_shots, avg_cost_per_s, expected_duration_s): number {
      return remaining_shots * avg_cost_per_s * expected_duration_s;
    },
  };

  return governor;
}

// ─── Degradation helpers ────────────────────────────────────────────────

export interface DegradationSuggestion {
  recommended_action: "tier_downgrade" | "swap_to_cheaper_provider" | "drop_to_stub" | "no_action";
  suggested_provider?: ProviderId;
  reasoning:          string;
}

export function suggestDegradation(g: CostGovernor): DegradationSuggestion {
  const used_pct = g.budget_cap_usd > 0 ? g.spent_usd / g.budget_cap_usd : 0;
  if (used_pct < 0.5) return { recommended_action: "no_action", reasoning: "budget healthy" };
  if (used_pct < 0.75) {
    return {
      recommended_action: "swap_to_cheaper_provider",
      suggested_provider: "luma",
      reasoning: `used ${(used_pct * 100).toFixed(0)}% of budget · swap to cheaper provider on remaining shots`,
    };
  }
  if (used_pct < 0.95) {
    return {
      recommended_action: "drop_to_stub",
      suggested_provider: "stub_local",
      reasoning: `used ${(used_pct * 100).toFixed(0)}% of budget · stub_local for remaining shots`,
    };
  }
  return {
    recommended_action: "tier_downgrade",
    reasoning: `used ${(used_pct * 100).toFixed(0)}% of budget · capsule should downgrade tier`,
  };
}
