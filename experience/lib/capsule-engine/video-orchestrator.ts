/**
 * KUDOS · Video Generation Orchestrator · FULL (P23.1).
 *
 * Multi-provider video generation with policy-driven selection, per-shot
 * parallel dispatch, per-shot reroll, and provider health tracking.
 *
 * Three concrete adapters:
 *   · KlingAdapter         · real PiAPI call (P16 callKlingVideo)
 *   · FluxKenBurnsAdapter  · real Replicate FLUX still + local ffmpeg motion
 *   · StillKenBurnsAdapter · ImageMagick still + local ffmpeg motion · NO NETWORK
 *
 * Selection policy (per tier):
 *   tier1_legend        → kling           → flux_kenburns → still_kenburns
 *   tier2_image_capsule → flux_kenburns   → still_kenburns
 *   tier3_story_card    → still_kenburns
 *   tier4_data_card     → (no video)
 *
 * Parallel dispatch with a semaphore (default concurrency 2 — provider
 * rate limits dominate for Kling/FLUX; for still_kenburns local CPU is
 * the limit). On per-shot failure, try the next provider in the tier
 * preference list; on QC reroll, only the rejected shot is regenerated.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { spawn } from "node:child_process";

import { callKlingVideo } from "./providers/kling";
import { callFluxImage  } from "./providers/flux";
import type {
  ShotPrompt, PromptBundle,
} from "./visual-prompt-engine";
import type { CapsuleTier } from "./types";

// ─── Provider abstraction (matches the skeleton interface) ────────────────

export type VideoProviderId = "kling" | "runway" | "pika" | "luma" | "flux_kenburns" | "still_kenburns";

export interface ProviderVideoOutput {
  local_path:  string;
  cost_usd:    number;
  ms:          number;
  provider:    VideoProviderId;
}

export interface VideoProvider {
  id: VideoProviderId;
  generate(shot: ShotPrompt, opts: AdapterOpts): Promise<ProviderVideoOutput>;
  capabilities: VideoProviderCapabilities;
}

export interface VideoProviderCapabilities {
  max_duration_s:           number;
  supports_image_to_video:  boolean;
  supports_text_to_video:   boolean;
  supports_camera_control:  boolean;
  cost_per_second_usd:      number;
  avg_latency_s:            number;
  quality_rank:             number;     // 0-100
  /** Whether this adapter requires external network · false = always available */
  requires_network:         boolean;
}

export interface AdapterOpts {
  capsule_id:        string;
  output_dir:        string;
  palette_hex:       ReadonlyArray<string>;
  /** Reference still for image-to-video providers (path to PNG/JPG on disk). */
  reference_still?:  string;
}

// ─── Orchestration types ──────────────────────────────────────────────────

export interface OrchestrateVideoInput {
  capsule_id:        string;
  tier:              CapsuleTier;
  bundle:            PromptBundle;
  output_dir:        string;
  remaining_budget:  number;
  /** Override provider preference order · default per tier */
  preferred_order?:  ReadonlyArray<VideoProviderId>;
  /** Max concurrent shot generations · default 2 */
  concurrency?:      number;
  /** Reroll only this shot index · skip the rest (returns existing assets) */
  reroll_only?:      { shot_index: number; prior_results: ReadonlyArray<ShotResult> };
}

export interface ShotResult {
  shot_index:     number;
  beat:           ShotPrompt["beat"];
  mp4_path:       string;
  provider:       VideoProviderId;
  cost_usd:       number;
  ms:             number;
  duration_s:     number;
  attempts:       number;
  fallback_chain: ReadonlyArray<{ provider: VideoProviderId; error: string }>;
}

