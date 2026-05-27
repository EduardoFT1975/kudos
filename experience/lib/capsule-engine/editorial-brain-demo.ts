/**
 * KUDOS · Editorial Brain · demo runner V3 (post P22 Engine 3 wiring).
 *
 *   tsc --module commonjs --target es2020 --moduleResolution node \\
 *     --esModuleInterop --skipLibCheck --strict --outDir /tmp/brain-build \\
 *     lib/capsule-engine/editorial-brain-demo.ts \\
 *     lib/capsule-engine/{editorial-brain,priority,inventory,engine-*,feed-composer,types}.ts
 *   node /tmp/brain-build/editorial-brain-demo.js
 *
 * Includes:
 *   · 7 Engine 0 anchors (Coliseo, Athens, Alhambra, Notre, Sagrada, Machu, Auschwitz)
 *   · Areoso · LONGTAIL but local + structurally dignified (LOCAL_MAGIC)
 *   · Tienda Pepe · marginal (proves dignity floor)
 *   · "porto-livraria-lello" · NEW · IMPORTANT baseline + sustained momentum
 *     -> Engine 3 promotes to ICONIC_RISING -> fills TRENDING_ICONIC slot
 *   · "guggenheim-bilbao" · NEW · ICONIC baseline + LEGEND_CANDIDATE momentum
 *     -> Engine 3 surfaces it to legend review queue
 */
import { runEditorialBrain, type BrainInput, type BrainCandidate } from "./editorial-brain";
import type { InventoryEntry } from "./inventory";

const today = "2025-05-26";

