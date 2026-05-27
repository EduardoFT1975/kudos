/**
 * KUDOS · Capsule Generation · QC Reroll Engine (Section 6).
 *
 *   "Most generations must fail. KUDOS treats failure as routing information."
 *
 *   This module maps QC reject reasons to concrete reroll strategies. It does
 *   NOT score · scoring lives in lib/capsule-engine/qc-engine.ts (the 4-layer
 *   stack from P23). This module decides what to DO when QC says "reroll".
 *
 *   Strategy ladder (in order of preference for cost):
 *
 *     1. same_provider_new_seed      (cheap · same model, different seed)
 *     2. stronger_realism_prompt     (add documentary anchors, escalate floor)
 *     3. lower_motion_intensity      (when "fake motion" / "AI melting" flagged)
 *     4. shorter_shot                (cut the duration · fewer frames to fail)
 *     5. different_provider          (route to next best in fallback chain)
 *     6. abandon                     (no fix possible · escalate to capsule reroll)
 */
import type { ShotGrammar } from "../cinematic-language/provider-abstraction";
import type { ProviderId } from "./provider-matrix";

// ─── Strategies ──────────────────────────────────────────────────────────

export type RerollStrategy =
  | "same_provider_new_seed"
  | "stronger_realism_prompt"
  | "lower_motion_intensity"
  | "shorter_shot"
  | "different_provider"
  | "abandon";

export interface PromptModifications {
  inject_realism_strength?: "default" | "strong" | "extreme";
  motion_intensity_override?: number;     // 0-1
  add_negative_clauses?:    ReadonlyArray<string>;
  shorten_to_s?:            number;
  /** When strategy=different_provider, set to exclude prior provider */
  exclude_provider?:        ProviderId;
}

export interface RerollDecision {
  strategy:        RerollStrategy;
  modifications:   PromptModifications;
  reasoning:       string;
  cost_multiplier: number;   // 1.0 = same as prior attempt
}

// ─── Decision ────────────────────────────────────────────────────────────

export interface DecideRerollInput {
  reject_reasons:                   ReadonlyArray<string>;
  attempts_so_far:                  number;
  current_provider:                 ProviderId;
  alternative_providers_available:  boolean;
  remaining_budget_usd:             number;
  estimated_reroll_cost_usd:        number;
  /** Strictness of the emotional mode · informs how aggressively to reroll */
  mode_strictness:                  number;   // 0-1
}

