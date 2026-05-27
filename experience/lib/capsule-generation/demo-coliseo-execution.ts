/**
 * KUDOS · Capsule Generation · Coliseo End-to-End Execution Demo (Section 12).
 *
 *   Demonstrates the full pipeline · cinematic language → provider arbitration
 *   → prompt expansion → shot execution → QC → reroll → continuity → audit.
 *
 *   The demo runs OFFLINE through stub_local (always-available). Network
 *   providers (Kling/Veo/Runway/Luma/Pika) are wired in the arbitrator's
 *   capability matrix and would be selected first when keys + network exist.
 *   Without those, arbitration cleanly falls through to stub_local, and the
 *   orchestration code path is exercised identically.
 *
 *   What runs LIVE:
 *     · provider arbitration (real scoring + ranking)
 *     · prompt expansion (real per-provider dialect emission)
 *     · stub_local render (real ImageMagick + ffmpeg ken-burns)
 *     · QC heuristic (real ffprobe on rendered frames)
 *     · reroll engine (real strategy selection)
 *     · continuity engine (real palette + lighting + drift scoring)
 *     · cost governor (real ledger)
 *     · execution audit (real serialization)
 *     · cinematic composition decisions (real breath / transition / memory)
 */
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { spawn } from "node:child_process";

import {
  arbitrateProvider, initialHealthState,
  expandPromptForProvider,
  establishContinuity, updateAnchorWithObservation, scoreContinuity,
  emptyMemory, rememberShot, memoryToPromptInjection,
  createCostGovernor,
  createAuditBuilder,
  executeShotGrammar, stubLocalAdapter,
  decideComposition,
  PROVIDER_MATRIX,
  type ProviderId,
} from "./index";
import { assembleGrammar, type ShotGrammar } from "../cinematic-language/provider-abstraction";
import type { ShotTypeId } from "../cinematic-language/shot-taxonomy";
import type { EmotionalMode } from "../cinematic-language/camera-language";
import type { PacingGrammar } from "../cinematic-language/pacing-engine";
import type { CapsuleTier } from "../capsule-engine/types";

// ─── Coliseo specification ──────────────────────────────────────────────

const POI = {
  id:   "coliseo",
  name: "Coliseo Romano",
  era:  "ancient",
  one_line_meaning: "A city held its breath together inside this stone.",
};

const MODE: EmotionalMode = "monumental_awe";
const PACING: PacingGrammar = "wonder_escalation";
const TIER: CapsuleTier = "tier3_story_card";  // tier3 keeps the demo runnable offline

const DURATION_S = 25;
const SHOTS: ReadonlyArray<{ shot_index: number; shot_type: ShotTypeId; beat: string; start_s: number; end_s: number; }> = [
  { shot_index: 1, shot_type: "monumental_drift",      beat: "hook",       start_s: 0,  end_s: 5  },
  { shot_index: 2, shot_type: "human_scale_wide",      beat: "escalation", start_s: 5,  end_s: 9  },
  { shot_index: 3, shot_type: "ruins_tracking",        beat: "wonder",     start_s: 9,  end_s: 14 },
  { shot_index: 4, shot_type: "observational_closeup", beat: "meaning",    start_s: 14, end_s: 17 },
  { shot_index: 5, shot_type: "civilization_trace",    beat: "meaning",    start_s: 17, end_s: 20 },
  { shot_index: 6, shot_type: "atmosphere_hold",       beat: "close",      start_s: 20, end_s: 25 },
];

// ─── Stub QC · runs a real ffprobe + ImageMagick observation pass ───────

