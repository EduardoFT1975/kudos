/**
 * KUDOS · Editorial Brain · daily scheduler.
 *
 * Four-slot daily pipeline · all UTC:
 *
 *   03:00 · structural review     · recompute Engine A scores for any POI
 *                                   whose signals changed in the last 24h
 *   04:00 · momentum review        · recompute Engine B for ALL active POIs
 *                                   from the last 24h of telemetry
 *   05:00 · editorial opportunity  · recompute Engine C · anniversaries,
 *                                   seasons, events, viral, weather
 *   06:00 · brain + generation     · runEditorialBrain() → orchestrator queue
 *
 * Production: register these as cron jobs (Railway / GitHub Actions / Vercel
 * Cron / fly machines). This file exports the entry points each slot calls.
 */
import { computePoiScore,    type PoiScoreInput }       from "./engine-a-poi-score";
type PoiScoreOutput  = ReturnType<typeof computePoiScore>;
import { computeFeedScore,   type FeedScoreInput }     from "./engine-b-feed-score";
type FeedScoreOutput = ReturnType<typeof computeFeedScore>;
import { computeEditorialScore, type EditorialOpportunityInput, type EditorialOpportunityOutput } from "./engine-c-editorial-score";
import { runEditorialBrain,  type BrainInput, type BrainOutput } from "./editorial-brain";

// Slot timings (UTC cron format)
export const SCHEDULE_CRON = {
  STRUCTURAL: "0 3 * * *",
  MOMENTUM:   "0 4 * * *",
  EDITORIAL:  "0 5 * * *",
  GENERATION: "0 6 * * *",
} as const;

// ─── Slot 03:00 · structural review ───────────────────────────────────────

export interface StructuralSlotInput { poi_signals: ReadonlyArray<{ poi_id: string; input: PoiScoreInput }>; }
export interface StructuralSlotOutput { results: ReadonlyArray<{ poi_id: string; score: PoiScoreOutput }>; }

export function runStructuralSlot(input: StructuralSlotInput): StructuralSlotOutput {
  return {
    results: input.poi_signals.map(p => ({ poi_id: p.poi_id, score: computePoiScore(p.input) })),
  };
}

// ─── Slot 04:00 · momentum review ─────────────────────────────────────────

export interface MomentumSlotInput  { poi_signals: ReadonlyArray<{ poi_id: string; input: FeedScoreInput }>; }
export interface MomentumSlotOutput { results: ReadonlyArray<{ poi_id: string; score: FeedScoreOutput }>; }

export function runMomentumSlot(input: MomentumSlotInput): MomentumSlotOutput {
  return {
    results: input.poi_signals.map(p => ({ poi_id: p.poi_id, score: computeFeedScore(p.input) })),
  };
}

// ─── Slot 05:00 · editorial opportunity ──────────────────────────────────

export interface EditorialSlotInput  { poi_signals: ReadonlyArray<{ poi_id: string; input: EditorialOpportunityInput }>; }
export interface EditorialSlotOutput { results: ReadonlyArray<{ poi_id: string; score: EditorialOpportunityOutput }>; }

export function runEditorialSlot(input: EditorialSlotInput): EditorialSlotOutput {
  return {
    results: input.poi_signals.map(p => ({ poi_id: p.poi_id, score: computeEditorialScore(p.input) })),
  };
}

// ─── Slot 06:00 · generation queue ────────────────────────────────────────

export type GenerationSlotInput  = BrainInput;
export type GenerationSlotOutput = BrainOutput;

export function runGenerationSlot(input: GenerationSlotInput): GenerationSlotOutput {
  return runEditorialBrain(input);
}
