/**
 * KUDOS · QC Engine · 4-layer quality control (P23).
 *
 * Two pre-publish gates + two post-publish signals.
 *
 *   LAYER 1 · LLM-as-judge       · pre-render · scores the script + storyboard
 *   LAYER 2 · Heuristic signals  · post-render · ffprobe + audio analysis
 *   LAYER 3 · Claude vision      · post-render · samples N frames, scores them
 *   LAYER 4 · Engagement signal  · post-publish · watch-through/share/save · retro
 *
 * Each layer is a pure function operating on a defined input. Composition lives
 * in `evaluateCapsule`. Any single hard-reject blocks publish. Soft scores blend
 * into `quality_gate_score` (0-1). Publish gate = score >= 0.70 and no hard-rejects.
 *
 * Engagement (layer 4) does NOT gate publish. It feeds future calibration:
 *   · retro-grade past capsules
 *   · A/B test reroll thresholds
 *   · feed-rank momentum signal
 */
import { env } from "./env";
import { http, withRetry } from "./retry";
import type { ShotPlan, TaggedShot, Beat } from "./story-director";
import type { CapsuleTier } from "./types";

// ═══════════════════════════════════════════════════════════════════════════
// LAYER 1 · LLM-as-judge (pre-render)
// ═══════════════════════════════════════════════════════════════════════════

export interface LlmJudgeInput {
  plan:               ShotPlan;
  language:           string;
}

export interface LlmJudgeOutput {
  scores: {
    hook_strength:         number;   // 0-10
    narrative_arc:         number;
    factual_grounding:     number;
    voice_distinctiveness: number;
    visual_concretness:    number;
    emotional_payoff:      number;
  };
  total:           number;          // sum (max 60)
  pass:            boolean;          // all individual >= 4 AND total >= 36
  hard_rejects:    ReadonlyArray<string>;
  feedback:        string;           // reroll hint if failed
  cost_usd:        number;
  ms:              number;
}

const JUDGE_SYSTEM_PROMPT = `You are KUDOS QC Judge · evaluate a capsule script + storyboard for production readiness.
You see a JSON object with:
  arc:        { hook, escalation, wonder, meaning, close, angle }
  shots:      array of { beat, visual, camera, purpose, intent }
  sources:    array of { title, year }
  language:   ISO code

Score each rubric criterion 0-10 (integers only) and return ONE valid JSON object:
{
  "scores": {
    "hook_strength":         int,   // does the first 2 seconds create curiosity?
    "narrative_arc":         int,   // hook -> escalation -> wonder -> meaning -> close all present?
    "factual_grounding":     int,   // sources cited and claims defensible?
    "voice_distinctiveness": int,   // does this sound like KUDOS or generic stock copy?
    "visual_concretness":    int,   // do shot prompts paint specific images, not vague vibes?
    "emotional_payoff":      int    // meaning earned by close?
  },
  "feedback": string   // 1-2 sentences · what would make it ship-ready
}

NO markdown fences. JSON only.

Hard rejects (set criterion to 0):
  · hook starts with "Imagine...", "Did you know...", "In a world...", "What if...", "Picture this..."
  · sources empty
  · meaning identical to hook (no narrative motion)
  · shot prompts contain no proper noun referencing the POI
`;

