/**
 * KUDOS · Story Director · narrative arc planner (P23).
 *
 * Transforms a POI + editorial decision into a structured ShotPlan:
 *
 *   Hook · 0-2s · curiosity spike, NO boring intro
 *   Escalation · 2-8s · widen the world, raise stakes
 *   Wonder · 8-18s · the visual payoff moment
 *   Meaning · 18-28s · why this matters (the editorial earn)
 *   Close · 28-30s+ · land the feeling, leave breath
 *
 * Single Claude call (already-real provider). Adds:
 *   · narrative-angle resolution (pick the one angle worth telling today)
 *   · arc validation (assert hook/wonder/meaning are present)
 *   · sources required (no claims without citation)
 *   · per-shot intent labels (so QC engine can grade frame vs intent)
 */
import { callClaudeStory } from "./providers/claude";
import type {
  CapsuleRequest, ClaudeStoryOutput, ShotSpec, CapsuleTier,
} from "./types";

// ─── Public contract ──────────────────────────────────────────────────────

/** Beats are the canonical narrative phases. Each shot is tagged with one. */
export type Beat = "hook" | "escalation" | "wonder" | "meaning" | "close";

export interface ShotPlan {
  capsule_id:         string;
  poi_id:             string;
  tier:               CapsuleTier;
  duration_seconds:   number;
  arc:                NarrativeArc;
  shots:              ReadonlyArray<TaggedShot>;
  sources:            ReadonlyArray<{ title: string; year: string }>;
  raw:                ClaudeStoryOutput;  // full Claude payload for downstream
}

export interface NarrativeArc {
  hook:        string;      // ≤120 chars, NO clichés (banned: "Imagine...", "Did you know...")
  escalation:  string;
  wonder:      string;
  meaning:     string;
  close:       string;
  /** The single angle this capsule commits to today (anniversary, geopolitical, etc.) */
  angle:       string;
  /** 0-1 · narrator pacing intensity · drives voice engine and music tension curve */
  emotional_curve: ReadonlyArray<number>;  // one value per shot
}

export interface TaggedShot extends ShotSpec {
  beat:               Beat;
  intent:             string;    // what the frame must convey for QC vision check
}

// ─── Configuration ────────────────────────────────────────────────────────

interface BeatLayout {
  duration_s:     number;
  ratio_of_total: number;
  required:       boolean;
}

const TIER_LAYOUTS: Record<CapsuleTier, ReadonlyArray<{ beat: Beat; layout: BeatLayout }>> = {
  tier1_legend: [
    { beat: "hook",       layout: { duration_s: 2,  ratio_of_total: 0.04, required: true  } },
    { beat: "escalation", layout: { duration_s: 12, ratio_of_total: 0.20, required: true  } },
    { beat: "wonder",     layout: { duration_s: 18, ratio_of_total: 0.30, required: true  } },
    { beat: "meaning",    layout: { duration_s: 18, ratio_of_total: 0.30, required: true  } },
    { beat: "close",      layout: { duration_s: 10, ratio_of_total: 0.16, required: true  } },
  ],
  tier2_image_capsule: [
    { beat: "hook",       layout: { duration_s: 2,  ratio_of_total: 0.07, required: true  } },
    { beat: "escalation", layout: { duration_s: 8,  ratio_of_total: 0.27, required: true  } },
    { beat: "wonder",     layout: { duration_s: 10, ratio_of_total: 0.33, required: true  } },
    { beat: "meaning",    layout: { duration_s: 7,  ratio_of_total: 0.23, required: true  } },
    { beat: "close",      layout: { duration_s: 3,  ratio_of_total: 0.10, required: false } },
  ],
  tier3_story_card: [
    { beat: "hook",       layout: { duration_s: 2,  ratio_of_total: 0.13, required: true  } },
    { beat: "wonder",     layout: { duration_s: 8,  ratio_of_total: 0.53, required: true  } },
    { beat: "meaning",    layout: { duration_s: 5,  ratio_of_total: 0.34, required: true  } },
  ],
  tier4_data_card: [
    // Tier 4 has no narrative arc · metadata card only · story-director skipped
    { beat: "hook", layout: { duration_s: 0, ratio_of_total: 1, required: false } },
  ],
};

const BANNED_HOOK_OPENERS = [
  /^imagine\b/i,
  /^did you know\b/i,
  /^in a world\b/i,
  /^what if\b/i,
  /^picture this\b/i,
  /^let me tell you\b/i,
] as const;

// ─── Main entry ───────────────────────────────────────────────────────────

export interface DirectInput {
  capsule_id:        string;
  tier:              CapsuleTier;
  request:           CapsuleRequest;
  /** Optional angle hint from the editorial brain (anniversary, cultural moment, etc.) */
  editorial_angle?:  string;
}

export interface DirectOutput {
  plan:              ShotPlan;
  warnings:          ReadonlyArray<string>;
  cost_usd:          number;
  ms:                number;
}

export async function directStory(input: DirectInput): Promise<DirectOutput> {
  const t0 = Date.now();
  if (input.tier === "tier4_data_card") {
    return tier4Stub(input, t0);
  }

  const story = await callClaudeStory(input.request);

  // ── Tag shots with beats ───────────────────────────────────────────────
  const layout = TIER_LAYOUTS[input.tier];
  const taggedShots = tagShotsWithBeats(story.shotList, layout, input.request.duration_seconds);

  // ── Build arc + validate ───────────────────────────────────────────────
  const warnings: string[] = [];
  const arc = extractArc(story, taggedShots, input.editorial_angle, warnings);
  validateArc(arc, layout, warnings);

  // ── Build plan ─────────────────────────────────────────────────────────
  const plan: ShotPlan = {
    capsule_id:         input.capsule_id,
    poi_id:             input.request.poi.id,
    tier:               input.tier,
    duration_seconds:   input.request.duration_seconds,
    arc,
    shots:              taggedShots,
    sources:            story.sources ?? [],
    raw:                story,
  };

  if (plan.sources.length === 0) {
    warnings.push("no sources cited · QC pre-render judge will likely reject for factual_grounding");
  }

  return {
    plan,
    warnings,
    cost_usd: story._meta.cost_usd,
    ms:       Date.now() - t0,
  };
}

