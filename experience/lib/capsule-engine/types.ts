/**
 * KUDOS · Capsule Engine · public types contract.
 *
 * Anything that crosses a boundary (API ⇄ orchestrator ⇄ providers ⇄ storage)
 * is typed here so we can swap stubs for real provider implementations
 * without touching call-sites.
 */

// ─── Input ────────────────────────────────────────────────────────────────

export interface CapsulePoi {
  id:           string;        // store id
  name:         string;        // "Coliseo Romano"
  location:     string;        // "Roma, Italia"
  country:      string;
  coordinates:  string;        // "41.8902,12.4922"
  era?:         string;        // optional, drives palette
  categories?:  ReadonlyArray<string>;
  poster?:      string;        // local poster URL if exists
}

export type Language = "es" | "en" | "fr" | "it" | "pt";
export type Audience = "traveler" | "historian" | "cultural" | "kids";
export type Tone     = "cinematic epic" | "intimate" | "mystery" | "celebratory";

export interface CapsuleRequest {
  poi:               CapsulePoi;
  poi_score:         number;       // 0-100 · drives tier
  language:          Language;
  audience:          Audience;
  duration_seconds:  number;       // 10-20
  tone:              Tone;
  style:             string;       // "Apple x TikTok x National Geographic"
}

// ─── Tier model ───────────────────────────────────────────────────────────

export type CapsuleTier =
  | "tier1_legend"        // score >= 90 · full AI video
  | "tier2_image_capsule" // 70-89     · stills + ffmpeg motion
  | "tier3_story_card"    // 40-69     · 1 hero + narrative
  | "tier4_data_card";    // < 40       · metadata only

export interface TierDecision {
  tier:                 CapsuleTier;
  score:                number;
  reason:               string;
  estimated_cost_usd:   number;
  estimated_latency_s:  number;
  appears_in_feed:      "home_premium" | "poi_contextual" | "card_only" | "metadata_only";
}

// ─── Provider contracts (swap stub → real) ───────────────────────────────

export interface ClaudeStoryInput  { request: CapsuleRequest; }
export interface ClaudeStoryOutput {
  title:           string;
  hook:            string;
  meaning:         string;
  promise:         string;
  script:          string;
  shotList:        ReadonlyArray<ShotSpec>;
  subtitlesVTT:    string;
  musicMood:       string;
  voiceStyle:      string;
  sources:         ReadonlyArray<{ title: string; year: string }>;
  _meta:           { tokens_in: number; tokens_out: number; cost_usd: number; ms: number };
}

export interface ShotSpec {
  shot:            number;
  start_s:         number;
  end_s:           number;
  visual:          string;
  camera:          string;
  purpose:         string;
  video_prompt:    string;
  image_prompt:    string;
}

export interface ImageGenInput  { prompt: string; aspect: "16:9" | "9:16" | "1:1"; seed?: number; }
export interface ImageGenOutput { local_path: string; cost_usd: number; ms: number; provider: string; }

export interface VideoGenInput  { still_path: string; motion_prompt: string; duration_s: number; }
export interface VideoGenOutput { local_path: string; cost_usd: number; ms: number; provider: string; quality_mode: "real" | "fallback"; }

export interface VoiceGenInput  { script: string; language: Language; voiceStyle: string; }
export interface VoiceGenOutput { local_path: string; cost_usd: number; ms: number; provider: string; }

export interface MusicSelectInput  { mood: string; bpm_target: number; duration_s: number; key?: string; }
export interface MusicSelectOutput { local_path: string; cost_usd: number; ms: number; provider: string; track_id: string; }

export interface ComposeInput {
  shots:        ReadonlyArray<{ path: string; duration_s: number }>;
  voice_path?:  string;
  music_path?:  string;
  sfx_path?:    string;
  subtitles?:   string;     // VTT content
  output_path:  string;
}
export interface ComposeOutput { mp4_path: string; thumb_path: string; vtt_path: string; ms: number; }

export interface StorageUploadInput  { local_path: string; key: string; content_type: string; }
export interface StorageUploadOutput { url: string; bytes: number; ms: number; cost_cents: number; }

// ─── Final orchestrator output ───────────────────────────────────────────

export interface CapsuleResult {
  capsule_id:           string;
  tier:                 CapsuleTier;
  tier_decision:        TierDecision;
  status:               "ready" | "failed" | "rejected_by_governor";

  // Asset URLs (R2 in prod · local /capsules in dev/fallback)
  assets: {
    video?:        string;   // tier 1+2 only
    hero_image?:   string;   // tier 1+2+3
    thumbnail?:    string;
    subtitles?:    string;   // tier 1+2
    metadata:      string;
    story_json?:   string;
  };

  story?:               Pick<ClaudeStoryOutput, "title" | "hook" | "meaning" | "promise" | "script">;

  cost_usd: {
    estimated:          number;
    actual:             number;
    breakdown:          Record<string, number>;
  };

  generation_time_ms: {
    estimated:          number;
    actual:             number;
    breakdown:          Record<string, number>;
  };

  providers_used: Record<string, { intended: string; actual: string; status: "real" | "fallback" | "skipped" }>;

  failures: ReadonlyArray<{ stage: string; error: string; recovered: boolean }>;
}
