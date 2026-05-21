/**
 * KUDOS Experience · environment-variable hard check (Phase 14.10).
 *
 * Runs once at app boot · imported from app/layout.tsx (the only file
 * guaranteed to load on every page). Validates required env vars and
 * fails loudly in development so the founder + Cowork see config
 * problems immediately, not days later via empty dashboards.
 *
 * Behavior:
 *   - In `NODE_ENV !== "production"`: throws a hard error if a
 *     REQUIRED var is missing · breaks `next dev` immediately with a
 *     clear message. This is intentional · silent footguns at startup
 *     are worse than a loud crash that explains itself.
 *   - In `NODE_ENV === "production"`: never throws (we don't want a
 *     misconfigured prod env to take down the entire site · the user
 *     gets system_unavailable surfaces instead). Logs to console
 *     once for operator visibility.
 *
 * REQUIRED vars (missing → hard fail in dev):
 *   NEXT_PUBLIC_API_BASE_URL
 *
 * OPTIONAL vars (missing → soft warn in dev, silent in prod):
 *   NEXT_PUBLIC_PLAUSIBLE_DOMAIN
 *   NEXT_PUBLIC_SITE_URL
 *
 * Idempotent · multiple imports across the layout tree only emit one
 * check (guarded by a module-level flag).
 */

interface EnvSpec {
  name: string;
  required: boolean;
  description: string;
}

const _SPEC: EnvSpec[] = [
  {
    name: "NEXT_PUBLIC_API_BASE_URL",
    required: true,
    description:
      "AXÓN backend origin (e.g. https://kudos-40cq.onrender.com). " +
      "Without this, every capsule fetch fails and the UI shows " +
      "system_unavailable forever.",
  },
  {
    name: "NEXT_PUBLIC_PLAUSIBLE_DOMAIN",
    required: false,
    description:
      "Plausible analytics domain. Optional · script only loads in " +
      "production AND when this is set. Without it: zero telemetry.",
  },
  {
    name: "NEXT_PUBLIC_SITE_URL",
    required: false,
    description:
      "Canonical site URL for OG/share. Without it: metadataBase " +
      "falls back to NEXT_PUBLIC_API_BASE_URL which produces wrong " +
      "share URLs.",
  },
];

let _checked = false;

export function checkEnv(): void {
  if (_checked) return;
  _checked = true;

  const isProd = process.env.NODE_ENV === "production";
  const missing: EnvSpec[] = [];

  for (const spec of _SPEC) {
    const value = process.env[spec.name];
    if (!value || value.length === 0) {
      missing.push(spec);
    }
  }

  if (missing.length === 0) return;

  const requiredMissing = missing.filter((s) => s.required);
  const optionalMissing = missing.filter((s) => !s.required);

  const lines: string[] = [];
  lines.push("");
  lines.push("================================================================");
  lines.push("KUDOS · environment check");
  lines.push("================================================================");
  if (requiredMissing.length > 0) {
    lines.push("");
    lines.push("REQUIRED env vars MISSING:");
    for (const s of requiredMissing) {
      lines.push(`  · ${s.name}`);
      lines.push(`    ${s.description}`);
    }
  }
  if (optionalMissing.length > 0) {
    lines.push("");
    lines.push("Optional env vars missing (degraded mode):");
    for (const s of optionalMissing) {
      lines.push(`  · ${s.name}`);
      lines.push(`    ${s.description}`);
    }
  }
  lines.push("");
  lines.push("See experience/.env.example for the full set.");
  lines.push("================================================================");
  lines.push("");

  const message = lines.join("\n");

  if (!isProd && requiredMissing.length > 0) {
    // Hard fail in dev · breaks `next dev` with a clear message.
    // Easier to fix one loud error than to chase silent empty_zone all
    // afternoon.
    throw new Error(message);
  }

  // Production OR only-optional missing · soft log.
  // eslint-disable-next-line no-console
  console.warn(message);
}
