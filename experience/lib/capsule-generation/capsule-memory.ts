/**
 * KUDOS · Capsule Generation · Cinematic Memory System (Section 7).
 *
 *   "Shots inside a capsule must feel related, not assembled."
 *
 *   CapsuleMemory accumulates what has been established across approved shots
 *   and feeds that knowledge forward into the next shot's prompt. This is
 *   distinct from continuity (which is the visual anchor); memory tracks
 *   narrative-level recurrence: motifs that should return, symbols that
 *   should echo, an atmosphere that should persist.
 *
 *   Example: the candle in shot 2 should recur in shot 6. The dust in shot 3
 *   should still be visible in shot 8. The grain texture established at shot 1
 *   carries across all shots.
 */
import type { ShotGrammar } from "../cinematic-language/provider-abstraction";
import type { EnvironmentalMotion } from "../cinematic-language/shot-taxonomy";

// ─── The memory ──────────────────────────────────────────────────────────

export interface CapsuleMemory {
  /** Visual motifs observed/declared across shots · "candle", "stone arch", "footstep" */
  visual_motifs:               ReadonlyArray<string>;
  /** Recurring symbols · narrative anchors that should appear more than once */
  recurring_symbols:           ReadonlyArray<string>;
  /** Atmosphere persistence · environmental motion elements that must remain */
  atmosphere_persistence:      ReadonlyArray<EnvironmentalMotion | string>;
  /** Number of shots approved so far */
  shots_approved:              number;
  /** Per-shot motion intensity observed · curve for the compositor */
  pacing_intensity_curve:      ReadonlyArray<number>;
  /** Per-shot emotional intensity · drives crescendo timing */
  emotional_progression:       ReadonlyArray<{ shot: number; intensity: number }>;
  /** Sound bridges or audio carryovers that the compositor must honor */
  audio_continuity_cues:       ReadonlyArray<string>;
}

// ─── Construction ────────────────────────────────────────────────────────

export function emptyMemory(): CapsuleMemory {
  return {
    visual_motifs:          [],
    recurring_symbols:      [],
    atmosphere_persistence: [],
    shots_approved:         0,
    pacing_intensity_curve: [],
    emotional_progression:  [],
    audio_continuity_cues:  [],
  };
}

// ─── Update ──────────────────────────────────────────────────────────────

export interface ApprovedShotRecord {
  shot_index:                number;
  grammar:                   ShotGrammar;
  /** Motifs declared by the grammar's must_include or beat */
  declared_motifs:           ReadonlyArray<string>;
}

export function rememberShot(memory: CapsuleMemory, record: ApprovedShotRecord): CapsuleMemory {
  // Add this shot's environmental motion to the persistent atmosphere if it
  // recurs across at least 2 shots
  const new_atmosphere = [...memory.atmosphere_persistence];
  for (const env of record.grammar.required_environmental_motion) {
    if (!new_atmosphere.includes(env)) new_atmosphere.push(env);
  }

  // Track motifs · anything appearing in 2+ shots becomes a "recurring_symbol"
  const new_motifs = uniq([...memory.visual_motifs, ...record.declared_motifs]);
  const motif_counts: Record<string, number> = {};
  for (const m of [...memory.visual_motifs, ...record.declared_motifs]) {
    motif_counts[m] = (motif_counts[m] ?? 0) + 1;
  }
  const new_recurring = Object.entries(motif_counts)
    .filter(([, n]) => n >= 2)
    .map(([m]) => m);

  // Pacing curve sample
  const new_pacing = [...memory.pacing_intensity_curve, record.grammar.motion_intensity];
  const new_emo    = [...memory.emotional_progression, { shot: record.shot_index, intensity: record.grammar.motion_intensity }];

  return {
    visual_motifs:          new_motifs,
    recurring_symbols:      uniq(new_recurring),
    atmosphere_persistence: new_atmosphere,
    shots_approved:         memory.shots_approved + 1,
    pacing_intensity_curve: new_pacing,
    emotional_progression:  new_emo,
    audio_continuity_cues:  memory.audio_continuity_cues,
  };
}

// ─── Inject memory into next shot's prompt ───────────────────────────────

export function memoryToPromptInjection(memory: CapsuleMemory, next_shot: ShotGrammar): ReadonlyArray<string> {
  if (memory.shots_approved === 0) return [];
  const injections: string[] = [];

  // Recurring symbols · ensure they continue to be visible
  if (memory.recurring_symbols.length > 0) {
    injections.push(`recurring motif: ${memory.recurring_symbols.slice(0, 2).join(", ")}`);
  }

  // Atmosphere persistence · ensure base atmospherics carry
  if (memory.atmosphere_persistence.length > 0) {
    const persistent = memory.atmosphere_persistence
      .filter(a => !next_shot.required_environmental_motion.includes(a as EnvironmentalMotion))
      .slice(0, 2);
    if (persistent.length > 0) {
      injections.push(`persistent atmosphere: ${persistent.join(", ")}`);
    }
  }

  return injections;
}

// ─── Audio continuity ────────────────────────────────────────────────────

export function declareAudioBridge(memory: CapsuleMemory, cue: string): CapsuleMemory {
  return {
    ...memory,
    audio_continuity_cues: uniq([...memory.audio_continuity_cues, cue]),
  };
}

function uniq<T>(xs: ReadonlyArray<T>): T[] {
  return Array.from(new Set(xs));
}
