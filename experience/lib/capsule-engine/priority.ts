/**
 * KUDOS · Capsule Engine · Editorial priority (Engines A + B + C composite).
 *
 *   priority_score = 0.45 · poi_score   (structural,   Engine A)
 *                  + 0.30 · momentum    (dynamic,      Engine B)
 *                  + 0.25 · editorial   (curatorial,   Engine C)
 *
 * Editorial tiers (different from runtime tiers in tier-router.ts · the
 * runtime router operates on poi_score alone for one-off API calls; this
 * mapper operates on the daily curated priority for the pre-gen queue):
 *
 *   priority >= 90  → A  PREMIUM LEGEND  → full AI video
 *   priority 75-89  → B  IMAGE CAPSULE   → stills + ffmpeg motion
 *   priority 50-74  → C  STORY CARD      → text + hero image
 *   priority <  50  → D  DATA ONLY       → metadata
 */
import type { CapsuleTier } from "./types";

export type EditorialTier = "A" | "B" | "C" | "D";

export interface PriorityInput {
  poi_id:          string;
  poi_score:       number;       // 0-100 (Engine A)
  momentum_score:  number;       // 0-100 (Engine B)
  editorial_score: number;       // 0-100 (Engine C)
}

export interface PriorityOutput {
  poi_id:          string;
  priority_score:  number;       // 0-100 weighted composite
  editorial_tier:  EditorialTier;
  capsule_tier:    CapsuleTier;  // mapping to orchestrator's runtime tier
  breakdown:       { poi: number; momentum: number; editorial: number };
}

const ALPHA = 0.45;   // poi
const BETA  = 0.30;   // momentum
const GAMMA = 0.25;   // editorial

export function computePriority(input: PriorityInput): PriorityOutput {
  const poi_w  = ALPHA * clamp01(input.poi_score        / 100);
  const mom_w  = BETA  * clamp01(input.momentum_score   / 100);
  const ed_w   = GAMMA * clamp01(input.editorial_score  / 100);
  const priority_score = Math.round((poi_w + mom_w + ed_w) * 100);

  const editorial_tier = priorityToTier(priority_score);

  return {
    poi_id:          input.poi_id,
    priority_score,
    editorial_tier,
    capsule_tier:    editorialToCapsuleTier(editorial_tier),
    breakdown: {
      poi:       Math.round(poi_w * 100),
      momentum:  Math.round(mom_w * 100),
      editorial: Math.round(ed_w  * 100),
    },
  };
}

export function priorityToTier(score: number): EditorialTier {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 50) return "C";
  return "D";
}

export function editorialToCapsuleTier(t: EditorialTier): CapsuleTier {
  switch (t) {
    case "A": return "tier1_legend";
    case "B": return "tier2_image_capsule";
    case "C": return "tier3_story_card";
    case "D": return "tier4_data_card";
  }
}

function clamp01(n: number): number { return Math.max(0, Math.min(1, n)); }
