/**
 * KUDOS · Voice Engine · skeleton (P23).
 *
 * Multilingual narrator orchestration with persona library and emotional
 * pacing aligned to the ShotPlan emotional_curve.
 *
 * Implementation TODO (P23.3):
 *   · Cartesia (P16 done) + ElevenLabs fallback
 *   · Persona library (cinematic, intimate, mystery, celebratory · per language)
 *   · Emotional pacing curve -> per-segment speed/intensity directives
 *   · Subtitle VTT generation aligned to actual waveform timestamps
 */
import type { ShotPlan, Beat } from "./story-director";

export type VoicePersona =
  | "cinematic_male"
  | "cinematic_female"
  | "intimate_male"
  | "intimate_female"
  | "mystery_male"
  | "mystery_female"
  | "documentary_male"
  | "documentary_female";

export interface VoiceSegment {
  /** Which shot/beat this voice segment narrates */
  shot_index:  number;
  beat:        Beat;
  text:        string;
  start_s:     number;
  end_s:       number;
  /** 0-1 emotional intensity · drives speed + tonal modulation */
  intensity:   number;
}

export interface SynthesizeVoiceInput {
  plan:        ShotPlan;
  language:    "es" | "en" | "fr" | "it" | "pt";
  persona:     VoicePersona;
  /** Override script segmentation · default = derive from shotList */
  segments?:   ReadonlyArray<VoiceSegment>;
}

export interface SynthesizeVoiceOutput {
  voice_path:     string;
  subtitles_vtt:  string;
  segments:       ReadonlyArray<VoiceSegment>;
  cost_usd:       number;
  ms:             number;
  provider:       "cartesia" | "elevenlabs";
}

/**
 * SKELETON. Real implementation in P23.3.
 */
export async function synthesizeVoice(input: SynthesizeVoiceInput): Promise<SynthesizeVoiceOutput> {
  throw new Error(
    `voice-engine skeleton · P23.3 TODO. ` +
    `Persona=${input.persona} lang=${input.language} shots=${input.plan.shots.length}`
  );
}

export const PERSONA_BY_TONE: Record<string, VoicePersona> = {
  "cinematic epic":  "cinematic_male",
  "intimate":        "intimate_female",
  "mystery":         "mystery_female",
  "celebratory":     "cinematic_female",
};
