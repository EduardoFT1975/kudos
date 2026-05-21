/**
 * KUDOS Experience · API client for the Content Engine capsule endpoint.
 *
 * Single function: fetchCapsuleResponse(lat, lng, radiusM)
 *
 * Failure handling philosophy (Phase 14.10 · differentiated):
 *   - Network error / fetch threw       → system_unavailable
 *   - Non-2xx HTTP response              → system_unavailable
 *   - Malformed JSON / parse threw       → system_unavailable
 *   - Unknown state value               → system_unavailable
 *   - Inconsistent shape (success+null)  → system_unavailable
 *   - Backend explicitly returned empty_zone → empty_zone (real silence)
 *
 * This split lets the UI render two distinct surfaces:
 *   - CapsuleSystemUnavailable · "we're having a moment, retry"
 *   - CapsuleEmptyZone         · "this place truly has no story yet"
 *
 * The UI never crashes. The user never sees a stack trace, a network
 * error message, or backend taxonomy. System-unavailable carries a
 * meta.degraded_reason for operator visibility (NEVER shown to user).
 */
import type { CapsuleResponse, CapsuleUXState } from "@/types/capsule-state";
import { track } from "@/lib/analytics/plausible";

// Phase 13 canonical endpoint (`/api/capsule/nearby` is preserved
// server-side as a back-compat alias but new code should target
// `/api/place-capsule`).
const ENDPOINT: string = "/api/place-capsule";

// Phase 14 telemetry · server emits this header on every response.
// Values: ok | empty | sparse | degraded | throttled | bad_request.
// We surface it as an event prop so founder dashboards can correlate
// frontend outcomes with backend pipeline health.
const _HEALTH_HEADER: string = "X-Kudos-Pipeline-Health";

/**
 * Monotonic high-resolution clock when available, falling back to
 * Date.now(). performance.now() is browser-only · in SSR / Node we
 * use Date.now() so the call never throws.
 */
function _now(): number {
  if (
    typeof performance !== "undefined" &&
    typeof performance.now === "function"
  ) {
    return performance.now();
  }
  return Date.now();
}

/** Round coords to 3 decimals (~111m) for analytics aggregation.
 *  Avoids leaking sub-meter precision to the analytics provider while
 *  preserving enough granularity for city-level dashboards. */
function _roundCoord(n: number): number {
  return Math.round(n * 1000) / 1000;
}

const _RAW_API_BASE: string | undefined = process.env.NEXT_PUBLIC_API_BASE_URL;
const API_BASE: string = _RAW_API_BASE ?? "";

// Defensive visibility · without NEXT_PUBLIC_API_BASE_URL, fetch hits
// the Next.js origin (`/api/place-capsule`) which is usually 404 unless
// Next and Django share an origin. Silent failure manifests as constant
// `empty_zone` in the UI · misleading for operators.
//
// Emit a single startup warning so the misconfiguration is visible in
// browser DevTools console (client) and Next.js server logs (SSR).
// Only logs in development to avoid log spam in production where the
// env var is expected to be set.
if (
  !_RAW_API_BASE &&
  typeof process !== "undefined" &&
  process.env.NODE_ENV !== "production"
) {
  // eslint-disable-next-line no-console
  console.warn(
    "[KUDOS · capsules] NEXT_PUBLIC_API_BASE_URL is not set. " +
      "fetch will hit the Next.js origin · expect /api/place-capsule to 404 " +
      "and all responses to collapse to empty_zone. Set this env var to " +
      "your Django backend origin (e.g. http://localhost:8000 or " +
      "https://api.kudos.example).",
  );
}

// States the backend is allowed to emit. `system_unavailable` is a
// frontend-only synthetic state minted by THIS module when the backend
// is unreachable or returns garbage · never accepted off the wire.
const _VALID_STATES: ReadonlySet<CapsuleUXState> = new Set<CapsuleUXState>([
  "success",
  "sparse_discovery",
  "empty_zone",
]);

/**
 * Optional knobs for fetchCapsuleResponse.
 *
 *   silent · suppresses ALL telemetry (capsule_requested / _success /
 *            _sparse / _empty / _error). Used by background probes
 *            (useCapsuleQueue) so the dashboard isn't flooded with
 *            phantom events the user never asked for. The queue hook
 *            emits its own queue_probe_* events instead.
 *   signal · standard fetch AbortSignal. Probes wire it so that on
 *            coord change or unmount the in-flight HTTP request is
 *            actually torn down (not just its result discarded).
 */
export interface FetchCapsuleOptions {
  silent?: boolean;
  signal?: AbortSignal;
}

