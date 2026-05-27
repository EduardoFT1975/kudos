/**
 * KUDOS · Capsule Generation · Execution Audit (Section 10).
 *
 *   "Every capsule must be explainable."
 *
 *   The CapsuleExecutionAudit is the complete forensic record of how a
 *   capsule was produced: which provider rendered each shot, why each reroll
 *   happened, how much each stage cost, what continuity anchors were used,
 *   and what the final confidence score was.
 *
 *   The audit is written to disk alongside the capsule (metadata.json) and
 *   indexed for later analysis · ML training, cost analytics, brand QC.
 */
import type { ContinuityAnchor } from "./continuity-engine";
import type { ProviderId } from "./provider-matrix";
import type { RerollStrategy } from "./qc-reroll-engine";
import type { CostLedgerEntry } from "./capsule-cost-governor";
import type { CapsuleTier } from "../capsule-engine/types";
import type { EmotionalMode } from "../cinematic-language/camera-language";
import type { PacingGrammar } from "../cinematic-language/pacing-engine";

// ─── Per-shot audit ──────────────────────────────────────────────────────

export interface ShotAttempt {
  attempt_index:        number;
  provider:             ProviderId;
  duration_s:           number;
  motion_intensity:     number;
  realism_strength:     "default" | "strong" | "extreme";
  seed?:                number;

  outcome:              "rendered_pass_qc" | "rendered_fail_qc" | "provider_error" | "skipped_budget";
  qc_score?:            number;
  reject_reasons:       ReadonlyArray<string>;

  cost_usd:             number;
  latency_ms:           number;

  reroll_strategy_used?:  RerollStrategy;
  reroll_reasoning?:      string;
  output_path?:           string;
}

export interface ShotExecutionAudit {
  shot_index:           number;
  beat:                 string;
  shot_type:            string;
  attempts:             ReadonlyArray<ShotAttempt>;
  final_provider:       ProviderId | null;
  final_output_path:    string | null;
  approved:             boolean;
  final_quality_score:  number;
  total_cost_usd:       number;
  total_latency_ms:     number;
}

// ─── Capsule-level audit ────────────────────────────────────────────────

export interface CapsuleExecutionAudit {
  // Identity
  capsule_id:           string;
  poi_id:               string;
  poi_name:             string;
  tier:                 CapsuleTier;

  // Cinematic decisions
  emotional_mode:       EmotionalMode;
  pacing:               PacingGrammar;

  // Shot-level
  shots:                ReadonlyArray<ShotExecutionAudit>;
  shot_count:           number;

  // Provider stats
  providers_used:       Record<ProviderId, number>;
  total_attempts:       number;
  total_rerolls:        number;

  // Continuity
  continuity_anchor_initial:  ContinuityAnchor;
  continuity_anchor_final:    ContinuityAnchor;

  // Cost
  cost_total_usd:       number;
  cost_budget_usd:      number;
  cost_ledger:          ReadonlyArray<CostLedgerEntry>;

  // Timing
  render_total_ms:      number;
  render_by_stage:      Record<string, number>;

  // Capsule-level verdict
  final_confidence:     number;
  capsule_qc_verdict:   "publish" | "manual_review" | "abandon";
  capsule_qc_reasoning: string;

  // Brand signals · for later analytics
  forbidden_aesthetics_detected: ReadonlyArray<string>;
  human_scale_pass:              boolean;
  temporal_collapse_used:        ReadonlyArray<string>;

  generated_at:         string;       // ISO timestamp
}

// ─── Builder ────────────────────────────────────────────────────────────

export interface AuditBuilder {
  audit:               CapsuleExecutionAudit;
  recordAttempt(shot_index: number, attempt: ShotAttempt): void;
  approveShot(shot_index: number, final: { provider: ProviderId; output_path: string; quality_score: number }): void;
  finalize(verdict: { verdict: CapsuleExecutionAudit["capsule_qc_verdict"]; confidence: number; reasoning: string }): CapsuleExecutionAudit;
  toJSON(): string;
}

export interface CreateAuditInput {
  capsule_id:               string;
  poi_id:                   string;
  poi_name:                 string;
  tier:                     CapsuleTier;
  emotional_mode:           EmotionalMode;
  pacing:                   PacingGrammar;
  shots: ReadonlyArray<{
    shot_index: number;
    beat:       string;
    shot_type:  string;
  }>;
  continuity_initial:       ContinuityAnchor;
  budget_usd:               number;
}

export function createAuditBuilder(input: CreateAuditInput): AuditBuilder {
  const shots: ShotExecutionAudit[] = input.shots.map(s => ({
    shot_index:          s.shot_index,
    beat:                s.beat,
    shot_type:           s.shot_type,
    attempts:            [],
    final_provider:      null,
    final_output_path:   null,
    approved:            false,
    final_quality_score: 0,
    total_cost_usd:      0,
    total_latency_ms:    0,
  }));

  const audit: CapsuleExecutionAudit = {
    capsule_id:                input.capsule_id,
    poi_id:                    input.poi_id,
    poi_name:                  input.poi_name,
    tier:                      input.tier,
    emotional_mode:            input.emotional_mode,
    pacing:                    input.pacing,
    shots,
    shot_count:                shots.length,
    providers_used:            {} as Record<ProviderId, number>,
    total_attempts:            0,
    total_rerolls:             0,
    continuity_anchor_initial: input.continuity_initial,
    continuity_anchor_final:   input.continuity_initial,
    cost_total_usd:            0,
    cost_budget_usd:           input.budget_usd,
    cost_ledger:               [],
    render_total_ms:           0,
    render_by_stage:           {},
    final_confidence:          0,
    capsule_qc_verdict:        "manual_review",
    capsule_qc_reasoning:      "",
    forbidden_aesthetics_detected: [],
    human_scale_pass:          false,
    temporal_collapse_used:    [],
    generated_at:              new Date().toISOString(),
  };

  return {
    audit,
    recordAttempt(shot_index, attempt) {
      const s = audit.shots.find(x => x.shot_index === shot_index);
      if (!s) throw new Error(`audit · shot ${shot_index} not registered`);
      (s.attempts as ShotAttempt[]).push(attempt);
      s.total_cost_usd   += attempt.cost_usd;
      s.total_latency_ms += attempt.latency_ms;
      audit.total_attempts++;
      if (attempt.attempt_index > 0) audit.total_rerolls++;
      audit.providers_used[attempt.provider] = (audit.providers_used[attempt.provider] ?? 0) + 1;
      audit.cost_total_usd += attempt.cost_usd;
    },
    approveShot(shot_index, final) {
      const s = audit.shots.find(x => x.shot_index === shot_index);
      if (!s) throw new Error(`audit · shot ${shot_index} not registered`);
      s.approved            = true;
      s.final_provider      = final.provider;
      s.final_output_path   = final.output_path;
      s.final_quality_score = final.quality_score;
    },
    finalize(verdict): CapsuleExecutionAudit {
      audit.capsule_qc_verdict   = verdict.verdict;
      audit.final_confidence     = verdict.confidence;
      audit.capsule_qc_reasoning = verdict.reasoning;
      return audit;
    },
    toJSON(): string {
      return JSON.stringify(this.audit, null, 2);
    },
  };
}