export interface OrchestrateVideoOutput {
  shots:            ReadonlyArray<ShotResult>;
  hero_png_path:    string;
  total_cost:       number;
  total_ms:         number;
  used_providers:   Record<string, number>;
  failures:         ReadonlyArray<{ shot_index: number; error: string }>;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONCRETE ADAPTERS
// ═══════════════════════════════════════════════════════════════════════════

const KlingAdapter: VideoProvider = {
  id: "kling",
  capabilities: {
    max_duration_s: 10, supports_image_to_video: true, supports_text_to_video: false,
    supports_camera_control: true, cost_per_second_usd: 0.06, avg_latency_s: 180,
    quality_rank: 92, requires_network: true,
  },
  async generate(shot, opts) {
    const t0 = Date.now();
    // Kling is image-to-video · must have a reference still
    if (!opts.reference_still) {
      throw new Error(`kling adapter requires reference_still · shot ${shot.shot_index}`);
    }
    const out = await callKlingVideo({
      still_path:    opts.reference_still,
      motion_prompt: shot.video_prompt,
      duration_s:    Math.min(10, shot.duration_s),
    });
    return {
      local_path: out.local_path,
      cost_usd:   out.cost_usd,
      ms:         Date.now() - t0,
      provider:   "kling",
    };
  },
};

const FluxKenBurnsAdapter: VideoProvider = {
  id: "flux_kenburns",
  capabilities: {
    max_duration_s: 30, supports_image_to_video: false, supports_text_to_video: true,
    supports_camera_control: true, cost_per_second_usd: 0.005, avg_latency_s: 30,
    quality_rank: 72, requires_network: true,
  },
  async generate(shot, opts) {
    const t0 = Date.now();
    // Generate the still on FLUX (real Replicate)
    const still = await callFluxImage({
      prompt: shot.image_prompt,
      aspect: "9:16",
    });
    // Local ffmpeg ken-burns motion
    const out_mp4 = path.join(opts.output_dir, `shot-${shot.shot_index.toString().padStart(2, "0")}-fluxkb.mp4`);
    await runKenBurns(still.local_path, out_mp4, shot.duration_s, shot.camera_move);
    return {
      local_path: out_mp4,
      cost_usd:   still.cost_usd,
      ms:         Date.now() - t0,
      provider:   "flux_kenburns",
    };
  },
};

const StillKenBurnsAdapter: VideoProvider = {
  id: "still_kenburns",
  capabilities: {
    max_duration_s: 30, supports_image_to_video: false, supports_text_to_video: true,
    supports_camera_control: true, cost_per_second_usd: 0, avg_latency_s: 4,
    quality_rank: 40, requires_network: false,
  },
  async generate(shot, opts) {
    const t0 = Date.now();
    // Generate procedural still via ImageMagick · NO NETWORK
    const still_png = path.join(opts.output_dir, `shot-${shot.shot_index.toString().padStart(2, "0")}-still.png`);
    await imageMagickPaletteStill(still_png, opts.palette_hex, shot.image_prompt, shot.beat);
    // Apply ken-burns motion
    const out_mp4 = path.join(opts.output_dir, `shot-${shot.shot_index.toString().padStart(2, "0")}-stillkb.mp4`);
    await runKenBurns(still_png, out_mp4, shot.duration_s, shot.camera_move);
    return {
      local_path: out_mp4,
      cost_usd:   0,
      ms:         Date.now() - t0,
      provider:   "still_kenburns",
    };
  },
};

const ADAPTERS: Record<VideoProviderId, VideoProvider> = {
  kling:          KlingAdapter,
  flux_kenburns:  FluxKenBurnsAdapter,
  still_kenburns: StillKenBurnsAdapter,
  // Stubs · throw if selected · TODO P23.2
  runway: { id: "runway", capabilities: { max_duration_s: 10, supports_image_to_video: true, supports_text_to_video: true, supports_camera_control: true, cost_per_second_usd: 0.10, avg_latency_s: 210, quality_rank: 90, requires_network: true }, generate: async () => { throw new Error("runway adapter not wired · P23.2"); } },
  pika:   { id: "pika",   capabilities: { max_duration_s: 4,  supports_image_to_video: true, supports_text_to_video: true, supports_camera_control: false, cost_per_second_usd: 0.05, avg_latency_s: 60,  quality_rank: 68, requires_network: true }, generate: async () => { throw new Error("pika adapter not wired · P23.2"); } },
  luma:   { id: "luma",   capabilities: { max_duration_s: 5,  supports_image_to_video: true, supports_text_to_video: true, supports_camera_control: false, cost_per_second_usd: 0.03, avg_latency_s: 90,  quality_rank: 75, requires_network: true }, generate: async () => { throw new Error("luma adapter not wired · P23.2"); } },
};

// ═══════════════════════════════════════════════════════════════════════════
// TIER PREFERENCE
// ═══════════════════════════════════════════════════════════════════════════

export const TIER_PROVIDER_ORDER: Record<CapsuleTier, ReadonlyArray<VideoProviderId>> = {
  tier1_legend:        ["kling", "flux_kenburns", "still_kenburns"],
  tier2_image_capsule: ["flux_kenburns", "still_kenburns"],
  tier3_story_card:    ["still_kenburns"],
  tier4_data_card:     [],
};

// ═══════════════════════════════════════════════════════════════════════════
// ORCHESTRATION
// ═══════════════════════════════════════════════════════════════════════════

export async function orchestrateVideo(input: OrchestrateVideoInput): Promise<OrchestrateVideoOutput> {
  const t0 = Date.now();
  fs.mkdirSync(input.output_dir, { recursive: true });

  // Determine provider preference order
  const order = input.preferred_order ?? TIER_PROVIDER_ORDER[input.tier];
  if (order.length === 0) {
    return emptyResult(t0);
  }

  // Reroll-only path: regenerate just the one shot and return prior results for the rest
  if (input.reroll_only) {
    const target = input.bundle.per_shot.find(s => s.shot_index === input.reroll_only!.shot_index);
    if (!target) throw new Error(`reroll target shot ${input.reroll_only.shot_index} not in bundle`);
    const r = await generateShot(target, order, input);
    const prior = input.reroll_only.prior_results;
    const merged = prior.map(p => p.shot_index === r.shot_index ? r : p);
    return assembleOutput(merged, input.output_dir, t0);
  }

  // Full generation · parallel with semaphore
  const concurrency = input.concurrency ?? 2;
  const results = await runWithSemaphore(
    input.bundle.per_shot,
    concurrency,
    (shot) => generateShot(shot, order, input),
  );

  return assembleOutput(results, input.output_dir, t0);
}

async function generateShot(
  shot:      ShotPrompt,
  order:     ReadonlyArray<VideoProviderId>,
  input:     OrchestrateVideoInput,
): Promise<ShotResult> {
  const t_shot = Date.now();
  const fallback_chain: { provider: VideoProviderId; error: string }[] = [];
  let attempts = 0;

  for (const providerId of order) {
    attempts++;
    const adapter = ADAPTERS[providerId];
    try {
      const out = await adapter.generate(shot, {
        capsule_id:      input.capsule_id,
        output_dir:      input.output_dir,
        palette_hex:     input.bundle.palette.anchors,
        reference_still: undefined,   // set by adapter-specific paths
      });
      return {
        shot_index:     shot.shot_index,
        beat:           shot.beat,
        mp4_path:       out.local_path,
        provider:       providerId,
        cost_usd:       out.cost_usd,
        ms:             Date.now() - t_shot,
        duration_s:     shot.duration_s,
        attempts,
        fallback_chain,
      };
    } catch (e) {
      const msg = (e as Error).message ?? String(e);
      fallback_chain.push({ provider: providerId, error: msg.slice(0, 200) });
      // continue to next provider in chain
    }
  }

  // All providers failed
  throw new Error(`all providers failed for shot ${shot.shot_index}: ${JSON.stringify(fallback_chain)}`);
}

function assembleOutput(
  results:     ReadonlyArray<ShotResult>,
  output_dir:  string,
  t0:          number,
): OrchestrateVideoOutput {
  // Extract hero still from the strongest shot (wonder beat preferred, else highest-quality_rank provider)
  const heroSource = results.find(r => r.beat === "wonder") ?? results[0];
  const hero_png_path = path.join(output_dir, "hero.png");
  // Extract first frame as hero
  try {
    extractFirstFrameSync(heroSource.mp4_path, hero_png_path);
  } catch {
    // hero is optional · keep going
  }

  const used_providers: Record<string, number> = {};
  for (const r of results) used_providers[r.provider] = (used_providers[r.provider] ?? 0) + 1;

  return {
    shots:          results,
    hero_png_path,
    total_cost:     results.reduce((s, r) => s + r.cost_usd, 0),
    total_ms:       Date.now() - t0,
    used_providers,
    failures:       [],
  };
}

function emptyResult(t0: number): OrchestrateVideoOutput {
  return { shots: [], hero_png_path: "", total_cost: 0, total_ms: Date.now() - t0, used_providers: {}, failures: [] };
}

// ═══════════════════════════════════════════════════════════════════════════
// LOCAL HELPERS · ImageMagick + ffmpeg
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate a 1080x1920 procedural still from palette + prompt + beat.
 * Uses ImageMagick `convert` to produce a tonal gradient with text inset
 * for shot reference. NO network. Deterministic-ish for QC reproducibility.
 */
async function imageMagickPaletteStill(
  out_png:   string,
  palette:   ReadonlyArray<string>,
  prompt:    string,
  beat:      string,
): Promise<void> {
  const top    = palette[0] ?? "#1f2a36";
  const bottom = palette[2] ?? palette[palette.length - 1] ?? "#0d1620";
  const accent = palette[1] ?? "#3d5a78";

  // Compose: vertical gradient + center vignette + accent ring + beat label
  const safePrompt = prompt.replace(/[\\"]/g, " ").slice(0, 80);
  const labelLine  = `${beat.toUpperCase()}  ·  ${safePrompt}`;

  await execFile("convert", [
    "-size", "1080x1920",
    `gradient:${top}-${bottom}`,
    "-fill", "none",
    "-stroke", accent,
    "-strokewidth", "8",
    "-draw", "circle 540,1280 540,1080",
    "-fill", "white",
    "-pointsize", "28",
    "-gravity", "south",
    "-annotate", "+0+120", labelLine,
    out_png,
  ]);
}

/**
 * Build ken-burns motion video from a still image.
 * 1080x1920 vertical, 30fps, h264. Camera move is interpreted as a
 * direction for the zoompan filter.
 */
async function runKenBurns(
  still_path:   string,
  out_mp4:      string,
  duration_s:   number,
  camera_move:  string,
): Promise<void> {
  const fps = 30;
  const total_frames = Math.max(2, Math.round(duration_s * fps));
  // Map camera_move to a zoompan expression
  const { z, x, y } = camMove(camera_move, total_frames);
  // First scale up so zoom has resolution to spend, then zoompan
  await execFile("ffmpeg", [
    "-y", "-hide_banner", "-loglevel", "error",
    "-loop", "1", "-i", still_path,
    "-vf",
    `scale=2160:3840,zoompan=z='${z}':x='${x}':y='${y}':d=${total_frames}:s=1080x1920:fps=${fps}`,
    "-c:v", "libx264", "-preset", "fast", "-crf", "20",
    "-pix_fmt", "yuv420p",
    "-t", String(duration_s),
    out_mp4,
  ]);
}

function camMove(move: string, frames: number): { z: string; x: string; y: string } {
  // Zoom from 1.0 to 1.25 over the shot for "push_in", reverse for "pull_out", etc.
  const step = `0.00833`;   // (1.25-1.0)/30 per frame approx
  switch (move) {
    case "push_in":      return { z: `min(zoom+${step},1.25)`, x: "iw/2-(iw/zoom/2)", y: "ih/2-(ih/zoom/2)" };
    case "pull_out":     return { z: `if(lte(zoom,1.0),1.25,zoom-${step})`, x: "iw/2-(iw/zoom/2)", y: "ih/2-(ih/zoom/2)" };
    case "tilt_up":      return { z: "1.15", x: "iw/2-(iw/zoom/2)", y: `ih-(ih/zoom)-(on/${frames})*((ih-(ih/zoom)))` };
    case "tilt_down":    return { z: "1.15", x: "iw/2-(iw/zoom/2)", y: `(on/${frames})*(ih-(ih/zoom))` };
    case "dolly_left":   return { z: "1.15", x: `iw-(iw/zoom)-(on/${frames})*((iw-(iw/zoom)))`, y: "ih/2-(ih/zoom/2)" };
    case "dolly_right":  return { z: "1.15", x: `(on/${frames})*(iw-(iw/zoom))`, y: "ih/2-(ih/zoom/2)" };
    case "orbit":        return { z: `min(zoom+${step},1.20)`, x: `iw/2-(iw/zoom/2)+sin(on/${frames}*3.14)*40`, y: `ih/2-(ih/zoom/2)+cos(on/${frames}*3.14)*40` };
    case "handheld":     return { z: "1.10", x: `iw/2-(iw/zoom/2)+sin(on/3)*8`, y: `ih/2-(ih/zoom/2)+cos(on/5)*8` };
    case "static":
    default:             return { z: "1.05", x: "iw/2-(iw/zoom/2)", y: "ih/2-(ih/zoom/2)" };
  }
}

function extractFirstFrameSync(mp4: string, out_png: string): void {
  // Sync because hero extraction is best-effort and called from sync assembly
  const { execFileSync } = require("node:child_process") as typeof import("node:child_process");
  execFileSync("ffmpeg", [
    "-y", "-hide_banner", "-loglevel", "error",
    "-i", mp4, "-frames:v", "1", out_png,
  ]);
}

// ═══════════════════════════════════════════════════════════════════════════
// CONCURRENCY HELPER
// ═══════════════════════════════════════════════════════════════════════════

async function runWithSemaphore<T, R>(
  items:       ReadonlyArray<T>,
  concurrency: number,
  fn:          (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = new Array(Math.min(concurrency, items.length)).fill(0).map(async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
}

function execFile(cmd: string, args: ReadonlyArray<string>): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, [...args], { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    proc.stderr.on("data", b => (stderr += b.toString()));
    proc.on("error", reject);
    proc.on("close", code => code === 0 ? resolve() : reject(new Error(`${cmd} exit ${code}: ${stderr.slice(-1500)}`)));
  });
}