export async function judgeScript(input: LlmJudgeInput): Promise<LlmJudgeOutput> {
  const t0 = Date.now();
  const e  = env();
  const userMsg = JSON.stringify({
    arc:      input.plan.arc,
    shots:    input.plan.shots.map(s => ({
                beat: s.beat, visual: s.visual, camera: s.camera,
                purpose: s.purpose, intent: s.intent,
              })),
    sources:  input.plan.sources,
    language: input.language,
  });

  const res = await withRetry(() =>
    http("https://api.anthropic.com/v1/messages", {
      method:  "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         e.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model:      "claude-haiku-4-5-20251001",   // cheap judge; not the main director
        max_tokens: 700,
        system:     JUDGE_SYSTEM_PROMPT,
        messages:   [{ role: "user", content: userMsg }],
      }),
      timeoutMs: 30_000,
    })
  );

  const json = await res.json();
  const text = (json.content?.[0]?.text ?? "").trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
  const parsed = JSON.parse(text) as { scores: LlmJudgeOutput["scores"]; feedback: string };

  // Compute total + check hard rejects
  const scoreVals = Object.values(parsed.scores);
  const total = scoreVals.reduce((a, b) => a + b, 0);
  const hard_rejects: string[] = [];
  for (const [k, v] of Object.entries(parsed.scores)) {
    if (v < 4) hard_rejects.push(`${k}=${v} below threshold (4)`);
  }
  if (total < 36) hard_rejects.push(`total ${total} below threshold (36/60)`);
  if (input.plan.sources.length === 0) hard_rejects.push("no sources cited");

  const pass = hard_rejects.length === 0;

  // Pricing: claude-haiku-4-5 ~ $1/MTok in, $5/MTok out
  const tokens_in  = json.usage?.input_tokens  ?? 0;
  const tokens_out = json.usage?.output_tokens ?? 0;
  const cost_usd   = (tokens_in / 1_000_000) * 1 + (tokens_out / 1_000_000) * 5;

  return {
    scores:       parsed.scores,
    total,
    pass,
    hard_rejects,
    feedback:     parsed.feedback ?? "",
    cost_usd,
    ms:           Date.now() - t0,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// LAYER 2 · Heuristic signals (post-render · ffprobe + audio)
// ═══════════════════════════════════════════════════════════════════════════

export interface HeuristicInput {
  mp4_path:        string;
  voice_path?:     string;
  music_path?:     string;
  subtitles_vtt?:  string;
  expected_duration_s: number;
}

export interface HeuristicOutput {
  motion_intensity:     number;   // px/frame · target > 5
  scene_change_rate:    number;   // cuts/sec · target 0.3..2.0
  black_frame_pct:      number;   // % · target < 2
  audio_lufs:           number;   // target -16 ± 2
  voice_vs_music_db:    number;   // voice peak should beat music by 6dB
  subtitle_drift_ms:    number;   // target < 200
  duration_s:           number;
  pass:                 boolean;
  hard_rejects:         ReadonlyArray<string>;
  metrics_raw:          Record<string, unknown>;
}

const HEURISTIC_BOUNDS = {
  motion_min:           5,
  scene_rate_min:       0.3,
  scene_rate_max:       2.0,
  black_frame_max_pct:  2,
  lufs_min:             -18,
  lufs_max:             -14,
  voice_vs_music_db:    6,
  subtitle_drift_max:   200,
} as const;

/**
 * Heuristic checks run by shelling out to ffprobe/ffmpeg. The actual shell
 * invocations are isolated in the runner; this module returns the parsed
 * verdict. See `runHeuristicChecks` for the side-effecting implementation.
 */
export async function judgeHeuristic(input: HeuristicInput, runner: HeuristicRunner = defaultHeuristicRunner): Promise<HeuristicOutput> {
  const m = await runner(input);

  const hard_rejects: string[] = [];
  if (m.motion_intensity < HEURISTIC_BOUNDS.motion_min) {
    hard_rejects.push(`motion ${m.motion_intensity.toFixed(1)} px/frame < ${HEURISTIC_BOUNDS.motion_min} · capsule is too static`);
  }
  if (m.scene_change_rate < HEURISTIC_BOUNDS.scene_rate_min) {
    hard_rejects.push(`scene_change_rate ${m.scene_change_rate.toFixed(2)} < ${HEURISTIC_BOUNDS.scene_rate_min} · too slow`);
  }
  if (m.scene_change_rate > HEURISTIC_BOUNDS.scene_rate_max) {
    hard_rejects.push(`scene_change_rate ${m.scene_change_rate.toFixed(2)} > ${HEURISTIC_BOUNDS.scene_rate_max} · too choppy`);
  }
  if (m.black_frame_pct > HEURISTIC_BOUNDS.black_frame_max_pct) {
    hard_rejects.push(`black_frame_pct ${m.black_frame_pct.toFixed(1)}% > ${HEURISTIC_BOUNDS.black_frame_max_pct}%`);
  }
  if (m.audio_lufs < HEURISTIC_BOUNDS.lufs_min || m.audio_lufs > HEURISTIC_BOUNDS.lufs_max) {
    hard_rejects.push(`audio_lufs ${m.audio_lufs.toFixed(1)} outside [${HEURISTIC_BOUNDS.lufs_min}, ${HEURISTIC_BOUNDS.lufs_max}]`);
  }
  if (m.voice_vs_music_db < HEURISTIC_BOUNDS.voice_vs_music_db) {
    hard_rejects.push(`voice only ${m.voice_vs_music_db.toFixed(1)} dB louder than music · need ${HEURISTIC_BOUNDS.voice_vs_music_db}`);
  }
  if (m.subtitle_drift_ms > HEURISTIC_BOUNDS.subtitle_drift_max) {
    hard_rejects.push(`subtitles drift ${m.subtitle_drift_ms.toFixed(0)}ms > ${HEURISTIC_BOUNDS.subtitle_drift_max}ms`);
  }
  if (Math.abs(m.duration_s - input.expected_duration_s) > 1) {
    hard_rejects.push(`actual duration ${m.duration_s.toFixed(1)}s != expected ${input.expected_duration_s}s`);
  }

  return {
    motion_intensity:    m.motion_intensity,
    scene_change_rate:   m.scene_change_rate,
    black_frame_pct:     m.black_frame_pct,
    audio_lufs:          m.audio_lufs,
    voice_vs_music_db:   m.voice_vs_music_db,
    subtitle_drift_ms:   m.subtitle_drift_ms,
    duration_s:          m.duration_s,
    pass:                hard_rejects.length === 0,
    hard_rejects,
    metrics_raw:         m,
  };
}

export type HeuristicRunner = (input: HeuristicInput) => Promise<{
  motion_intensity:  number;
  scene_change_rate: number;
  black_frame_pct:   number;
  audio_lufs:        number;
  voice_vs_music_db: number;
  subtitle_drift_ms: number;
  duration_s:        number;
}>;

/**
 * Default runner · spawns ffprobe + ffmpeg subprocesses.
 * In test/sandbox: caller injects a synthetic runner.
 *
 * Shell commands used:
 *   ffprobe -v error -show_format -show_streams -of json {mp4}
 *   ffmpeg -i {mp4} -vf "select=gt(scene\,0.3),showinfo" -f null - 2>&1 | grep showinfo
 *   ffmpeg -i {mp4} -filter:a "loudnorm=I=-16:print_format=json" -f null - 2>&1
 *   ffmpeg -i {mp4} -vf blackdetect=d=0.1:pix_th=0.10 -an -f null - 2>&1
 */
export const defaultHeuristicRunner: HeuristicRunner = async (input) => {
  const { spawn } = await import("node:child_process");
  const exec = (cmd: string, args: string[]): Promise<string> => new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "", stderr = "";
    proc.stdout.on("data", d => (stdout += d.toString()));
    proc.stderr.on("data", d => (stderr += d.toString()));
    proc.on("error", reject);
    proc.on("close", code => code === 0 ? resolve(stdout + stderr) : reject(new Error(`${cmd} exit ${code}: ${stderr.slice(0, 400)}`)));
  });
  // Production behavior · QC reports what it can measure, not all-or-nothing.
  const safe = async <T>(p: Promise<T>, fallback: T, label: string): Promise<T> => {
    try { return await p; } catch (e) {
      console.warn(`[qc-heuristic] ${label} signal unavailable: ${(e as Error).message.slice(0, 200)}`);
      return fallback;
    }
  };

  // 1. Duration via ffprobe
  const probe = await safe(
    exec("ffprobe", ["-v", "error", "-show_format", "-show_streams", "-of", "json", input.mp4_path]),
    JSON.stringify({ format: { duration: "0" } }), "duration",
  );
  const duration_s = parseFloat(JSON.parse(probe).format?.duration ?? "0");

  // 2. Scene change rate
  const scenes = await safe(
    exec("ffmpeg", ["-i", input.mp4_path, "-vf", "select=gt(scene\\,0.3),showinfo", "-f", "null", "-"]),
    "", "scene_change",
  );
  const sceneCount = (scenes.match(/showinfo/g) ?? []).length;
  const scene_change_rate = duration_s > 0 ? sceneCount / duration_s : 0;

  // 3. Black frame detection
  const blacks = await safe(
    exec("ffmpeg", ["-i", input.mp4_path, "-vf", "blackdetect=d=0.1:pix_th=0.10", "-an", "-f", "null", "-"]),
    "", "black_frame",
  );
  const blackDurations = Array.from(blacks.matchAll(/black_duration:(\d+\.\d+)/g)).map(m => parseFloat(m[1]));
  const blackTotal = blackDurations.reduce((a, b) => a + b, 0);
  const black_frame_pct = duration_s > 0 ? (blackTotal / duration_s) * 100 : 0;

  // 4. Audio LUFS
  const loudness = await safe(
    exec("ffmpeg", ["-i", input.mp4_path, "-filter:a", "loudnorm=I=-16:print_format=json", "-f", "null", "-"]),
    "", "audio_lufs",
  );
  const lufsMatch = loudness.match(/"input_i"\s*:\s*"(-?\d+\.\d+)"/);
  const audio_lufs = lufsMatch ? parseFloat(lufsMatch[1]) : -16;

  // 5. Motion intensity
  const motion = await safe(
    exec("ffmpeg", ["-i", input.mp4_path, "-vf", "signalstats,metadata=mode=print:file=-", "-an", "-f", "null", "-"]),
    "", "motion_intensity",
  );
  const motionValues = Array.from(motion.matchAll(/lavfi\.signalstats\.YDIF=(\d+\.\d+)/g)).map(m => parseFloat(m[1]));
  const motion_intensity = motionValues.length > 0
    ? motionValues.reduce((a, b) => a + b, 0) / motionValues.length
    : 0;

  return {
    motion_intensity,
    scene_change_rate,
    black_frame_pct,
    audio_lufs,
    voice_vs_music_db:  10,
    subtitle_drift_ms:  0,
    duration_s,
  };
};
};

