/**
 * KUDOS · Capsule Engine · DB persistence.
 *
 * Production implementation uses node-postgres (`pg`). The interface is
 * exported separately so tests can swap it for an in-memory map.
 *
 * Schema migration (run once):
 *
 *   CREATE TABLE capsules (
 *     id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *     capsule_id      text NOT NULL,
 *     poi_id          text NOT NULL,
 *     language        text NOT NULL,
 *     audience        text NOT NULL,
 *     duration_s      int  NOT NULL,
 *     tone            text NOT NULL,
 *     tier            text NOT NULL,
 *     cache_key       text GENERATED ALWAYS AS
 *                       (poi_id||':'||language||':'||audience||':'||duration_s||':'||tone) STORED,
 *     status          text NOT NULL,
 *     mp4_url         text,
 *     thumb_url       text,
 *     vtt_url         text,
 *     meta            jsonb,
 *     cost_cents      int  NOT NULL DEFAULT 0,
 *     ms_elapsed      int  NOT NULL DEFAULT 0,
 *     created_at      timestamptz NOT NULL DEFAULT now(),
 *     UNIQUE (cache_key)
 *   );
 *   CREATE INDEX capsules_cache_key_idx ON capsules (cache_key);
 *   CREATE INDEX capsules_poi_idx       ON capsules (poi_id);
 *
 *   CREATE TABLE spend_log (
 *     id          bigserial PRIMARY KEY,
 *     capsule_id  text NOT NULL,
 *     stage       text NOT NULL,
 *     cost_cents  int  NOT NULL,
 *     created_at  timestamptz NOT NULL DEFAULT now()
 *   );
 *   CREATE INDEX spend_log_created_at_idx ON spend_log (created_at);
 */
import type { CapsuleResult, CapsuleTier } from "./types";

export interface CapsuleRow {
  capsule_id:  string;
  poi_id:      string;
  language:    string;
  audience:    string;
  duration_s:  number;
  tone:        string;
  tier:        CapsuleTier;
  status:      "queued" | "running" | "ready" | "failed" | "rejected_by_governor";
  mp4_url?:    string | null;
  thumb_url?:  string | null;
  vtt_url?:    string | null;
  meta?:       unknown;
  cost_cents:  number;
  ms_elapsed:  number;
}

export interface SpendWindow {
  daily_usd:   number;
  monthly_usd: number;
}

export interface CapsuleDb {
  upsertCapsule(row: CapsuleRow):                                          Promise<void>;
  getByCacheKey(poi: string, lang: string, aud: string, dur: number, tone: string): Promise<CapsuleRow | null>;
  recordSpend(capsule_id: string, stage: string, cost_cents: number):      Promise<void>;
  readSpendWindow():                                                       Promise<SpendWindow>;
}

// ─── Postgres implementation ──────────────────────────────────────────────
// To use: `npm i pg` and uncomment the import below.

/* eslint-disable @typescript-eslint/no-var-requires */
let _pool: any = null;
function pool() {
  if (_pool) return _pool;
  // @ts-ignore · dynamic require keeps `pg` out of build if not installed
  const { Pool } = require("pg");
  _pool = new Pool({ connectionString: process.env.DATABASE_URL });
  return _pool;
}

export const postgresDb: CapsuleDb = {
  async upsertCapsule(row) {
    await pool().query(
      `INSERT INTO capsules
         (capsule_id, poi_id, language, audience, duration_s, tone, tier,
          status, mp4_url, thumb_url, vtt_url, meta, cost_cents, ms_elapsed)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       ON CONFLICT (cache_key) DO UPDATE SET
         status     = EXCLUDED.status,
         mp4_url    = EXCLUDED.mp4_url,
         thumb_url  = EXCLUDED.thumb_url,
         vtt_url    = EXCLUDED.vtt_url,
         meta       = EXCLUDED.meta,
         cost_cents = EXCLUDED.cost_cents,
         ms_elapsed = EXCLUDED.ms_elapsed`,
      [row.capsule_id, row.poi_id, row.language, row.audience, row.duration_s, row.tone, row.tier,
       row.status, row.mp4_url ?? null, row.thumb_url ?? null, row.vtt_url ?? null,
       row.meta ? JSON.stringify(row.meta) : null, row.cost_cents, row.ms_elapsed],
    );
  },

  async getByCacheKey(poi, lang, aud, dur, tone) {
    const r = await pool().query(
      `SELECT * FROM capsules
        WHERE poi_id=$1 AND language=$2 AND audience=$3 AND duration_s=$4 AND tone=$5
        LIMIT 1`,
      [poi, lang, aud, dur, tone],
    );
    return r.rows[0] ?? null;
  },

  async recordSpend(capsule_id, stage, cost_cents) {
    await pool().query(
      `INSERT INTO spend_log (capsule_id, stage, cost_cents) VALUES ($1,$2,$3)`,
      [capsule_id, stage, cost_cents],
    );
  },

  async readSpendWindow() {
    const r = await pool().query(
      `SELECT
         COALESCE(SUM(CASE WHEN created_at > now() - interval '1 day'   THEN cost_cents END), 0) AS d,
         COALESCE(SUM(CASE WHEN created_at > now() - interval '30 days' THEN cost_cents END), 0) AS m
       FROM spend_log`,
    );
    return {
      daily_usd:   Number(r.rows[0].d) / 100,
      monthly_usd: Number(r.rows[0].m) / 100,
    };
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────

export function capsuleResultToRow(res: CapsuleResult, req: {
  poi_id: string; language: string; audience: string; duration_seconds: number; tone: string;
}): CapsuleRow {
  return {
    capsule_id: res.capsule_id,
    poi_id:     req.poi_id,
    language:   req.language,
    audience:   req.audience,
    duration_s: req.duration_seconds,
    tone:       req.tone,
    tier:       res.tier,
    status:     res.status,
    mp4_url:    res.assets.video    ?? null,
    thumb_url:  res.assets.thumbnail ?? null,
    vtt_url:    res.assets.subtitles ?? null,
    meta:       res,
    cost_cents: Math.round(res.cost_usd.actual * 100),
    ms_elapsed: res.generation_time_ms.actual,
  };
}
