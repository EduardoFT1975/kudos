/**
 * KUDOS · Capsule Compositor · FULL (P23.1).
 *
 * Final ffmpeg-based render. Produces:
 *   · final.mp4         · 1080x1920 H264 / AAC · faststart · 6-12 Mbps
 *   · thumb.png         · smart-frame thumbnail (brightest+colorful candidate)
 *   · subtitles.vtt     · the input VTT written verbatim
 *   · metadata.json     · capsule_id, duration, providers, cost, qc, asset paths
 *
 * Filter graph:
 *   1. concat shots (concat demuxer, lossless re-pack)
 *   2. scale/pad to 1080x1920 if any shot isn't already (defensive)
 *   3. overlay KUDOS brand bug bottom-right (PNG · optional)
 *   4. burn subtitles via subtitles filter
 *   5. amix audio: voice (full) + music (sidechain-ducked under voice) + sfx
 *   6. loudnorm to -16 LUFS
 *   7. encode H264 high yuv420p crf 22, AAC 192k, +faststart
 *   8. sample 5 candidate frames for thumbnail, pick brightest+most-colorful
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { spawn, execFileSync } from "node:child_process";

import type { ShotPlan } from "./story-director";

// ─── Public types ────────────────────────────────────────────────────────

export interface CompositeInput {
  plan:           ShotPlan;
  shots:          ReadonlyArray<{ shot_index: number; mp4_path: string }>;
  voice_path?:    string;
  music_path?:    string;
  sfx_path?:      string;
  subtitles_vtt?: string;
  output_dir:     string;
  brand_bug?:     boolean;
  brand_bug_path?: string;       // PNG · optional · defaults to ${output_dir}/brand-bug.png if exists
  /** Bitrate target · default 8 Mbps */
  target_kbps?:   number;
  /** Extra metadata fields (cost ledger, qc scores, providers used) */
  metadata_extra?: Record<string, unknown>;
}

export interface CompositeOutput {
  mp4_path:           string;
  thumb_path:         string;
  vtt_path:           string;
  metadata_path:      string;
  ms:                 number;
  ffmpeg_invocation:  string;
  thumbnail_pick: {
    candidate_count:  number;
    chosen_at_s:      number;
    score:            number;
    method:           "smart_frame" | "fallback_30pct";
  };
}

// ─── Entry ───────────────────────────────────────────────────────────────

export async function composite(input: CompositeInput): Promise<CompositeOutput> {
  const t0 = Date.now();
  fs.mkdirSync(input.output_dir, { recursive: true });

  if (!input.shots.length) throw new Error("compositor: no shots provided");

  const out_mp4      = path.join(input.output_dir, "final.mp4");
  const out_thumb    = path.join(input.output_dir, "thumb.png");
  const out_vtt      = path.join(input.output_dir, "subtitles.vtt");
  const out_metadata = path.join(input.output_dir, "metadata.json");

  // 1. Subtitles to disk (used by the subtitles filter)
  if (input.subtitles_vtt) {
    fs.writeFileSync(out_vtt, input.subtitles_vtt);
  }

  // 2. Concat list for ffmpeg concat demuxer
  const sorted_shots = [...input.shots].sort((a, b) => a.shot_index - b.shot_index);
  const concat_file = path.join(input.output_dir, "concat.txt");
  fs.writeFileSync(
    concat_file,
    sorted_shots.map(s => `file '${s.mp4_path.replace(/'/g, "'\\''")}'`).join("\n"),
  );

  // 3. Build filter_complex + map args
  const { args: ffArgs, invocation } = buildFfmpegArgs({
    concat_file,
    voice_path:     input.voice_path,
    music_path:     input.music_path,
    sfx_path:       input.sfx_path,
    subtitles_path: input.subtitles_vtt ? out_vtt : undefined,
    brand_bug_path: resolveBrandBug(input),
    out_mp4,
    target_kbps:    input.target_kbps ?? 8000,
  });
  await runFfmpeg(ffArgs);

  // 4. Smart thumbnail pick
  const thumb = await pickSmartThumbnail(out_mp4, out_thumb, input.plan.duration_seconds);

  // 5. Cleanup
  try { fs.unlinkSync(concat_file); } catch {}

  // 6. Metadata
  const meta = {
    capsule_id:        input.plan.capsule_id,
    poi_id:            input.plan.poi_id,
    tier:              input.plan.tier,
    duration_seconds:  input.plan.duration_seconds,
    composed_at:       new Date().toISOString(),
    shots:             sorted_shots.length,
    assets: {
      video:     path.relative(input.output_dir, out_mp4),
      thumb:     path.relative(input.output_dir, out_thumb),
      subtitles: input.subtitles_vtt ? path.relative(input.output_dir, out_vtt) : null,
    },
    story: {
      title:    input.plan.raw.title,
      hook:     input.plan.arc.hook,
      meaning:  input.plan.arc.meaning,
      close:    input.plan.arc.close,
      angle:    input.plan.arc.angle,
    },
    sources:           input.plan.sources,
    ffmpeg_invocation: invocation,
    extra:             input.metadata_extra ?? {},
  };
  fs.writeFileSync(out_metadata, JSON.stringify(meta, null, 2));

  return {
    mp4_path:    out_mp4,
    thumb_path:  out_thumb,
    vtt_path:    out_vtt,
    metadata_path: out_metadata,
    ms:          Date.now() - t0,
    ffmpeg_invocation: invocation,
    thumbnail_pick: thumb,
  };
}

