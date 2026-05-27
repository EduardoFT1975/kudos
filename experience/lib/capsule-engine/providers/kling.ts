/**
 * KUDOS · Provider · Kling 2.1 Master via PiAPI.
 *
 *   POST  https://api.piapi.ai/api/v1/task
 *   GET   https://api.piapi.ai/api/v1/task/{task_id}
 *
 * Image-to-video · returns local MP4 path after polling completion.
 * Documented at https://piapi.ai/docs/kling
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { env } from "../env";
import { http, withRetry, poll } from "../retry";
import type { VideoGenInput, VideoGenOutput } from "../types";

const API_CREATE = "https://api.piapi.ai/api/v1/task";
const API_STATUS = (id: string) => `https://api.piapi.ai/api/v1/task/${id}`;

const PRICE_PER_SECOND = 0.06;   // Kling 2.1 master std mode · Q2 2025

export async function callKlingVideo(input: VideoGenInput): Promise<VideoGenOutput> {
  const t0 = Date.now();
  const e  = env();

  // Kling expects either a public image URL OR a base64-encoded JPEG.
  // For local /tmp file paths, encode to base64.
  const stillBase64 = await fileToBase64(input.still_path);

  // 1. Create task
  const create = await withRetry(() =>
    http(API_CREATE, {
      method: "POST",
      headers: {
        "X-API-Key":    e.PIAPI_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "kling",
        task_type: "video_generation",
        input: {
          version:  "2.1-master",
          mode:     "std",                          // "pro" doubles cost
          prompt:   input.motion_prompt,
          image:    `data:image/jpeg;base64,${stillBase64}`,
          duration: Math.min(10, Math.round(input.duration_s)),  // Kling max 10s per clip
          cfg_scale: 0.5,
          aspect_ratio: "16:9",
        },
      }),
      timeoutMs: 30_000,
    })
  );
  const created = await create.json();
  const task_id: string = created.data?.task_id ?? created.task_id;
  if (!task_id) throw new Error(`PiAPI Kling did not return task_id: ${JSON.stringify(created).slice(0, 300)}`);

  // 2. Poll status until completed
  const final = await poll(
    async () => {
      const r = await withRetry(() =>
        http(API_STATUS(task_id), {
          headers: { "X-API-Key": e.PIAPI_KEY },
          timeoutMs: 15_000,
        })
      );
      return r.json();
    },
    (s) => s.data?.status === "completed" || s.status === "completed",
    (s) => s.data?.status === "failed"    || s.status === "failed",
    { interval_ms: 4000, max_wait_ms: 180_000, backoff_factor: 1.2 },
  );

  const video_url: string =
    final.data?.output?.video_url ??
    final.data?.output?.works?.[0]?.video?.resource ??
    final.output?.video_url;
  if (!video_url) throw new Error(`Kling completed but no video_url: ${JSON.stringify(final).slice(0, 400)}`);

  // 3. Download MP4
  const local = await downloadMp4(video_url);

  return {
    local_path:   local,
    cost_usd:     PRICE_PER_SECOND * input.duration_s,
    ms:           Date.now() - t0,
    provider:     "piapi:kling-2.1-master-std",
    quality_mode: "real",
  };
}

async function fileToBase64(p: string): Promise<string> {
  const buf = await fs.promises.readFile(p);
  return buf.toString("base64");
}

async function downloadMp4(url: string): Promise<string> {
  const res = await withRetry(() => http(url, { timeoutMs: 60_000 }));
  const buf = Buffer.from(await res.arrayBuffer());
  const dir = process.env.CAPSULE_TMPDIR ?? "/tmp/kudos";
  fs.mkdirSync(dir, { recursive: true });
  const p = path.join(dir, `kling-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mp4`);
  fs.writeFileSync(p, buf);
  return p;
}