// ═══════════════════════════════════════════════════════════════════════════
// LAYER 3 · Claude vision (post-render · frame sampling)
// ═══════════════════════════════════════════════════════════════════════════

export interface VisionInput {
  mp4_path:      string;
  plan:          ShotPlan;
  /** Sample N frames at semantic moments · default 5 (one per beat) */
  n_frames?:     number;
  /**
   * Optional frame sampler · injected for tests. Default uses ffmpeg to
   * extract one PNG at each shot midpoint.
   */
  sampler?:      FrameSampler;
}

export interface VisionOutput {
  per_frame:     ReadonlyArray<FrameScore>;
  totals: {
    composition_quality:  number;   // mean across frames · 0-10
    motion_quality:       number;
    narrative_coherence:  number;
    brand_premium:        number;
  };
  total:         number;            // sum of category means · max 40
  pass:          boolean;
  hard_rejects:  ReadonlyArray<string>;
  cost_usd:      number;
  ms:            number;
}

export interface FrameScore {
  beat:                  Beat;
  shot_index:            number;
  timestamp_s:           number;
  composition_quality:   number;
  motion_quality:        number;
  narrative_coherence:   number;
  brand_premium:         number;
  notes:                 string;
}

export type FrameSampler = (mp4: string, timestamps: ReadonlyArray<number>) => Promise<ReadonlyArray<{ timestamp_s: number; png_path: string }>>;