// ─── ffmpeg args builder ──────────────────────────────────────────────────

interface BuildArgs {
  concat_file:     string;
  voice_path?:     string;
  music_path?:     string;
  sfx_path?:       string;
  subtitles_path?: string;
  brand_bug_path?: string;
  out_mp4:         string;
  target_kbps:     number;
}

function buildFfmpegArgs(b: BuildArgs): { args: string[]; invocation: string } {
  const inputs: string[] = ["-f", "concat", "-safe", "0", "-i", b.concat_file];
  const audioInputs: Array<{ label: string; path: string; gain_db: number; is_voice: boolean }> = [];
  if (b.voice_path && fs.existsSync(b.voice_path)) audioInputs.push({ label: "voice", path: b.voice_path, gain_db: -2,  is_voice: true });
  if (b.music_path && fs.existsSync(b.music_path)) audioInputs.push({ label: "music", path: b.music_path, gain_db: -18, is_voice: false });
  if (b.sfx_path   && fs.existsSync(b.sfx_path))   audioInputs.push({ label: "sfx",   path: b.sfx_path,   gain_db: -10, is_voice: false });
  for (const a of audioInputs) inputs.push("-i", a.path);

  const brandIdx = b.brand_bug_path && fs.existsSync(b.brand_bug_path) ? inputs.length / 2 : -1;
  if (brandIdx >= 0 && b.brand_bug_path) inputs.push("-i", b.brand_bug_path);

  // Filter graph
  const filters: string[] = [];

  // Video: ensure 1080x1920 (defensive scale/pad), optional brand bug overlay, optional subtitles burn-in
  let videoLabel = "[0:v]";
  filters.push(`${videoLabel}scale='if(gt(a,1080/1920),1080,-2)':'if(gt(a,1080/1920),-2,1920)',pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1[vscaled]`);
  videoLabel = "[vscaled]";
  if (brandIdx >= 0) {
    filters.push(`${videoLabel}[${brandIdx}:v]overlay=W-w-32:H-h-48:format=auto[vbranded]`);
    videoLabel = "[vbranded]";
  }
  if (b.subtitles_path) {
    // Escape the path for the subtitles filter
    const subs = b.subtitles_path.replace(/'/g, "\\'").replace(/:/g, "\\:");
    filters.push(`${videoLabel}subtitles='${subs}':force_style='FontName=DejaVu Sans,FontSize=22,PrimaryColour=&HFFFFFFFF,OutlineColour=&H802A1410,BorderStyle=1,Outline=2,Shadow=1,Alignment=2,MarginV=72'[vfinal]`);
    videoLabel = "[vfinal]";
  } else {
    filters.push(`${videoLabel}null[vfinal]`);
    videoLabel = "[vfinal]";
  }

  // Audio: voice + music (sidechained under voice) + sfx
  // ffmpeg filter labels are SINGLE-USE. If voice feeds the sidechain reference
  // AND the amix output, we must asplit it first.
  let audioMap: string | null = null;
  if (audioInputs.length > 0) {
    const hasVoice = audioInputs.some(a => a.is_voice);
    const hasMusic = audioInputs.some(a => a.label === "music");
    const needsSplit = hasVoice && hasMusic;
    // Stage 1: gain each track. Voice gets an asplit so it can drive sidechain AND amix.
    audioInputs.forEach((a, idx) => {
      const inputIdx = idx + 1;   // 0 is the video concat input
      const gain = Math.pow(10, a.gain_db / 20).toFixed(3);
      if (a.is_voice && needsSplit) {
        filters.push(`[${inputIdx}:a]volume=${gain},aresample=44100,asplit=2[voice_mix][voice_ref]`);
      } else {
        filters.push(`[${inputIdx}:a]volume=${gain},aresample=44100[${a.label}_g]`);
      }
    });
    // Stage 2: sidechain music under voice if both present
    // sidechaincompress requires both inputs in the same sample format/layout.
    // Normalize each branch with aformat before the compressor in ffmpeg 4.x.
    if (needsSplit) {
      filters.push(`[music_g]aformat=sample_fmts=fltp:channel_layouts=stereo:sample_rates=44100[music_ready]`);
      filters.push(`[voice_ref]aformat=sample_fmts=fltp:channel_layouts=stereo:sample_rates=44100[voice_ready]`);
      filters.push(`[music_ready][voice_ready]sidechaincompress=threshold=0.04:ratio=8:attack=20:release=300[music_ducked]`);
    }
    // Stage 3: amix everything
    const labels: string[] = [];
    for (const a of audioInputs) {
      if (a.label === "music" && needsSplit) labels.push("[music_ducked]");
      else if (a.is_voice && needsSplit)     labels.push("[voice_mix]");
      else                                   labels.push(`[${a.label}_g]`);
    }
    if (labels.length === 1) {
      filters.push(`${labels[0]}loudnorm=I=-16:LRA=11:TP=-1.0[aout]`);
    } else {
      filters.push(`${labels.join("")}amix=inputs=${labels.length}:duration=longest:dropout_transition=0:normalize=0,loudnorm=I=-16:LRA=11:TP=-1.0[aout]`);
    }
    audioMap = "[aout]";
  }

  const args: string[] = [
    "-y", "-hide_banner", "-loglevel", "error",
    ...inputs,
    "-filter_complex", filters.join(";"),
    "-map", videoLabel,
    ...(audioMap ? ["-map", audioMap] : []),
    "-c:v", "libx264", "-preset", "medium", "-profile:v", "high",
    "-b:v", `${b.target_kbps}k`, "-maxrate", `${Math.round(b.target_kbps * 1.5)}k`, "-bufsize", `${b.target_kbps * 2}k`,
    "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "192k",
    "-movflags", "+faststart",
    "-r", "30",
    b.out_mp4,
  ];

  // Build a readable invocation string for metadata
  const invocation = ["ffmpeg", ...args.map(a => a.includes(" ") || a.includes(";") || a.includes("[") ? JSON.stringify(a) : a)].join(" ");

  return { args, invocation };
}

function resolveBrandBug(input: CompositeInput): string | undefined {
  if (input.brand_bug === false) return undefined;
  if (input.brand_bug_path) return input.brand_bug_path;
  const candidate = path.join(input.output_dir, "brand-bug.png");
  if (fs.existsSync(candidate)) return candidate;
  return undefined;
}

// ─── Smart thumbnail picker ───────────────────────────────────────────────

interface ThumbCandidate {
  t_s:        number;
  png_path:   string;
  brightness: number;
  colorfulness: number;
  score:      number;
}

async function pickSmartThumbnail(
  mp4:         string,
  out_thumb:   string,
  duration_s:  number,
): Promise<CompositeOutput["thumbnail_pick"]> {
  // Sample 5 candidates at 15%, 30%, 50%, 70%, 88% of duration
  const fractions = [0.15, 0.30, 0.50, 0.70, 0.88];
  const dir = path.dirname(out_thumb);
  const candidates: ThumbCandidate[] = [];
  for (const f of fractions) {
    const t = Math.max(0.5, duration_s * f);
    const png = path.join(dir, `thumb-cand-${f.toFixed(2)}.png`);
    try {
      await execFfmpegFrame(mp4, t, png);
      const stats = imageMagickStatsSync(png);
      const score = stats.brightness * 0.5 + stats.colorfulness * 0.5;
      candidates.push({ t_s: t, png_path: png, ...stats, score });
    } catch {
      // ignore failed candidates
    }
  }

  if (candidates.length === 0) {
    // Fallback · single frame at 30%
    await execFfmpegFrame(mp4, duration_s * 0.30, out_thumb);
    return { candidate_count: 0, chosen_at_s: duration_s * 0.30, score: 0, method: "fallback_30pct" };
  }

  // Pick highest score
  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];
  fs.copyFileSync(best.png_path, out_thumb);
  // Cleanup other candidates
  for (const c of candidates) {
    if (c.png_path !== out_thumb) { try { fs.unlinkSync(c.png_path); } catch {} }
  }
  return { candidate_count: candidates.length, chosen_at_s: best.t_s, score: best.score, method: "smart_frame" };
}

