/**
 * KUDOS Experience · Plausible analytics (Phase 14 telemetry).
 *
 * Minimal wrapper around Plausible's window.plausible() function.
 * Used by capsule flow + geolocation hook to emit lifecycle events.
 *
 * Fail-safe rules:
 *   - SSR safe (no-op when window undefined)
 *   - No-op when NEXT_PUBLIC_PLAUSIBLE_DOMAIN env var missing
 *   - No-op when window.plausible function absent (script not loaded yet,
 *     ad-blocked, network failure, etc.)
 *   - Any throw inside Plausible call is swallowed silently
 *
 * Telemetry MUST NEVER crash the UX layer.
 */
"use client";

declare global {
  interface Window {
    plausible?: (
      event: string,
      options?: {
        props?: Record<string, string | number | boolean>;
        callback?: () => void;
      },
    ) => void;
  }
}

export type EventProps = Record<string, string | number | boolean>;

const _DOMAIN: string | undefined = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
const _IS_PROD: boolean = process.env.NODE_ENV === "production";

export const PLAUSIBLE_DOMAIN: string | undefined = _DOMAIN;
/** True iff Plausible should be active in this runtime. */
export const PLAUSIBLE_ENABLED: boolean =
  typeof _DOMAIN === "string" && _DOMAIN.length > 0 && _IS_PROD;

/**
 * Emit a custom event to Plausible with optional properties.
 *
 * Common event names used in KUDOS:
 *   page_view_aqui · explicit signal for /aqui mounts (auto pageview emits
 *                     too, this is for distinguishing the geolocation entry)
 *   geolocation_prompt · permission prompt shown
 *   geolocation_granted · user accepted
 *   geolocation_denied · user denied
 *   geolocation_unavailable · API missing OR generic error OR watchdog
 *   geolocation_timeout · browser-internal timeout fired
 *   capsule_requested · POST /api/place-capsule started
 *   capsule_success · response state=success
 *   capsule_sparse · response state=sparse_discovery
 *   capsule_empty · response state=empty_zone
 *   capsule_error · fetch threw or non-2xx (degrades to empty in UI)
 *
 * Props are key-value strings/numbers/booleans. Plausible dashboard
 * filterable by props.
 */
export function track(event: string, props?: EventProps): void {
  if (typeof window === "undefined") return;
  if (!PLAUSIBLE_ENABLED) return;
  try {
    const fn = window.plausible;
    if (typeof fn === "function") {
      fn(event, props ? { props } : undefined);
    }
  } catch {
    // Telemetry never crashes UX. Swallow silently.
  }
}

// ----------------------------------------------------------------------------
// Phase 14.12 · trackUnloadSafe · session-exit-resistant telemetry
// ----------------------------------------------------------------------------
// Problem: `track()` delegates to window.plausible(), which uses a regular
// fetch/XHR internally. When the page is unloading (pagehide, mobile Safari
// background-kill, navigation), the browser aborts in-flight requests · the
// event is silently dropped. capsule_session_ended is the canonical victim.
//
// Solution: bypass window.plausible() for unload-critical events and POST
// directly to Plausible's /api/event endpoint using transports designed to
// survive document unload:
//
//   Priority 1 · navigator.sendBeacon  · purpose-built for this case,
//                queued by the browser, survives unload, no CORS preflight
//                when body is a plain string (text/plain default).
//   Priority 2 · fetch({ keepalive: true })  · modern fallback, lets fetch
//                outlive document unload. Body sent as text/plain to avoid
//                CORS preflight (Plausible parses body as JSON regardless).
//   Priority 3 · fall through to track() · best-effort if both above fail.
//
// Plausible API contract: POST /api/event with JSON body
//   { name, url, domain, props? }
// (verified against plausible.io and plausible-tracker open source).
// ----------------------------------------------------------------------------

/** Hardcoded Plausible Cloud endpoint. If self-hosting Plausible later,
 *  this should be derived from NEXT_PUBLIC_PLAUSIBLE_API_URL or similar. */
const _PLAUSIBLE_ENDPOINT = "https://plausible.io/api/event";

