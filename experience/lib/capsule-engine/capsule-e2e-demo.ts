/**
 * KUDOS · Capsule Engine · End-to-end execution demo (P23.1).
 *
 *   tsc --module commonjs --target es2020 --moduleResolution node \
 *     --esModuleInterop --skipLibCheck --outDir /tmp/cap-build \
 *     lib/capsule-engine/capsule-e2e-demo.ts (+ deps)
 *   node /tmp/cap-build/capsule-e2e-demo.js
 *
 * This demo runs the full pipeline end-to-end WITHOUT external network calls
 * by selecting the still_kenburns adapter for video and stubbing the Claude
 * story / voice synthesis with hand-authored content. The orchestration code
 * path is the SAME one tier1 would execute; only the adapter changes.
 *
 * What runs LIVE:
 *   · video-orchestrator (still_kenburns adapter · ImageMagick + ffmpeg)
 *   · compositor (real ffmpeg graph)
 *   · qc-engine layer 2 (heuristic ffprobe / ffmpeg signal analysis)
 *
 * What's stubbed (network-bound):
 *   · Claude story (hand-authored ShotPlan)
 *   · Cartesia voice (silent audio track of correct duration)
 *   · QC layer 1 (LLM judge) and layer 3 (vision) injected with mock outputs
 *
 * The result is a REAL final.mp4 + thumb.png + metadata.json + qc verdict.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { spawn } from "node:child_process";

import { orchestrateVideo, TIER_PROVIDER_ORDER } from "./video-orchestrator";
import { composite }                              from "./compositor";
import { evaluateCapsule, visionEnabledForTier }  from "./qc-engine";
import type { ShotPlan, TaggedShot }              from "./story-director";
import type { PromptBundle }                      from "./visual-prompt-engine";
import type { CapsuleTier }                       from "./types";

const OUT_DIR = path.join(os.tmpdir(), `kudos-capsule-${Date.now()}`);
fs.mkdirSync(OUT_DIR, { recursive: true });

// ─── 1. Hand-authored ShotPlan (would normally come from story-director + Claude) ─

const TIER: CapsuleTier = "tier3_story_card";   // 15s · local-only providers
const DURATION_S = 15;

const shots: TaggedShot[] = [
  { shot: 1, start_s: 0,  end_s: 2.5, beat: "hook",       visual: "Coliseo emerging from morning mist", camera: "push_in",  purpose: "open curiosity", video_prompt: "slow push toward Coliseo amphitheatre at dawn, warm light, no text", image_prompt: "Rome Coliseum at dawn from low angle, warm umber light, cinematic", intent: "create curiosity in first 2 seconds" },
  { shot: 2, start_s: 2.5, end_s: 8,  beat: "wonder",     visual: "Wide aerial circle of the arches",   camera: "orbit",    purpose: "the payoff visual", video_prompt: "orbit around Coliseo exterior, ancient stone arches, sweeping motion", image_prompt: "Rome Coliseum aerial perspective, golden hour, dramatic arches", intent: "the payoff moment" },
  { shot: 3, start_s: 8,   end_s: 13, beat: "meaning",    visual: "Interior arena floor where gladiators fought",  camera: "pull_out", purpose: "anchor history", video_prompt: "slow pull back from arena floor exposing tiers of seats", image_prompt: "Inside Coliseum arena, gladiator perspective, hypogeum visible below", intent: "the why · earned by the wonder shot" },
  { shot: 4, start_s: 13,  end_s: 15, beat: "close",      visual: "Single shaft of light on weathered stone",       camera: "tilt_up",  purpose: "leave breath", video_prompt: "tilt up from weathered stone to open sky above Coliseo", image_prompt: "Coliseum stone column lit by single shaft of light, contemplative", intent: "land the feeling" },
];

const plan: ShotPlan = {
  capsule_id:       `cap-coliseo-demo-${Date.now()}`,
  poi_id:           "coliseo",
  tier:             TIER,
  duration_seconds: DURATION_S,
  arc: {
    hook:       "Two thousand years ago, fifty thousand voices roared from these stones.",
    escalation: "",
    wonder:     "Sunrise over the Coliseo, dust still in the air from the morning mass.",
    meaning:    "What survives is not the empire but the architecture of an idea: a place where a city held its breath together.",
    close:      "Rome is still listening.",
    angle:      "civilizational continuity",
    emotional_curve: [0.85, 0.95, 0.80, 0.40],
  },
  shots,
  sources: [
    { title: "Coliseo: Rome\u2019s Great Amphitheatre · Hopkins/Beard", year: "2005" },
    { title: "UNESCO World Heritage List · Historic Centre of Rome", year: "1980" },
  ],
  raw: {
    title:    "Coliseo Romano · Civilizational Continuity",
    hook:     "Two thousand years ago, fifty thousand voices roared from these stones.",
    meaning:  "What survives is not the empire but the architecture of an idea.",
    promise:  "Rome is still listening.",
    script:   "Two thousand years ago, fifty thousand voices roared from these stones. Sunrise over the Coliseo, dust still in the air. What survives is not the empire but the architecture of an idea: a place where a city held its breath together. Rome is still listening.",
    shotList: shots,
    subtitlesVTT: buildVtt(shots),
    musicMood:    "cinematic warm orchestral",
    voiceStyle:   "intimate documentary",
    sources: [],
    _meta: { tokens_in: 0, tokens_out: 0, cost_usd: 0, ms: 0 },
  },
};

// ─── 2. Build a PromptBundle (would normally come from visual-prompt-engine) ─

const bundle: PromptBundle = {
  capsule_id:      plan.capsule_id,
  poi_id:          plan.poi_id,
  palette: {
    anchors:     ["#8b6c42", "#c4a36a", "#3d2e1f", "#f0e4cb"],   // ancient roman warm umber
    era_label:   "ancient roman",
    time_of_day: "golden_hour",
  },
  motion_grammar: {
    intensity: 0.7,
    per_beat: {
      hook: "push_in", escalation: "orbit", wonder: "orbit",
      meaning: "pull_out", close: "tilt_up",
    },
  },
  per_shot: shots.map(s => ({
    shot_index: s.shot,
    beat:       s.beat,
    image_prompt: s.image_prompt,
    video_prompt: s.video_prompt,
    duration_s:   s.end_s - s.start_s,
    camera_move:  ({ hook: "push_in" as const, escalation: "orbit" as const, wonder: "orbit" as const, meaning: "pull_out" as const, close: "tilt_up" as const })[s.beat],
  })),
  negative_prompt: "text, watermark, logo, blurry, distorted, morphing",
};

// ─── 3. Run the pipeline ─────────────────────────────────────────────────

async function main() {
  log("KUDOS CAPSULE END-TO-END · " + plan.capsule_id);
  log(`output_dir = ${OUT_DIR}`);
  log(`tier = ${TIER} (using ${TIER_PROVIDER_ORDER[TIER].join(" -> ")})`);
  log("");

  const t_total = Date.now();

  // ── Video orchestration ──────────────────────────────────────────────
  log("STAGE: video-orchestrator");
  const video = await orchestrateVideo({
    capsule_id:       plan.capsule_id,
    tier:             TIER,
    bundle,
    output_dir:       OUT_DIR,
    remaining_budget: 0.10,
    concurrency:      2,
  });
  for (const s of video.shots) {
    log(`  shot ${s.shot_index} [${s.beat.padEnd(10)}] provider=${s.provider.padEnd(14)} ${s.ms}ms  $${s.cost_usd.toFixed(4)}  ${path.basename(s.mp4_path)}`);
  }
  log(`  hero: ${path.basename(video.hero_png_path)}`);
  log(`  total: ${video.total_ms}ms  $${video.total_cost.toFixed(4)}  providers=${JSON.stringify(video.used_providers)}`);
  log("");

  // ── Voice (stubbed · generate silence of correct duration) ───────────
  log("STAGE: voice (network stub · using silent track)");
  const voice_path = path.join(OUT_DIR, "voice.wav");
  await silentWav(voice_path, DURATION_S);
  log(`  voice.wav (${DURATION_S}s silent track placeholder)`);
  log("");

  // ── Sound design (stubbed · generate quiet sine for music) ───────────
  log("STAGE: sound design (network stub · using ambient sine)");
  const music_path = path.join(OUT_DIR, "music.wav");
  await ambientSine(music_path, DURATION_S);
  log(`  music.wav (${DURATION_S}s ambient sine placeholder)`);
  log("");

  // ── Compositor ───────────────────────────────────────────────────────
  log("STAGE: compositor (REAL ffmpeg)");
  const composed = await composite({
    plan,
    shots:         video.shots.map(s => ({ shot_index: s.shot_index, mp4_path: s.mp4_path })),
    voice_path,
    music_path,
    subtitles_vtt: plan.raw.subtitlesVTT,
    output_dir:    OUT_DIR,
    brand_bug:     false,    // no brand PNG in this demo
    target_kbps:   8000,
    metadata_extra: {
      providers_used: video.used_providers,
      cost_breakdown: { video: video.total_cost, voice: 0, music: 0, compose: 0 },
    },
  });
  log(`  final.mp4    = ${path.basename(composed.mp4_path)}`);
  log(`  thumb.png    = ${path.basename(composed.thumb_path)} (method=${composed.thumbnail_pick.method}, at ${composed.thumbnail_pick.chosen_at_s.toFixed(1)}s, score=${composed.thumbnail_pick.score.toFixed(1)})`);
  log(`  subtitles    = ${path.basename(composed.vtt_path)}`);
  log(`  metadata     = ${path.basename(composed.metadata_path)}`);
  log(`  ffmpeg ran in ${composed.ms}ms`);
  log("");

  // ── QC ───────────────────────────────────────────────────────────────
  log("STAGE: qc-engine");
  const qc = await evaluateCapsule({
    plan,
    rendered_mp4_path:   composed.mp4_path,
    voice_path,
    music_path,
    subtitles_vtt:       plan.raw.subtitlesVTT,
    expected_duration_s: DURATION_S,
    language:            "es",
    enable_vision:       false,    // network-bound · skip in demo
    stubs: {
      // Layer 1 (LLM judge) · network-bound · stub with realistic verdict
      llm: {
        scores: { hook_strength: 8, narrative_arc: 8, factual_grounding: 7, voice_distinctiveness: 8, visual_concretness: 7, emotional_payoff: 8 },
        total: 46,
        pass: true,
        hard_rejects: [],
        feedback: "strong hook · meaning earned · sources present",
        cost_usd: 0,
        ms: 0,
      },
    },
  });
  log(`  layer 1 (llm judge):  total=${qc.layers.llm_judge.total}/60  pass=${qc.layers.llm_judge.pass}  [stub]`);
  log(`  layer 2 (heuristic): motion=${qc.layers.heuristic.motion_intensity.toFixed(1)} scene_rate=${qc.layers.heuristic.scene_change_rate.toFixed(2)} lufs=${qc.layers.heuristic.audio_lufs.toFixed(1)} black=${qc.layers.heuristic.black_frame_pct.toFixed(1)}% dur=${qc.layers.heuristic.duration_s.toFixed(1)}s  pass=${qc.layers.heuristic.pass}`);
  if (qc.layers.heuristic.hard_rejects.length > 0) {
    qc.layers.heuristic.hard_rejects.forEach(r => log(`    HEURISTIC REJECT: ${r}`));
  }
  log(`  layer 3 (vision):    skipped (tier3 + network-bound)`);
  log(`  quality_gate_score = ${qc.quality_gate_score.toFixed(3)}   verdict = ${qc.verdict}`);
  if (qc.reroll_reason) log(`  reroll_reason = ${qc.reroll_reason}`);
  log("");

  // ── Final report ─────────────────────────────────────────────────────
  log("================================================================");
  log("FINAL CAPSULE");
  log("================================================================");
  log(`capsule_id  : ${plan.capsule_id}`);
  log(`tier        : ${TIER}`);
  log(`duration    : ${DURATION_S}s`);
  log(`total_ms    : ${Date.now() - t_total}ms`);
  log(`total_cost  : $${(video.total_cost + qc.total_cost_usd).toFixed(4)}`);
  log(`verdict     : ${qc.verdict}`);
  log("");
  log("ARTIFACTS:");
  log(`  ${composed.mp4_path}`);
  log(`  ${composed.thumb_path}`);
  log(`  ${composed.vtt_path}`);
  log(`  ${composed.metadata_path}`);
  log("");

  // File sanity check
  const stats = (p: string) => { try { return `${fs.statSync(p).size} bytes`; } catch { return "MISSING"; } };
  log("FILE SANITY:");
  log(`  final.mp4   : ${stats(composed.mp4_path)}`);
  log(`  thumb.png   : ${stats(composed.thumb_path)}`);
  log(`  subtitles   : ${stats(composed.vtt_path)}`);
  log(`  metadata    : ${stats(composed.metadata_path)}`);
}

// ─── helpers ─────────────────────────────────────────────────────────────

function buildVtt(shots: TaggedShot[]): string {
  const lines = ["WEBVTT", ""];
  const captions = [
    "Two thousand years ago, fifty thousand voices roared from these stones.",
    "Sunrise over the Coliseo, dust still in the air.",
    "What survives is not the empire — but the architecture of an idea.",
    "Rome is still listening.",
  ];
  shots.forEach((s, i) => {
    lines.push(timecode(s.start_s) + " --> " + timecode(s.end_s));
    lines.push(captions[i] ?? "");
    lines.push("");
  });
  return lines.join("\n");
}

function timecode(s: number): string {
  const hh = Math.floor(s / 3600).toString().padStart(2, "0");
  const mm = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
  const ss = (s % 60).toFixed(3).padStart(6, "0");
  return `${hh}:${mm}:${ss.replace(".", ".")}`;
}

function silentWav(out: string, duration_s: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", [
      "-y", "-hide_banner", "-loglevel", "error",
      "-f", "lavfi", "-i", `anullsrc=channel_layout=stereo:sample_rate=44100`,
      "-t", String(duration_s), out,
    ], { stdio: ["ignore", "pipe", "pipe"] });
    proc.on("error", reject);
    proc.on("close", c => c === 0 ? resolve() : reject(new Error(`silentWav exit ${c}`)));
  });
}

function ambientSine(out: string, duration_s: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", [
      "-y", "-hide_banner", "-loglevel", "error",
      "-f", "lavfi", "-i", `sine=frequency=110:duration=${duration_s}:sample_rate=44100`,
      "-af", "volume=0.05", out,
    ], { stdio: ["ignore", "pipe", "pipe"] });
    proc.on("error", reject);
    proc.on("close", c => c === 0 ? resolve() : reject(new Error(`ambientSine exit ${c}`)));
  });
}

function log(s: string) { console.log(s); }

main().catch(e => {
  console.error("DEMO FAILED:", e.message);
  console.error(e.stack);
  process.exit(1);
});
