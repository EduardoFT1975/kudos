/**
 * KUDOS · Capsule Generation · Shot Execution Engine (Section 2).
 *
 *   "The shot executor is where the cinematic constitution meets the GPUs."
 *
 *   executeShotGrammar() is the central pipeline for producing one approved
 *   shot. It orchestrates:
 *
 *     1. arbitrate provider (provider-arbitrator.ts)
 *     2. expand prompt for that provider (prompt-expander.ts)
 *     3. call the provider adapter (capsule-engine/providers/* or stub local)
 *     4. validate the output exists on disk
 *     5. record cost + latency in the cost governor + audit
 *     6. (optional) QC scoring · if reject, consult reroll engine
 *     7. apply reroll strategy and loop
 *     8. return approved shot or abandon
 *
 *   The executor honors:
 *     · max reroll attempts (default 3)
 *     · cost governor verdicts (no rerolls without affordability)
 *     · provider exclusion list (don't reattempt failed providers blindly)
 *     · seed locking when supported (deterministic reruns)
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { spawn } from "node:child_process";

import {
  arbitrateProvider, updateHealth,
  type ProviderHealth, type ArbitrationInput,
} from "./provider-arbitrator";
import {
  expandPromptForProvider,
} from "./prompt-expander";
import {
  decideRerollStrategy, applyRerollStrategyToGrammar,
  type RerollDecision, type PromptModifications,
} from "./qc-reroll-engine";
import {
  type CostGovernor,
} from "./capsule-cost-governor";
import type { ContinuityAnchor } from "./continuity-engine";
import type { ShotGrammar } from "../cinematic-language/provider-abstraction";
import type { CapsuleTier } from "../capsule-engine/types";
import {
  type ProviderId,
  capabilityOf,
} from "./provider-matrix";
import type { ShotAttempt } from "./execution-audit";

// ─── Provider adapter contract ──────────────────────────────────────────
//   The executor calls one of these per attempt. Adapters live elsewhere:
//   · KlingAdapter        in capsule-engine/video-orchestrator.ts (P23.1)
//   · StillKenBurnsAdapter in capsule-engine/video-orchestrator.ts (P23.1)
//   · Others to be wired in P24.3+.
//
//   For this module we accept an injectable adapter map keyed by ProviderId.

export interface RenderInput {
  positive_prompt:     string;
  negative_prompt:     string;
  duration_s:          number;
  seed?:               number;
  camera_directive:    string;
  motion_intensity:    number;
  /** Reference image path for image-to-video providers · optional */
  reference_image?:    string;
  /** Color palette anchors for stub_local + visualization */
  palette_hex:         ReadonlyArray<string>;
  /** Output directory · adapter writes mp4/png here */
  output_dir:          string;
  /** Beat label · informs visualization for stub_local */
  beat:                string;
  /** Shot index · informs file naming */
  shot_index:          number;
}

export interface RenderOutput {
  local_path:          string;
  cost_usd:            number;
  ms:                  number;
  /** Optional · the still frame extracted for hero/anchor purposes */
  hero_png?:           string;
}

export type RenderAdapter = (input: RenderInput) => Promise<RenderOutput>;
export type AdapterMap = Partial<Record<ProviderId, RenderAdapter>>;

// ─── QC contract ─────────────────────────────────────────────────────────
//   The executor calls this after each render to decide whether to accept.
//   It is the boundary to lib/capsule-engine/qc-engine.ts. For this module
//   we accept an injectable QC function so tests can stub.

export interface PerShotQcInput {
  rendered_path:   string;
  grammar:         ShotGrammar;
  continuity:      ContinuityAnchor;
}

export interface PerShotQcOutput {
  pass:            boolean;
  quality_score:   number;     // 0-1
  reject_reasons:  ReadonlyArray<string>;
  observed_palette: ReadonlyArray<string>;
  mean_luminance:  number;
}

export type PerShotQc = (input: PerShotQcInput) => Promise<PerShotQcOutput>;

// ─── Execute ─────────────────────────────────────────────────────────────

export interface ExecuteShotInput {
  grammar:                ShotGrammar;
  capsule_tier:           CapsuleTier;
  output_dir:             string;
  continuity:             ContinuityAnchor;
  cost_governor:          CostGovernor;
  adapters:               AdapterMap;
  qc:                     PerShotQc;
  provider_health:        Record<ProviderId, ProviderHealth>;
  network_unavailable?:   boolean;
  is_hero_shot?:          boolean;
  /** Maximum reroll attempts · default 3 */
  max_reroll_attempts?:   number;
  /** Seed for the first attempt · if supported */
  initial_seed?:          number;
}

