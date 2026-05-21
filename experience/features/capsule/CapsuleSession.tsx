"use client";

/**
 * KUDOS Experience · <CapsuleSession />
 *
 * Client-side request lifecycle wrapper around CapsuleStateRouter.
 *
 * Lifecycle:
 *   1. Mount / coords change   → response state set to null
 *                                 → router renders CapsuleBuildingContext
 *   2. fetchCapsuleResponse()  → request to /api/capsule/nearby in flight
 *   3. Resolve                 → response state set to API result
 *                                 → router renders success / sparse /
 *                                   empty depending on payload
 *
 * Coord changes during an in-flight request:
 *   - Old request is cancelled-on-effect (cancelled flag closure).
 *   - State resets to null while new request fires.
 *   - User sees CapsuleBuildingContext continuously across coord
 *     changes · no stale capsule briefly flashing.
 *
 * `building_context` is a FRONTEND state. It is never received from
 * the API. The API only emits success / sparse_discovery / empty_zone.
 *
 * Phase 14.7 loop frictionless · session-local capsule queue
 *   - useCapsuleQueue preloads 3-5 nearby alternative capsules in the
 *     background while the primary capsule is being read.
 *   - "Otra cápsula" pop'd from queue → INSTANT swap (no fetch wait,
 *     no picker overlay).
 *   - On queue miss (empty / cold start), fall back to the manual
 *     picker so the loop never dead-ends.
 *
 * Fail-safe inherited from fetchCapsuleResponse: any network or
 * shape failure → empty_zone, never a thrown error in the UI tree.
 */
import * as React from "react";
import { CapsuleStateRouter } from "./CapsuleStateRouter";
import { ManualLocationPicker } from "./ManualLocationPicker";
import { fetchCapsuleResponse } from "@/lib/api/capsules";
import { inspectCapsuleQuality } from "@/lib/capsule/quality";
import { useCapsuleQueue } from "@/lib/capsule/useCapsuleQueue";
import { track, trackUnloadSafe } from "@/lib/analytics/plausible";
import type { CapsuleResponse } from "@/types/capsule-state";

interface CapsuleSessionProps {
  lat: number;
  lng: number;
  /** Default 1500m · matches the V0 master test map default. */
  radiusM?: number;
  /** Phase 14.5 · invoked when user picks a city in the manual
   *  picker. Parent (CapsuleEntry) replaces its coords accordingly. */
  onManualCoordsPicked?: (coords: { lat: number; lng: number }) => void;
}

const DEFAULT_RADIUS_M = 1500;
const MAX_RADIUS_M = 5000; // Backend cap (content_engine/api.py).
const EXPAND_STEP_M = 1500;
const _QUALITY_RETRY_RADIUS_M = 3500; // First auto-expand on weak result.

// P0.6 · primary fetch client-side timeout. Browser default is 5min+
// which would leave the user staring at the building-context stall CTA
// indefinitely on a hung backend. 20s comfortably covers worst-case p99
// for a working backend and bails to system_unavailable below that.
const _PRIMARY_TIMEOUT_MS = 20_000;

// P0.6 · rage-tap guard window for retry / expand. Real-user retries
// happen seconds apart · spam-taps fire within ~50ms. 600ms preserves
// the former and kills the latter without affecting normal usage.
const _RETRY_DEBOUNCE_MS = 600;

// Phase 14.11 · capsule_session_ended emission strategy.
// PRODUCTION: synchronous emit in cleanup · React doesn't run StrictMode
//   double-invoke in prod, so a real unmount = a real session end. Also
//   fires via pagehide (browser close / hard nav) when that happens first.
// DEVELOPMENT: skip the cleanup-emit entirely · StrictMode would
//   double-invoke and double-fire. Dev analytics is noise anyway. pagehide
//   path still works in dev for real browser-level exits.
//
// This replaces the earlier P0.5 module-level deferred-timer pattern, which
// caused a real bug: when the user switched coord-source mid-session
// (geo → manual via recovery picker), the new CapsuleSession mount cleared
// the old instance's pending emit before it fired, silently dropping the
// session_ended event for the geolocation session.
const _IS_PROD = process.env.NODE_ENV === "production";