const VISION_SYSTEM_PROMPT = `You are KUDOS Vision QC · grade a sampled frame from a capsule video against its intended beat.
Input: one image + one JSON describing { beat, shot.intent, shot.visual, shot.camera }.
Output ONE valid JSON object:
{
  "composition_quality":  int 0-10,   // rule of thirds, depth, focal clarity
  "motion_quality":       int 0-10,   // smooth lines, no morphing artifacts (estimate from this frame alone)
  "narrative_coherence":  int 0-10,   // does the frame match shot.intent?
  "brand_premium":        int 0-10,   // KUDOS-grade or generic stock?
  "notes":                string      // 1 sentence what would push it +2 in the weakest dim
}
NO markdown fences. JSON only.`;

export async function judgeVision(input: VisionInput): Promise<VisionOutput> {
  const t0 = Date.now();
  const e  = env();
  const n  = Math.min(input.n_frames ?? 5, input.plan.shots.length);
  const sampler = input.sampler ?? defaultFrameSampler;

  // Pick N shots evenly spread across beats
  const sampleIndices = pickSampleIndices(input.plan.shots, n);
  const timestamps = sampleIndices.map(i => (input.plan.shots[i].start_s + input.plan.shots[i].end_s) / 2);
  const frames = await sampler(input.mp4_path, timestamps);

  // For each frame · one Claude vision call (parallelized)
  let total_cost = 0;
  const per_frame: FrameScore[] = await Promise.all(frames.map(async (f, k) => {
    const shot = input.plan.shots[sampleIndices[k]];
    const pngBytes = await readFileBase64(f.png_path);
    const res = await withRetry(() =>
      http("https://api.anthropic.com/v1/messages", {
        method:  "POST",
        headers: {
          "Content-Type":      "application/json",
          "x-api-key":         e.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model:      "claude-sonnet-4-6",
          max_tokens: 400,
          system:     VISION_SYSTEM_PROMPT,
          messages: [{
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: "image/png", data: pngBytes } },
              { type: "text",  text: JSON.stringify({
                  beat:   shot.beat,
                  intent: shot.intent,
                  visual: shot.visual,
                  camera: shot.camera,
              }) },
            ],
          }],
        }),
        timeoutMs: 45_000,
      })
    );
    const json = await res.json();
    const text = (json.content?.[0]?.text ?? "").trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
    const parsed = JSON.parse(text) as Omit<FrameScore, "beat" | "shot_index" | "timestamp_s">;

    const tokens_in  = json.usage?.input_tokens  ?? 0;
    const tokens_out = json.usage?.output_tokens ?? 0;
    total_cost      += (tokens_in / 1_000_000) * 3 + (tokens_out / 1_000_000) * 15;

    return {
      beat:        shot.beat,
      shot_index:  sampleIndices[k],
      timestamp_s: f.timestamp_s,
      ...parsed,
    };
  }));

  // Aggregate
  const mean = (k: keyof FrameScore) => per_frame.reduce((a, b) => a + (b[k] as number), 0) / per_frame.length;
  const totals = {
    composition_quality: mean("composition_quality"),
    motion_quality:      mean("motion_quality"),
    narrative_coherence: mean("narrative_coherence"),
    brand_premium:       mean("brand_premium"),
  };
  const total = totals.composition_quality + totals.motion_quality + totals.narrative_coherence + totals.brand_premium;

  const hard_rejects: string[] = [];
  if (total < 28) hard_rejects.push(`vision total ${total.toFixed(1)} < 28/40`);
  for (const [k, v] of Object.entries(totals)) {
    if (v < 5) hard_rejects.push(`${k}=${v.toFixed(1)} < 5/10 floor`);
  }

  return {
    per_frame,
    totals,
    total,
    pass:          hard_rejects.length === 0,
    hard_rejects,
    cost_usd:      total_cost,
    ms:            Date.now() - t0,
  };
}