async function stubQc(input: { rendered_path: string; grammar: ShotGrammar; }): Promise<{
  pass: boolean; quality_score: number; reject_reasons: string[];
  observed_palette: string[]; mean_luminance: number;
}> {
  const { spawn } = await import("node:child_process");
  // ffprobe duration
  const probeOut = await execCmd("ffprobe", ["-v", "error", "-show_format", "-of", "json", input.rendered_path]).catch(() => "{\"format\":{}}");
  const probeJson = JSON.parse(probeOut);
  const duration = parseFloat(probeJson.format?.duration ?? "0");

  // ImageMagick observe palette and luminance from the first frame
  const tmp_png = path.join(path.dirname(input.rendered_path), `qc-frame-${input.grammar.shot_index}.png`);
  await execCmd("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-ss", String(input.grammar.duration_s * 0.3), "-i", input.rendered_path, "-frames:v", "1", tmp_png]).catch(() => null);
  let observed_palette: string[] = [];
  let mean_luminance = 50;
  if (fs.existsSync(tmp_png)) {
    const meanRes = await execCmd("identify", ["-format", "%[fx:mean*100]\\n%[fx:standard_deviation*100]\\n", tmp_png]).catch(() => "50\n0\n");
    const [m] = meanRes.split("\n").map(s => parseFloat(s.trim()) || 50);
    mean_luminance = m;
    const palOut = await execCmd("convert", [tmp_png, "-resize", "1x1", "txt:-"]).catch(() => "");
    const hexMatch = palOut.match(/#([0-9A-Fa-f]{6,8})/);
    if (hexMatch) observed_palette = ["#" + hexMatch[1].slice(0, 6)];
  }

  const reject_reasons: string[] = [];
  if (Math.abs(duration - input.grammar.duration_s) > 1) reject_reasons.push(`duration ${duration} != ${input.grammar.duration_s}`);
  // stub_local always passes structurally
  const pass = reject_reasons.length === 0;
  return { pass, quality_score: pass ? 0.75 : 0.30, reject_reasons, observed_palette, mean_luminance };

  function execCmd(cmd: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const p = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
      let stdout = "", stderr = "";
      p.stdout.on("data", b => stdout += b.toString());
      p.stderr.on("data", b => stderr += b.toString());
      p.on("error", reject);
      p.on("close", c => c === 0 ? resolve(stdout + stderr) : reject(new Error(`${cmd} exit ${c}: ${stderr.slice(0, 200)}`)));
    });
  }
}

// ─── Runner ─────────────────────────────────────────────────────────────