export interface ExecuteShotOutput {
  approved:               boolean;
  attempts:               ReadonlyArray<ShotAttempt>;
  final_provider:         ProviderId | null;
  final_output_path:      string | null;
  final_quality_score:    number;
  observed_palette:       ReadonlyArray<string>;
  mean_luminance:         number;
  total_cost_usd:         number;
  total_ms:               number;
  /** Updated provider_health map · caller threads this back into the next call */
  provider_health_after:  Record<ProviderId, ProviderHealth>;
}

export async function executeShotGrammar(input: ExecuteShotInput): Promise<ExecuteShotOutput> {
  const t0 = Date.now();
  const max_attempts = (input.max_reroll_attempts ?? 3) + 1;
  const attempts: ShotAttempt[] = [];
  const excluded: ProviderId[] = [];

  let grammar = input.grammar;
  let modifications: PromptModifications = {};
  let seed = input.initial_seed;
  let final_quality_score = 0;
  let observed_palette: ReadonlyArray<string> = [];
  let mean_luminance = 50;
  let final_output_path: string | null = null;
  let final_provider: ProviderId | null = null;
  let provider_health = { ...input.provider_health };

  for (let attempt_index = 0; attempt_index < max_attempts; attempt_index++) {
    // ── 1. Arbitrate ───────────────────────────────────────────────────
    const arb_in: ArbitrationInput = {
      shot_grammar:         grammar,
      capsule_tier:         input.capsule_tier,
      remaining_budget_usd: input.cost_governor.remaining(),
      queue_load:           0,
      provider_health,
      urgency:              "normal",
      excluded_providers:   excluded,
      network_unavailable:  input.network_unavailable,
    };
    const arb = arbitrateProvider(arb_in);
    const provider = arb.primary;
    const adapter = input.adapters[provider];
    if (!adapter) {
      attempts.push({
        attempt_index, provider,
        duration_s: grammar.duration_s, motion_intensity: grammar.motion_intensity,
        realism_strength: modifications.inject_realism_strength ?? "default",
        seed,
        outcome: "provider_error",
        qc_score: 0, reject_reasons: [`no adapter for ${provider}`],
        cost_usd: 0, latency_ms: 0,
      });
      excluded.push(provider);
      if (arb.fallback_chain.length === 0) break;
      continue;
    }

    // ── 2. Expand prompt ───────────────────────────────────────────────
    const expanded = expandPromptForProvider({
      grammar,
      provider,
      continuity: input.continuity,
      seed,
      reroll_modifications: modifications,
    });

    // ── 3. Affordability check ─────────────────────────────────────────
    const estimated_cost = input.cost_governor.costForShot(provider, expanded.duration_s);
    if (!input.cost_governor.canAfford(estimated_cost)) {
      attempts.push({
        attempt_index, provider,
        duration_s: expanded.duration_s, motion_intensity: expanded.motion_intensity_normalized,
        realism_strength: modifications.inject_realism_strength ?? "default", seed,
        outcome: "skipped_budget",
        qc_score: 0, reject_reasons: ["cost governor refused"],
        cost_usd: 0, latency_ms: 0,
      });
      // Try a cheaper provider · exclude this one and continue
      excluded.push(provider);
      continue;
    }

    // ── 4. Render ──────────────────────────────────────────────────────
    const render_t0 = Date.now();
    let render_out: RenderOutput;
    try {
      render_out = await adapter({
        positive_prompt:  expanded.positive_prompt,
        negative_prompt:  expanded.negative_prompt,
        duration_s:       expanded.duration_s,
        seed:             expanded.seed,
        camera_directive: expanded.camera_motion_directive,
        motion_intensity: expanded.motion_intensity_normalized,
        reference_image:  expanded.reference_image_path,
        palette_hex:      input.continuity.palette_hex,
        output_dir:       input.output_dir,
        beat:             grammar.beat,
        shot_index:       grammar.shot_index,
      });
    } catch (e) {
      const latency = Date.now() - render_t0;
      attempts.push({
        attempt_index, provider,
        duration_s: expanded.duration_s, motion_intensity: expanded.motion_intensity_normalized,
        realism_strength: modifications.inject_realism_strength ?? "default", seed,
        outcome: "provider_error",
        qc_score: 0, reject_reasons: [(e as Error).message.slice(0, 200)],
        cost_usd: 0, latency_ms: latency,
      });
      provider_health = { ...provider_health, [provider]: updateHealth(provider_health[provider], { provider, succeeded: false, latency_s: latency / 1000 }) };
      excluded.push(provider);
      continue;
    }
    const render_latency_ms = Date.now() - render_t0;

    // Validate output exists
    if (!fs.existsSync(render_out.local_path)) {
      attempts.push({
        attempt_index, provider,
        duration_s: expanded.duration_s, motion_intensity: expanded.motion_intensity_normalized,
        realism_strength: modifications.inject_realism_strength ?? "default", seed,
        outcome: "provider_error",
        qc_score: 0, reject_reasons: ["output file missing on disk"],
        cost_usd: render_out.cost_usd, latency_ms: render_latency_ms,
      });
      input.cost_governor.charge({ label: `shot_${grammar.shot_index}_failed_render`, usd: render_out.cost_usd, shot_index: grammar.shot_index, provider, attempt_kind: attempt_index === 0 ? "initial" : "reroll" });
      excluded.push(provider);
      continue;
    }

    input.cost_governor.charge({
      label: `shot_${grammar.shot_index}_${attempt_index === 0 ? "initial" : "reroll"}_${provider}`,
      usd: render_out.cost_usd, shot_index: grammar.shot_index, provider,
      attempt_kind: attempt_index === 0 ? "initial" : "reroll",
    });
    provider_health = { ...provider_health, [provider]: updateHealth(provider_health[provider], { provider, succeeded: true, latency_s: render_latency_ms / 1000 }) };

    // ── 5. QC ──────────────────────────────────────────────────────────
    const qc_out = await input.qc({ rendered_path: render_out.local_path, grammar, continuity: input.continuity });

    // ── 6. Decision ────────────────────────────────────────────────────
    if (qc_out.pass) {
      attempts.push({
        attempt_index, provider,
        duration_s: expanded.duration_s, motion_intensity: expanded.motion_intensity_normalized,
        realism_strength: modifications.inject_realism_strength ?? "default", seed,
        outcome: "rendered_pass_qc",
        qc_score: qc_out.quality_score, reject_reasons: [],
        cost_usd: render_out.cost_usd, latency_ms: render_latency_ms,
        output_path: render_out.local_path,
      });
      final_provider     = provider;
      final_output_path  = render_out.local_path;
      final_quality_score = qc_out.quality_score;
      observed_palette   = qc_out.observed_palette;
      mean_luminance     = qc_out.mean_luminance;
      break;
    }

    // ── 7. Reroll ──────────────────────────────────────────────────────
    const decision: RerollDecision = decideRerollStrategy({
      reject_reasons:                  qc_out.reject_reasons,
      attempts_so_far:                 attempt_index + 1,
      current_provider:                provider,
      alternative_providers_available: arb.fallback_chain.length > 0,
      remaining_budget_usd:            input.cost_governor.remaining(),
      estimated_reroll_cost_usd:       capabilityOf(provider).cost_per_second_usd * expanded.duration_s,
      mode_strictness:                 0.7,
    });

    attempts.push({
      attempt_index, provider,
      duration_s: expanded.duration_s, motion_intensity: expanded.motion_intensity_normalized,
      realism_strength: modifications.inject_realism_strength ?? "default", seed,
      outcome: "rendered_fail_qc",
      qc_score: qc_out.quality_score, reject_reasons: qc_out.reject_reasons,
      cost_usd: render_out.cost_usd, latency_ms: render_latency_ms,
      output_path: render_out.local_path,
      reroll_strategy_used: decision.strategy,
      reroll_reasoning:     decision.reasoning,
    });

    if (decision.strategy === "abandon") break;

    // Apply economic verdict
    const econ = input.cost_governor.shouldReroll({
      estimated_reroll_cost_usd: capabilityOf(provider).cost_per_second_usd * (decision.modifications.shorten_to_s ?? expanded.duration_s),
      current_quality_score: qc_out.quality_score,
      target_quality_threshold: 0.70,
      attempts_so_far: attempt_index + 1,
      is_hero_shot: input.is_hero_shot ?? false,
    });
    if (!econ.proceed) break;

    // Apply modifications for the next attempt
    modifications = decision.modifications;
    if (decision.modifications.exclude_provider) excluded.push(decision.modifications.exclude_provider);
    grammar = applyRerollStrategyToGrammar(grammar, decision.modifications);
    // Seed advances on same_provider_new_seed
    if (decision.strategy === "same_provider_new_seed") {
      seed = (seed ?? Math.floor(Math.random() * 1e9)) + 1;
    }
  }

  const total_cost = attempts.reduce((s, a) => s + a.cost_usd, 0);

  return {
    approved:              final_output_path !== null,
    attempts,
    final_provider,
    final_output_path,
    final_quality_score,
    observed_palette,
    mean_luminance,
    total_cost_usd:        total_cost,
    total_ms:              Date.now() - t0,
    provider_health_after: provider_health,
  };
}

