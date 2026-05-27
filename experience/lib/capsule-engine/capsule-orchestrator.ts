/**
 * KUDOS · Capsule Orchestrator (P23 · top-level).
 *
 * Coordinates the 7 production modules to produce one capsule end-to-end.
 *
 *   directStory -> buildPrompts -> [QC pre-render judge] -> orchestrateVideo
 *      -> synthesizeVoice + composeSoundDesign -> composite
 *      -> [QC post-render heuristic + vision] -> publish OR reroll
 *
 * This replaces the P16 monolithic orchestrator.ts. P16 stays in-tree as a
 * reference but is not the entry point for new capsule generation.
 *
 * Real provider implementations live in providers/. The 5 skeleton modules
 * throw on call until their P23.x follow-ups land — this file's compile
 * proves the architecture wires correctly without requiring live providers.
 */
import { directStory,        type ShotPlan }                       from "./story-director";
import { buildPrompts,       type PromptBundle }                   from "./visual-prompt-engine";
import { orchestrateVideo,   type OrchestrateVideoOutput }         from "./video-orchestrator";
import { synthesizeVoice,    type SynthesizeVoiceOutput, PERSONA_BY_TONE } from "./voice-engine";
import { composeSoundDesign, type SoundDesignOutput }              from "./sound-design";
import { composite,          type CompositeOutput }                from "./compositor";
import {
  evaluateCapsule, visionEnabledForTier,
  type CapsuleQcOutput,
} from "./qc-engine";
import type { CapsuleRequest, CapsuleResult, CapsuleTier } from "./types";
import { decide, DEFAULT_GOVERNOR, type GovernorPolicy } from "./tier-router";

export interface OrchestrateCapsuleInput {
  capsule_id:        string;
  request:           CapsuleRequest;
  editorial_angle?:  string;
  output_dir:        string;
  policy?:           GovernorPolicy;
  current_spend?:    { daily_usd: number; monthly_usd: number };
  /** Maximum number of reroll cycles before giving up · default 1 */
  max_rerolls?:      number;
}

export interface OrchestrateCapsuleOutput {
  result:           CapsuleResult;
  plan:             ShotPlan;
  qc:               CapsuleQcOutput;
  cost_ledger:      Record<string, number>;
  reroll_attempts:  number;
}