async function execFfmpegFrame(mp4: string, t_s: number, out_png: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(process.env.FFMPEG_BIN ?? "ffmpeg", [
      "-y", "-hide_banner", "-loglevel", "error",
      "-ss", String(t_s), "-i", mp4,
      "-frames:v", "1", out_png,
    ], { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    proc.stderr.on("data", b => (stderr += b.toString()));
    proc.on("error", reject);
    proc.on("close", code => code === 0 ? resolve() : reject(new Error(`ffmpeg frame extract: ${stderr.slice(-500)}`)));
  });
}

function imageMagickStatsSync(png: string): { brightness: number; colorfulness: number } {
  // ImageMagick identify · returns mean (brightness) and standard_deviation (proxy for colorfulness)
  try {
    const meanStr = execFileSync("identify", [
      "-format", "%[fx:mean*100]\n%[fx:standard_deviation*100]\n", png,
    ], { stdio: ["ignore", "pipe", "pipe"] }).toString();
    const [mean, stddev] = meanStr.trim().split("\n").map(s => parseFloat(s.trim()) || 0);
    // Brightness sweet-spot 35-65 (penalize too dark or too washed)
    const brightness = mean >= 35 && mean <= 65 ? mean : Math.max(0, 65 - Math.abs(mean - 50));
    return { brightness, colorfulness: stddev };
  } catch {
    return { brightness: 0, colorfulness: 0 };
  }
}

// ─── ffmpeg runner ────────────────────────────────────────────────────────

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const ff = spawn(process.env.FFMPEG_BIN ?? "ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    ff.stderr.on("data", (b) => { stderr += b.toString(); });
    ff.on("error", reject);
    ff.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg compositor exit ${code}\n${stderr.slice(-2000)}`));
    });
  });
}