async function main() {
  const OUT_DIR = path.join(os.tmpdir(), `kudos-p242-${Date.now()}`);
  fs.mkdirSync(OUT_DIR, { recursive: true });

  log(""); log("=".repeat(80));
  log(`  KUDOS P24.2 · END-TO-END CINEMATIC EXECUTION`);
  log(`  ${POI.name} · ${MODE} · ${PACING} · tier=${TIER}`);
  log(`  "${POI.one_line_meaning}"`);
  log("=".repeat(80));
  log(`  output_dir = ${OUT_DIR}`);
  log("");

  // ── STEP 1 · Story Director output (assembled from cinematic language) ─
  log("STEP 1 · STORY DIRECTOR OUTPUT");
  log("-".repeat(80));
  const grammarOut = assembleGrammar({
    shots:           SHOTS,
    emotional_mode:  MODE,
    pacing:          PACING,
    total_duration_s: DURATION_S,
    poi_context:     { name: POI.name, era: POI.era, one_line_meaning: POI.one_line_meaning },
  });
  for (const g of grammarOut.grammars) {
    log(`  #${g.shot_index} [${g.beat.padEnd(10)}] ${g.shot_type.padEnd(22)} ${g.duration_s.toFixed(1)}s  ${g.camera_motion}  ${g.lens}`);
  }
  log("");
  log(`  capsule directives:`);
  log(`    one_line: ${grammarOut.capsule_directives.capsule_one_line}`);
  log(`    cut_aggressiveness=${grammarOut.capsule_directives.cut_aggressiveness}  narration_density=${grammarOut.capsule_directives.narration_density}  silence_pct=${grammarOut.capsule_directives.silence_required_pct}`);
  log("");

  // ── STEP 2 · Continuity anchor established ─────────────────────────────
  log("STEP 2 · CONTINUITY ANCHOR ESTABLISHED");
  log("-".repeat(80));
  let anchor = establishContinuity({ emotional_mode: MODE, era: POI.era, poi_id: POI.id });
  log(`  palette:       ${anchor.palette_hex.join(", ")}`);
  log(`  dominant:      ${anchor.dominant_color}`);
  log(`  lighting:      ${anchor.lighting_descriptor}`);
  log(`  weather:       ${anchor.weather}`);
  log(`  motion sig:    ${anchor.motion_signature}`);
  log(`  atmosphere:    ${anchor.atmosphere.join(", ")}`);
  log(`  grain:         ${anchor.grain_profile}`);
  log(`  strictness:    ${anchor.strictness}`);
  log("");

  // ── STEP 3 · Cost governor created ─────────────────────────────────────
  log("STEP 3 · COST GOVERNOR + AUDIT BUILDER");
  log("-".repeat(80));
  const governor = createCostGovernor({ capsule_tier: TIER });
  const audit = createAuditBuilder({
    capsule_id:           `cap-coliseo-${Date.now()}`,
    poi_id:               POI.id,
    poi_name:             POI.name,
    tier:                 TIER,
    emotional_mode:       MODE,
    pacing:               PACING,
    shots:                SHOTS.map(s => ({ shot_index: s.shot_index, beat: s.beat, shot_type: s.shot_type })),
    continuity_initial:   anchor,
    budget_usd:           governor.budget_cap_usd,
  });
  log(`  capsule_id     = ${audit.audit.capsule_id}`);
  log(`  tier           = ${TIER}  budget_cap = $${governor.budget_cap_usd.toFixed(2)}`);
  log("");

  // ── STEP 4 · Health state initialized ─────────────────────────────────
  let provider_health = initialHealthState();
  log("STEP 4 · PROVIDER HEALTH STATE (initial · all fresh, all closed circuits)");
  log("-".repeat(80));
  for (const p of Object.keys(provider_health) as ProviderId[]) {
    const h = provider_health[p];
    log(`  ${p.padEnd(14)}  rate=${h.success_rate.toFixed(2)}  p50=${h.p50_latency_s.toFixed(1)}s  circuit=${h.circuit}`);
  }
  log("");

  // ── STEP 5 · Per-shot execution ───────────────────────────────────────
  log("STEP 5 · SHOT-BY-SHOT EXECUTION (arbitration + expansion + render + QC + memory)");
  log("=".repeat(80));

  let memory = emptyMemory();
  const t_total_render = Date.now();

  for (const grammar of grammarOut.grammars) {
    log("");
    log(`  ───── shot ${grammar.shot_index} [${grammar.beat}] · ${grammar.shot_type} · ${grammar.duration_s}s ─────`);

    // Show arbitration ranking
    const arb = arbitrateProvider({
      shot_grammar:         grammar,
      capsule_tier:         TIER,
      remaining_budget_usd: governor.remaining(),
      queue_load:           0,
      provider_health,
      urgency:              "normal",
      excluded_providers:   [],
      network_unavailable:  true,   // demo · no network in sandbox · forces stub_local
    });
    log(`  ARBITRATION:`);
    log(`    primary  = ${arb.primary}  (confidence ${arb.confidence.toFixed(3)})`);
    log(`    fallback = ${arb.fallback_chain.join(" → ") || "(none)"}`);
    log(`    reasoning: ${arb.reasoning}`);
    const top3 = arb.scored.filter(s => s.score > 0).slice(0, 3);
    for (const s of top3) {
      log(`      ${s.provider.padEnd(14)} score=${s.score.toFixed(3)}  shot_fit=${s.components.shot_fit.toFixed(2)} emo_fit=${s.components.emotional_fit.toFixed(2)} realism=${s.components.realism.toFixed(2)} motion=${s.components.motion_fit.toFixed(2)}`);
    }

    // Show expanded prompt for primary
    const expanded = expandPromptForProvider({ grammar, provider: arb.primary, continuity: anchor });
    log(`  PROMPT EXPANSION (for ${arb.primary}):`);
    log(`    positive: ${expanded.positive_prompt.slice(0, 180)}${expanded.positive_prompt.length > 180 ? "..." : ""}`);
    log(`    negative (excerpt): ${expanded.negative_prompt.slice(0, 140)}...`);
    log(`    camera: ${expanded.camera_motion_directive}  motion=${expanded.motion_intensity_normalized.toFixed(2)}  duration=${expanded.duration_s}s`);
    if (memory.shots_approved > 0) {
      const mem_inj = memoryToPromptInjection(memory, grammar);
      if (mem_inj.length > 0) log(`    memory injection: ${mem_inj.join(" · ")}`);
    }

    // Execute
    const exec_out = await executeShotGrammar({
      grammar,
      capsule_tier:       TIER,
      output_dir:         OUT_DIR,
      continuity:         anchor,
      cost_governor:      governor,
      adapters:           { stub_local: stubLocalAdapter },
      qc:                 stubQc,
      provider_health,
      network_unavailable: true,
      is_hero_shot:       grammar.beat === "wonder",
      max_reroll_attempts: 2,
    });
    provider_health = exec_out.provider_health_after;

    log(`  EXECUTION:`);
    for (const a of exec_out.attempts) {
      const tag = a.outcome === "rendered_pass_qc" ? "PASS" : a.outcome === "rendered_fail_qc" ? "QC_FAIL" : a.outcome === "provider_error" ? "ERROR" : "SKIP";
      log(`    attempt ${a.attempt_index}  ${a.provider.padEnd(14)} ${tag.padEnd(8)} qc=${(a.qc_score ?? 0).toFixed(2)}  $${a.cost_usd.toFixed(4)}  ${a.latency_ms}ms  ${a.reroll_strategy_used ?? ""}`);
      if (a.reject_reasons.length > 0) {
        a.reject_reasons.forEach(r => log(`      reason: ${r}`));
      }
      audit.recordAttempt(grammar.shot_index, a);
    }

    if (exec_out.approved && exec_out.final_provider && exec_out.final_output_path) {
      audit.approveShot(grammar.shot_index, {
        provider:      exec_out.final_provider,
        output_path:   exec_out.final_output_path,
        quality_score: exec_out.final_quality_score,
      });
      log(`  APPROVED   ${path.basename(exec_out.final_output_path)}  quality=${exec_out.final_quality_score.toFixed(2)}`);

      // Update continuity from observation
      const drift = scoreContinuity(anchor, {
        shot_index:       grammar.shot_index,
        observed_palette: exec_out.observed_palette,
        mean_luminance:   exec_out.mean_luminance,
        color_variance:   0,
      });
      anchor = updateAnchorWithObservation(anchor, {
        shot_index:       grammar.shot_index,
        observed_palette: exec_out.observed_palette,
        mean_luminance:   exec_out.mean_luminance,
        color_variance:   0,
      });
      log(`  CONTINUITY drift_score=${drift.score.toFixed(2)}  reasons=${drift.drift_reasons.join(", ") || "(none)"}`);

      // Update memory
      memory = rememberShot(memory, {
        shot_index:       grammar.shot_index,
        grammar,
        declared_motifs:  motifsFromGrammar(grammar),
      });
    } else {
      log(`  ABANDONED`);
    }
  }

  const total_render_ms = Date.now() - t_total_render;
  log("");
  log("=".repeat(80));

  // ── STEP 6 · Cinematic composition decisions ──────────────────────────
  log("STEP 6 · CINEMATIC COMPOSITION DECISIONS");
  log("-".repeat(80));
  const composition = decideComposition({
    capsule_directives: grammarOut.capsule_directives,
    grammars:           grammarOut.grammars,
    enable_brand_bug:   true,
  });
  log(`  total_runtime  = ${composition.total_runtime_s.toFixed(1)}s (incl. ${composition.silence_windows.length} breath gaps)`);
  log(`  shot timings:`);
  for (const st of composition.shot_timings) {
    log(`    #${st.shot_index} start=${st.start_s.toFixed(2)}s  pre=${st.pre_silence_s.toFixed(2)}s  dur=${st.duration_s.toFixed(2)}s  post=${st.post_silence_s.toFixed(2)}s`);
  }
  log(`  transitions:`);
  for (const t of composition.transitions) {
    log(`    ${t.from_shot} → ${t.to_shot}  ${t.type.padEnd(15)} dur=${t.duration_s.toFixed(2)}s  ${t.reasoning}`);
  }
  log(`  memory inserts: ${composition.memory_inserts.length}`);
  for (const m of composition.memory_inserts) {
    log(`    t=${m.t_s.toFixed(1)}s  source=shot${m.source_shot}  dur=${m.duration_s}s  ${m.reasoning}`);
  }
  log(`  music ducking curve: ${composition.music_ducking_curve.length} samples`);
  log(`  brand bug visible: ${composition.brand_bug_visible.map(b => `${b.start_s.toFixed(0)}-${b.end_s.toFixed(0)}s`).join(", ")}`);
  log("");

  // ── STEP 7 · Audit finalize ───────────────────────────────────────────
  log("STEP 7 · FINAL EXECUTION AUDIT");
  log("-".repeat(80));
  const all_approved = audit.audit.shots.every(s => s.approved);
  const avg_quality = audit.audit.shots.reduce((sum, s) => sum + s.final_quality_score, 0) / audit.audit.shots.length;
  const final_audit = audit.finalize({
    verdict: all_approved && avg_quality >= 0.65 ? "publish" : "manual_review",
    confidence: avg_quality,
    reasoning: all_approved ? "all shots approved · avg quality " + avg_quality.toFixed(2) : "one or more shots abandoned",
  });
  final_audit.continuity_anchor_final = anchor;
  final_audit.render_total_ms = total_render_ms;

  log(`  shots approved:      ${audit.audit.shots.filter(s => s.approved).length} / ${audit.audit.shots.length}`);
  log(`  total attempts:      ${audit.audit.total_attempts}  (${audit.audit.total_rerolls} rerolls)`);
  log(`  providers used:      ${JSON.stringify(audit.audit.providers_used)}`);
  log(`  total cost:          $${audit.audit.cost_total_usd.toFixed(4)}  / budget $${audit.audit.cost_budget_usd.toFixed(2)}`);
  log(`  render total:        ${total_render_ms}ms`);
  log(`  final verdict:       ${final_audit.capsule_qc_verdict}`);
  log(`  final confidence:    ${final_audit.final_confidence.toFixed(3)}`);
  log(`  reasoning:           ${final_audit.capsule_qc_reasoning}`);
  log("");

  // Cost ledger
  log(`  cost ledger:`);
  audit.audit.cost_ledger.forEach(e => log(`    ${e.label.padEnd(50)} $${e.usd.toFixed(4)}  ${e.attempt_kind}`));
  log("");

  // Write audit to disk
  const audit_path = path.join(OUT_DIR, "execution-audit.json");
  fs.writeFileSync(audit_path, JSON.stringify(final_audit, null, 2));
  log(`  audit JSON written:  ${audit_path}`);
  log("");
  log("=".repeat(80));
  log("END · KUDOS P24.2 cinematic execution complete.");
  log("=".repeat(80));
  log("");
}

function motifsFromGrammar(g: ShotGrammar): string[] {
  const out: string[] = [];
  // Heuristic motif extraction from must_include clauses
  for (const m of g.must_include) {
    if (m.includes("candle"))      out.push("candle");
    if (m.includes("stone"))       out.push("stone");
    if (m.includes("footstep"))    out.push("footstep");
    if (m.includes("inscription") || m.includes("carved")) out.push("inscription");
    if (m.includes("dust"))        out.push("dust");
    if (m.includes("light"))       out.push("light_shift");
  }
  if (g.shot_type === "civilization_trace")    out.push("civilization_trace");
  if (g.shot_type === "observational_closeup") out.push("detail_closeup");
  return out;
}

function log(s: string) { console.log(s); }

main().catch(e => {
  console.error("DEMO FAILED:", e.message);
  console.error(e.stack);
  process.exit(1);
});