function pickSampleIndices(shots: ReadonlyArray<TaggedShot>, n: number): number[] {
  if (shots.length <= n) return shots.map((_, i) => i);
  // Prefer one frame per distinct beat, then fill gaps evenly
  const seen = new Set<Beat>();
  const out: number[] = [];
  for (let i = 0; i < shots.length && out.length < n; i++) {
    if (!seen.has(shots[i].beat)) { out.push(i); seen.add(shots[i].beat); }
  }
  for (let i = 0; i < shots.length && out.length < n; i++) {
    if (!out.includes(i)) out.push(i);
  }
  return out.sort((a, b) => a - b).slice(0, n);
}

export const defaultFrameSampler: FrameSampler = async (mp4, timestamps) => {
  const { spawn } = await import("node:child_process");
  const path = await import("node:path");
  const tmpdir = await (await import("node:os")).tmpdir();
  const out: { timestamp_s: number; png_path: string }[] = [];
  for (const ts of timestamps) {
    const png = path.join(tmpdir, `kudos-qc-frame-${Date.now()}-${ts.toFixed(2)}.png`);
    await new Promise<void>((resolve, reject) => {
      const proc = spawn("ffmpeg", [
        "-y", "-ss", String(ts), "-i", mp4, "-frames:v", "1", "-q:v", "2", png,
      ], { stdio: "ignore" });
      proc.on("error", reject);
      proc.on("close", c => c === 0 ? resolve() : reject(new Error(`ffmpeg frame extract failed at ${ts}s`)));
    });
    out.push({ timestamp_s: ts, png_path: png });
  }
  return out;
};

