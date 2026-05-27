/**
 * KUDOS · Visual Prompt Engine · skeleton (P23).
 *
 * Builds the prompt bundles fed to image/video providers.
 * Consumes the ShotPlan from story-director; emits structured prompts
 * with palette anchors, motion grammar, and consistency seeds.
 *
 * Implementation TODO (P23.1):
 *   · era-aware palette/lighting templates
 *   · motion-grammar dictionary (push, pull, orbit, tilt)
 *   · consistency seed strategy (POI anchor frame propagated as ref)
 *   · negative-prompt library (no text, no watermark, no morphing)
 *   · prompt-refinement pass via Claude (rewrite weak prompts before render)
 */
import type { ShotPlan, TaggedShot, Beat } from "./story-director";

export interface PromptBundle {
  capsule_id:         string;
  poi_id:             string;
  palette:            Palette;
  motion_grammar:     MotionGrammar;
  consistency_seed?:  number;
  per_shot:           ReadonlyArray<ShotPrompt>;
  negative_prompt:    string;
}

export interface Palette {
  /** Hex colors anchoring lighting/grading · 3-5 values */
  anchors:        ReadonlyArray<string>;
  era_label:      string;            // "ancient roman warm umber", "modernist concrete"
  time_of_day:    "dawn" | "day" | "golden_hour" | "blue_hour" | "night";
}

export interface MotionGrammar {
  /** Camera vocabulary for the capsule · maps beat -> camera move */
  per_beat: Record<Beat, "static" | "push_in" | "pull_out" | "orbit" | "tilt_up" | "tilt_down" | "dolly_left" | "dolly_right" | "handheld">;
  /** 0-1 · overall motion intensity tier */
  intensity: number;
}

export interface ShotPrompt {
  shot_index:        number;
  beat:              Beat;
  image_prompt:      string;       // for FLUX/SDXL still generation
  video_prompt:      string;       // for Kling/Runway image-to-video
  reference_image?:  string;       // path/url to anchor frame for consistency
  duration_s:        number;
  camera_move:       MotionGrammar["per_beat"][Beat];
}

export interface BuildPromptsInput {
  plan:                ShotPlan;
  /** POI era hint · drives palette · "ancient", "medieval", "modern", "contemporary" */
  era?:                string;
  /** Optional refinement pass via Claude (costs $0.01-0.02 per capsule) */
  refine_with_claude?: boolean;
}

export interface BuildPromptsOutput {
  bundle:    PromptBundle;
  cost_usd:  number;
  ms:        number;
  warnings:  ReadonlyArray<string>;
}

/**
 * SKELETON. Real implementation in P23.1.
 * Current behavior: pass-through from ShotPlan, no refinement, default palette.
 */
export async function buildPrompts(input: BuildPromptsInput): Promise<BuildPromptsOutput> {
  const t0 = Date.now();

  const palette: Palette = {
    anchors:     defaultPaletteFor(input.era ?? "contemporary"),
    era_label:   input.era ?? "contemporary",
    time_of_day: "golden_hour",
  };

  const motion_grammar: MotionGrammar = {
    intensity: 0.7,
    per_beat: {
      hook:       "push_in",
      escalation: "orbit",
      wonder:     "pull_out",
      meaning:    "static",
      close:      "tilt_up",
    },
  };

  const per_shot: ShotPrompt[] = input.plan.shots.map(s => ({
    shot_index:   s.shot,
    beat:         s.beat,
    image_prompt: s.image_prompt,
    video_prompt: s.video_prompt,
    duration_s:   s.end_s - s.start_s,
    camera_move:  motion_grammar.per_beat[s.beat],
  }));

  return {
    bundle: {
      capsule_id:      input.plan.capsule_id,
      poi_id:          input.plan.poi_id,
      palette,
      motion_grammar,
      per_shot,
      negative_prompt: DEFAULT_NEGATIVE_PROMPT,
    },
    cost_usd: 0,
    ms:       Date.now() - t0,
    warnings: ["skeleton implementation · no era-aware refinement · TODO P23.1"],
  };
}

const DEFAULT_NEGATIVE_PROMPT =
  "text, watermark, logo, signature, blurry, low quality, distorted, morphing, " +
  "extra limbs, deformed, oversaturated, cartoon, illustration, painting";

function defaultPaletteFor(era: string): ReadonlyArray<string> {
  switch (era) {
    case "ancient":      return ["#8b6c42", "#c4a36a", "#3d2e1f", "#f0e4cb"];
    case "medieval":     return ["#5a4a3e", "#9a8266", "#262019", "#e6dcc4"];
    case "modern":       return ["#2a2a30", "#5e6973", "#aeb6bf", "#f4f6f7"];
    case "contemporary": return ["#1f2a36", "#3d5a78", "#a3b8cc", "#f1f5f9"];
    default:             return ["#2a2a30", "#5e6973", "#aeb6bf", "#f4f6f7"];
  }
}