export function decideRerollStrategy(input: DecideRerollInput): RerollDecision {
  const reasons = input.reject_reasons.map(r => r.toLowerCase());

  // ── Hard abandon conditions ──────────────────────────────────────────
  if (input.attempts_so_far >= 4) {
    return { strategy: "abandon", modifications: {}, reasoning: "max attempts reached", cost_multiplier: 0 };
  }
  if (input.estimated_reroll_cost_usd > input.remaining_budget_usd * 0.6) {
    return { strategy: "abandon", modifications: {}, reasoning: "reroll would exceed 60% of remaining budget", cost_multiplier: 0 };
  }

  // ── Strategy selection by reason ──────────────────────────────────────

  // AI artifact / melting / hallucination → stronger realism + different provider
  if (anyMatch(reasons, ["ai_artifact", "melt", "hallucinat", "ai_hallucination_architecture", "ai_fantasy"])) {
    if (input.alternative_providers_available) {
      return {
        strategy: "different_provider",
        modifications: { exclude_provider: input.current_provider, inject_realism_strength: "extreme" },
        reasoning: "AI artifacts detected · swapping provider + extreme realism floor",
        cost_multiplier: 1.0,
      };
    }
    return {
      strategy: "stronger_realism_prompt",
      modifications: { inject_realism_strength: "extreme", add_negative_clauses: ["melted edges", "morphing geometry", "repeating ornament", "impossible perspective"] },
      reasoning: "AI artifacts detected · extreme realism prompt (no alt provider)",
      cost_multiplier: 1.0,
    };
  }

  // Dead world / empty → cannot fix with reroll · structural issue · abandon
  if (anyMatch(reasons, ["empty_dead_world", "dead world", "empty-world", "no human"])) {
    return {
      strategy: "abandon",
      modifications: {},
      reasoning: "dead-world failure is structural · shot grammar must change · escalate to capsule reroll",
      cost_multiplier: 0,
    };
  }

  // Fake motion / temporal instability → lower motion intensity + same provider
  if (anyMatch(reasons, ["fake_motion", "motion < ", "temporal_instab", "shaky", "motion 0"])) {
    return {
      strategy: "lower_motion_intensity",
      modifications: { motion_intensity_override: 0.15, inject_realism_strength: "strong" },
      reasoning: "fake / unstable motion · cap intensity at 0.15 and reattempt",
      cost_multiplier: 1.0,
    };
  }

  // Scene rate too high → shorter shot
  if (anyMatch(reasons, ["scene_change_rate", "too choppy", "marvel_trailer", "tiktok"])) {
    return {
      strategy: "shorter_shot",
      modifications: { shorten_to_s: Math.max(2, 0), add_negative_clauses: ["tiktok overedit", "marvel trailer pacing"] },
      reasoning: "scene rate / overcut · shorten to halt the pace problem",
      cost_multiplier: 0.6,
    };
  }

  // Tourism / commercial / instagram filter → stronger realism + different provider
  if (anyMatch(reasons, ["luxury_travel_ad", "instagram_filter", "stock_footage", "tourism", "drone_tourism"])) {
    if (input.alternative_providers_available) {
      return {
        strategy: "different_provider",
        modifications: { exclude_provider: input.current_provider, inject_realism_strength: "strong", add_negative_clauses: ["tourism vibe", "luxury ad gloss", "stock footage feel"] },
        reasoning: "commercial / tourism aesthetic · route to a different provider with stronger realism",
        cost_multiplier: 1.0,
      };
    }
    return {
      strategy: "stronger_realism_prompt",
      modifications: { inject_realism_strength: "strong", add_negative_clauses: ["tourism vibe", "luxury ad gloss", "stock footage feel"] },
      reasoning: "commercial aesthetic · escalate realism (no alt provider)",
      cost_multiplier: 1.0,
    };
  }

  // Lighting / luminance drift → stronger continuity injection (handled via prompt-expander)
  if (anyMatch(reasons, ["luminance drift", "palette drift", "lighting"])) {
    return {
      strategy: "same_provider_new_seed",
      modifications: { inject_realism_strength: "strong" },
      reasoning: "continuity drift · same provider, new seed, stronger anchor injection",
      cost_multiplier: 1.0,
    };
  }

  // Default · first attempt failure with no specific signal → new seed
  if (input.attempts_so_far <= 1) {
    return {
      strategy: "same_provider_new_seed",
      modifications: {},
      reasoning: "generic failure · same provider, new seed",
      cost_multiplier: 1.0,
    };
  }

  // Second+ attempt · escalate
  if (input.alternative_providers_available) {
    return {
      strategy: "different_provider",
      modifications: { exclude_provider: input.current_provider, inject_realism_strength: "strong" },
      reasoning: "second attempt · escalating to different provider",
      cost_multiplier: 1.0,
    };
  }

  return {
    strategy: "stronger_realism_prompt",
    modifications: { inject_realism_strength: "strong" },
    reasoning: "no alternative provider · escalate realism prompt",
    cost_multiplier: 1.0,
  };
}

// ─── Apply ──────────────────────────────────────────────────────────────
// Strategy modifications are consumed by prompt-expander.ts via the
// `reroll_modifications` field. apply() is provided for callers that want a
// pre-modified ShotGrammar; in most pipelines we pass modifications through.

export function applyRerollStrategyToGrammar(g: ShotGrammar, m: PromptModifications): ShotGrammar {
  return {
    ...g,
    duration_s:        m.shorten_to_s        ?? g.duration_s,
    motion_intensity:  m.motion_intensity_override ?? g.motion_intensity,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function anyMatch(haystack: ReadonlyArray<string>, needles: ReadonlyArray<string>): boolean {
  return haystack.some(h => needles.some(n => h.includes(n)));
}