const candidates: BrainCandidate[] = [
  // ─── Engine 0 LEGEND anchors ──────────────────────────────────────
  {
    poi_id: "coliseo", poi_name: "Coliseo Romano",
    poi_signals: {
      historical_importance: 1.0, unesco_weight: 1.0, global_search_volume: 0.95,
      tourism_relevance: 1.0, visual_storytelling_potential: 0.98, emotional_resonance: 0.95,
      uniqueness: 0.92, iconicity: 1.0, geographic_value: 0.85,
    },
    momentum_signals: {
      views_24h: 18420, shares_24h: 320, saves_24h: 1100, comments_24h: 215,
      seasonality: 0.92, proximity: 0.4, travel_trending: 0.88, novelty: 0.32,
      local_event_relevance: 0.4,
    },
    editorial_signals: {
      poi_id: "coliseo", today,
      anniversaries: [{ name: "inauguracion del Coliseo (80 d.C.)", date_mmdd: "06-01", weight: 0.85 }],
      local_events:  [{ name: "Notti d'Estate al Colosseo", weight: 0.7 }],
      seasonal_affinity: 0.9, viral_social_lift: 0.78,
      travel_trending_region: 0.85, weather_opportunity: 0.9,
      geopolitical_relevance: 0.2, cultural_moment: 0.4, curator_boost: 0,
    },
    cultural_significance: 1.0,
    contextual_boost: 60,
  },
  {
    poi_id: "machu", poi_name: "Machu Picchu",
    poi_signals: {
      historical_importance: 0.95, unesco_weight: 1.0, global_search_volume: 0.92,
      tourism_relevance: 0.85, visual_storytelling_potential: 1.0, emotional_resonance: 0.95,
      uniqueness: 0.98, iconicity: 0.98, geographic_value: 0.9,
    },
    momentum_signals: {
      views_24h: 9200, shares_24h: 180, saves_24h: 650, comments_24h: 88,
      seasonality: 0.55, proximity: 0.15, travel_trending: 0.55, novelty: 0.2,
      local_event_relevance: 0.1,
    },
    editorial_signals: {
      poi_id: "machu", today,
      anniversaries: [{ name: "redescubrimiento (1911)", date_mmdd: "07-24", weight: 0.8 }],
      local_events: [],
      seasonal_affinity: 0.4, viral_social_lift: 0.15,
      travel_trending_region: 0.35, weather_opportunity: 0.6,
      geopolitical_relevance: 0.0, cultural_moment: 0.0, curator_boost: 0,
    },
    cultural_significance: 0.95,
    contextual_boost: 25,
  },
  {
    poi_id: "alhambra", poi_name: "La Alhambra",
    poi_signals: {
      historical_importance: 0.92, unesco_weight: 1.0, global_search_volume: 0.78,
      tourism_relevance: 0.85, visual_storytelling_potential: 0.92, emotional_resonance: 0.9,
      uniqueness: 0.85, iconicity: 0.88, geographic_value: 0.78,
    },
    momentum_signals: {
      views_24h: 3400, shares_24h: 65, saves_24h: 280, comments_24h: 32,
      seasonality: 0.88, proximity: 0.5, travel_trending: 0.62, novelty: 0.18,
      local_event_relevance: 0.3,
    },
    editorial_signals: {
      poi_id: "alhambra", today,
      anniversaries: [],
      local_events: [{ name: "Festival de Musica y Danza de Granada", weight: 0.55 }],
      seasonal_affinity: 0.85, viral_social_lift: 0.22,
      travel_trending_region: 0.55, weather_opportunity: 0.85,
      geopolitical_relevance: 0.0, cultural_moment: 0.0, curator_boost: 0,
    },
    cultural_significance: 0.85,
    contextual_boost: 45,
  },
  {
    poi_id: "areoso", poi_name: "Castros de Areoso",
    poi_signals: {
      historical_importance: 0.7, unesco_weight: 0.0, global_search_volume: 0.12,
      tourism_relevance: 0.55, visual_storytelling_potential: 0.7, emotional_resonance: 0.65,
      uniqueness: 0.88, iconicity: 0.4, geographic_value: 0.6,
    },
    momentum_signals: {
      views_24h: 120, shares_24h: 4, saves_24h: 12, comments_24h: 2,
      seasonality: 0.75, proximity: 0.85, travel_trending: 0.18, novelty: 0.5,
      local_event_relevance: 0.1,
    },
    editorial_signals: {
      poi_id: "areoso", today,
      anniversaries: [], local_events: [],
      seasonal_affinity: 0.7, viral_social_lift: 0.0,
      travel_trending_region: 0.15, weather_opportunity: 0.7,
      geopolitical_relevance: 0.0, cultural_moment: 0.0, curator_boost: 0,
    },
    cultural_significance: 0.6,
    contextual_boost: 80,
  },
  {
    poi_id: "marginal-1", poi_name: "Tienda local Pepe",
    poi_signals: {
      historical_importance: 0.05, unesco_weight: 0.0, global_search_volume: 0.01,
      tourism_relevance: 0.05, visual_storytelling_potential: 0.15, emotional_resonance: 0.2,
      uniqueness: 0.4, iconicity: 0.02, geographic_value: 0.1,
    },
    momentum_signals: {
      views_24h: 4, shares_24h: 0, saves_24h: 1, comments_24h: 0,
      seasonality: 0.3, proximity: 0.95, travel_trending: 0.05, novelty: 0.4,
      local_event_relevance: 0.0,
    },
    editorial_signals: {
      poi_id: "marginal-1", today,
      anniversaries: [], local_events: [],
      seasonal_affinity: 0.3, viral_social_lift: 0.0,
      travel_trending_region: 0.05, weather_opportunity: 0.3,
      geopolitical_relevance: 0.0, cultural_moment: 0.0, curator_boost: 0,
    },
    cultural_significance: 0.1,
    contextual_boost: 90,
  },
  {
    poi_id: "notre", poi_name: "Notre-Dame de Paris",
    poi_signals: {
      historical_importance: 0.98, unesco_weight: 1.0, global_search_volume: 0.9,
      tourism_relevance: 0.95, visual_storytelling_potential: 0.95, emotional_resonance: 0.95,
      uniqueness: 0.9, iconicity: 0.98, geographic_value: 0.88,
    },
    momentum_signals: {
      views_24h: 7200, shares_24h: 110, saves_24h: 400, comments_24h: 50,
      seasonality: 0.7, proximity: 0.2, travel_trending: 0.6, novelty: 0.25,
      local_event_relevance: 0.1,
    },
    editorial_signals: {
      poi_id: "notre", today,
      anniversaries: [], local_events: [],
      seasonal_affinity: 0.6, viral_social_lift: 0.18,
      travel_trending_region: 0.55, weather_opportunity: 0.7,
      geopolitical_relevance: 0.0, cultural_moment: 0.0, curator_boost: 0,
    },
    cultural_significance: 0.95,
    contextual_boost: 30,
  },
  {
    poi_id: "sagrada-familia", poi_name: "La Sagrada Familia",
    poi_signals: {
      historical_importance: 0.9, unesco_weight: 1.0, global_search_volume: 0.88,
      tourism_relevance: 0.95, visual_storytelling_potential: 0.95, emotional_resonance: 0.9,
      uniqueness: 0.95, iconicity: 0.95, geographic_value: 0.85,
    },
    momentum_signals: {
      views_24h: 6500, shares_24h: 90, saves_24h: 350, comments_24h: 45,
      seasonality: 0.78, proximity: 0.35, travel_trending: 0.7, novelty: 0.3,
      local_event_relevance: 0.2,
    },
    editorial_signals: {
      poi_id: "sagrada-familia", today,
      anniversaries: [], local_events: [],
      seasonal_affinity: 0.75, viral_social_lift: 0.2,
      travel_trending_region: 0.65, weather_opportunity: 0.8,
      geopolitical_relevance: 0.0, cultural_moment: 0.0, curator_boost: 0,
    },
    cultural_significance: 0.9,
    contextual_boost: 40,
  },
  {
    poi_id: "athens", poi_name: "Acropolis de Atenas",
    poi_signals: {
      historical_importance: 0.95, unesco_weight: 1.0, global_search_volume: 0.85,
      tourism_relevance: 0.9, visual_storytelling_potential: 0.9, emotional_resonance: 0.88,
      uniqueness: 0.88, iconicity: 0.9, geographic_value: 0.8,
    },
    momentum_signals: {
      views_24h: 11800, shares_24h: 220, saves_24h: 780, comments_24h: 130,
      seasonality: 0.85, proximity: 0.3, travel_trending: 0.82, novelty: 0.4,
      local_event_relevance: 0.35,
    },
    editorial_signals: {
      poi_id: "athens", today,
      anniversaries: [{ name: "aniversario de las Olimpiadas modernas", date_mmdd: "04-06", weight: 0.5 }],
      local_events: [],
      seasonal_affinity: 0.88, viral_social_lift: 0.55,
      travel_trending_region: 0.8, weather_opportunity: 0.88,
      geopolitical_relevance: 0.0, cultural_moment: 0.3, curator_boost: 0,
    },
    cultural_significance: 0.9,
    contextual_boost: 55,
  },
  {
    poi_id: "auschwitz", poi_name: "Auschwitz-Birkenau",
    poi_signals: {
      historical_importance: 1.0, unesco_weight: 1.0, global_search_volume: 0.7,
      tourism_relevance: 0.55, visual_storytelling_potential: 0.85, emotional_resonance: 1.0,
      uniqueness: 0.95, iconicity: 0.9, geographic_value: 0.7,
    },
    momentum_signals: {
      views_24h: 2100, shares_24h: 60, saves_24h: 180, comments_24h: 28,
      seasonality: 0.4, proximity: 0.1, travel_trending: 0.3, novelty: 0.15,
      local_event_relevance: 0.6,
    },
    editorial_signals: {
      poi_id: "auschwitz", today,
      anniversaries: [], local_events: [],
      seasonal_affinity: 0.3, viral_social_lift: 0.1,
      travel_trending_region: 0.25, weather_opportunity: 0.4,
      geopolitical_relevance: 0.8, cultural_moment: 0.85, curator_boost: 0.5,
    },
    cultural_significance: 1.0,
    contextual_boost: 35,
  },

  // ─── P22 · Engine 3 rising-star case ────────────────────────────────
  // Livraria Lello in Porto · structurally IMPORTANT (struct ~73) ·
  // sustained momentum from TikTok trend · 30 days of consistent signal.
  // Engine 3 should promote it ICONIC_RISING -> fills TRENDING_ICONIC slot #3.
  {
    poi_id: "porto-livraria-lello", poi_name: "Livraria Lello (Porto)",
    poi_signals: {
      historical_importance: 0.7,  unesco_weight: 0.0,  global_search_volume: 0.55,
      tourism_relevance: 0.85,     visual_storytelling_potential: 0.95,
      emotional_resonance: 0.85,   uniqueness: 0.9,
      iconicity: 0.62,             geographic_value: 0.65,
    },
    momentum_signals: {
      views_24h: 8800, shares_24h: 280, saves_24h: 720, comments_24h: 105,
      seasonality: 0.8, proximity: 0.35, travel_trending: 0.85, novelty: 0.55,
      local_event_relevance: 0.4,
    },
    editorial_signals: {
      poi_id: "porto-livraria-lello", today,
      anniversaries: [],
      local_events: [{ name: "Festival Literario do Porto", weight: 0.5 }],
      seasonal_affinity: 0.85, viral_social_lift: 0.82,
      travel_trending_region: 0.9, weather_opportunity: 0.8,
      geopolitical_relevance: 0.0, cultural_moment: 0.5, curator_boost: 0,
    },
    cultural_significance: 0.7,
    contextual_boost: 50,
    rising_history: {
      momentum_7d_avg:             78,     // strong 7-day sustained
      momentum_30d_avg:            72,     // consistent 30-day trend
      momentum_consistency:        0.82,   // very steady, not spiky
      editorial_trigger_count_30d: 5,      // 5 distinct triggers in 30d
      editorial_score_30d_avg:     58,     // moderate sustained editorial signal
      curator_nomination:          true,   // editor flagged "watch this"
      previous_rising_class:       "RISING_TO_ICONIC",   // was already climbing
      days_at_current_class:       12,     // past the 7-day stability gate
    },
  },

  // ─── P22 · Legend candidate case ────────────────────────────────────
  // Guggenheim Bilbao · structurally ICONIC (~85) · sustained
  // momentum hitting LEGEND_CANDIDATE territory. Should be surfaced
  // for curator review (NOT auto-promoted to Engine 0).
  {
    poi_id: "guggenheim-bilbao", poi_name: "Guggenheim Bilbao",
    poi_signals: {
      historical_importance: 0.82, unesco_weight: 0.0, global_search_volume: 0.78,
      tourism_relevance: 0.95, visual_storytelling_potential: 0.98, emotional_resonance: 0.9,
      uniqueness: 0.95, iconicity: 0.92, geographic_value: 0.75,
    },
    momentum_signals: {
      views_24h: 9500, shares_24h: 240, saves_24h: 680, comments_24h: 95,
      seasonality: 0.85, proximity: 0.4, travel_trending: 0.88, novelty: 0.5,
      local_event_relevance: 0.55,
    },
    editorial_signals: {
      poi_id: "guggenheim-bilbao", today,
      anniversaries: [],
      local_events: [{ name: "Retrospectiva Anish Kapoor", weight: 0.7 }],
      seasonal_affinity: 0.85, viral_social_lift: 0.7,
      travel_trending_region: 0.85, weather_opportunity: 0.8,
      geopolitical_relevance: 0.0, cultural_moment: 0.5, curator_boost: 0,
    },
    cultural_significance: 0.85,
    contextual_boost: 55,
    rising_history: {
      momentum_7d_avg:             92,
      momentum_30d_avg:            87,
      momentum_consistency:        0.88,
      editorial_trigger_count_30d: 7,
      editorial_score_30d_avg:     75,
      curator_nomination:          true,
      previous_rising_class:       "ICONIC_RISING",
      days_at_current_class:       21,
    },
  },
];

