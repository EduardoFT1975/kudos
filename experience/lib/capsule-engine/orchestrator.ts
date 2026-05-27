/**
 * KUDOS · Capsule Engine · Orchestrator (tier-aware).
 *
 *  Input:  CapsuleRequest + governor policy + current_spend
 *  Output: CapsuleResult with assets keyed by tier
 *
 *  Flow:
 *    1. tier router decides effective tier (may downgrade)
 *    2. cost governor decides allowed
 *    3. tier-specific pipeline runs
 *    4. each provider call wrapped with try/catch · failures recorded · fallback paths taken
 *    5. final assets uploaded to R2 (stub: local /capsules)
 *    6. metadata.json written
 *
 *  No call-site change when stubs are swapped for real APIs.
 */
import type {
  CapsuleRequest, CapsuleResult, ShotSpec,
} from "./types";
import { decide, DEFAULT_GOVERNOR, type GovernorPolicy } from "./tier-router";
import {
  callClaudeStory, callFluxImage, callKlingVideo, callCartesiaVoice,
  callMusicSelect, callFfmpegCompose, callR2Upload,
} from "./providers";

export interface OrchestrateOptions {
  policy?:         GovernorPolicy;
  current_spend?:  { daily_usd: number; monthly_usd: number };
  output_dir?:     string;           // for ffmpeg output staging
  capsule_id?:     string;
}

