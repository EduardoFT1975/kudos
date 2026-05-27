/**
 * KUDOS · Capsule Engine · demo runner.
 *
 * Demonstrates tier routing + cost governor over a small POI catalog.
 * Run: `npx tsx lib/capsule-engine/demo.ts`
 *
 * Output: prints the 4-tier decision matrix + a sample orchestrate() per tier.
 */
import { orchestrate } from "./orchestrator";
import { decide } from "./tier-router";
import type { CapsuleRequest } from "./types";

const SAMPLE: ReadonlyArray<{ id: string; name: string; score: number }> = [
  { id: "coliseo",            name: "Coliseo Romano",         score: 98 }, // TIER 1
  { id: "machu",              name: "Machu Picchu",           score: 96 }, // TIER 1
  { id: "athens",             name: "Acrópolis de Atenas",    score: 94 }, // TIER 1
  { id: "sagrada-familia",    name: "Sagrada Familia",        score: 91 }, // TIER 1
  { id: "alhambra",           name: "La Alhambra",            score: 88 }, // TIER 2
  { id: "petra",              name: "Petra",                  score: 86 }, // TIER 2
  { id: "hagia-sofia",        name: "Hagia Sofía",            score: 82 }, // TIER 2
  { id: "areoso",             name: "Castros de Areoso",      score: 64 }, // TIER 3
  { id: "pontevedra-medieval",name: "Pontevedra medieval",    score: 58 }, // TIER 3
  { id: "tokyo-showa",        name: "Tokio Shōwa",            score: 71 }, // TIER 2
  { id: "santiagomateo",      name: "Pórtico da Gloria",      score: 79 }, // TIER 2
  { id: "marginal-1",         name: "Tienda local Pepe",      score: 28 }, // TIER 4
];

async function main() {
  const dailySoFar = { daily_usd: 0, monthly_usd: 0 };

  console.log("\n═══════════════════════════════════════════════════════════════════════");
  console.log("KUDOS CAPSULE ORCHESTRATOR · TIER DECISION MATRIX");
  console.log("═══════════════════════════════════════════════════════════════════════\n");
  console.log(
    "POI".padEnd(26),
    "score".padStart(5),
    " ",
    "tier".padEnd(22),
    "  ",
    "cost".padStart(6),
    " ",
    "latency".padStart(8),
    "  ",
    "feed_position"
  );
  console.log("─".repeat(95));

  for (const s of SAMPLE) {
    const req: CapsuleRequest = {
      poi: { id: s.id, name: s.name, location: "—", country: "—", coordinates: "0,0" },
      poi_score: s.score,
      language: "es",
      audience: "traveler",
      duration_seconds: 15,
      tone: "cinematic epic",
      style: "Apple x TikTok x National Geographic",
    };
    const d = decide(req, undefined, dailySoFar);
    console.log(
      s.name.padEnd(26),
      String(s.score).padStart(5),
      " ",
      d.tier.padEnd(22),
      " $",
      d.estimated_cost_usd.toFixed(2).padStart(5),
      " ",
      `${d.estimated_latency_s}s`.padStart(8),
      "  ",
      d.appears_in_feed,
      d.allowed ? "" : "  ✗ REJECTED",
    );
    dailySoFar.daily_usd += d.estimated_cost_usd;
  }

  console.log("─".repeat(95));
  console.log(`TOTAL ESTIMATED DAILY SPEND if all generated: $${dailySoFar.daily_usd.toFixed(2)}\n`);

  // ── Run one of each tier to show pipeline shapes ─────────────────
  console.log("═══════════════════════════════════════════════════════════════════════");
  console.log("ORCHESTRATE SAMPLES · one per tier");
  console.log("═══════════════════════════════════════════════════════════════════════\n");
  for (const sample of SAMPLE.slice(0, 4).concat([SAMPLE[4], SAMPLE[7], SAMPLE[11]])) {
    const req: CapsuleRequest = {
      poi: { id: sample.id, name: sample.name, location: "—", country: "—", coordinates: "0,0" },
      poi_score: sample.score,
      language: "es",
      audience: "traveler",
      duration_seconds: 15,
      tone: "cinematic epic",
      style: "Apple x TikTok x National Geographic",
    };
    const result = await orchestrate(req);
    console.log(`▸ ${sample.name} (score ${sample.score})`);
    console.log(`   tier   = ${result.tier}`);
    console.log(`   status = ${result.status}`);
    console.log(`   cost   = est $${result.cost_usd.estimated.toFixed(2)} · actual $${result.cost_usd.actual.toFixed(4)}`);
    console.log(`   time   = est ${(result.generation_time_ms.estimated / 1000).toFixed(1)}s · actual ${(result.generation_time_ms.actual).toFixed(0)}ms`);
    console.log(`   assets =`, Object.keys(result.assets).filter((k) => (result.assets as any)[k]).join(", "));
    console.log();
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