// ─── Beat tagging ─────────────────────────────────────────────────────────

function tagShotsWithBeats(
  shots:    ReadonlyArray<ShotSpec>,
  layout:   ReadonlyArray<{ beat: Beat; layout: BeatLayout }>,
  total_s:  number,
): TaggedShot[] {
  // Assign each shot to the beat whose [start_ratio, end_ratio] contains its midpoint.
  let cumulativeRatio = 0;
  const boundaries: Array<{ beat: Beat; start: number; end: number; intent: string }> = layout.map(l => {
    const start = cumulativeRatio;
    cumulativeRatio += l.layout.ratio_of_total;
    return {
      beat:   l.beat,
      start,
      end:    cumulativeRatio,
      intent: defaultIntentForBeat(l.beat),
    };
  });

  return shots.map(s => {
    const mid_ratio = ((s.start_s + s.end_s) / 2) / total_s;
    const match = boundaries.find(b => mid_ratio >= b.start && mid_ratio < b.end) ?? boundaries[boundaries.length - 1];
    return { ...s, beat: match.beat, intent: match.intent };
  });
}

function defaultIntentForBeat(b: Beat): string {
  switch (b) {
    case "hook":       return "create curiosity in first 2 seconds · arresting visual · no text overlay";
    case "escalation": return "widen the world · raise the stakes · move the camera";
    case "wonder":     return "the payoff moment · the image that earns the share";
    case "meaning":    return "the why · the human/historical anchor · earned by the wonder shot";
    case "close":      return "land the feeling · breath · invite the next moment";
  }
}

// ─── Arc extraction + validation ──────────────────────────────────────────

function extractArc(
  story:          ClaudeStoryOutput,
  shots:          ReadonlyArray<TaggedShot>,
  editorialAngle: string | undefined,
  warnings:       string[],
): NarrativeArc {
  const lineByBeat: Record<Beat, string> = {
    hook:       story.hook ?? firstShotVisual(shots, "hook"),
    escalation: firstShotVisual(shots, "escalation"),
    wonder:     firstShotVisual(shots, "wonder"),
    meaning:    story.meaning ?? firstShotVisual(shots, "meaning"),
    close:      story.promise ?? firstShotVisual(shots, "close"),
  };

  // Banned-opener guard
  for (const banned of BANNED_HOOK_OPENERS) {
    if (banned.test(lineByBeat.hook)) {
      warnings.push(`banned hook opener detected · /${banned.source}/ · pre-render judge will reject`);
    }
  }

  // Emotional curve · simple parametric shape
  const emotional_curve = shots.map(s => emotionalCurveFor(s.beat));

  return {
    ...lineByBeat,
    angle: editorialAngle ?? inferAngle(story),
    emotional_curve,
  };
}

function firstShotVisual(shots: ReadonlyArray<TaggedShot>, beat: Beat): string {
  return shots.find(s => s.beat === beat)?.visual ?? "";
}

function emotionalCurveFor(beat: Beat): number {
  switch (beat) {
    case "hook":       return 0.85;  // sharp spike
    case "escalation": return 0.55;  // breathe out, set scene
    case "wonder":     return 0.95;  // peak
    case "meaning":    return 0.80;  // sustained gravitas
    case "close":      return 0.40;  // resolution
  }
}

function inferAngle(story: ClaudeStoryOutput): string {
  // Heuristic · the title usually telegraphs the angle
  return story.title?.split(" · ")[0] ?? story.musicMood ?? "cultural";
}

function validateArc(arc: NarrativeArc, layout: ReadonlyArray<{ beat: Beat; layout: BeatLayout }>, warnings: string[]): void {
  for (const l of layout) {
    if (!l.layout.required) continue;
    const beatText = (arc as unknown as Record<string, string>)[l.beat];
    if (!beatText || beatText.length < 6) {
      warnings.push(`missing required beat: ${l.beat}`);
    }
  }
  if (arc.hook.length > 120) {
    warnings.push(`hook is ${arc.hook.length} chars · > 120 char limit · trim or judge will mark hook_strength low`);
  }
}

// ─── Tier 4 stub · no story, no Claude call ───────────────────────────────

function tier4Stub(input: DirectInput, t0: number): DirectOutput {
  return {
    plan: {
      capsule_id:       input.capsule_id,
      poi_id:           input.request.poi.id,
      tier:             input.tier,
      duration_seconds: 0,
      arc: {
        hook:       input.request.poi.name,
        escalation: "",
        wonder:     "",
        meaning:    input.request.poi.location,
        close:      "",
        angle:      "metadata",
        emotional_curve: [],
      },
      shots:    [],
      sources:  [],
      raw: {
        title: input.request.poi.name,
        hook: input.request.poi.name,
        meaning: input.request.poi.location,
        promise: "",
        script: "",
        shotList: [],
        subtitlesVTT: "",
        musicMood: "",
        voiceStyle: "",
        sources: [],
        _meta: { tokens_in: 0, tokens_out: 0, cost_usd: 0, ms: 0 },
      },
    },
    warnings: ["tier4_data_card · story director skipped"],
    cost_usd: 0,
    ms:       Date.now() - t0,
  };
}