export async function fetchCapsuleResponse(
  lat: number,
  lng: number,
  radiusM: number,
  options: FetchCapsuleOptions = {},
): Promise<CapsuleResponse> {
  const { silent = false, signal } = options;

  // Phase 14 telemetry · emit request start so founder can see fan-out
  // even when the backend never responds. Coords are rounded for
  // analytics aggregation (3 decimals ≈ 110m city-level granularity).
  if (!silent) {
    track("capsule_requested", {
      lat: _roundCoord(lat),
      lng: _roundCoord(lng),
      radius_m: radiusM,
    });
  }

  const _t0: number = _now();
  let _health: string = "unknown";

  try {
    const res = await fetch(`${API_BASE}${ENDPOINT}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat, lng, radius_m: radiusM }),
      cache: "no-store",
      signal,
    });

    // Header read · defensive try (some fetch polyfills throw on
    // missing headers; we never want telemetry to crash UX).
    try {
      _health = res.headers.get(_HEALTH_HEADER) ?? "unknown";
    } catch {
      _health = "unknown";
    }

    if (!res.ok) {
      if (!silent) {
        track("capsule_error", {
          reason: `http_${res.status}`,
          latency_ms: Math.round(_now() - _t0),
          pipeline_health: _health,
        });
      }
      // Phase 14.10 · non-2xx is a system problem, NOT an empty place.
      return systemUnavailableFallback(`http_${res.status}`);
    }
    let data: unknown;
    try {
      data = await res.json();
    } catch (parseErr) {
      if (!silent) {
        track("capsule_error", {
          reason: "parse_error",
          latency_ms: Math.round(_now() - _t0),
          pipeline_health: _health,
        });
      }
      return systemUnavailableFallback("parse_error");
    }
    const validated = validateResponse(data);

    // Map UX state → telemetry event. Validation-induced fallback is
    // still reported as capsule_empty (correct from the user's POV);
    // operators distinguish via pipeline_health header (`bad_request`
    // or `degraded` vs. `empty`).
    const _latency_ms: number = Math.round(_now() - _t0);
    if (!silent) {
      if (validated.state === "success") {
        track("capsule_success", {
          latency_ms: _latency_ms,
          pipeline_health: _health,
        });
      } else if (validated.state === "sparse_discovery") {
        track("capsule_sparse", {
          latency_ms: _latency_ms,
          pipeline_health: _health,
        });
      } else {
        track("capsule_empty", {
          latency_ms: _latency_ms,
          pipeline_health: _health,
        });
      }
    }
    return validated;
  } catch (err) {
    // Network failure, abort, or any other unexpected error.
    // Intentionally swallowed · no error language reaches the UI.
    // AbortError is expected when the consumer cancels · still silent
    // for UX, still surfaces in the error event when telemetry is on.
    const reason = err instanceof Error ? err.name : "unknown";
    if (!silent) {
      track("capsule_error", {
        reason,
        latency_ms: Math.round(_now() - _t0),
        pipeline_health: _health,
      });
    }
    // Phase 14.10 · network failure / abort / unexpected throw = system
    // problem, not an empty place. AbortError specifically is the
    // consumer cancelling us · we still return system_unavailable but
    // the caller's cancelled flag will discard the value anyway.
    return systemUnavailableFallback(reason);
  }
}

/**
 * Defensive shape validation. Any deviation from the contract
 * collapses to system_unavailable (Phase 14.10) rather than empty_zone,
 * because malformed responses indicate a backend/contract problem, not
 * an empty place. Backend-emitted state="empty_zone" with valid shape
 * still passes through cleanly.
 */
function validateResponse(data: unknown): CapsuleResponse {
  if (
    data === null ||
    typeof data !== "object" ||
    !("state" in data) ||
    !("meta" in data)
  ) {
    return systemUnavailableFallback("malformed_response");
  }
  const obj = data as Record<string, unknown>;
  const state = obj.state as CapsuleUXState;
  if (!_VALID_STATES.has(state)) {
    return systemUnavailableFallback("unknown_state");
  }
  // Capsule presence consistency check
  const capsule = obj.capsule ?? null;
  if ((state === "success" || state === "sparse_discovery") && capsule === null) {
    return systemUnavailableFallback("inconsistent_shape");
  }
  // Trust the rest of the shape; types narrow it at the call site.
  return data as CapsuleResponse;
}

/**
 * Phase 14.10 · explicit "system is having a moment" response. The
 * reason string is operator-only telemetry · UI components MUST NOT
 * render it. CapsuleSystemUnavailable surfaces a contemplative-tone
 * "the system is unreachable" message regardless of the underlying
 * reason.
 */
function systemUnavailableFallback(_reason: string): CapsuleResponse {
  // _reason is intentionally accepted but not embedded in the response ·
  // it serves as documentation at call sites (grep for "system_unavailable
  // fallback") and is already surfaced via the capsule_error telemetry
  // event's `reason` prop. UI components never see this value.
  return {
    state: "system_unavailable",
    capsule: null,
    meta: {
      confidence: null,
      partial: false,
      source: null,
    },
  };
}