/**
 * Emit a custom event reliably even when the document is unloading.
 *
 * Use this ONLY for events that NEED to fire during page exit / background
 * (session_ended, share_completed-on-leave). Regular in-page events should
 * keep using `track()` — they don't need the extra machinery and benefit
 * from Plausible's script-level enrichment.
 *
 * Fail-safe rules identical to track(): SSR no-op, env-gated, silent on
 * throw, never crashes UX.
 */
export function trackUnloadSafe(event: string, props?: EventProps): void {
  if (typeof window === "undefined") return;
  if (!PLAUSIBLE_ENABLED) return;
  if (typeof _DOMAIN !== "string" || _DOMAIN.length === 0) return;

  // Build the Plausible API payload once · all transports use the same body.
  let body: string;
  try {
    body = JSON.stringify({
      name: event,
      url: window.location.href,
      domain: _DOMAIN,
      props: props ?? undefined,
    });
  } catch {
    // JSON.stringify can throw on circular props · defensive guard.
    return;
  }

  // Priority 1 · sendBeacon · string body avoids CORS preflight.
  try {
    if (
      typeof navigator !== "undefined" &&
      typeof navigator.sendBeacon === "function"
    ) {
      const ok = navigator.sendBeacon(_PLAUSIBLE_ENDPOINT, body);
      if (ok) return;
    }
  } catch {
    // fall through to keepalive
  }

  // Priority 2 · fetch keepalive · text/plain avoids CORS preflight.
  try {
    if (typeof fetch === "function") {
      void fetch(_PLAUSIBLE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body,
        keepalive: true,
      });
      return;
    }
  } catch {
    // fall through to regular track
  }

  // Priority 3 · best-effort fallback · in-flight request likely aborted
  // on unload but at least we tried via the regular Plausible path.
  track(event, props);
}

/**
 * Phase 14 deployment verification · founder test event.
 *
 * Exposes `window.kudosTestEvent()` on any KUDOS page so the founder
 * can confirm the FULL telemetry pipeline end-to-end without waiting
 * for a real geolocation session:
 *
 *   1. Open https://YOUR_DOMAIN/aqui (or any KUDOS page)
 *   2. Open DevTools console
 *   3. Type:  kudosTestEvent()
 *   4. Network tab → see POST plausible.io/api/event with n=kudos_founder_test
 *   5. Plausible dashboard → kudos_founder_test count increments within 60s
 *
 * Diagnostic returns + console messages:
 *   - "kudosTestEvent is not defined"      · script not loaded · provider didn't mount
 *   - returns false + warn "Plausible disabled" · env var missing OR not prod build
 *   - returns false + warn "window.plausible undefined" · script blocked (CSP / adblock / 404)
 *   - returns true  · event sent · verify dashboard in 30-60s
 *     If true but dashboard never shows it → domain mismatch between
 *     NEXT_PUBLIC_PLAUSIBLE_DOMAIN and the site registered in Plausible.
 */
declare global {
  interface Window {
    kudosTestEvent?: (note?: string) => boolean;
  }
}

export function _installFounderTestEvent(): void {
  if (typeof window === "undefined") return;
  window.kudosTestEvent = (note?: string): boolean => {
    if (!PLAUSIBLE_ENABLED) {
      // eslint-disable-next-line no-console
      console.warn(
        "[KUDOS · telemetry] kudosTestEvent called but Plausible is " +
          "disabled. Either NEXT_PUBLIC_PLAUSIBLE_DOMAIN is missing at " +
          "build time or NODE_ENV !== 'production'. Event NOT sent.",
      );
      return false;
    }
    if (typeof window.plausible !== "function") {
      // eslint-disable-next-line no-console
      console.warn(
        "[KUDOS · telemetry] kudosTestEvent called but window.plausible " +
          "is undefined. Script failed to load · check Network tab for " +
          "plausible.io/js/script.js (CSP block, adblock, 404).",
      );
      return false;
    }
    track("kudos_founder_test", {
      note: typeof note === "string" && note.length > 0 ? note : "manual",
      ts: new Date().toISOString(),
    });
    // eslint-disable-next-line no-console
    console.log(
      "[KUDOS · telemetry] kudos_founder_test emitted. " +
        "Verify Plausible dashboard in 30-60s.",
    );
    return true;
  };
}
