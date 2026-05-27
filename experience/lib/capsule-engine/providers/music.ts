/**
 * KUDOS · Provider · Music selection from local Epidemic-Sound library.
 *
 * Production setup:
 *   1. Subscribe to Epidemic Sound (€15/mo) · download ~50 cinematic tracks
 *   2. Place files in /public/music/library/<track_id>.mp3
 *   3. Maintain TRACK_INDEX below (id → tags + duration + path)
 *
 * The selector picks the best mood match · loops/trims to requested duration.
 * Licensing is pre-cleared by your Epidemic subscription · per-use cost amortized.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import type { MusicSelectInput, MusicSelectOutput } from "../types";

interface MusicTrack {
  id:           string;
  file:         string;          // path inside repo · /public/music/library/...
  mood_tags:    ReadonlyArray<string>;
  bpm:          number;
  key:          string;
  duration_s:   number;
  intensity:    number;          // 0-1
}

const TRACK_INDEX: ReadonlyArray<MusicTrack> = [
  { id: "EP_VespasianRising",  file: "public/music/library/vespasian-rising.mp3",
    mood_tags: ["cinematic", "epic", "rising", "historical"], bpm: 82, key: "Dm",  duration_s: 180, intensity: 0.85 },
  { id: "EP_QuietMonument",    file: "public/music/library/quiet-monument.mp3",
    mood_tags: ["intimate", "contemplative", "piano", "soft"], bpm: 68, key: "Cm", duration_s: 200, intensity: 0.45 },
  { id: "EP_AncientWind",      file: "public/music/library/ancient-wind.mp3",
    mood_tags: ["mystery", "ambient", "ethereal", "ancient"], bpm: 60, key: "Am",  duration_s: 240, intensity: 0.55 },
  { id: "EP_GoldenHour",       file: "public/music/library/golden-hour.mp3",
    mood_tags: ["uplifting", "celebratory", "strings", "warm"], bpm: 96, key: "G", duration_s: 190, intensity: 0.72 },
  { id: "EP_NightFall",        file: "public/music/library/night-fall.mp3",
    mood_tags: ["dark", "tension", "cello", "low"], bpm: 72, key: "Em",  duration_s: 220, intensity: 0.80 },
  // ... add 45 more tracks here as you build the library
];

const AMORTIZED_COST_USD = 0.015;   // €15/mo ÷ ~1000 capsules

export async function callMusicSelect(input: MusicSelectInput): Promise<MusicSelectOutput> {
  const t0 = Date.now();
  const wanted = new Set(input.mood.toLowerCase().split(/[\s·,]+/).filter(Boolean));
  const bpmTol = 20;

  let best: { track: MusicTrack; score: number } | null = null;
  for (const track of TRACK_INDEX) {
    const tagOverlap = track.mood_tags.filter((t) => wanted.has(t.toLowerCase())).length;
    const bpmFit    = Math.max(0, 1 - Math.abs(track.bpm - input.bpm_target) / bpmTol);
    const keyFit    = input.key && track.key === input.key ? 0.2 : 0;
    const score = tagOverlap * 1.0 + bpmFit * 0.6 + keyFit;
    if (!best || score > best.score) best = { track, score };
  }

  if (!best) throw new Error("Music library empty · seed /public/music/library/ before deploy");

  // Verify the file is present on disk
  const abs = path.resolve(process.cwd(), best.track.file);
  if (!fs.existsSync(abs)) {
    throw new Error(`Music track file missing: ${abs} · run "npm run music:seed" or check Epidemic download`);
  }

  return {
    local_path: abs,
    cost_usd:   AMORTIZED_COST_USD,
    ms:         Date.now() - t0,
    provider:   "epidemic-sound:library-lookup",
    track_id:   best.track.id,
  };
}
