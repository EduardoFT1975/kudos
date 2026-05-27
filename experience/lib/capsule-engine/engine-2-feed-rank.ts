/**
 * KUDOS · Engine 2 · Feed Rank.
 *
 * DYNAMIC. Changes constantly. Decides POSITION in feed today.
 * Does NOT decide whether a POI deserves a premium capsule · that's
 * Engine 1 (legend classification) territory.
 *
 *   feed_rank =
 *     0.50 · feed_score        (Engine B momentum · views/shares/saves/comments)
 *   + 0.25 · structural_score  (Engine 1 prestige weight)
 *   + 0.15 · editorial_score   (Engine C opportunity · anniversaries/events)
 *   + 0.10 · contextual_boost  (geo proximity, language match, time-of-day)
 *
 * THE INVARIANTS THIS ENGINE GUARANTEES:
 *
 *   1. A LEGEND can rank #6 today.
 *      → Its premium capsule still exists. It just isn't the hero card today.
 *
 *   2. A LONGTAIL with viral spike can rank #3 in a local feed.
 *      → It will appear in the local rail. It will NOT get a premium capsule.
 *
 *   3. Premium catalog membership is decided by Engine 1 alone.
 *      → No amount of viral momentum here promotes a LONGTAIL to LEGEND.
 */
import type { LegendClass } from "./engine-1-legend-class";

export interface FeedRankInput {
  poi_id:             string;
  feed_score:         number;        // 0-100 (Engine B)
  structural_score:   number;        // 0-100 (Engine 1)
  editorial_score:    number;        // 0-100 (Engine C)
  /** 0-100 · geo proximity, language match, device-context, time-of-day */
  contextual_boost:   number;
  legend_class:       LegendClass;
}

export interface FeedRankOutput {
  poi_id:               string;
  feed_rank_score:      number;        // 0-100 combined
  legend_class:         LegendClass;
  /** TRUE only if Engine 1 says premium AND feed-rank survives ranking */
  eligible_for_premium_feed: boolean;
  /** TRUE if appears in local/contextual rails regardless of premium status */
  eligible_for_local_feed:   boolean;
  breakdown: {
    feed:        number;
    structural:  number;
    editorial:   number;
    contextual:  number;
  };
}

const W_FEED       = 0.50;
const W_STRUCTURAL = 0.20;
const W_EDITORIAL  = 0.15;
const W_CONTEXTUAL = 0.15;

export function computeFeedRank(input: FeedRankInput): FeedRankOutput {
  const f = W_FEED       * clamp01(input.feed_score        / 100);
  const s = W_STRUCTURAL * clamp01(input.structural_score  / 100);
  const e = W_EDITORIAL  * clamp01(input.editorial_score   / 100);
  const c = W_CONTEXTUAL * clamp01(input.contextual_boost  / 100);
  const total = Math.round((f + s + e + c) * 100);

  // Premium home feed: LEGEND always eligible · ICONIC eligible if rank high enough
  const eligible_for_premium_feed =
    input.legend_class === "LEGEND"
    || (input.legend_class === "ICONIC" && total >= 70);

  // Local / contextual rails: anything with enough feed_score
  const eligible_for_local_feed = total >= 35;

  return {
    poi_id:                 input.poi_id,
    feed_rank_score:        total,
    legend_class:           input.legend_class,
    eligible_for_premium_feed,
    eligible_for_local_feed,
    breakdown: {
      feed:        Math.round(f * 100),
      structural:  Math.round(s * 100),
      editorial:   Math.round(e * 100),
      contextual:  Math.round(c * 100),
    },
  };
}

/**
 * Rank a list of candidates · returns sorted array with absolute positions.
 * Caller decides whether to filter on `eligible_for_premium_feed` (home)
 * or `eligible_for_local_feed` (contextual rails).
 */
export function rankFeed(
  candidates: ReadonlyArray<FeedRankInput>,
): ReadonlyArray<FeedRankOutput & { position: number }> {
  return candidates
    .map(computeFeedRank)
    .slice()
    .sort((a, b) => b.feed_rank_score - a.feed_rank_score)
    .map((r, i) => ({ ...r, position: i + 1 }));
}

function clamp01(n: number): number { return Math.max(0, Math.min(1, n)); }
