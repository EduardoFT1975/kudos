/**
 * KUDOS · Capsule Generation · Prompt Expansion Engine (Section 5).
 *
 *   "The cinematic language is abstract. Providers need concrete prompts."
 *
 *   This module takes a ShotGrammar + selected provider + continuity anchor
 *   and produces a provider-specific ExpandedPrompt: the literal positive
 *   prompt, negative prompt, camera control directives, and reference image
 *   path that the provider client will consume.
 *
 *   Key invariants:
 *     · the abstract grammar never changes when providers change
 *     · realism floor clauses ALWAYS appear in the positive prompt
 *     · forbidden aesthetics ALWAYS appear in the negative prompt
 *     · continuity anchors are injected as concrete clauses, not as IDs
 *     · per-provider dialect (Kling vs Veo vs Runway vs Luma vs Pika)
 *
 *   Output of this module is what the adapter (kling.ts, etc.) sees.
 */
import type { ShotGrammar } from "../cinematic-language/provider-abstraction";
import { translateForKling, translateForRunway } from "../cinematic-language/provider-abstraction";
import { hardRejectGlobal, forbiddenForMode } from "../cinematic-language/forbidden-aesthetics";
import type { ProviderId } from "./provider-matrix";
import type { ContinuityAnchor } from "./continuity-engine";

// ─── Output ──────────────────────────────────────────────────────────────

export interface ExpandedPrompt {
  provider:                      ProviderId;
  positive_prompt:               string;
  negative_prompt:               string;
  duration_s:                    number;
  seed?:                         number;
  reference_image_path?:         string;
  camera_motion_directive:       string;
  motion_intensity_normalized:   number;
  realism_floor_clauses:         ReadonlyArray<string>;
  continuity_injection:          ReadonlyArray<string>;
  /** Plain English explanation for the audit log */
  expansion_notes:               string;
}

// ─── Input ───────────────────────────────────────────────────────────────

