/**
 * KUDOS · Capsule Generation · Provider Capability Matrix (P24.2 · Section 1).
 *
 *   "Providers are not creators. Providers are render engines · interchangeable,
 *    scoreable, replaceable. KUDOS is the director."
 *
 *   This module declares what each video provider is good at and what it costs.
 *   The arbitrator consumes this matrix to route shots intelligently. Provider
 *   adapters live in capsule-engine/providers/ (real HTTP clients); this file
 *   is pure capability data + the unified provider interface.
 *
 *   Editorial scores (realism, motion, temporal_consistency, etc.) reflect
 *   public benchmarks + curator observation. They are revised when the
 *   provider-health learning loop (provider-arbitrator.ts) detects drift.
 */
import type { ShotTypeId } from "../cinematic-language/shot-taxonomy";
import type { EmotionalMode } from "../cinematic-language/camera-language";

// ─── Provider identity ────────────────────────────────────────────────────

export type ProviderId =
  | "kling"          // PiAPI Kling 2.1 · P16 real wired
  | "veo"            // Google Veo 3 · P24.3 wire target
  | "runway"         // Runway Gen-3 / Gen-4 · P24.3 wire target
  | "luma"           // Luma Dream Machine · P24.3 wire target
  | "pika"           // Pika 1.5 · P24.3 wire target
  | "stub_local";    // Local procedural · ImageMagick + ffmpeg · always available

// ─── Capability schema ────────────────────────────────────────────────────

export interface ProviderCapability {
  provider:                ProviderId;
  display_name:            string;
  one_line:                string;

  // ─── Editorial scores (0-10) ────────────────────────────────────────
  realism_score:           number;
  motion_score:            number;
  temporal_consistency:    number;
  facial_consistency:      number;
  atmospheric_rendering:   number;
  camera_coherence:        number;

  // ─── Strengths / weaknesses ─────────────────────────────────────────
  excels_at:               ReadonlyArray<ShotTypeId>;
  weak_at:                 ReadonlyArray<string>;
  preferred_emotional_modes: ReadonlyArray<EmotionalMode>;
  avoid_emotional_modes:   ReadonlyArray<EmotionalMode>;

  // ─── Operational ────────────────────────────────────────────────────
  cost_per_second_usd:     number;
  avg_latency_s:           number;
  p99_latency_s:           number;
  max_duration_s:          number;
  /** 0-1 · how often we should retry same provider vs swap on failure */
  retry_tolerance:         number;

  // ─── Capabilities ──────────────────────────────────────────────────
  supports_image_to_video: boolean;
  supports_text_to_video:  boolean;
  supports_camera_control: boolean;
  supports_seed_locking:   boolean;
  supports_reference_image: boolean;
  supports_negative_prompt: boolean;

  /** false = no external network needed · always available · cheap fallback */
  requires_network:        boolean;

  /** True if the provider has a documented rate limit we must respect */
  has_rate_limit:          boolean;
  rate_limit_per_minute?:  number;
}

// ═══════════════════════════════════════════════════════════════════════════
// THE MATRIX
// ═══════════════════════════════════════════════════════════════════════════

