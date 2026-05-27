/**
 * KUDOS · Provider · FLUX 1.1 [pro] via Replicate.
 *
 *   POST  https://api.replicate.com/v1/models/black-forest-labs/flux-1.1-pro/predictions
 *   GET   https://api.replicate.com/v1/predictions/{id}   (poll until succeeded)
 *
 * Returns a downloaded local path · file lives on disk for ffmpeg to consume.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { env } from "../env";
import { http, withRetry, poll } from "../retry";
import type { ImageGenInput, ImageGenOutput } from "../types";

const MODEL_URL  = "https://api.replicate.com/v1/models/black-forest-labs/flux-1.1-pro/predictions";
const STATUS_URL = (id: string) => `https://api.replicate.com/v1/predictions/${id}`;

const PRICE_USD = 0.04;   // per image · Q2 2025

export async function callFluxImage(input: ImageGenInput): Promise<ImageGenOutput> {
  const t0 = Date.now();
  const e  = env();

  // 1. Create prediction
  const create = await withRetry(() =>
    http(MODEL_URL, {
      method: "POST",
      headers: {
        "Authorization": `Token ${e.REPLICATE_API_TOKEN}`,
        "Content-Type":  "application/json",
        "Prefer":        "wait=5",     // try synchronous first · falls back to polling
      },
      body: JSON.stringify({
        input: {
          prompt:         input.prompt,
          aspect_ratio:   input.aspect,
          output_format:  "jpg",
          output_quality: 90,
          safety_tolerance: 2,
          seed:           input.seed,
        },
      }),
      timeoutMs: 30_000,
    })
  );
  const initial = await create.json();

  // 2. Poll until terminal
  const final = initial.status === "succeeded" || initial.status === "failed"
    ? initial
    : await poll(
        async () => {
          const r = await withRetry(() => http(STATUS_URL(initial.id), {
            headers: { "Authorization": `Token ${e.REPLICATE_API_TOKEN}` },
            timeoutMs: 15_000,
          }));
          return r.json();
        },
        (s) => s.status === "succeeded",
        (s) => s.status === "failed" || s.status === "canceled",
        { interval_ms: 1500, max_wait_ms: 120_000 },
      );

  if (final.status !== "succeeded") {
    throw new Error(`FLUX prediction failed: ${final.error ?? final.status}`);
  }

  const url: string = Array.isArray(final.output) ? final.output[0] : final.output;
  if (!url) throw new Error("FLUX returned no output URL");

  // 3. Download bytes to /tmp
  const local = await downloadToTmp(url, ".jpg");

  return {
    local_path: local,
    cost_usd:   PRICE_USD,
    ms:         Date.now() - t0,
    provider:   "replicate:flux-1.1-pro",
  };
}

async function downloadToTmp(url: string, ext: string): Promise<string> {
  const res = await withRetry(() => http(url, { timeoutMs: 30_000 }));
  const buf = Buffer.from(await res.arrayBuffer());
  const dir = process.env.CAPSULE_TMPDIR ?? "/tmp/kudos";
  fs.mkdirSync(dir, { recursive: true });
  const p = path.join(dir, `flux-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  fs.writeFileSync(p, buf);
  return p;
}
