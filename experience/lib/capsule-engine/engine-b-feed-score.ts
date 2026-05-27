/**
 * KUDOS · Engine B · Feed Momentum Score (dynamic, refreshed hourly).
 *
 * Output range 0-100. Drives feed ranking + caching priority.
 * All inputs are raw counters/ratios · normalized inside the function.
 */
export interface FeedScoreInput {
  /** Views in last 24h */
  views_24h:               number;
  /** Shares in last 24h */
  shares_24h:              number;
  /** Saves in last 24h */
  saves_24h:               number;
  /** Comments / mind queries in last 24h */
  comments_24h:            number;
  /** 0-1 · Seasonal relevance now (winter for ski POIs etc) */
  seasonality:             number;
  /** 0-1 · 1 = user is at POI, 0 = >1000km */
  proximity:               number;
  /** 0-1 · Travel-trending signal · external (Skyscanner, Booking) */
  travel_trending:         number;
  /** 0-1 · Novelty · how recently was the POI added or refreshed */
  novelty:                 number;
  /** 0-1 · Local event today (concert, exhibit) */
  local_event_relevance:   number;
}

const WEIGHTS = {
  views_24h:             20,    // log-normalized
  shares_24h:            18,    // shares weight more than views
  saves_24h:             12,
  comments_24h:           8,
  seasonality:            8,
  proximity:             14,
  travel_trending:        8,
  novelty:                7,
  local_event_relevance:  5,
} as const;

/** log normalization · 1.0 = 1000+ events */
function logNorm(n: number): number {
  if (n <= 0) return 0;
  return Math.min(1, Math.log10(n + 1) / 3);
}

export function computeFeedScore(input: FeedScoreInput): { feed_score: number; breakdown: Record<string, number> } {
  const normalized: Record<string, number> = {
    views_24h:             logNorm(input.views_24h),
    shares_24h:            logNorm(input.shares_24h),
    saves_24h:             logNorm(input.saves_24h),
    comments_24h:          logNorm(input.comments_24h),
    seasonality:           clamp01(input.seasonality),
    proximity:             clamp01(input.proximity),
    travel_trending:       clamp01(input.travel_trending),
    novelty:               clamp01(input.novelty),
    local_event_relevance: clamp01(input.local_event_relevance),
  };
  const breakdown: Record<string, number> = {};
  let total = 0;
  for (const k of Object.keys(WEIGHTS) as Array<keyof typeof WEIGHTS>) {
    const contrib = normalized[k] * WEIGHTS[k];
    breakdown[k] = Number(contrib.toFixed(2));
    total += contrib;
  }
  return { feed_score: Math.round(total), breakdown };
}

function clamp01(n: number): number {
  if (typeof n !== "number" || isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n));
}