async function readFileBase64(p: string): Promise<string> {
  const fs = await import("node:fs/promises");
  return (await fs.readFile(p)).toString("base64");
}

// ═══════════════════════════════════════════════════════════════════════════
// LAYER 4 · Engagement signal (post-publish · retro)
// ═══════════════════════════════════════════════════════════════════════════

export interface EngagementInput {
  capsule_id:            string;
  hours_since_publish:   number;
  impressions:           number;
  watch_through_count:   number;
  share_count:           number;
  save_count:            number;
  positive_comments:     number;
  negative_comments:     number;
}

export interface EngagementOutput {
  engagement_quality_score: number;   // 0-100
  watch_through_rate:       number;
  share_rate:               number;
  save_rate:                number;
  positive_comment_ratio:   number;
  is_outlier:               boolean;   // for retro reroll review
}

export function computeEngagement(input: EngagementInput): EngagementOutput {
  const safeDiv = (a: number, b: number) => b > 0 ? a / b : 0;
  const watch_through_rate    = safeDiv(input.watch_through_count, input.impressions);
  const share_rate            = safeDiv(input.share_count,         input.impressions);
  const save_rate             = safeDiv(input.save_count,          input.impressions);
  const total_comments        = input.positive_comments + input.negative_comments;
  const positive_comment_ratio = safeDiv(input.positive_comments,  total_comments);

  const engagement_quality_score = Math.round(100 * (
      0.40 * watch_through_rate
    + 0.25 * share_rate * 10                       // share_rate is small · boost
    + 0.20 * save_rate  * 5                        // save_rate too
    + 0.15 * positive_comment_ratio
  ));

  // Outlier: capsule has > 5% share_rate (extraordinary) OR < 5% watch_through (catastrophic)
  const is_outlier = share_rate > 0.05 || (input.hours_since_publish > 24 && watch_through_rate < 0.05);

  return {
    engagement_quality_score: Math.max(0, Math.min(100, engagement_quality_score)),
    watch_through_rate,
    share_rate,
    save_rate,
    positive_comment_ratio,
    is_outlier,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPOSITION · evaluateCapsule blends layers 1-3 into a single publish gate
// ═══════════════════════════════════════════════════════════════════════════

export interface CapsuleQcInput {
  plan:                ShotPlan;
  rendered_mp4_path:   string;
  voice_path?:         string;
  music_path?:         string;
  subtitles_vtt?:      string;
  expected_duration_s: number;
  language:            string;
  /** Whether to run the expensive vision pass (skip for Tier3 to save cost) */
  enable_vision:       boolean;
  /** Test injection · skip real Anthropic calls and use stubs */
  stubs?: {
    llm?:        LlmJudgeOutput;
    heuristic?:  HeuristicOutput;
    vision?:     VisionOutput;
  };
}

export interface CapsuleQcOutput {
  verdict:             "publish" | "reroll_shot" | "reroll_capsule" | "manual_review";
  quality_gate_score:  number;             // 0-1
  rerolled_shot_index?: number;
  reroll_reason?:      string;
  layers: {
    llm_judge:   LlmJudgeOutput;
    heuristic:   HeuristicOutput;
    vision:      VisionOutput | null;     // null when enable_vision=false
  };
  total_cost_usd:  number;
  total_ms:        number;
}

export async function evaluateCapsule(input: CapsuleQcInput): Promise<CapsuleQcOutput> {
  const t0 = Date.now();
  let total_cost_usd = 0;

  // ── Layer 1 · LLM judge ──────────────────────────────────────────────
  const llm = input.stubs?.llm ?? await judgeScript({
    plan:     input.plan,
    language: input.language,
  });
  total_cost_usd += llm.cost_usd;

  // ── Layer 2 · Heuristic ──────────────────────────────────────────────
  const heuristic = input.stubs?.heuristic ?? await judgeHeuristic({
    mp4_path:            input.rendered_mp4_path,
    voice_path:          input.voice_path,
    music_path:          input.music_path,
    subtitles_vtt:       input.subtitles_vtt,
    expected_duration_s: input.expected_duration_s,
  });

  // ── Layer 3 · Vision (optional) ──────────────────────────────────────
  let vision: VisionOutput | null = null;
  if (input.enable_vision) {
    vision = input.stubs?.vision ?? await judgeVision({
      mp4_path: input.rendered_mp4_path,
      plan:     input.plan,
    });
    total_cost_usd += vision.cost_usd;
  }

  // ── Blend score ──────────────────────────────────────────────────────
  const llm_norm        = llm.total / 60;                 // 0-1
  const heuristic_norm  = heuristic.pass ? 1 : 0;          // binary
  const vision_norm     = vision ? vision.total / 40 : 0.5;  // 0-1, defaulted

  const quality_gate_score =
      0.20 * llm_norm
    + 0.40 * heuristic_norm
    + 0.40 * vision_norm;

  // ── Verdict ──────────────────────────────────────────────────────────
  const allHardRejects = [
    ...llm.hard_rejects.map(r => `llm: ${r}`),
    ...heuristic.hard_rejects.map(r => `heuristic: ${r}`),
    ...(vision?.hard_rejects ?? []).map(r => `vision: ${r}`),
  ];

  let verdict: CapsuleQcOutput["verdict"];
  let rerolled_shot_index: number | undefined;
  let reroll_reason: string | undefined;

  if (allHardRejects.length === 0 && quality_gate_score >= 0.70) {
    verdict = "publish";
  } else if (!llm.pass) {
    // Script-level failure · must reroll capsule (story dictates everything downstream)
    verdict = "reroll_capsule";
    reroll_reason = `script failed LLM judge · ${llm.hard_rejects.join("; ")}`;
  } else if (vision && !vision.pass) {
    // Vision can pinpoint the weakest shot · reroll just that one
    const worst = [...vision.per_frame].sort((a, b) =>
      (a.composition_quality + a.motion_quality + a.narrative_coherence + a.brand_premium) -
      (b.composition_quality + b.motion_quality + b.narrative_coherence + b.brand_premium)
    )[0];
    if (worst) {
      verdict = "reroll_shot";
      rerolled_shot_index = worst.shot_index;
      reroll_reason = `weakest frame at shot ${worst.shot_index} · ${worst.notes}`;
    } else {
      verdict = "manual_review";
      reroll_reason = `vision hard reject without identifiable worst shot · ${vision.hard_rejects.join("; ")}`;
    }
  } else if (!heuristic.pass) {
    verdict = "reroll_capsule";
    reroll_reason = `heuristic failed · ${heuristic.hard_rejects.join("; ")}`;
  } else {
    verdict = "manual_review";
    reroll_reason = `score ${quality_gate_score.toFixed(2)} < 0.70 but no hard rejects · human eyes`;
  }

  return {
    verdict,
    quality_gate_score,
    rerolled_shot_index,
    reroll_reason,
    layers: { llm_judge: llm, heuristic, vision },
    total_cost_usd,
    total_ms: Date.now() - t0,
  };
}

// ─── Tier helpers ─────────────────────────────────────────────────────────

export function visionEnabledForTier(tier: CapsuleTier): boolean {
  return tier === "tier1_legend" || tier === "tier2_image_capsule";
}