const inventory: InventoryEntry[] = [
  {
    poi_id: "coliseo", capsule_id: "cap-coliseo-v1",
    capsule_tier: "tier1_legend", status: "active",
    created_at: "2024-09-15", refreshed_at: "2024-11-08",
    served_count: 14220, last_served_at: "2025-05-26T05:14:00Z",
    editorial_dirty: true,
  },
  {
    poi_id: "machu", capsule_id: "cap-machu-v1",
    capsule_tier: "tier1_legend", status: "active",
    created_at: "2025-04-20", refreshed_at: "2025-04-26",
    served_count: 5800, last_served_at: "2025-05-26T06:00:00Z",
    editorial_dirty: false,
  },
];

const input: BrainInput = {
  date: today,
  season: "spring",
  global_events: ["Notti d'Estate al Colosseo opening soon"],
  regional_events: ["Festival Musica y Danza de Granada"],
  budget_today_usd: 50,
  budget_month_usd: 500,
  spent_month_usd: 220,
  candidates,
  inventory,
};

const out = runEditorialBrain(input);

console.log("\n=======================================================================");
console.log(`KUDOS EDITORIAL BRAIN V3 | daily run | ${out.date}`);
console.log("=======================================================================\n");

console.log("DECISIONS (effective class · base class · rising class)");
console.log("-------------------------------------------------------");
for (const d of out.decisions) {
  console.log(`  ${d.poi_name.padEnd(28)}  eff=[${d.effective_legend_class.padEnd(9)}]  base=[${d.legend_class.padEnd(9)}]  rise=[${d.rising_class.padEnd(20)}]  struct=${String(d.structural_score).padStart(3)}  feed_rank=${String(d.feed_rank_score).padStart(3)} (#${String(d.feed_position_today).padStart(2)})  rise_score=${String(d.rising_score).padStart(3)}  tier=${d.capsule_tier.padEnd(20)}  -> ${d.decision.padEnd(8)}  $${d.estimated_cost.toFixed(2).padStart(5)}`);
}

