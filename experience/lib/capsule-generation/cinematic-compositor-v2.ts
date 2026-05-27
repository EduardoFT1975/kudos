/**
 * KUDOS · Capsule Generation · Cinematic Compositor V2 (Section 8).
 *
 *   "The old compositor concatenated shots. This one composes a documentary."
 *
 *   Cinematic Compositor V2 extends P23.1's compositor (which already does
 *   the ffmpeg graph plumbing) with cinematic-aware composition decisions:
 *
 *     · breath pacing       · silence gaps between beats per emotional mode
 *     · emotional crescendos · music ducking curve tied to the pacing curve
 *     · temporal dissolves   · per-shot-pair transition durations
 *     · soundtrack ducking   · already in V1, now sidechain-aware
 *     · memory inserts       · re-use earlier shot fragments as memory cuts
 *
 *   This module is the orchestrator over P23.1's `composite()`. It does NOT
 *   re-implement ffmpeg; it builds the COMPOSITION DECISIONS that P23.1
 *   consumes.
 */
import type { CapsuleDirectives, ShotGrammar } from "../cinematic-language/provider-abstraction";
import type { PacingGrammar } from "../cinematic-language/pacing-engine";
import { PACING_ENGINE, sampleCurve } from "../cinematic-language/pacing-engine";
import type { EmotionalMode } from "../cinematic-language/camera-language";
import { CAMERA_LANGUAGE } from "../cinematic-language/camera-language";
import type { CollapseTechnique } from "../cinematic-language/temporal-collapse";
import { TEMPORAL_COLLAPSE } from "../cinematic-language/temporal-collapse";

// ─── Composition decisions output ────────────────────────────────────────

export interface CompositionDecisions {
  /** Total runtime including breath gaps · seconds */
  total_runtime_s:        number;
  /** Per-shot timing · start time + duration with potential extension */
  shot_timings:           ReadonlyArray<ShotTiming>;
  /** Per-transition · between shot i and i+1 */
  transitions:            ReadonlyArray<TransitionDecision>;
  /** Music curve · 0-1 ducking per second · 0 = full music, 1 = full ducked */
  music_ducking_curve:    ReadonlyArray<{ t_s: number; ducking: number }>;
  /** Silence gaps · windows where narration must not play */
  silence_windows:        ReadonlyArray<{ start_s: number; end_s: number; reason: string }>;
  /** Memory insert cues · optional re-uses of earlier shot fragments */
  memory_inserts:         ReadonlyArray<MemoryInsertCue>;
  /** Brand bug visibility schedule · always on by default for tier1/2 */
  brand_bug_visible:      ReadonlyArray<{ start_s: number; end_s: number }>;
}

export interface ShotTiming {
  shot_index:     number;
  start_s:        number;
  duration_s:     number;
  /** Fade-in gap at the start · seconds */
  pre_silence_s:  number;
  /** Hold-after gap at the end · seconds */
  post_silence_s: number;
}

export interface TransitionDecision {
  from_shot:       number;
  to_shot:         number;
  type:            "hard_cut" | "dissolve" | "long_dissolve" | "match_cut" | "fade_to_black" | "sound_bridge_cut";
  duration_s:      number;
  reasoning:       string;
  collapse_technique?: CollapseTechnique;
}

export interface MemoryInsertCue {
  /** Time in the capsule at which the memory insert happens */
  t_s:              number;
  /** Source shot index whose fragment is reused */
  source_shot:      number;
  /** Duration of the insert · short (0.3-1.0s) */
  duration_s:       number;
  /** Why this insert exists · for audit */
  reasoning:        string;
}

// ─── Inputs ─────────────────────────────────────────────────────────────

export interface ComposeDecisionsInput {
  capsule_directives:    CapsuleDirectives;
  grammars:              ReadonlyArray<ShotGrammar>;
  /** Whether tier supports the brand bug overlay */
  enable_brand_bug:      boolean;
  /** Optional · narration density override (from voice engine) */
  narration_curve?:      ReadonlyArray<{ t_s: number; density: number }>;
}

