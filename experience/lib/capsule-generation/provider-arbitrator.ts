/**
 * KUDOS · Capsule Generation · Provider Arbitration Engine (Section 4).
 *
 *   "Provider selection is a director decision, not an SDK call."
 *
 *   Given a ShotGrammar + capsule context + remaining budget + provider health,
 *   the arbitrator ranks all eligible providers and emits a primary + fallback
 *   chain. Selection blends:
 *
 *     0.30  shot fit          (provider's excels_at vs requested shot type)
 *     0.20  emotional fit     (provider's preferred_emotional_modes match)
 *     0.15  realism score
 *     0.15  motion score for the shot's motion intensity needs
 *     0.10  cost fit          (cost vs remaining budget)
 *     0.10  health             (recent failure rate / circuit state)
 *
 *   The arbitrator also LEARNS · provider-health updates after each shot.
 *   Failures move the health score down for that provider; sustained success
 *   moves it up. The matrix scores are baseline; health is the live correction.
 */
import {
  PROVIDER_MATRIX, type ProviderId, type ProviderCapability,
  capabilityOf,
} from "./provider-matrix";
import type { ShotGrammar } from "../cinematic-language/provider-abstraction";
import type { CapsuleTier } from "../capsule-engine/types";

// ─── Health tracking ──────────────────────────────────────────────────────

export interface ProviderHealth {
  provider:              ProviderId;
  /** 0-1 · success rate over last N attempts */
  success_rate:          number;
  /** Recent latency p50 in seconds */
  p50_latency_s:         number;
  /** Circuit breaker state */
  circuit:               "closed" | "half_open" | "open";
  /** UTC ms · when circuit will probe again */
  circuit_until_ms:      number;
  /** Rolling count of last N attempts · used to weight new evidence */
  attempts_last_window:  number;
}

export function freshHealth(p: ProviderId): ProviderHealth {
  return {
    provider: p,
    success_rate: 1.0,
    p50_latency_s: capabilityOf(p).avg_latency_s,
    circuit: "closed",
    circuit_until_ms: 0,
    attempts_last_window: 0,
  };
}

export interface HealthUpdate {
  provider:     ProviderId;
  succeeded:    boolean;
  latency_s:    number;
  ts_ms?:       number;
}

export function updateHealth(prev: ProviderHealth, u: HealthUpdate): ProviderHealth {
  const alpha = 0.20;  // weight of new observation
  const new_rate = u.succeeded
    ? prev.success_rate * (1 - alpha) + 1.0 * alpha
    : prev.success_rate * (1 - alpha) + 0.0 * alpha;
  const new_lat  = prev.p50_latency_s * (1 - alpha) + u.latency_s * alpha;
  const attempts = prev.attempts_last_window + 1;

  // Circuit breaker: open after 3 consecutive observed failures (success_rate < 0.3)
  let circuit: ProviderHealth["circuit"] = prev.circuit;
  let circuit_until_ms = prev.circuit_until_ms;
  if (new_rate < 0.30 && prev.circuit !== "open") {
    circuit = "open";
    circuit_until_ms = (u.ts_ms ?? Date.now()) + 60_000;  // probe again in 60s
  } else if (circuit === "open" && (u.ts_ms ?? Date.now()) > circuit_until_ms) {
    circuit = "half_open";
  } else if (circuit === "half_open" && u.succeeded) {
    circuit = "closed";
    circuit_until_ms = 0;
  } else if (circuit === "half_open" && !u.succeeded) {
    circuit = "open";
    circuit_until_ms = (u.ts_ms ?? Date.now()) + 120_000;
  }

  return { provider: prev.provider, success_rate: new_rate, p50_latency_s: new_lat, circuit, circuit_until_ms, attempts_last_window: attempts };
}

// ─── Arbitration ──────────────────────────────────────────────────────────

export interface ArbitrationInput {
  shot_grammar:                   ShotGrammar;
  capsule_tier:                   CapsuleTier;
  /** USD still available in the capsule budget */
  remaining_budget_usd:           number;
  /** 0-1 · current global queue load · raises the cost weight */
  queue_load:                     number;
  provider_health:                Readonly<Record<ProviderId, ProviderHealth>>;
  urgency:                        "low" | "normal" | "high";
  /** Providers that already attempted and failed for this shot · excluded */
  excluded_providers:             ReadonlyArray<ProviderId>;
  /** True = network blocked · only local providers eligible */
  network_unavailable?:           boolean;
}

export interface ArbitrationOutput {
  primary:                ProviderId;
  fallback_chain:         ReadonlyArray<ProviderId>;
  reasoning:              string;
  confidence:             number;
  /** Per-provider scores for explainability */
  scored:                 ReadonlyArray<{
    provider: ProviderId;
    score: number;
    blocked_reason?: string;
    components: {
      shot_fit:        number;
      emotional_fit:   number;
      realism:         number;
      motion_fit:      number;
      cost_fit:        number;
      health:          number;
    };
  }>;
}

const WEIGHTS = {
  shot_fit:      0.30,
  emotional_fit: 0.20,
  realism:       0.15,
  motion_fit:    0.15,
  cost_fit:      0.10,
  health:        0.10,
} as const;

type ScoredEntry = {
  provider: ProviderId;
  score: number;
  blocked_reason?: string;
  components: { shot_fit: number; emotional_fit: number; realism: number; motion_fit: number; cost_fit: number; health: number; };
};

