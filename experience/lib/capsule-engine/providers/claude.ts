/**
 * KUDOS · Provider · Anthropic Claude (Story Director).
 *
 * Direct HTTPS to https://api.anthropic.com/v1/messages.
 * Forces structured JSON output via a system prompt + JSON-mode hint.
 * No SDK dep · just fetch.
 */
import { env } from "../env";
import { http, withRetry } from "../retry";
import type { CapsuleRequest, ClaudeStoryOutput, ShotSpec } from "../types";

const MODEL = "claude-sonnet-4-6";
const API = "https://api.anthropic.com/v1/messages";

const SYSTEM_PROMPT = `You are KUDOS Story Director · cinematic capsule scriptwriter.
Output ONE valid JSON object matching this exact schema:
{
  "title": string,
  "hook": string,
  "meaning": string,
  "promise": string,
  "script": string,           // narration of EXACT duration_seconds, cinematic, no clichés
  "shotList": [
    { "shot": int, "start_s": float, "end_s": float,
      "visual": string, "camera": string, "purpose": string,
      "video_prompt": string,   // Hollywood-grade Kling/Runway/Veo prompt
      "image_prompt": string }  // photorealistic FLUX prompt, no text/no logos
  ],
  "subtitlesVTT": string,     // valid WEBVTT
  "musicMood": string,
  "voiceStyle": string,
  "sources": [{ "title": string, "year": string }]
}
RULES: no markdown fences, JSON only. 5 shots covering the full duration. Sources required.
Style reference per request.style field. Language per request.language.`;

export async function callClaudeStory(req: CapsuleRequest): Promise<ClaudeStoryOutput> {
  const t0 = Date.now();
  const e = env();
  const userMsg = JSON.stringify({
    poi:               req.poi,
    location:          req.poi.location,
    language:          req.language,
    audience:          req.audience,
    duration_seconds:  req.duration_seconds,
    tone:              req.tone,
    style:             req.style,
  });

  const res = await withRetry(() =>
    http(API, {
      method: "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         e.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2400,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMsg }],
      }),
      timeoutMs: 45_000,
    })
  );

  const json = await res.json();
  const text: string = json.content?.[0]?.text ?? "";
  const story = parseStrictJSON<ClaudeStoryOutput>(text);

  // Pricing: claude-sonnet-4.6 ~ $3/MTok in, $15/MTok out
  const tokens_in  = json.usage?.input_tokens  ?? 0;
  const tokens_out = json.usage?.output_tokens ?? 0;
  const cost_usd   = (tokens_in / 1_000_000) * 3 + (tokens_out / 1_000_000) * 15;

  return {
    ...story,
    shotList: normalizeShotList(story.shotList, req.duration_seconds),
    _meta: { tokens_in, tokens_out, cost_usd, ms: Date.now() - t0 },
  };
}

function parseStrictJSON<T>(s: string): T {
  // Strip code fences if Claude ignored "no markdown"
  const cleaned = s.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch (err) {
    throw new Error(`Claude returned invalid JSON: ${(err as Error).message}\nFirst 400 chars: ${cleaned.slice(0, 400)}`);
  }
}

function normalizeShotList(shots: ReadonlyArray<ShotSpec>, total_s: number): ShotSpec[] {
  if (!Array.isArray(shots) || shots.length === 0) return [];
  // Ensure shot timings cover [0, total_s] without gaps · clamp end_s to total
  const n = shots.length;
  return shots.map((s, i) => ({
    ...s,
    shot:    i + 1,
    start_s: Math.max(0, Math.min(total_s, s.start_s ?? (i / n) * total_s)),
    end_s:   Math.max(0, Math.min(total_s, s.end_s   ?? ((i + 1) / n) * total_s)),
  }));
}
