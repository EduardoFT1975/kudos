/**
 * KUDOS · Engine C · Editorial Opportunity Score.
 *
 * Detects "why today is the day to feature this POI". Output 0-100.
 * Refreshed daily at 05:00 UTC by the editorial brain scheduler.
 *
 * Unlike Engine A (slow, structural) and Engine B (hourly, momentum),
 * Engine C is the curator's brain: it answers "is there a *reason*
 * to push this place today?"
 *
 * Inputs are explicit signals — never an LLM call. Deterministic,
 * auditable, and the curator can override any single facet manually.
 */

export interface EditorialOpportunityInput {
  poi_id:                       string;
  /** Today's date in ISO (YYYY-MM-DD) — used for anniversary windowing */
  today:                        string;
  /** Major anniversaries tied to this POI. Each fires within ±7 days */
  anniversaries:                ReadonlyArray<{ name: string; date_mmdd: string; weight: number }>;
  /** Local events happening today within 5km of the POI. Each 0-1 weighted */
  local_events:                 ReadonlyArray<{ name: string; weight: number }>;
  /** "spring" | "summer" | "autumn" | "winter" affinity 0-1 */
  seasonal_affinity:            number;
  /** External viral signal · 0-1 normalized vs the day's top viral post */
  viral_social_lift:            number;
  /** Skyscanner / Booking trending region match · 0-1 */
  travel_trending_region:       number;
  /** Reachable weather window today · sunny+mild = 1, storm = 0 */
  weather_opportunity:          number;
  /** Geopolitical or cultural moment that surfaces this POI · 0-1 */
  geopolitical_relevance:       number;
  /** Cultural moment (Oscars, Eurovision, exhibition opening) · 0-1 */
  cultural_moment:              number;
  /** Curator manual override · -100..+100 · final post-add */
  curator_boost:                number;
}

const WEIGHTS = {
  anniversary:            22,
  local_event:            15,
  seasonal:               12,
  viral:                  14,
  travel_trending:        10,
  weather:                 8,
  geopolitical:            9,
  cultural:               10,
} as const;

const WEIGHT_SUM = Object.values(WEIGHTS).reduce((a, b) => a + b, 0); // 100

export interface EditorialOpportunityOutput {
  editorial_score:    number;
  reason:             string;
  triggers:           ReadonlyArray<string>;
  breakdown:          Record<string, number>;
}

export function computeEditorialScore(input: EditorialOpportunityInput): EditorialOpportunityOutput {
  const triggers: string[] = [];
  const breakdown: Record<string, number> = {};

  // Anniversary window ±7 days
  const todayMD = input.today.slice(5);                              // "MM-DD"
  const annivHit = pickBestAnniversary(input.anniversaries, todayMD);
  const anniv01 = annivHit ? annivHit.weight : 0;
  if (anniv01 > 0) triggers.push(`anniversary:${annivHit!.name}`);
  breakdown.anniversary = (anniv01 * WEIGHTS.anniversary);

  // Local events
  const event01 = clamp01(input.local_events.reduce((s, e) => s + e.weight, 0));
  if (event01 > 0.2) triggers.push(`local_event:${input.local_events[0].name}`);
  breakdown.local_event = event01 * WEIGHTS.local_event;

  // Seasonal
  const season01 = clamp01(input.seasonal_affinity);
  if (season01 > 0.6) triggers.push("season_window");
  breakdown.seasonal = season01 * WEIGHTS.seasonal;

  // Viral
  const viral01 = clamp01(input.viral_social_lift);
  if (viral01 > 0.5) triggers.push("viral_social");
  breakdown.viral = viral01 * WEIGHTS.viral;

  // Travel trending
  const travel01 = clamp01(input.travel_trending_region);
  if (travel01 > 0.5) triggers.push("travel_trending");
  breakdown.travel_trending = travel01 * WEIGHTS.travel_trending;

  // Weather
  const weather01 = clamp01(input.weather_opportunity);
  if (weather01 > 0.7) triggers.push("weather_window");
  breakdown.weather = weather01 * WEIGHTS.weather;

  // Geopolitical
  const geo01 = clamp01(input.geopolitical_relevance);
  if (geo01 > 0.5) triggers.push("geopolitical_moment");
  breakdown.geopolitical = geo01 * WEIGHTS.geopolitical;

  // Cultural
  const cult01 = clamp01(input.cultural_moment);
  if (cult01 > 0.5) triggers.push("cultural_moment");
  breakdown.cultural = cult01 * WEIGHTS.cultural;

  // Sum + curator boost
  const raw = Object.values(breakdown).reduce((a, b) => a + b, 0);
  const withBoost = raw + (input.curator_boost ?? 0);
  const editorial_score = Math.round(clamp(withBoost, 0, 100));

  const reason = triggers.length === 0
    ? "no strong editorial trigger today"
    : `top triggers: ${triggers.slice(0, 3).join(" + ")}${input.curator_boost ? ` (curator ${signed(input.curator_boost)})` : ""}`;

  return { editorial_score, reason, triggers, breakdown };
}

// ─── helpers ─────────────────────────────────────────────────────────────

function pickBestAnniversary(
  list: ReadonlyArray<{ name: string; date_mmdd: string; weight: number }>,
  todayMD: string,
): { name: string; weight: number } | null {
  let best: { name: string; weight: number } | null = null;
  for (const a of list) {
    const d = daysBetweenMD(todayMD, a.date_mmdd);
    if (d > 7) continue;
    const decay = 1 - d / 7;
    const w = clamp01(a.weight * decay);
    if (!best || w > best.weight) best = { name: a.name, weight: w };
  }
  return best;
}

function daysBetweenMD(a: string, b: string): number {
  // Both "MM-DD" · returns absolute day delta within current year (cyclic).
  const [am, ad] = a.split("-").map(Number);
  const [bm, bd] = b.split("-").map(Number);
  const da = new Date(2000, am - 1, ad).getTime();
  const db = new Date(2000, bm - 1, bd).getTime();
  const diff = Math.abs(da - db) / 86_400_000;
  return Math.min(diff, 365 - diff);
}

function clamp(n: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, n)); }
function clamp01(n: number): number { return clamp(n, 0, 1); }
function signed(n: number): string { return n >= 0 ? `+${n}` : `${n}`; }

export const _WEIGHT_SUM_FOR_TEST = WEIGHT_SUM;
