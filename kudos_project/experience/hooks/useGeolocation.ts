"use client";

/**
 * KUDOS Experience · useGeolocation hook (Phase 13 + hardening).
 *
 * Browser geolocation with structured state machine. SSR-safe (returns
 * `pending` until mounted in browser). Cleanly distinguishes the four
 * outcomes that matter for UX routing:
 *
 *   pending       · async permission/lookup in flight
 *   ready         · coords resolved successfully
 *   denied        · user explicitly denied permission
 *   unavailable   · geolocation API missing OR position unavailable
 *                   OR generic error OR absolute watchdog tripped
 *   timeout       · resolution exceeded timeoutMs (default 10s)
 *
 * Consumers map these to UX states · CapsuleEntry routes:
 *     pending → CapsuleBuildingContext
 *     ready   → CapsuleSession(lat, lng)
 *     others  → CapsuleEmptyZone  (silent · no error language)
 *
 * Never throws. Never exposes raw `GeolocationPositionError` to UI.
 *
 * Hardening (Phase 13 audit fix):
 *   - `enabled` option · short-circuits the effect entirely. Used by
 *     CapsuleEntry when `manualCoords` is provided so the browser
 *     permission prompt never appears for demo links / fixed-coord
 *     embeds. React hooks rule preserved · hook always called, only
 *     its useEffect body becomes a no-op.
 *   - Absolute watchdog timeout · `getCurrentPosition`'s `timeout`
 *     option only counts the position lookup, NOT the permission
 *     prompt. If the user ignores the prompt indefinitely (open tab,
 *     walk away), state would stay `pending` forever. The watchdog
 *     forces a transition to `unavailable` after `watchdogMs` (default
 *     30000ms) regardless of permission prompt state.
 */
import { useEffect, useState } from "react";
import { track } from "@/lib/analytics/plausible";

export type GeolocationStatus =
  | "pending"
  | "ready"
  | "denied"
  | "unavailable"
  | "timeout";

export interface GeolocationState {
  status: GeolocationStatus;
  lat?: number;
  lng?: number;
}

export interface UseGeolocationOptions {
  /** Geolocation watchdog timeout in ms · default 10000.
   *  This is the browser's internal lookup timeout AFTER permission. */
  timeoutMs?: number;
  /** Max age of cached position in ms · default 60000 (1 min). */
  maxAgeMs?: number;
  /** High accuracy mode · default false (faster, more battery friendly). */
  enableHighAccuracy?: boolean;
  /** ABSOLUTE watchdog timeout in ms · default 30000.
   *  Covers the case where user never responds to permission prompt.
   *  After this time we force transition to `unavailable` regardless
   *  of what the browser is doing. */
  watchdogMs?: number;
  /** When false, the hook is a no-op (state stays `pending` forever).
   *  Used to skip browser geolocation when caller has alternate
   *  coords source (e.g., manualCoords prop). Default true. */
  enabled?: boolean;
}

const _DEFAULT_TIMEOUT_MS = 10_000;
const _DEFAULT_MAX_AGE_MS = 60_000;
const _DEFAULT_WATCHDOG_MS = 30_000;

export function useGeolocation(
  options: UseGeolocationOptions = {},
): GeolocationState {
  const [state, setState] = useState<GeolocationState>({ status: "pending" });

  const timeoutMs = options.timeoutMs ?? _DEFAULT_TIMEOUT_MS;
  const maxAgeMs = options.maxAgeMs ?? _DEFAULT_MAX_AGE_MS;
  const enableHighAccuracy = options.enableHighAccuracy ?? false;
  const watchdogMs = options.watchdogMs ?? _DEFAULT_WATCHDOG_MS;
  const enabled = options.enabled ?? true;

  useEffect(() => {
    // Hardening: enabled=false → hook is a no-op. State stays in its
    // current value (initial `pending`). Caller is responsible for
    // routing around this (e.g., CapsuleEntry checks manualCoords
    // before reading geo state).
    if (!enabled) return;

    // SSR-safe · navigator only exists in browser
    if (
      typeof navigator === "undefined" ||
      !("geolocation" in navigator) ||
      !navigator.geolocation
    ) {
      setState({ status: "unavailable" });
      track("geolocation_unavailable", { reason: "api_missing" });
      return;
    }

    let resolved = false;
    // Phase 14 telemetry · permission prompt is about to appear
    track("geolocation_prompt");

    // Absolute watchdog · catches "user ignored permission prompt"
    // and any other indefinite stall. When this fires, we set
    // `resolved=true` first so the late success/error callbacks
    // become no-ops and don't overwrite the unavailable state.
    const watchdog = window.setTimeout(() => {
      if (resolved) return;
      resolved = true;
      setState({ status: "unavailable" });
      track("geolocation_unavailable", { reason: "watchdog" });
    }, watchdogMs);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (resolved) return;
        resolved = true;
        window.clearTimeout(watchdog);
        setState({
          status: "ready",
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        track("geolocation_granted", {
          accuracy_m: Math.round(pos.coords.accuracy ?? 0),
        });
      },
      (err) => {
        if (resolved) return;
        resolved = true;
        window.clearTimeout(watchdog);
        // GeolocationPositionError codes:
        //   1 = PERMISSION_DENIED, 2 = POSITION_UNAVAILABLE, 3 = TIMEOUT.
        if (err.code === 1) {
          setState({ status: "denied" });
          track("geolocation_denied");
        } else if (err.code === 3) {
          setState({ status: "timeout" });
          track("geolocation_timeout");
        } else {
          setState({ status: "unavailable" });
          track("geolocation_unavailable", { reason: "position_error" });
        }
      },
      {
        enableHighAccuracy,
        timeout: timeoutMs,
        maximumAge: maxAgeMs,
      },
    );

    return () => {
      // Cleanup · prevent late callbacks from updating unmounted state.
      resolved = true;
      window.clearTimeout(watchdog);
    };
  }, [enabled, timeoutMs, maxAgeMs, enableHighAccuracy, watchdogMs]);

  return state;
}
