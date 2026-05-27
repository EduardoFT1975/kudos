/**
 * KUDOS · Provider · Cartesia Sonic-2 TTS.
 *
 *   POST  https://api.cartesia.ai/tts/bytes
 *
 * Returns local WAV path. 90ms TTFB · pay-per-character.
 * Docs: https://docs.cartesia.ai/api-reference/tts/bytes
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { env } from "../env";
import { http, withRetry } from "../retry";
import type { VoiceGenInput, VoiceGenOutput } from "../types";

const API = "https://api.cartesia.ai/tts/bytes";
const MODEL_ID = "sonic-2-2025-08";
const PRICE_PER_1K_CHARS = 0.025;   // Sonic-2 Q2 2025

/**
 * Cartesia voice IDs are per-language. The orchestrator passes `voiceStyle`
 * which we use as a tag · this map narrows to specific voices.
 * Expand as you bring more voice presets online.
 */
const VOICE_BY_LANG: Record<string, string> = {
  "es": "es-ES-male-cinematic-1",
  "en": "en-US-male-cinematic-1",
  "fr": "fr-FR-male-cinematic-1",
  "it": "it-IT-male-cinematic-1",
  "pt": "pt-BR-male-cinematic-1",
};

export async function callCartesiaVoice(input: VoiceGenInput): Promise<VoiceGenOutput> {
  const t0 = Date.now();
  const e  = env();
  const voice_id = VOICE_BY_LANG[input.language] ?? VOICE_BY_LANG.en;

  const res = await withRetry(() =>
    http(API, {
      method: "POST",
      headers: {
        "X-API-Key":         e.CARTESIA_API_KEY,
        "Cartesia-Version":  "2024-11-13",
        "Content-Type":      "application/json",
      },
      body: JSON.stringify({
        model_id:        MODEL_ID,
        transcript:      input.script,
        voice:           { mode: "id", id: voice_id },
        output_format: {
          container:    "wav",
          encoding:     "pcm_s16le",
          sample_rate:  44100,
        },
        language: input.language,
      }),
      timeoutMs: 30_000,
    })
  );

  const buf = Buffer.from(await res.arrayBuffer());
  const dir = process.env.CAPSULE_TMPDIR ?? "/tmp/kudos";
  fs.mkdirSync(dir, { recursive: true });
  const p = path.join(dir, `voice-${Date.now()}.wav`);
  fs.writeFileSync(p, buf);

  return {
    local_path: p,
    cost_usd:   (input.script.length / 1000) * PRICE_PER_1K_CHARS,
    ms:         Date.now() - t0,
    provider:   `cartesia:${MODEL_ID}:${voice_id}`,
  };
}