// ─── stub_local adapter · always-available offline ─────────────────────
//   Generates a procedural palette still + ken-burns motion. Same approach as
//   P23.1 StillKenBurnsAdapter, repurposed here to satisfy the RenderAdapter
//   contract directly.

export const stubLocalAdapter: RenderAdapter = async (input) => {
  const t0 = Date.now();
  fs.mkdirSync(input.output_dir, { recursive: true });

  const still_png = path.join(input.output_dir, `shot-${String(input.shot_index).padStart(2, "0")}-still.png`);
  await imageMagickStill(still_png, input.palette_hex, input.beat, input.positive_prompt);

  const out_mp4 = path.join(input.output_dir, `shot-${String(input.shot_index).padStart(2, "0")}-stub.mp4`);
  await runKenBurns(still_png, out_mp4, input.duration_s, input.camera_directive, input.motion_intensity);

  return { local_path: out_mp4, cost_usd: 0, ms: Date.now() - t0, hero_png: still_png };
};

async function imageMagickStill(out: string, palette: ReadonlyArray<string>, beat: string, prompt: string): Promise<void> {
  const top    = palette[0] ?? "#1f2a36";
  const bottom = palette[palette.length - 1] ?? "#0d1620";
  const accent = palette[1] ?? "#3d5a78";
  const label  = `${beat.toUpperCase()}  ·  ${prompt.replace(/[\\"]/g, " ").slice(0, 80)}`;
  await exec("convert", [
    "-size", "1080x1920", `gradient:${top}-${bottom}`,
    "-fill", "none", "-stroke", accent, "-strokewidth", "6",
    "-draw", "circle 540,1280 540,1080",
    "-fill", "white", "-pointsize", "26", "-gravity", "south",
    "-annotate", "+0+120", label,
    out,
  ]);
}