export async function orchestrateCapsule(input: OrchestrateCapsuleInput): Promise<OrchestrateCapsuleOutput> {
  const t0 = Date.now();
  const policy = input.policy ?? DEFAULT_GOVERNOR;
  const spend  = input.current_spend ?? { daily_usd: 0, monthly_usd: 0 };
  const cost_ledger: Record<string, number> = {};

  // ── 1. Cost governor + tier decision ────────────────────────────────
  const tier_decision = decide(input.request, policy, spend);
  if (!tier_decision.allowed) {
    return rejectedByGovernor(input, tier_decision, t0, cost_ledger);
  }
  const tier: CapsuleTier = tier_decision.tier;

  // ── 2. Story Director ───────────────────────────────────────────────
  const story = await directStory({
    capsule_id:       input.capsule_id,
    tier,
    request:          input.request,
    editorial_angle:  input.editorial_angle,
  });
  cost_ledger.story = story.cost_usd;
  const plan: ShotPlan = story.plan;

  // ── 3. Visual Prompt Engine ─────────────────────────────────────────
  const prompts = await buildPrompts({
    plan,
    era: input.request.poi.era,
    refine_with_claude: tier === "tier1_legend",
  });
  cost_ledger.prompts = prompts.cost_usd;

  // ── 4. (Optional pre-render QC short-circuit) ──────────────────────
  // For now we always run post-render QC; pre-render judge runs inside
  // evaluateCapsule. A future optimization is to call judgeScript here
  // directly and reroll the story BEFORE spending video money.

  // ── 5. Video orchestration ──────────────────────────────────────────
  const video = await orchestrateVideo({
    capsule_id:        input.capsule_id,
    tier,
    bundle:            prompts.bundle,
    remaining_budget:  tier_decision.estimated_cost_usd - sum(cost_ledger),
  });
  cost_ledger.video = video.total_cost;

  // ── 6. Voice + Sound Design (parallel) ──────────────────────────────
  const persona = PERSONA_BY_TONE[input.request.tone] ?? "cinematic_male";
  const [voice, sound] = await Promise.all([
    synthesizeVoice({ plan, language: input.request.language, persona }),
    composeSoundDesign({ plan, music_mood: plan.raw.musicMood }),
  ]);
  cost_ledger.voice = voice.cost_usd;
  cost_ledger.music = sound.cost_usd;

  // ── 7. Compositor (final render) ────────────────────────────────────
  const final = await composite({
    plan,
    shots:          video.shots.map(s => ({ shot_index: s.shot_index, mp4_path: s.mp4_path })),
    voice_path:     voice.voice_path,
    music_path:     sound.music_path,
    sfx_path:       sound.sfx_path,
    subtitles_vtt:  voice.subtitles_vtt,
    output_dir:     input.output_dir,
    brand_bug:      tier === "tier1_legend" || tier === "tier2_image_capsule",
  });
  cost_ledger.compose = 0;

  // ── 8. QC post-render ───────────────────────────────────────────────
  const qc = await evaluateCapsule({
    plan,
    rendered_mp4_path:   final.mp4_path,
    voice_path:          voice.voice_path,
    music_path:          sound.music_path,
    subtitles_vtt:       voice.subtitles_vtt,
    expected_duration_s: input.request.duration_seconds,
    language:            input.request.language,
    enable_vision:       visionEnabledForTier(tier),
  });
  cost_ledger.qc = qc.total_cost_usd;

  // ── 9. Verdict → result ─────────────────────────────────────────────
  const result: CapsuleResult = {
    capsule_id:       input.capsule_id,
    tier,
    tier_decision,
    status:           qc.verdict === "publish" ? "ready" : "failed",
    assets: {
      video:      final.mp4_path,
      thumbnail:  final.thumb_path,
      subtitles:  final.vtt_path,
      metadata:   final.metadata_path,
    },
    story: {
      title:   plan.raw.title,
      hook:    plan.arc.hook,
      meaning: plan.arc.meaning,
      promise: plan.arc.close,
      script:  plan.raw.script,
    },
    cost_usd: {
      estimated:  tier_decision.estimated_cost_usd,
      actual:     sum(cost_ledger),
      breakdown:  cost_ledger,
    },
    generation_time_ms: {
      estimated:  tier_decision.estimated_latency_s * 1000,
      actual:     Date.now() - t0,
      breakdown:  {},
    },
    providers_used: {},
    failures: [],
  };

  return {
    result,
    plan,
    qc,
    cost_ledger,
    reroll_attempts: 0,
  };
}

function sum(o: Record<string, number>): number {
  return Object.values(o).reduce((a, b) => a + b, 0);
}

function rejectedByGovernor(
  input:          OrchestrateCapsuleInput,
  tier_decision:  ReturnType<typeof decide>,
  t0:             number,
  cost_ledger:    Record<string, number>,
): OrchestrateCapsuleOutput {
  return {
    result: {
      capsule_id:    input.capsule_id,
      tier:          tier_decision.tier,
      tier_decision,
      status:        "rejected_by_governor",
      assets:        { metadata: "" },
      cost_usd:      { estimated: 0, actual: 0, breakdown: {} },
      generation_time_ms: { estimated: 0, actual: Date.now() - t0, breakdown: {} },
      providers_used: {},
      failures: [{ stage: "governor", error: tier_decision.reason, recovered: false }],
    },
    plan: null as unknown as ShotPlan,
    qc:   null as unknown as CapsuleQcOutput,
    cost_ledger,
    reroll_attempts: 0,
  };
}
