/**
 * KUDOS · Feed Ranker · combines Engine A + Engine B + editorial boost.
 *
 *   feed_rank = 0.55 * feed_score + 0.30 * poi_score + 0.15 * editorial_boost
 *
 * BUT: only Tier 1 capsules are eligible for the premium home feed.
 * Tier 2 surfaces only in contextual POI screens.
 */
import type { CapsuleTier } from "./types";

export interface FeedCandidate {
  poi_id:           string;
  poi_score:        number;       // 0-100 (Engine A)
  feed_score:       number;       // 0-100 (Engine B)
  editorial_boost:  number;       // 0-100 (curator override)
  tier:             CapsuleTier;
}

export interface FeedRanked extends FeedCandidate {
  feed_rank:        number;       // 0-100 combined
  feed_eligible:    boolean;      // tier1 only for premium feed
  surface:          "home_premium" | "poi_contextual" | "search_only";
}

const ALPHA = 0.55;   // feed_score
const BETA  = 0.30;   // poi_score
const GAMMA = 0.15;   // editorial_boost

export function rankCandidate(c: FeedCandidate): FeedRanked {
  const feed_rank = ALPHA * c.feed_score + BETA * c.poi_score + GAMMA * c.editorial_boost;
  const tier1 = c.tier === "tier1_legend";
  const tier2 = c.tier === "tier2_image_capsule";
  return {
    ...c,
    feed_rank: Number(feed_rank.toFixed(2)),
    feed_eligible: tier1,
    surface: tier1 ? "home_premium" : tier2 ? "poi_contextual" : "search_only",
  };
}

export function rankAll(candidates: ReadonlyArray<FeedCandidate>): FeedRanked[] {
  return candidates.map(rankCandidate).sort((a, b) => b.feed_rank - a.feed_rank);
}

/** Premium home feed = top N tier1 capsules by feed_rank. */
export function premiumHomeFeed(candidates: ReadonlyArray<FeedCandidate>, limit = 20): FeedRanked[] {
  return rankAll(candidates).filter((c) => c.feed_eligible).slice(0, limit);
}