export interface ExpandPromptInput {
  grammar:                       ShotGrammar;
  provider:                      ProviderId;
  continuity:                    ContinuityAnchor;
  seed?:                         number;
  reference_image_path?:         string;
  /** Stronger realism / lower motion / etc. · injected by reroll engine */
  reroll_modifications?: {
    inject_realism_strength?:    "default" | "strong" | "extreme";
    motion_intensity_override?:  number;
    add_negative_clauses?:       ReadonlyArray<string>;
    shorten_to_s?:               number;
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// ENTRY
// ═══════════════════════════════════════════════════════════════════════════

const REALISM_FLOOR_CLAUSES: ReadonlyArray<string> = [
  "photorealistic, captured on real-world camera",
  "natural light, atmospheric depth, dust visible in beams",
  "weathered surfaces with appropriate patina",
  "physically-correct shadows",
  "no AI fantasy saturation",
];

const REALISM_STRONG_CLAUSES: ReadonlyArray<string> = [
  "documentary photography aesthetic, BBC Earth or National Geographic feel",
  "shot on Arri Alexa anamorphic",
  "natural color grading, no LUT, no Instagram filter",
];

const REALISM_EXTREME_CLAUSES: ReadonlyArray<string> = [
  "indistinguishable from real footage",
  "no generative artifacts, no melted edges, no repeating patterns",
  "subject must obey physical perspective",
];

export function expandPromptForProvider(input: ExpandPromptInput): ExpandedPrompt {
  const g = input.grammar;
  const mods = input.reroll_modifications ?? {};

  // 1. Realism floor (always present, escalated under reroll)
  const realism_floor_clauses: string[] = [...REALISM_FLOOR_CLAUSES];
  if (mods.inject_realism_strength === "strong" || mods.inject_realism_strength === "extreme") {
    realism_floor_clauses.push(...REALISM_STRONG_CLAUSES);
  }
  if (mods.inject_realism_strength === "extreme") {
    realism_floor_clauses.push(...REALISM_EXTREME_CLAUSES);
  }

  // 2. Continuity injection
  const continuity_injection = continuityClauses(input.continuity);

  // 3. Negative · global forbidden + mode forbidden + reroll-additional
  const negative_set = new Set<string>([
    ...hardRejectGlobal().map(prettyForbidden),
    ...forbiddenForMode(g.emotional_mode).map(prettyForbidden),
    ...g.forbidden_aesthetics.map(prettyForbidden),
    ...g.must_exclude,
    ...(mods.add_negative_clauses ?? []),
  ]);
  const negative_prompt = Array.from(negative_set).join(", ");

  // 4. Duration (honoring reroll modification)
  const duration_s = mods.shorten_to_s ?? g.duration_s;

  // 5. Motion intensity (honoring override)
  const motion_intensity_normalized = mods.motion_intensity_override ?? g.motion_intensity;

  // 6. Provider-specific positive prompt assembly
  let positive_prompt = "";
  let camera_motion_directive = "";

  switch (input.provider) {
    case "kling": {
      const t = translateForKling(g);
      positive_prompt = assemblePositive(
        t.motion_prompt,
        continuity_injection,
        realism_floor_clauses,
      );
      camera_motion_directive = klingCameraDirective(g.camera_motion);
      break;
    }
    case "runway": {
      const t = translateForRunway(g);
      positive_prompt = assemblePositive(
        t.prompt,
        continuity_injection,
        realism_floor_clauses,
      );
      camera_motion_directive = t.camera_motion;
      break;
    }
    case "veo": {
      positive_prompt = veoPrompt(g, continuity_injection, realism_floor_clauses);
      camera_motion_directive = veoCameraDirective(g.camera_motion);
      break;
    }
    case "luma": {
      positive_prompt = lumaPrompt(g, continuity_injection, realism_floor_clauses);
      camera_motion_directive = "auto";   // luma does not accept explicit camera control
      break;
    }
    case "pika": {
      positive_prompt = pikaPrompt(g, continuity_injection, realism_floor_clauses);
      camera_motion_directive = "default";
      break;
    }
    case "stub_local": {
      positive_prompt = assemblePositive(
        g.composition_rule,
        continuity_injection,
        [],
      );
      camera_motion_directive = g.camera_motion;
      break;
    }
  }

  const expansion_notes = [
    `provider=${input.provider}`,
    mods.inject_realism_strength ? `realism=${mods.inject_realism_strength}` : "",
    mods.motion_intensity_override !== undefined ? `motion_override=${mods.motion_intensity_override.toFixed(2)}` : "",
    mods.shorten_to_s !== undefined ? `shortened=${mods.shorten_to_s}s` : "",
    `continuity_clauses=${continuity_injection.length}`,
  ].filter(Boolean).join(" · ");

  return {
    provider:                    input.provider,
    positive_prompt,
    negative_prompt,
    duration_s,
    seed:                        input.seed,
    reference_image_path:        input.reference_image_path,
    camera_motion_directive,
    motion_intensity_normalized,
    realism_floor_clauses,
    continuity_injection,
    expansion_notes,
  };
}

// ─── Continuity injection ─────────────────────────────────────────────────

function continuityClauses(c: ContinuityAnchor): ReadonlyArray<string> {
  const clauses: string[] = [];
  if (c.palette_hex.length > 0) {
    clauses.push(`color palette anchors: ${c.palette_hex.slice(0, 3).join(", ")}`);
  }
  if (c.lighting_descriptor) clauses.push(`lighting: ${c.lighting_descriptor}`);
  if (c.weather) clauses.push(`weather: ${c.weather}`);
  if (c.atmosphere.length > 0) clauses.push(`atmosphere: ${c.atmosphere.join(", ")}`);
  if (c.grain_profile) clauses.push(`grain: ${c.grain_profile}`);
  return clauses;
}

// ─── Per-provider dialect ─────────────────────────────────────────────────

function assemblePositive(
  base:           string,
  continuity:     ReadonlyArray<string>,
  realism_floor:  ReadonlyArray<string>,
): string {
  return [base, ...continuity, ...realism_floor].filter(Boolean).join(" · ");
}

function klingCameraDirective(motion: string): string {
  // Kling expects camera language in the prompt itself; this string is for the audit log
  return motion;
}

function veoPrompt(g: ShotGrammar, continuity: ReadonlyArray<string>, realism: ReadonlyArray<string>): string {
  // Veo prefers structured paragraph form
  const env = g.required_environmental_motion.length
    ? `Environmental motion: ${g.required_environmental_motion.join(", ")}. `
    : "";
  return [
    `${g.composition_rule}.`,
    `Camera: ${veoCameraDirective(g.camera_motion)}.`,
    `Emotional tone: ${g.emotional_descriptor}.`,
    env,
    `Lighting: ${g.lighting}.`,
    ...continuity.map(c => `${c}.`),
    ...realism.map(r => `${r}.`),
  ].join(" ");
}

function veoCameraDirective(m: string): string {
  switch (m) {
    case "static_locked":       return "locked camera, no motion";
    case "subtle_breath":       return "subtle handheld breath";
    case "slow_forward_drift":  return "slow forward dolly";
    case "slow_pull_back":      return "slow pull back";
    case "monumental_drift":    return "wide arcing orbit, slow";
    case "ruins_tracking":      return "lateral tracking shot, slow";
    case "tilt_up_to_sky":      return "tilt up";
    case "tilt_down_to_ground": return "tilt down";
    case "handheld_kinetic":    return "handheld kinetic, urban energy";
    case "memory_float":        return "slow float, dreamlike";
    case "archival_pan":        return "archival pan";
    case "match_cut_hold":      return "locked frame";
    default:                    return "auto";
  }
}

function lumaPrompt(g: ShotGrammar, continuity: ReadonlyArray<string>, realism: ReadonlyArray<string>): string {
  // Luma prefers concise descriptive prose
  return [
    g.composition_rule,
    g.emotional_descriptor.slice(0, 120),
    ...continuity.slice(0, 3),
    ...realism.slice(0, 3),
  ].join(", ");
}

function pikaPrompt(g: ShotGrammar, continuity: ReadonlyArray<string>, realism: ReadonlyArray<string>): string {
  // Pika prefers short keyword-style prompts
  const keywords = [
    g.shot_type.replace(/_/g, " "),
    g.camera_motion.replace(/_/g, " "),
    g.lens.replace(/_/g, " "),
    ...g.must_include.slice(0, 4),
    ...continuity.slice(0, 2),
    ...realism.slice(0, 2),
  ];
  return keywords.join(", ");
}

function prettyForbidden(s: string): string {
  return s.replace(/_/g, " ");
}