// ═══════════════════════════════════════════════════════════════════════════
// ENTRY
// ═══════════════════════════════════════════════════════════════════════════

export function decideComposition(input: ComposeDecisionsInput): CompositionDecisions {
  const mode = CAMERA_LANGUAGE[input.capsule_directives.emotional_mode];
  const pace = PACING_ENGINE[input.capsule_directives.pacing];
  const grammars = input.grammars;

  // ── 1. Breath pacing · silence gaps between beats ───────────────────
  // Each mode declares a silence_required_pct. We carve breath gaps between
  // shots whose beats transition (escalation → wonder gets a beat of air;
  // meaning → close gets the longest pause).

  const shot_timings: ShotTiming[] = [];
  let cursor = 0;
  for (let i = 0; i < grammars.length; i++) {
    const g = grammars[i];
    const prev = grammars[i - 1];
    const pre_silence_s = breathBetween(prev?.beat, g.beat, mode);
    cursor += pre_silence_s;
    shot_timings.push({
      shot_index:    g.shot_index,
      start_s:       cursor,
      duration_s:    g.duration_s,
      pre_silence_s,
      post_silence_s: 0,   // set in the post-pass below
    });
    cursor += g.duration_s;
  }
  // Final close gap
  const last = shot_timings[shot_timings.length - 1];
  if (last) {
    const close_silence = mode.id === "restrained_reverence" || mode.id === "geopolitical_grave" ? 2.0 : 1.0;
    last.post_silence_s = close_silence;
    cursor += close_silence;
  }
  const total_runtime_s = cursor;

  // ── 2. Transitions ──────────────────────────────────────────────────
  const transitions: TransitionDecision[] = [];
  for (let i = 0; i < grammars.length - 1; i++) {
    const a = grammars[i];
    const b = grammars[i + 1];
    const t = pickTransition(a, b, mode.cut_aggressiveness, mode.allowed_transitions);
    transitions.push(t);
  }

  // ── 3. Music ducking curve ──────────────────────────────────────────
  // Sample the pacing motion curve per second; high motion windows = louder
  // music (less ducking), reflective windows = more ducking.
  const music_ducking_curve: { t_s: number; ducking: number }[] = [];
  for (let t = 0; t <= total_runtime_s; t += 0.5) {
    const progress = t / Math.max(1, total_runtime_s);
    const motion_mult = sampleCurve(pace.motion_curve, progress);
    const intensity_norm = Math.max(0, Math.min(1, mode.movement_intensity * motion_mult));
    // ducking = high when narration density is high (will be set by voice engine
    // when narration_curve provided) · default model: silence windows fully duck,
    // active narrative windows duck 0.5
    const ducking = 0.5 + 0.3 * (1 - intensity_norm);
    music_ducking_curve.push({ t_s: t, ducking });
  }

  // ── 4. Silence windows ──────────────────────────────────────────────
  const silence_windows: { start_s: number; end_s: number; reason: string }[] = [];
  for (const st of shot_timings) {
    if (st.pre_silence_s > 0) silence_windows.push({ start_s: st.start_s - st.pre_silence_s, end_s: st.start_s, reason: `pre_beat_breath shot ${st.shot_index}` });
    if (st.post_silence_s > 0) silence_windows.push({ start_s: st.start_s + st.duration_s, end_s: st.start_s + st.duration_s + st.post_silence_s, reason: `post_beat_breath shot ${st.shot_index}` });
  }

  // ── 5. Memory inserts ───────────────────────────────────────────────
  // For modes that benefit from recall (archival_dream, restrained_reverence,
  // monumental_awe), insert a fragment from an earlier shot at the meaning beat.
  const memory_inserts: MemoryInsertCue[] = [];
  const wants_memory_insert =
    mode.id === "archival_dream" ||
    mode.id === "restrained_reverence" ||
    mode.id === "monumental_awe";

  if (wants_memory_insert && grammars.length >= 4) {
    const meaning_shot = shot_timings.find(s => grammars[s.shot_index - 1]?.beat === "meaning");
    const source_candidate = grammars.find(g => g.beat === "hook" || g.beat === "wonder");
    if (meaning_shot && source_candidate) {
      memory_inserts.push({
        t_s:        meaning_shot.start_s + meaning_shot.duration_s * 0.30,
        source_shot: source_candidate.shot_index,
        duration_s: 0.6,
        reasoning:  `memory insert · recall ${source_candidate.beat} shot during meaning beat`,
      });
    }
  }

  // ── 6. Brand bug visibility ─────────────────────────────────────────
  const brand_bug_visible: { start_s: number; end_s: number }[] = [];
  if (input.enable_brand_bug) {
    // Visible from 2s in to 2s before end · respects opening hook and final breath
    brand_bug_visible.push({ start_s: 2, end_s: Math.max(2, total_runtime_s - 2) });
  }

  return {
    total_runtime_s,
    shot_timings,
    transitions,
    music_ducking_curve,
    silence_windows,
    memory_inserts,
    brand_bug_visible,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────

function breathBetween(prev_beat: string | undefined, next_beat: string, mode: { id: EmotionalMode; silence_required_pct: number }): number {
  if (!prev_beat) return 0;   // no breath before hook
  // Memorial / sacred modes get longer breath at every beat change
  const base = mode.id === "restrained_reverence" || mode.id === "geopolitical_grave" ? 0.8 : 0.3;
  // Significant beat transitions get extra
  const significant = (prev_beat === "wonder" && next_beat === "meaning") || (next_beat === "close");
  return significant ? base + 0.5 : base;
}

function pickTransition(
  a:                ShotGrammar,
  b:                ShotGrammar,
  cut_aggressiveness: number,
  allowed:          ReadonlyArray<"hard_cut" | "dissolve" | "long_dissolve" | "match_cut" | "fade_to_black" | "sound_bridge_cut">,
): TransitionDecision {
  // Temporal collapse pairing · use match cut or long dissolve as appropriate
  if (a.collapse_technique && b.collapse_technique && a.collapse_technique === b.collapse_technique) {
    const rule = TEMPORAL_COLLAPSE[a.collapse_technique];
    const type = a.collapse_technique === "architectural_match_cut" ? "match_cut" : "long_dissolve";
    return {
      from_shot:           a.shot_index,
      to_shot:             b.shot_index,
      type,
      duration_s:          rule.duration_range_s[1],
      reasoning:           `collapse pair · ${a.collapse_technique} · ${type}`,
      collapse_technique:  a.collapse_technique,
    };
  }

  // Beat-driven default
  if (a.beat === "wonder" && b.beat === "meaning") {
    const choice = allowed.includes("long_dissolve") ? "long_dissolve" : (allowed.includes("dissolve") ? "dissolve" : "hard_cut");
    return { from_shot: a.shot_index, to_shot: b.shot_index, type: choice, duration_s: choice === "long_dissolve" ? 1.2 : choice === "dissolve" ? 0.6 : 0, reasoning: "wonder → meaning · soften" };
  }
  if (b.beat === "close") {
    const choice = allowed.includes("fade_to_black") ? "fade_to_black" : (allowed.includes("long_dissolve") ? "long_dissolve" : "dissolve");
    return { from_shot: a.shot_index, to_shot: b.shot_index, type: choice, duration_s: choice === "fade_to_black" ? 1.5 : 1.0, reasoning: "→ close · breath into ending" };
  }

  // Aggressiveness gate
  if (cut_aggressiveness > 0.5) {
    return { from_shot: a.shot_index, to_shot: b.shot_index, type: "hard_cut", duration_s: 0, reasoning: "high cut_aggressiveness mode · hard cut" };
  }
  const choice = allowed.includes("dissolve") ? "dissolve" : "hard_cut";
  return { from_shot: a.shot_index, to_shot: b.shot_index, type: choice, duration_s: choice === "dissolve" ? 0.5 : 0, reasoning: "default · gentle transition" };
}
