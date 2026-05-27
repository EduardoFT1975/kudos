/**
 * KUDOS · Sound Design · skeleton (P23).
 *
 * Music score + SFX design tied to the emotional curve.
 *
 * Implementation TODO (P23.4):
 *   · Music library API (P16 Epidemic Sound done) + tension curve selector
 *   · SFX library: ambient (wind, water, market), impact (cuts, transitions)
 *   · Sidechain compression so music ducks under voice automatically
 *   · BPM matching to scene_change_rate
 */
import type { ShotPlan } from "./story-director";

export interface SoundDesignInput {
  plan:               ShotPlan;
  music_mood:         string;          // from Claude story output
  bpm_target?:        number;          // derived from scene rate if absent
}

export interface SoundDesignOutput {
  music_path:    string;
  sfx_path?:     string;             // optional · per-beat SFX cues
  sfx_cues:      ReadonlyArray<SfxCue>;
  cost_usd:      number;
  ms:            number;
  provider:      string;
  track_id:      string;
}

export interface SfxCue {
  beat:        ShotPlan["shots"][number]["beat"];
  timestamp_s: number;
  sfx_id:      string;       // library reference
  volume_db:   number;
}

/**
 * SKELETON. Real implementation in P23.4.
 */
export async function composeSoundDesign(input: SoundDesignInput): Promise<SoundDesignOutput> {
  throw new Error(
    `sound-design skeleton · P23.4 TODO. mood=${input.music_mood} ` +
    `shots=${input.plan.shots.length}`
  );
}