console.log("\nRISING PROMOTIONS (this run)");
console.log("----------------------------");
if (out.rising_promotions.length === 0) {
  console.log("  (none · all POIs stable or at previous class)");
} else {
  out.rising_promotions.forEach(p => {
    console.log(`  ${p.poi_name.padEnd(28)}  ${p.from} -> ${p.to}  score=${p.score}`);
    console.log(`     ${p.reason}`);
  });
}

console.log("\nLEGEND REVIEW QUEUE (curator surface · Engine 0 manual add)");
console.log("-----------------------------------------------------------");
if (out.legend_review_queue.length === 0) {
  console.log("  (none)");
} else {
  out.legend_review_queue.forEach(q => {
    console.log(`  ${q.poi_name.padEnd(28)}  rising_score=${q.rising_score}`);
    console.log(`     ${q.reason}`);
  });
}

console.log("\nGENERATION QUEUE");
console.log("----------------");
out.generation_queue.forEach((q, i) => {
  console.log(`${String(i+1).padStart(2)}. ${q.poi_name.padEnd(28)}  ${q.editorial_tier}  ${q.decision.padEnd(8)}  $${q.estimated_cost.toFixed(2).padStart(5)}`);
});

console.log("\nBUDGET IMPACT");
console.log("-------------");
console.log(JSON.stringify(out.budget_impact, null, 2));