export function arbitrateProvider(input: ArbitrationInput): ArbitrationOutput {
  const scored: ScoredEntry[] = [];

  for (const cap of Object.values(PROVIDER_MATRIX) as ProviderCapability[]) {
    const p = cap.provider;

    // Hard exclusions
    if (input.excluded_providers.includes(p)) {
      scored.push({ provider: p, score: 0, blocked_reason: "excluded · prior attempt failed", components: zeroComponents() });
      continue;
    }
    if (input.network_unavailable && cap.requires_network) {
      scored.push({ provider: p, score: 0, blocked_reason: "network unavailable", components: zeroComponents() });
      continue;
    }
    const health = input.provider_health[p] ?? freshHealth(p);
    if (health.circuit === "open") {
      scored.push({ provider: p, score: 0, blocked_reason: `circuit OPEN until ${new Date(health.circuit_until_ms).toISOString()}`, components: zeroComponents() });
      continue;
    }
    if (cap.avoid_emotional_modes.includes(input.shot_grammar.emotional_mode)) {
      scored.push({ provider: p, score: 0, blocked_reason: `mode ${input.shot_grammar.emotional_mode} on avoid list`, components: zeroComponents() });
      continue;
    }

    // ── Component scores (all 0-1) ──────────────────────────────────
    const shot_fit      = cap.excels_at.includes(input.shot_grammar.shot_type) ? 1.0 : 0.30;
    const emotional_fit = cap.preferred_emotional_modes.includes(input.shot_grammar.emotional_mode) ? 1.0 : 0.50;
    const realism       = cap.realism_score / 10;
    const motion_fit    = motionFitScore(cap, input.shot_grammar.motion_intensity);
    const estimated_cost = cap.cost_per_second_usd * input.shot_grammar.duration_s;
    const cost_fit      = costFitScore(estimated_cost, input.remaining_budget_usd, input.queue_load);
    const health_score  = health.success_rate;

    const total =
        WEIGHTS.shot_fit      * shot_fit
      + WEIGHTS.emotional_fit * emotional_fit
      + WEIGHTS.realism       * realism
      + WEIGHTS.motion_fit    * motion_fit
      + WEIGHTS.cost_fit      * cost_fit
      + WEIGHTS.health        * health_score;

    scored.push({
      provider: p,
      score: total,
      components: { shot_fit, emotional_fit, realism, motion_fit, cost_fit, health: health_score },
    });
  }

  scored.sort((a, b) => b.score - a.score);

  // Apply urgency: if "high" prefer faster providers (penalize latency)
  if (input.urgency === "high") {
    scored.sort((a, b) => {
      if (b.score - a.score !== 0) return b.score - a.score;
      return capabilityOf(a.provider).avg_latency_s - capabilityOf(b.provider).avg_latency_s;
    });
  }

  const eligible = scored.filter(s => s.score > 0);
  if (eligible.length === 0) {
    // Hard fallback · stub_local is always available
    return {
      primary: "stub_local",
      fallback_chain: [],
      reasoning: "no eligible network providers · stub_local hard fallback",
      confidence: 0.30,
      scored,
    };
  }

  const primary = eligible[0].provider;
  const fallback_chain = eligible.slice(1).map(e => e.provider);

  const top = eligible[0];
  const reasoning =
    `primary=${primary} (score ${top.score.toFixed(3)}) ` +
    `· shot_fit=${top.components.shot_fit.toFixed(2)} ` +
    `· emo_fit=${top.components.emotional_fit.toFixed(2)} ` +
    `· realism=${top.components.realism.toFixed(2)} ` +
    `· motion_fit=${top.components.motion_fit.toFixed(2)} ` +
    `· cost_fit=${top.components.cost_fit.toFixed(2)} ` +
    `· health=${top.components.health.toFixed(2)}`;

  return { primary, fallback_chain, reasoning, confidence: top.score, scored };
}

function motionFitScore(cap: ProviderCapability, intensity: number): number {
  // Higher motion intensity = providers with high motion_score fit better.
  // Lower intensity = realism + temporal_consistency dominate.
  if (intensity >= 0.5) {
    return cap.motion_score / 10;
  } else {
    return (cap.temporal_consistency * 0.6 + cap.realism_score * 0.4) / 10;
  }
}

function costFitScore(estimated: number, remaining: number, queue_load: number): number {
  if (remaining <= 0) return 0;
  const ratio = estimated / remaining;
  // Ideal: 0-15% of remaining budget per shot.
  // Worst: > 50% of remaining budget.
  const base = ratio < 0.15 ? 1.0
             : ratio < 0.30 ? 0.85
             : ratio < 0.50 ? 0.60
             : ratio < 0.80 ? 0.30
             :                0.05;
  // Queue load discounts further (under heavy load, prefer cheaper providers)
  return base * (1 - 0.4 * queue_load);
}

function zeroComponents() {
  return { shot_fit: 0, emotional_fit: 0, realism: 0, motion_fit: 0, cost_fit: 0, health: 0 };
}

// ─── Bulk health state helpers ───────────────────────────────────────────

export function initialHealthState(): Record<ProviderId, ProviderHealth> {
  const out = {} as Record<ProviderId, ProviderHealth>;
  for (const p of Object.keys(PROVIDER_MATRIX) as ProviderId[]) {
    out[p] = freshHealth(p);
  }
  return out;
}
