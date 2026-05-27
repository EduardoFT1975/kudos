/**
 * KUDOS · Capsule Engine · Inventory + Freshness rules.
 *
 * Decides whether an existing capsule asset should be:
 *
 *   generate  · doesn't exist yet
 *   reuse     · exists, still fresh, no editorial reason to refresh
 *   refresh   · exists, but stale OR new editorial signal OR upgrade tier
 *   archive   · capsule's POI lost relevance · stop serving
 */
import type { CapsuleTier } from "./types";
import type { EditorialTier } from "./priority";

export type InventoryDecision = "generate" | "reuse" | "refresh" | "archive";

export interface InventoryEntry {
  poi_id:           string;
  capsule_id:       string;
  capsule_tier:     CapsuleTier;
  status:           "active" | "archived" | "stale";
  created_at:       string;       // ISO
  refreshed_at:     string;       // ISO
  served_count:     number;
  last_served_at:   string | null;
  /** Did an editorial signal fire since refreshed_at? */
  editorial_dirty:  boolean;
}

export interface InventoryDecisionInput {
  poi_id:                  string;
  requested_tier:          EditorialTier;
  current_priority_score:  number;
  current_editorial_tier:  EditorialTier;
  /** Legend Class (Engine 1) · LEGEND POIs cannot be archived, regardless of momentum. */
  legend_class?:           "LEGEND" | "ICONIC" | "IMPORTANT" | "LONGTAIL";
  inventory:               ReadonlyArray<InventoryEntry>;
  today:                   string;             // ISO
}

export interface InventoryDecisionOutput {
  decision:        InventoryDecision;
  reason:          string;
  current_entry?:  InventoryEntry;
}

// Freshness ladders (days) · tier-specific because expensive capsules
// should live longer.
const FRESHNESS_DAYS: Record<CapsuleTier, number> = {
  tier1_legend:        180,  // 6 months for premium
  tier2_image_capsule: 120,
  tier3_story_card:     90,
  tier4_data_card:      30,
};

const ARCHIVE_BELOW = 35;   // priority drop below 35 → archive

export function decideInventoryAction(input: InventoryDecisionInput): InventoryDecisionOutput {
  const existing = input.inventory.find(e => e.poi_id === input.poi_id && e.status === "active");
  const requested_capsule_tier = editorialTierToCapsule(input.requested_tier);

  // Case 1 · no inventory · generate
  if (!existing) {
    return {
      decision: "generate",
      reason:   `no active capsule for ${input.poi_id} · generate ${input.requested_tier}`,
    };
  }

  // Case 2 · priority collapsed below archive threshold
  if (input.current_priority_score < ARCHIVE_BELOW) {
    // BRAND-PROTECT: LEGEND POIs are never archived, even when momentum dies.
    if (input.legend_class === "LEGEND") {
      return {
        decision:      "reuse",
        reason:        `LEGEND class · priority ${input.current_priority_score} below archive threshold but LEGEND POIs are NEVER archived · keep serving existing premium asset`,
        current_entry: existing,
      };
    }
    return {
      decision:      "archive",
      reason:        `priority ${input.current_priority_score} < ${ARCHIVE_BELOW} · archive existing`,
      current_entry: existing,
    };
  }

  // Case 3 · tier upgrade requested · refresh with higher quality
  if (tierRank(existing.capsule_tier) < tierRank(requested_capsule_tier)) {
    return {
      decision:      "refresh",
      reason:        `tier upgrade ${existing.capsule_tier} → ${requested_capsule_tier} · regenerate`,
      current_entry: existing,
    };
  }

  // Case 4 · editorial signal dirty · refresh even if not stale
  if (existing.editorial_dirty) {
    return {
      decision:      "refresh",
      reason:        `editorial signal changed since ${existing.refreshed_at} · regenerate`,
      current_entry: existing,
    };
  }

  // Case 5 · staleness window exceeded
  const ageDays = daysBetween(existing.refreshed_at, input.today);
  const limit   = FRESHNESS_DAYS[existing.capsule_tier];
  if (ageDays > limit) {
    return {
      decision:      "refresh",
      reason:        `age ${ageDays.toFixed(0)}d > ${limit}d freshness window for ${existing.capsule_tier}`,
      current_entry: existing,
    };
  }

  // Case 6 · everything fresh + tier matches · reuse
  return {
    decision:      "reuse",
    reason:        `fresh (${ageDays.toFixed(0)}d / ${limit}d) · tier matches · no editorial signal`,
    current_entry: existing,
  };
}

// ─── helpers ─────────────────────────────────────────────────────────────

function daysBetween(a_iso: string, b_iso: string): number {
  return Math.abs((new Date(b_iso).getTime() - new Date(a_iso).getTime()) / 86_400_000);
}

function tierRank(t: CapsuleTier): number {
  switch (t) {
    case "tier1_legend":        return 4;
    case "tier2_image_capsule": return 3;
    case "tier3_story_card":    return 2;
    case "tier4_data_card":     return 1;
  }
}

function editorialTierToCapsule(t: EditorialTier): CapsuleTier {
  switch (t) {
    case "A": return "tier1_legend";
    case "B": return "tier2_image_capsule";
    case "C": return "tier3_story_card";
    case "D": return "tier4_data_card";
  }
}