export function CapsuleSession({
  lat,
  lng,
  radiusM = DEFAULT_RADIUS_M,
  onManualCoordsPicked,
}: CapsuleSessionProps) {
  const [response, setResponse] = React.useState<CapsuleResponse | null>(null);

  // Recovery state · user-initiated radius bump persists across the
  // session until coords change. Quality-guard auto-expand is internal
  // (does not surface to the user as a different "radius").
  const [effectiveRadius, setEffectiveRadius] =
    React.useState<number>(radiusM);
  const [retryNonce, setRetryNonce] = React.useState<number>(0);
  const [pickerOpen, setPickerOpen] = React.useState<boolean>(false);

  // Reset effectiveRadius when coords or the parent-supplied radiusM
  // change · a fresh session shouldn't inherit prior expand clicks.
  React.useEffect(() => {
    setEffectiveRadius(radiusM);
  }, [lat, lng, radiusM]);

  // Phase 14.7 · session-local queue · preloads 3-5 nearby alternative
  // capsules in the background. primaryCapsuleId tells the queue what
  // to exclude from probes. Enabled only after a successful primary
  // capsule renders · before that, there's nothing to compare against
  // and probes would overlap with the primary's own catchment.
  const primaryCapsuleId: string | null =
    response?.state === "success" && response.capsule
      ? response.capsule.id
      : null;
  const queue = useCapsuleQueue({
    centerLat: lat,
    centerLng: lng,
    primaryCapsuleId,
    enabled: true,
  });

  // Phase 14.8 telemetry · mirror queue.size into a ref so handleNext
  // can read the current value at call time WITHOUT pulling queue.size
  // into its dep array (which would undo the previous identity-stability
  // patch and re-introduce per-mutation re-renders of CapsuleStateRouter).
  const queueSizeRef = React.useRef<number>(0);
  React.useEffect(() => {
    queueSizeRef.current = queue.size;
  }, [queue.size]);

  // Phase 14.8 telemetry · session depth tracking.
  // Counts every distinct capsule shown to the user within an
  // anchor-stable session (i.e., without a coord change). Resets when
  // lat/lng change · a new picker pick or new geolocation starts at 1.
  const sessionDepthRef = React.useRef<number>(0);
  const lastShownIdRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    sessionDepthRef.current = 0;
    lastShownIdRef.current = null;
  }, [lat, lng]);
  React.useEffect(() => {
    if (!response) return;
    if (!response.capsule) return;
    if (response.capsule.id === lastShownIdRef.current) return;
    sessionDepthRef.current += 1;
    lastShownIdRef.current = response.capsule.id;
    track("capsule_session_depth", { depth: sessionDepthRef.current });
  }, [response]);

  // Phase 14.11-14.12 telemetry · capsule_session_ended.
  // Fires AT MOST ONCE per session instance via the earliest of:
  //   (a) `visibilitychange` → hidden  (mobile Safari background, tab switch,
  //       app switch · fires BEFORE pagehide on iOS where pagehide may
  //       never arrive if the OS kills the tab in background),
  //   (b) `pagehide` (browser close / hard navigation),
  //   (c) component cleanup in PRODUCTION (SPA route change, parent swap,
  //       coord-source switch causing CapsuleSession remount).
  // In development the cleanup-path is skipped to avoid StrictMode double-
  // fire · dev sessions never contribute to analytics anyway.
  //
  // Phase 14.12 · all three paths use `trackUnloadSafe` which prioritises
  // navigator.sendBeacon → fetch keepalive over the regular Plausible
  // script. This survives unload / background-kill where the script-based
  // track() would have its in-flight request aborted.
  //
  // Per-instance `sessionEndedRef` guarantees no duplicate fire across
  // the three triggers (whichever runs first wins).
  const sessionEndedRef = React.useRef<boolean>(false);
  React.useEffect(() => {
    sessionEndedRef.current = false;

    const buildPayload = () => ({
      depth: sessionDepthRef.current,
      // Plausible EventProps disallow null/undefined · coerce "no capsule
      // shown this session" → empty string. Dashboard can filter on
      // last_capsule_id != "" to count sessions that rendered something.
      last_capsule_id: lastShownIdRef.current ?? "",
      loop_used: sessionDepthRef.current > 1,
    });

    const emitOnce = () => {
      if (sessionEndedRef.current) return;
      sessionEndedRef.current = true;
      trackUnloadSafe("capsule_session_ended", buildPayload());
    };

    const onPageHide = () => emitOnce();
    const onVisibilityChange = () => {
      // visibilitychange fires when the user backgrounds the tab / switches
      // apps. Treating this as a session-end signal is intentional · the
      // user has effectively left, and mobile Safari may never fire pagehide
      // if the OS kills the tab in background. sessionEndedRef dedupes if
      // the user comes back and the cleanup later fires.
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        emitOnce();
      }
    };

    window.addEventListener("pagehide", onPageHide);
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisibilityChange);
    }

    return () => {
      window.removeEventListener("pagehide", onPageHide);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibilityChange);
      }
      // PROD only · synchronous emit on real unmount. Skipping in dev
      // sidesteps StrictMode double-invoke without needing a defer window
      // or module-level coordination.
      if (!_IS_PROD) return;
      emitOnce();
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    // P0.6 · client-side timeout. AbortController is passed to BOTH
    // primary and quality-retry fetches. On timeout, fetch rejects with
    // AbortError → fetchCapsuleResponse returns system_unavailable →
    // user sees recovery surface instead of infinite spinner.
    const controller = new AbortController();
    const timeoutId = window.setTimeout(
      () => controller.abort(),
      _PRIMARY_TIMEOUT_MS,
    );
    setResponse(null);

    (async () => {
      // First attempt · effective radius (user-controlled).
      const primary = await fetchCapsuleResponse(lat, lng, effectiveRadius, {
        signal: controller.signal,
      });
      if (cancelled) return;

      // Phase 14.5 quality guard · if backend returned "success" but
      // the capsule looks weak (supermercado / gasolinera / generic
      // street), transparently retry once with a larger radius before
      // showing anything. The user just sees a slightly longer build
      // state, not the weak capsule.
      if (
        primary.state === "success" &&
        primary.capsule &&
        effectiveRadius < _QUALITY_RETRY_RADIUS_M
      ) {
        const signal = inspectCapsuleQuality(primary.capsule);
        if (signal.weak) {
          track("capsule_quality_retry", {
            reason: signal.reason,
            primary_title: primary.capsule.title.slice(0, 80),
            primary_radius_m: effectiveRadius,
            retry_radius_m: _QUALITY_RETRY_RADIUS_M,
          });
          const retry = await fetchCapsuleResponse(
            lat,
            lng,
            _QUALITY_RETRY_RADIUS_M,
            { signal: controller.signal },
          );
          if (cancelled) return;

          // Keep the retry only if it's a non-weak success. Otherwise
          // fall back to the primary · a weak named capsule still
          // beats an empty_zone for first-session WOW.
          if (
            retry.state === "success" &&
            retry.capsule &&
            !inspectCapsuleQuality(retry.capsule).weak
          ) {
            track("capsule_quality_retry_kept");
            setResponse(retry);
            return;
          }
          track("capsule_quality_retry_discarded", {
            retry_state: retry.state,
          });
        }
      }

      setResponse(primary);
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [lat, lng, effectiveRadius, retryNonce]);

  // ----- Recovery callbacks wired to CapsuleEmptyZone --------------
  // P0.6 · debounce rage taps on Retry / Expand. Each tap normally
  // cancels in-flight + restarts · spam taps generate fetch storms and
  // burn through the backend's 10/min/IP ratelimit. 600ms guard kills
  // spam without affecting real-user retry cadence.
  //
  // Phase 14.13 BUG FIX · also call queue.reset() inside the recovery
  // handlers. Without this, if backend was briefly down on initial mount,
  // queue probes exhausted their budget (probeExhaustedRef = true) AND
  // the queue stays permanently dead for the rest of the session even
  // after primary recovers. User taps "Otra cápsula" → picker fallback
  // forever. Resetting on user-initiated retry re-enables probing.
  // queue.reset() is stable (useCallback []) so deps don't churn.
  const _lastRetryAt = React.useRef<number>(0);
  const handleRetry = React.useCallback(() => {
    const now = Date.now();
    if (now - _lastRetryAt.current < _RETRY_DEBOUNCE_MS) return;
    _lastRetryAt.current = now;
    // Re-enable queue probes (in case they exhausted during a degraded
    // backend window that the user is now explicitly retrying past).
    queue.reset();
    // Same coords + same radius. Forces a fresh fetch (e.g., transient
    // 429 or network blip).
    setRetryNonce((n) => n + 1);
  }, [queue.reset]);

  const handleExpand = React.useCallback(() => {
    const now = Date.now();
    if (now - _lastRetryAt.current < _RETRY_DEBOUNCE_MS) return;
    _lastRetryAt.current = now;
    // Re-enable queue probes · expanded search radius may also surface
    // new candidates that previously-failed probes missed.
    queue.reset();
    // Larger radius (capped). If already at cap, this becomes a retry.
    setEffectiveRadius((r) => Math.min(r + EXPAND_STEP_M, MAX_RADIUS_M));
    setRetryNonce((n) => n + 1);
  }, [queue.reset]);

  const handleManual = React.useCallback(() => {
    setPickerOpen(true);
  }, []);

  const handlePick = React.useCallback(
    (coords: { lat: number; lng: number }) => {
      setPickerOpen(false);
      if (onManualCoordsPicked) {
        onManualCoordsPicked(coords);
      }
    },
    [onManualCoordsPicked],
  );

  // Phase 14.7 · "Otra cápsula" handler · queue-first, picker-fallback.
  // Queue pop returns null when empty (cold start, depleted, disabled);
  // we degrade gracefully to the existing manual flow so the loop CTA
  // is never a dead button. The queue hook emits queue_hit/queue_miss
  // telemetry · CapsuleSuccess already emits loop_action action="next"
  // ahead of this call, so the two events bracket the outcome cleanly.
  const handleNext = React.useCallback(() => {
    // Phase 14.8 · capture queue size at click time (before pop). Used
    // by capsule_next_clicked.queue_size_before and to derive
    // capsule_next_served.queue_size_after = sizeBefore - 1.
    const sizeBefore = queueSizeRef.current;
    const source: "queue" | "manual_fallback" =
      sizeBefore > 0 ? "queue" : "manual_fallback";
    track("capsule_next_clicked", {
      source,
      queue_size_before: sizeBefore,
    });

    const popped = queue.pop();
    if (popped) {
      // INSTANT swap · no network wait, no loading state. Atmosphere
      // layer keeps running (no remount of CapsuleSession). The next
      // primaryCapsuleId derivation will pick this up and the queue
      // hook will refill in the background.
      track("capsule_next_served", {
        queue_size_after: Math.max(0, sizeBefore - 1),
      });
      setResponse(popped);
      return;
    }
    // Cold start or queue depleted · fall back to manual picker so
    // the user still has a forward path. Only available when the
    // parent (CapsuleEntry) wired onManualCoordsPicked.
    if (onManualCoordsPicked) {
      setPickerOpen(true);
    }
  }, [queue.pop, onManualCoordsPicked]);

  // Disable "expand" when we've already hit the backend cap.
  const expandAvailable = effectiveRadius < MAX_RADIUS_M;

  // "Otra cápsula" surfaces whenever EITHER the queue has items OR
  // the manual fallback is wired. Pop logic handles both internally.
  const nextAvailable = queue.size > 0 || Boolean(onManualCoordsPicked);

  return (
    <>
      <CapsuleStateRouter
        response={response}
        onRetry={handleRetry}
        onExpand={expandAvailable ? handleExpand : undefined}
        onManual={onManualCoordsPicked ? handleManual : undefined}
        onNext={nextAvailable ? handleNext : undefined}
        lat={lat}
        lng={lng}
      />
      <ManualLocationPicker
        open={pickerOpen}
        onPick={handlePick}
        onClose={() => setPickerOpen(false)}
      />
    </>
  );
}