async function runKenBurns(still: string, out: string, duration_s: number, camera: string, intensity: number): Promise<void> {
  const fps = 30;
  const frames = Math.max(2, Math.round(duration_s * fps));
  const z_target = 1 + Math.max(0.05, Math.min(0.35, intensity * 0.5));
  const z_step = (z_target - 1) / frames;
  const z = `min(zoom+${z_step.toFixed(5)},${z_target.toFixed(3)})`;
  const center_x = "iw/2-(iw/zoom/2)";
  const center_y = "ih/2-(ih/zoom/2)";
  let x = center_x, y = center_y;
  if (camera.includes("tilt_up"))      y = `ih-(ih/zoom)-(on/${frames})*((ih-(ih/zoom)))`;
  else if (camera.includes("tilt_down"))  y = `(on/${frames})*(ih-(ih/zoom))`;
  else if (camera.includes("dolly_left"))  x = `iw-(iw/zoom)-(on/${frames})*((iw-(iw/zoom)))`;
  else if (camera.includes("dolly_right")) x = `(on/${frames})*(iw-(iw/zoom))`;
  await exec("ffmpeg", [
    "-y", "-hide_banner", "-loglevel", "error",
    "-loop", "1", "-i", still,
    "-vf", `scale=2160:3840,zoompan=z='${z}':x='${x}':y='${y}':d=${frames}:s=1080x1920:fps=${fps}`,
    "-c:v", "libx264", "-preset", "fast", "-crf", "20",
    "-pix_fmt", "yuv420p", "-t", String(duration_s),
    out,
  ]);
}

function exec(cmd: string, args: ReadonlyArray<string>): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, [...args], { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    p.stderr.on("data", b => (stderr += b.toString()));
    p.on("error", reject);
    p.on("close", code => code === 0 ? resolve() : reject(new Error(`${cmd} exit ${code}: ${stderr.slice(-800)}`)));
  });
}