export async function orchestrate(
  req:  CapsuleRequest,
  opts: OrchestrateOptions = {},
): Promise<CapsuleResult> {
  const policy = opts.policy ?? DEFAULT_GOVERNOR;
  const spend  = opts.current_spend ?? { daily_usd: 0, monthly_usd: 0 };
  const t_total = Date.now();
  const capsule_id = opts.capsule_id ?? makeId(req);

  // ── 1+2 · Decision ────────────────────────────────────────────────
  const decision = decide(req, policy, spend);

  if (!decision.allowed) {
    return rejected(req, capsule_id, decision, t_total);
  }

  // ── 3 · Route by tier ─────────────────────────────────────────────
  switch (decision.tier) {
    case "tier1_legend":        return runTier1(req, capsule_id, decision, t_total, opts);
    case "tier2_image_capsule": return runTier2(req, capsule_id, decision, t_total, opts);
    case "tier3_story_card":    return runTier3(req, capsule_id, decision, t_total, opts);
    case "tier4_data_card":     return runTier4(req, capsule_id, decision, t_total, opts);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TIER 1 · LEGEND · full AI video
// ═══════════════════════════════════════════════════════════════════════════

async function runTier1(req: CapsuleRequest, id: string, decision: any, t0: number, opts: OrchestrateOptions): Promise<CapsuleResult> {
  const failures: FailureEntry[] = [];
  const breakdown: Record<string, number> = {};
  let actual_cost = 0;

  // Story
  const story = await stage("claude_story", () => callClaudeStory(req), failures, breakdown);
  actual_cost += story?._meta.cost_usd ?? 0;

  // Stills (5 shots in parallel)
  const stills = await Promise.all(
    (story?.shotList ?? []).map((s: ShotSpec) =>
      stage(`flux_shot_${s.shot}`, () => callFluxImage({ prompt: s.image_prompt, aspect: "16:9" }), failures, breakdown)
    )
  );
  actual_cost += stills.reduce((sum, x) => sum + (x?.cost_usd ?? 0), 0);

  // Videos (5 shots sequential to avoid provider rate limit)
  const clips = [] as Array<{ path: string; duration_s: number }>;
  for (let i = 0; i < (story?.shotList.length ?? 0); i++) {
    const s = story!.shotList[i];
    const still = stills[i];
    if (!still) continue;
    const v = await stage(`kling_shot_${s.shot}`,
      () => callKlingVideo({ still_path: still.local_path, motion_prompt: s.video_prompt, duration_s: s.end_s - s.start_s }),
      failures, breakdown);
    if (v) {
      clips.push({ path: v.local_path, duration_s: s.end_s - s.start_s });
      actual_cost += v.cost_usd;
    }
  }

  // Voice
  const voice = await stage("cartesia_voice",
    () => callCartesiaVoice({ script: story?.script ?? "", language: req.language, voiceStyle: story?.voiceStyle ?? "" }),
    failures, breakdown);
  actual_cost += voice?.cost_usd ?? 0;

  // Music
  const music = await stage("music_select",
    () => callMusicSelect({ mood: story?.musicMood ?? "cinematic", bpm_target: 82, duration_s: req.duration_seconds }),
    failures, breakdown);
  actual_cost += music?.cost_usd ?? 0;

  // Compose
  const compose = await stage("ffmpeg_compose",
    () => callFfmpegCompose({
      shots: clips,
      voice_path: voice?.local_path,
      music_path: music?.local_path,
      subtitles:  story?.subtitlesVTT,
      output_path: `${opts.output_dir ?? "/tmp"}/${id}.mp4`,
    }),
    failures, breakdown);
  actual_cost += 0.002;   // ffmpeg compute

  // Upload
  const up_video = await stage("r2_upload_video",
    () => callR2Upload({ local_path: compose?.mp4_path ?? "", key: `capsules/${id}/video.mp4`, content_type: "video/mp4" }),
    failures, breakdown);
  const up_thumb = await stage("r2_upload_thumb",
    () => callR2Upload({ local_path: compose?.thumb_path ?? "", key: `capsules/${id}/thumb.jpg`, content_type: "image/jpeg" }),
    failures, breakdown);
  const up_vtt = await stage("r2_upload_vtt",
    () => callR2Upload({ local_path: compose?.vtt_path ?? "", key: `capsules/${id}/subs.vtt`, content_type: "text/vtt" }),
    failures, breakdown);

  return finalize({
    capsule_id: id, tier: "tier1_legend", decision, story, t0, actual_cost, breakdown, failures,
    assets: {
      video:      up_video?.url,
      thumbnail:  up_thumb?.url,
      subtitles:  up_vtt?.url,
      metadata:   `/capsules/${id}/metadata.json`,
    },
    providers_used: {
      story_director: { intended: "claude-sonnet-4.6",          actual: "stub:cached-output",            status: "fallback" },
      image_gen:      { intended: "flux-1.1-pro-via-replicate", actual: "stub:fallback-to-local-poster", status: "fallback" },
      video_gen:      { intended: "kling-2.1-master-via-piapi", actual: "stub:fallback-to-prebaked",     status: "fallback" },
      voice_gen:      { intended: "cartesia-sonic-2-es-male",   actual: "stub:silent-placeholder",       status: "fallback" },
      music_gen:      { intended: "epidemic-sound-library",     actual: "stub:lavfi-sine-drone",         status: "fallback" },
      composition:    { intended: "ffmpeg",                     actual: "ffmpeg",                         status: "real"     },
      storage:        { intended: "cloudflare-r2",              actual: "local-/public/capsules",         status: "fallback" },
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// TIER 2 · IMAGE CAPSULE · stills + ffmpeg motion (no Kling)
// ═══════════════════════════════════════════════════════════════════════════

async function runTier2(req: CapsuleRequest, id: string, decision: any, t0: number, opts: OrchestrateOptions): Promise<CapsuleResult> {
  const failures: FailureEntry[] = [];
  const breakdown: Record<string, number> = {};
  let actual_cost = 0;

  const story = await stage("claude_story", () => callClaudeStory(req), failures, breakdown);
  actual_cost += story?._meta.cost_usd ?? 0;

  const stills = await Promise.all(
    (story?.shotList ?? []).slice(0, 3).map((s: ShotSpec) =>
      stage(`flux_shot_${s.shot}`, () => callFluxImage({ prompt: s.image_prompt, aspect: "16:9" }), failures, breakdown)
    )
  );
  actual_cost += stills.reduce((sum, x) => sum + (x?.cost_usd ?? 0), 0);

  // ffmpeg ken-burns over the 3 stills · no Kling
  const clips = stills.filter(Boolean).map((s, i) => ({
    path: s!.local_path,
    duration_s: req.duration_seconds / Math.max(1, stills.filter(Boolean).length),
  }));

  const voice = req.duration_seconds <= 10
    ? null
    : await stage("cartesia_voice_optional",
      () => callCartesiaVoice({ script: story?.script ?? "", language: req.language, voiceStyle: story?.voiceStyle ?? "" }),
      failures, breakdown);
  if (voice) actual_cost += voice.cost_usd;

  const compose = await stage("ffmpeg_compose",
    () => callFfmpegCompose({
      shots: clips,
      voice_path: voice?.local_path,
      subtitles:  story?.subtitlesVTT,
      output_path: `${opts.output_dir ?? "/tmp"}/${id}.mp4`,
    }),
    failures, breakdown);
  actual_cost += 0.002;

  const up_video = await stage("r2_upload",
    () => callR2Upload({ local_path: compose?.mp4_path ?? "", key: `capsules/${id}/video.mp4`, content_type: "video/mp4" }),
    failures, breakdown);

  return finalize({
    capsule_id: id, tier: "tier2_image_capsule", decision, story, t0, actual_cost, breakdown, failures,
    assets: {
      video:      up_video?.url,
      hero_image: stills[0]?.local_path,
      metadata:   `/capsules/${id}/metadata.json`,
    },
    providers_used: {
      story_director: { intended: "claude-sonnet-4.6",          actual: "stub:cached-output",            status: "fallback" },
      image_gen:      { intended: "flux-1.1-pro-via-replicate", actual: "stub:fallback-to-local-poster", status: "fallback" },
      video_gen:      { intended: "skipped-by-tier-policy",     actual: "ffmpeg-ken-burns",              status: "real"     },
      voice_gen:      { intended: voice ? "cartesia-sonic-2" : "skipped-short-duration", actual: voice ? "stub:silent" : "skipped", status: voice ? "fallback" : "skipped" },
      music_gen:      { intended: "skipped-by-tier-policy",     actual: "skipped",                       status: "skipped"  },
      composition:    { intended: "ffmpeg",                     actual: "ffmpeg",                         status: "real"     },
      storage:        { intended: "cloudflare-r2",              actual: "local-/public/capsules",         status: "fallback" },
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// TIER 3 · STORY CARD · 1 hero image + narrative card
// ═══════════════════════════════════════════════════════════════════════════

async function runTier3(req: CapsuleRequest, id: string, decision: any, t0: number, opts: OrchestrateOptions): Promise<CapsuleResult> {
  const failures: FailureEntry[] = [];
  const breakdown: Record<string, number> = {};
  let actual_cost = 0;

  const story = await stage("claude_story_short", () => callClaudeStory(req), failures, breakdown);
  actual_cost += story?._meta.cost_usd ?? 0;

  const hero = await stage("flux_hero",
    () => callFluxImage({ prompt: story?.shotList[0]?.image_prompt ?? `Hero image of ${req.poi.name}`, aspect: "16:9" }),
    failures, breakdown);
  actual_cost += hero?.cost_usd ?? 0;

  const up_hero = await stage("r2_upload_hero",
    () => callR2Upload({ local_path: hero?.local_path ?? "", key: `capsules/${id}/hero.jpg`, content_type: "image/jpeg" }),
    failures, breakdown);

  return finalize({
    capsule_id: id, tier: "tier3_story_card", decision, story, t0, actual_cost, breakdown, failures,
    assets: {
      hero_image: up_hero?.url,
      thumbnail:  up_hero?.url,
      metadata:   `/capsules/${id}/metadata.json`,
      story_json: `/capsules/${id}/story.json`,
    },
    providers_used: {
      story_director: { intended: "claude-sonnet-4.6",          actual: "stub:cached-output",            status: "fallback" },
      image_gen:      { intended: "flux-1.1-pro-via-replicate", actual: "stub:fallback-to-local-poster", status: "fallback" },
      video_gen:      { intended: "skipped-by-tier-policy",     actual: "skipped",                       status: "skipped"  },
      voice_gen:      { intended: "skipped-by-tier-policy",     actual: "skipped",                       status: "skipped"  },
      music_gen:      { intended: "skipped-by-tier-policy",     actual: "skipped",                       status: "skipped"  },
      composition:    { intended: "skipped",                    actual: "skipped",                       status: "skipped"  },
      storage:        { intended: "cloudflare-r2",              actual: "local-/public/capsules",         status: "fallback" },
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// TIER 4 · DATA CARD · metadata only · no media generation
// ═══════════════════════════════════════════════════════════════════════════

async function runTier4(req: CapsuleRequest, id: string, decision: any, t0: number, _opts: OrchestrateOptions): Promise<CapsuleResult> {
  return finalize({
    capsule_id: id, tier: "tier4_data_card", decision, story: undefined, t0,
    actual_cost: 0,
    breakdown: { metadata_only: 0 },
    failures: [],
    assets: {
      thumbnail: req.poi.poster ?? `/pois/${req.poi.id}.jpg`,
      metadata:  `/capsules/${id}/metadata.json`,
    },
    providers_used: {
      story_director: { intended: "skipped-by-tier-policy", actual: "skipped", status: "skipped" },
      image_gen:      { intended: "skipped-by-tier-policy", actual: "skipped", status: "skipped" },
      video_gen:      { intended: "skipped-by-tier-policy", actual: "skipped", status: "skipped" },
      voice_gen:      { intended: "skipped-by-tier-policy", actual: "skipped", status: "skipped" },
      music_gen:      { intended: "skipped-by-tier-policy", actual: "skipped", status: "skipped" },
      composition:    { intended: "skipped",                actual: "skipped", status: "skipped" },
      storage:        { intended: "n/a",                    actual: "n/a",     status: "skipped" },
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

type FailureEntry = { stage: string; error: string; recovered: boolean };

async function stage<T>(
  name:      string,
  fn:        () => Promise<T>,
  failures:  FailureEntry[],
  breakdown: Record<string, number>,
): Promise<T | null> {
  const t = Date.now();
  try {
    const out = await fn();
    breakdown[name] = Date.now() - t;
    return out;
  } catch (err: any) {
    failures.push({ stage: name, error: err?.message ?? String(err), recovered: true });
    breakdown[name] = Date.now() - t;
    return null;
  }
}

function makeId(req: CapsuleRequest): string {
  return `cap-${req.poi.id}-${req.language}-${req.audience}-${req.duration_seconds}s-${req.tone.replace(/\s+/g, "_")}-v1`;
}

function rejected(req: CapsuleRequest, id: string, decision: any, t0: number): CapsuleResult {
  return {
    capsule_id: id, tier: decision.tier, tier_decision: decision, status: "rejected_by_governor",
    assets: { metadata: "n/a" },
    cost_usd: { estimated: decision.estimated_cost_usd, actual: 0, breakdown: {} },
    generation_time_ms: { estimated: decision.estimated_latency_s * 1000, actual: Date.now() - t0, breakdown: {} },
    providers_used: {}, failures: [{ stage: "governor", error: decision.governor_reason, recovered: false }],
  };
}

function finalize(args: {
  capsule_id:    string;
  tier:          CapsuleResult["tier"];
  decision:      any;
  story:         any;
  t0:            number;
  actual_cost:   number;
  breakdown:     Record<string, number>;
  failures:      FailureEntry[];
  assets:        CapsuleResult["assets"];
  providers_used: CapsuleResult["providers_used"];
}): CapsuleResult {
  return {
    capsule_id:    args.capsule_id,
    tier:          args.tier,
    tier_decision: args.decision,
    status:        "ready",
    assets:        args.assets,
    story:         args.story ? {
      title:   args.story.title,
      hook:    args.story.hook,
      meaning: args.story.meaning,
      promise: args.story.promise,
      script:  args.story.script,
    } : undefined,
    cost_usd: {
      estimated: args.decision.estimated_cost_usd,
      actual:    args.actual_cost,
      breakdown: {},
    },
    generation_time_ms: {
      estimated: args.decision.estimated_latency_s * 1000,
      actual:    Date.now() - args.t0,
      breakdown: args.breakdown,
    },
    providers_used: args.providers_used,
    failures:       args.failures,
  };
}
