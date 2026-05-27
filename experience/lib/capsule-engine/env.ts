/**
 * KUDOS · Capsule Engine · environment validation.
 *
 * Single source of truth for every required API key.
 * Throws on first call if any required var is missing so deploys fail fast.
 *
 * .env.local example:
 *   ANTHROPIC_API_KEY=sk-ant-...
 *   REPLICATE_API_TOKEN=r8_...
 *   PIAPI_KEY=...
 *   CARTESIA_API_KEY=...
 *   ELEVENLABS_API_KEY=...                  # optional fallback
 *   R2_ACCOUNT_ID=...
 *   R2_ACCESS_KEY_ID=...
 *   R2_SECRET_ACCESS_KEY=...
 *   R2_BUCKET=kudos-capsules
 *   R2_PUBLIC_BASE=https://capsules.kudos.app   # CDN/custom-domain
 *   DATABASE_URL=postgres://...
 */
export interface CapsuleEnv {
  ANTHROPIC_API_KEY:     string;
  REPLICATE_API_TOKEN:   string;
  PIAPI_KEY:             string;
  CARTESIA_API_KEY:      string;
  ELEVENLABS_API_KEY?:   string;
  R2_ACCOUNT_ID:         string;
  R2_ACCESS_KEY_ID:      string;
  R2_SECRET_ACCESS_KEY:  string;
  R2_BUCKET:             string;
  R2_PUBLIC_BASE:        string;
  DATABASE_URL:          string;
}

const REQUIRED: ReadonlyArray<keyof CapsuleEnv> = [
  "ANTHROPIC_API_KEY",
  "REPLICATE_API_TOKEN",
  "PIAPI_KEY",
  "CARTESIA_API_KEY",
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
  "R2_PUBLIC_BASE",
  "DATABASE_URL",
];

let _cache: CapsuleEnv | null = null;

export function env(): CapsuleEnv {
  if (_cache) return _cache;
  const e = (typeof process !== "undefined" ? process.env : {}) as Record<string, string | undefined>;
  const missing = REQUIRED.filter((k) => !e[k]);
  if (missing.length > 0) {
    throw new Error(
      `[capsule-engine/env] Missing required environment variable(s): ${missing.join(", ")}. ` +
      `Set them in .env.local or your deployment platform.`
    );
  }
  _cache = {
    ANTHROPIC_API_KEY:    e.ANTHROPIC_API_KEY!,
    REPLICATE_API_TOKEN:  e.REPLICATE_API_TOKEN!,
    PIAPI_KEY:            e.PIAPI_KEY!,
    CARTESIA_API_KEY:     e.CARTESIA_API_KEY!,
    ELEVENLABS_API_KEY:   e.ELEVENLABS_API_KEY,
    R2_ACCOUNT_ID:        e.R2_ACCOUNT_ID!,
    R2_ACCESS_KEY_ID:     e.R2_ACCESS_KEY_ID!,
    R2_SECRET_ACCESS_KEY: e.R2_SECRET_ACCESS_KEY!,
    R2_BUCKET:            e.R2_BUCKET!,
    R2_PUBLIC_BASE:       e.R2_PUBLIC_BASE!,
    DATABASE_URL:         e.DATABASE_URL!,
  };
  return _cache;
}

/** Reset cache · only for tests. */
export function _resetEnvCache() { _cache = null; }