export const PROVIDER_MATRIX: Readonly<Record<ProviderId, ProviderCapability>> = {

  kling: {
    provider: "kling",
    display_name: "Kling 2.1 Master",
    one_line: "Image-to-video with strong camera coherence and slow monumental motion.",
    realism_score:         8.7,
    motion_score:          9.1,
    temporal_consistency:  8.3,
    facial_consistency:    7.6,
    atmospheric_rendering: 8.4,
    camera_coherence:      9.0,
    excels_at: [
      "monumental_drift", "slow_forward_drift", "sacred_static",
      "human_scale_wide", "ruins_tracking", "atmosphere_hold",
      "aerial_reveal",
    ],
    weak_at: ["crowd continuity", "dialogue sync", "rapid motion"],
    preferred_emotional_modes: ["monumental_awe", "sacred_emergence", "restrained_reverence", "archival_dream"],
    avoid_emotional_modes: ["celebratory_radiant"],
    cost_per_second_usd:     0.06,
    avg_latency_s:           180,
    p99_latency_s:           300,
    max_duration_s:          10,
    retry_tolerance:         0.4,
    supports_image_to_video: true,
    supports_text_to_video:  false,
    supports_camera_control: true,
    supports_seed_locking:   true,
    supports_reference_image: true,
    supports_negative_prompt: true,
    requires_network:        true,
    has_rate_limit:          true,
    rate_limit_per_minute:   10,
  },

  veo: {
    provider: "veo",
    display_name: "Google Veo 3",
    one_line: "Text-to-video with strong photoreal atmospheric rendering · longer durations.",
    realism_score:         9.1,
    motion_score:          8.7,
    temporal_consistency:  8.9,
    facial_consistency:    8.3,
    atmospheric_rendering: 9.3,
    camera_coherence:      8.6,
    excels_at: [
      "atmosphere_hold", "aerial_reveal", "monumental_drift",
      "slow_forward_drift", "ruins_tracking", "memory_fragment",
    ],
    weak_at: ["extreme close-up faces", "sustained handheld kinetic"],
    preferred_emotional_modes: ["monumental_awe", "sacred_emergence", "archival_dream", "restrained_reverence", "pilgrimage_steady"],
    avoid_emotional_modes: ["kinetic_observational"],
    cost_per_second_usd:     0.12,
    avg_latency_s:           150,
    p99_latency_s:           260,
    max_duration_s:          30,
    retry_tolerance:         0.45,
    supports_image_to_video: true,
    supports_text_to_video:  true,
    supports_camera_control: true,
    supports_seed_locking:   true,
    supports_reference_image: true,
    supports_negative_prompt: false,
    requires_network:        true,
    has_rate_limit:          true,
    rate_limit_per_minute:   6,
  },

  runway: {
    provider: "runway",
    display_name: "Runway Gen-3 Alpha",
    one_line: "Cinematic film-look with editorial motion vocabulary and strong negative-prompt control.",
    realism_score:         8.9,
    motion_score:          8.8,
    temporal_consistency:  8.7,
    facial_consistency:    7.9,
    atmospheric_rendering: 8.6,
    camera_coherence:      8.7,
    excels_at: [
      "archival_transition", "temporal_overlay", "memory_fragment",
      "slow_forward_drift", "observational_closeup", "ruins_tracking",
      "civilization_trace",
    ],
    weak_at: ["very wide aerial scale", "crowd handling"],
    preferred_emotional_modes: ["archival_dream", "intimate_documentary", "monumental_awe", "geopolitical_grave"],
    avoid_emotional_modes: [],
    cost_per_second_usd:     0.10,
    avg_latency_s:           210,
    p99_latency_s:           360,
    max_duration_s:          10,
    retry_tolerance:         0.40,
    supports_image_to_video: true,
    supports_text_to_video:  true,
    supports_camera_control: true,
    supports_seed_locking:   true,
    supports_reference_image: true,
    supports_negative_prompt: true,
    requires_network:        true,
    has_rate_limit:          true,
    rate_limit_per_minute:   8,
  },

  luma: {
    provider: "luma",
    display_name: "Luma Dream Machine",
    one_line: "Atmospheric drift specialist · dreamlike haze · gentle motion.",
    realism_score:         8.3,
    motion_score:          7.8,
    temporal_consistency:  8.1,
    facial_consistency:    7.2,
    atmospheric_rendering: 9.0,
    camera_coherence:      7.9,
    excels_at: [
      "atmosphere_hold", "memory_fragment", "slow_forward_drift",
      "sacred_static", "archival_transition", "silence_frame",
    ],
    weak_at: ["fast motion", "complex architecture", "facial detail"],
    preferred_emotional_modes: ["archival_dream", "sacred_emergence", "intimate_documentary"],
    avoid_emotional_modes: ["kinetic_observational", "celebratory_radiant"],
    cost_per_second_usd:     0.03,
    avg_latency_s:           90,
    p99_latency_s:           180,
    max_duration_s:          5,
    retry_tolerance:         0.50,
    supports_image_to_video: true,
    supports_text_to_video:  true,
    supports_camera_control: false,
    supports_seed_locking:   true,
    supports_reference_image: true,
    supports_negative_prompt: false,
    requires_network:        true,
    has_rate_limit:          false,
  },

  pika: {
    provider: "pika",
    display_name: "Pika 1.5",
    one_line: "Fast, cheap, social-feed friendly · weak for monumental subjects.",
    realism_score:         7.0,
    motion_score:          7.5,
    temporal_consistency:  6.8,
    facial_consistency:    6.5,
    atmospheric_rendering: 6.9,
    camera_coherence:      7.0,
    excels_at: [
      "kinetic_handheld", "crowd_echo", "memory_fragment",
    ],
    weak_at: ["sacred reverence", "civilizational scale", "long durations"],
    preferred_emotional_modes: ["kinetic_observational", "celebratory_radiant"],
    avoid_emotional_modes: ["restrained_reverence", "geopolitical_grave", "monumental_awe", "sacred_emergence"],
    cost_per_second_usd:     0.05,
    avg_latency_s:           60,
    p99_latency_s:           120,
    max_duration_s:          4,
    retry_tolerance:         0.55,
    supports_image_to_video: true,
    supports_text_to_video:  true,
    supports_camera_control: false,
    supports_seed_locking:   false,
    supports_reference_image: true,
    supports_negative_prompt: true,
    requires_network:        true,
    has_rate_limit:          true,
    rate_limit_per_minute:   12,
  },

  stub_local: {
    provider: "stub_local",
    display_name: "Local Procedural (ImageMagick + ffmpeg ken-burns)",
    one_line: "Always-available local fallback · no network · cheap · low realism but pipeline-honest.",
    realism_score:         3.5,
    motion_score:          3.0,
    temporal_consistency: 10.0,
    facial_consistency:   0.0,
    atmospheric_rendering: 4.0,
    camera_coherence:     10.0,
    excels_at: ["atmosphere_hold", "silence_frame", "civilization_trace"],
    weak_at: ["realism", "any AI capability"],
    preferred_emotional_modes: [],
    avoid_emotional_modes: [],
    cost_per_second_usd:     0,
    avg_latency_s:           4,
    p99_latency_s:           8,
    max_duration_s:          30,
    retry_tolerance:         1.0,
    supports_image_to_video: false,
    supports_text_to_video:  true,
    supports_camera_control: true,
    supports_seed_locking:   true,
    supports_reference_image: false,
    supports_negative_prompt: false,
    requires_network:        false,
    has_rate_limit:          false,
  },

};

// ─── Accessors ────────────────────────────────────────────────────────────

export function capabilityOf(p: ProviderId): ProviderCapability {
  return PROVIDER_MATRIX[p];
}

export function providersFor(shot: ShotTypeId): ReadonlyArray<ProviderId> {
  return (Object.values(PROVIDER_MATRIX) as ProviderCapability[])
    .filter(c => c.excels_at.includes(shot))
    .sort((a, b) => b.realism_score - a.realism_score)
    .map(c => c.provider);
}

export function providersForMode(m: EmotionalMode): ReadonlyArray<ProviderId> {
  return (Object.values(PROVIDER_MATRIX) as ProviderCapability[])
    .filter(c => c.preferred_emotional_modes.includes(m))
    .map(c => c.provider);
}

export function allProviders(): ReadonlyArray<ProviderId> {
  return Object.keys(PROVIDER_MATRIX) as ProviderId[];
}

export function networkProviders(): ReadonlyArray<ProviderId> {
  return allProviders().filter(p => PROVIDER_MATRIX[p].requires_network);
}

export function localProviders(): ReadonlyArray<ProviderId> {
  return allProviders().filter(p => !PROVIDER_MATRIX[p].requires_network);
}
