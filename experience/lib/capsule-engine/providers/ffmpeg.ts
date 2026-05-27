/**
 * KUDOS · Provider · ffmpeg composition.
 *
 * Real implementation · spawns the system `ffmpeg` binary in a child process.
 * Produces:
 *   1. <output>.mp4    · concat shots + audio mix + subtitle burn-in
 *   2. <output>-thumb.jpg · frame extract at climax (~88% of duration)
 *   3. <output>.vtt    · the subtitles passed in (written to disk verbatim)
 *
 * Pipeline:
 *   - concat video shots (h264 baseline yuv420p)
 *   - mix voice (-8 LUFS) + music (-18 LUFS) + sfx (-14 LUFS) via amix
 *   - burn subtitles via subtitles filter (force_style)
 *   - final encode: h264 high yuv420p · faststart · loudness-normalized aac
 */
import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import type { ComposeInput, ComposeOutput } from "../types";

export async function callFfmpegCompose(input: ComposeInput): Promise<ComposeOutput> {
  const t0 = Date.now();
  if (!input.shots.length) throw new Error("ffmpeg.compose: no shots provided");

  const out_mp4 = input.output_path;
  const out_jpg = out_mp4.replace(/\.mp4$/, "-thumb.jpg");
  const out_vtt = out_mp4.replace(/\.mp4$/, ".vtt");
  const dir = path.dirname(out_mp4);
  fs.mkdirSync(dir, { recursive: true });

  // 1. Write subtitles
  if (input.subtitles) {
    fs.writeFileSync(out_vtt, input.subtitles);
  }

  // 2. Concat list
  const concat_file = path.join(dir, `concat-${Date.now()}.txt`);
  fs.writeFileSync(
    concat_file,
    input.shots.map((s) => `file '${s.path.replace(/'/g, "'\\''")}'`).join("\n"),
  );

  // 3. Mix audio (voice/music/sfx · any of the three may be missing)
  const audio_inputs: string[] = [];
  const audio_filters: string[] = [];
  let aidx = 1;   // 0 is the concat video input
  if (input.voice_path && fs.existsSync(input.voice_path)) {
    audio_inputs.push("-i", input.voice_path);
    audio_filters.push(`[${aidx}:a]volume=0.40[v];`);
    aidx++;
  }
  if (input.music_path && fs.existsSync(input.music_path)) {
    audio_inputs.push("-i", input.music_path);
    audio_filters.push(`[${aidx}:a]volume=0.13[m];`);
    aidx++;
  }
  if (input.sfx_path && fs.existsSync(input.sfx_path)) {
    audio_inputs.push("-i", input.sfx_path);
    audio_filters.push(`[${aidx}:a]volume=0.20[f];`);
    aidx++;
  }

  // Build amix label list
  const amixIns = ["v", "m", "f"].filter((lbl) =>
    audio_filters.some((f) => f.includes(`[${lbl}]`))
  );
  const amix = amixIns.length
    ? `${amixIns.map((l) => `[${l}]`).join("")}amix=inputs=${amixIns.length}:duration=longest:weights=${amixIns.map(() => 1).join(" ")},aresample=44100,loudnorm=I=-16:LRA=11:TP=-1.0[aout]`
    : "";

  const vf = input.subtitles
    ? `subtitles='${out_vtt.replace(/'/g, "'\\''")}':force_style='FontName=Poppins,FontSize=18,PrimaryColour=&HFFFFFFFF,OutlineColour=&H802A1410,BorderStyle=1,Outline=2,Shadow=1,Alignment=2,MarginV=24'`
    : "null";

  const args = [
    "-y", "-hide_banner", "-loglevel", "error",
    "-f", "concat", "-safe", "0", "-i", concat_file,
    ...audio_inputs,
    "-filter_complex", audio_filters.join("") + (amix ? amix : ""),
    "-map", "0:v:0",
    ...(amix ? ["-map", "[aout]"] : []),
    "-vf", vf,
    "-c:v", "libx264", "-preset", "medium", "-profile:v", "high", "-crf", "22", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "192k",
    "-movflags", "+faststart",
    out_mp4,
  ];

  await runFfmpeg(args);

  // 4. Thumbnail at 88% of duration
  const total_s = input.shots.reduce((s, x) => s + x.duration_s, 0);
  const at = Math.max(1, total_s * 0.88);
  await runFfmpeg([
    "-y", "-hide_banner", "-loglevel", "error",
    "-ss", String(at), "-i", out_mp4,
    "-vframes", "1", "-q:v", "3",
    out_jpg,
  ]);

  // 5. Cleanup concat list
  try { fs.unlinkSync(concat_file); } catch {}

  return {
    mp4_path:   out_mp4,
    thumb_path: out_jpg,
    vtt_path:   out_vtt,
    ms:         Date.now() - t0,
  };
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const ff = spawn(process.env.FFMPEG_BIN ?? "ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    ff.stderr.on("data", (b) => { stderr += b.toString(); });
    ff.on("error", reject);
    ff.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited ${code}\n${stderr.slice(-2000)}`));
    });
  });
}