console.log("\nFEED CANDIDATES (premium-eligible, sorted)");
console.log("------------------------------------------");
out.feed_candidates.forEach((f, i) => {
  console.log(`#${String(i+1).padStart(2)} ${f.poi_name.padEnd(28)}  feed_rank=${String(f.feed_rank_score).padStart(3)}  [${f.legend_class.padEnd(9)}]  ${f.capsule_tier}`);
});

console.log("\nHOME FEED | LAYERED EDITORIAL COMPOSITION V4");
console.log("--------------------------------------------");
console.log("(LAYER schedule: A-A-B-A-C-A-E  ·  TRENDING_ICONIC now accepts ICONIC_RISING from Engine 3)\n");
out.home_feed.forEach(s => {
  console.log(`  #${String(s.slot).padStart(2)}  ${s.layer.padEnd(16)}  [${s.legend_class.padEnd(9)}]  rank=${String(s.feed_rank_score).padStart(3)}  score=${String(Math.round(s.layer_score)).padStart(3)}  ${s.poi_name.padEnd(28)}  ${s.capsule_tier}`);
  console.log(`         reason: ${s.reason}`);
});
if (out.home_feed_unfilled.length > 0) {
  console.log("\nUNFILLED SLOTS:");
  out.home_feed_unfilled.forEach(u => console.log(`  - slot ${u.slot} (${u.layer}) -> ${u.reason}`));
}

console.log("\nHOME FEED | POOL AUDIT");
console.log(JSON.stringify({
  legend_core_eligible:     out.home_feed_audit.legend_core_eligible,
  trending_iconic_eligible: out.home_feed_audit.trending_iconic_eligible,
  local_magic_eligible:     out.home_feed_audit.local_magic_eligible,
  editorial_event_eligible: out.home_feed_audit.editorial_event_eligible,
}, null, 2));

if (out.home_feed_audit.local_magic_rejected_for_dignity.length > 0) {
  console.log("\nLOCAL_MAGIC | REJECTED FOR DIGNITY (V2 floor)");
  out.home_feed_audit.local_magic_rejected_for_dignity.forEach(r => {
    console.log(`  - ${r.poi_name.padEnd(28)} (${r.poi_id})  -> ${r.reason}`);
  });
}

console.log("\nLEGEND CATALOG (effective)");
console.log("--------------------------");
console.log(JSON.stringify(out.legend_catalog, null, 2));

console.log("\nAUDIT");
console.log("-----");
console.log(JSON.stringify(out.audit, null, 2));
console.log();
