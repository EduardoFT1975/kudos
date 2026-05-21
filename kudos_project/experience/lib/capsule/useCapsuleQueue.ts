"use client";

/**
 * KUDOS Experience · useCapsuleQueue (Phase 14.7 loop frictionless).
 *
 * Session-local capsule queue that preloads nearby alternative
 * candidates in the background so "Otra cápsula" lands an INSTANT
 * render instead of opening the manual picker.
 *
 * Strategy:
 *   1. Anchor on (centerLat, centerLng) · the user's geolocation OR
 *      a manually-picked city. Anchor never moves on pop · all probes
 *      stay relative to the user's home for this session.
 *   2. Probe a pentagon ring (5 bearings) of nearby coords. Three
 *      progressive ring distances (1000m / 2000m / 3000m) so the
 *      queue can pull from increasingly broader scopes if the inner
 *      ring runs dry. Total budget 15 probe locations.
 *   3. Each probe uses a SMALL radius (800m default) so it's likely
 *      to surface a landmark distinct from the primary capsule's
 *      catchment, not just re-rank the same one.
 *   4. Filter aggressively. Only keep results that are: state=success,
 *      capsule present, id != primary id, not already queued, and
 *      not flagged weak by inspectCapsuleQuality.
 *   5. Target queue size 4. Stop probing when reached. Refill triggers
 *      automatically when the consumer pops below target.
 *
 * Fail-safe rules:
 *   - All probe fetches use fetchCapsuleResponse({silent: true}) so the
 *     telemetry dashboard isn't flooded with phantom user-style events.
 *   - Network errors are swallowed silently per probe (the primary
 *     capsule layer already provides UX safety nets).
 *   - On coord change / unmount, AbortController kills in-flight HTTP
 *     and pending results are discarded via a local cancelled flag.
 *
 * Queue-only telemetry (visible to founder dashboard):
 *   queue_probe_completed · {state, kept (bool)}  · one per probe
 *   queue_hit             · {size_before, depth} · consumer pop succeeded
 *   queue_miss            · {reason: "empty" | "disabled"} · pop failed
 *
 * The hook does NOT emit queue_action="next" itself · that signal lives
 * with the consumer's loop_action event (CapsuleSuccess) so the existing
 * funnel slice remains correct.
 */
import * as React from "react";
import {
  fetchCapsuleResponse,
} from "@/lib/api/capsules";
import { inspectCapsuleQuality } from "@/lib/capsule/quality";
import { track } from "@/lib/analytics/plausible";
import type { CapsuleResponse } from "@/types/capsule-state";

export interface UseCapsuleQueueOptions {
  centerLat: number;
  centerLng: number;
  /** Currently-displayed capsule id · used to exclude from queue.
   *  Pass null while the primary is still loading · the hook waits. */
  primaryCapsuleId: string | null;
  /** Disable entirely · returns an inert queue. Useful when the parent
   *  cannot guarantee callbacks for pop fallback. */
  enabled?: boolean;
  /** Target queue length. Default 4 (spec target 3-5). */
  targetSize?: number;
  /** Probe fetch radius in meters · small to surface DIFFERENT
   *  landmarks. Default 800m. */
  probeRadiusM?: number;
  /** Base ring distance · the inner ring of probe coords sits this far
   *  from anchor. Outer rings = 2× and 3× this distance. Default 1000m. */
  ringRadiusM?: number;
}

export interface CapsuleQueueHandle {
  /** Current number of ready capsules · drives UI hints if desired. */
  size: number;
  /** Pop the head of the queue. Returns null when empty. Emits
   *  queue_hit (on success) or queue_miss (on empty). */
  pop: () => CapsuleResponse | null;
  /** Force an immediate reset (e.g., manual flush before manual pick). */
  reset: () => void;
}

const _DEFAULT_TARGET = 4;
const _DEFAULT_PROBE_RADIUS = 800;
const _DEFAULT_RING_RADIUS = 1000;
const _RING_MULTIPLIERS: readonly number[] = [1, 2, 3];
const _PROBE_BEARINGS_DEG: readonly number[] = [0, 72, 144, 216, 288];

const _EARTH_RADIUS_M = 6_378_137;

/**
 * Standard great-circle destination formula. Returns {lat, lng} after
 * traveling `distanceM` along `bearingDeg` from origin.
 *
 * Math validated against geodetic references · accurate to <1m at
 * city-scale distances (we're using 1-3km). No external dependency.
 */
function _offsetCoords(
  lat: number,
  lng: number,
  distanceM: number,
  bearingDeg: number,
): { lat: number; lng: number } {
  const bearing = (bearingDeg * Math.PI) / 180;
  const angDist = distanceM / _EARTH_RADIUS_M;
  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180;

  const lat2 = Math.asin(
    Math.sin(latRad) * Math.cos(angDist) +
      Math.cos(latRad) * Math.sin(angDist) * Math.cos(bearing),
  );
  const lng2 =
    lngRad +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angDist) * Math.cos(latRad),
      Math.cos(angDist) - Math.sin(latRad) * Math.sin(lat2),
    );
  return {
    lat: (lat2 * 180) / Math.PI,
    // Normalize longitude to [-180, 180]
    lng: (((lng2 * 180) / Math.PI + 540) % 360) - 180,
  };
}

/** Probe coordinates listed in order · inner ring first, then expand. */
function _probePlan(
  centerLat: number,
  centerLng: number,
  ringRadiusM: number,
): { lat: number; lng: number }[] {
  const plan: { lat: number; lng: number }[] = [];
  for (const mul of _RING_MULTIPLIERS) {
    for (const bearing of _PROBE_BEARINGS_DEG) {
      plan.push(_offsetCoords(centerLat, centerLng, ringRadiusM * mul, bearing));
    }
  }
  return plan;
}

export function useCapsuleQueue(
  opts: UseCapsuleQueueOptions,
): CapsuleQueueHandle {
  const {
    centerLat,
    centerLng,
    primaryCapsuleId,
    enabled = true,
    targetSize = _DEFAULT_TARGET,
    probeRadiusM = _DEFAULT_PROBE_RADIUS,
    ringRadiusM = _DEFAULT_RING_RADIUS,
  } = opts;

  // Ref holds the canonical queue · the state mirror exists only to
  // notify consumers when size changes. The ref is the source of truth
  // for in-effect logic that needs current snapshot mid-loop.
  const queueRef = React.useRef<CapsuleResponse[]>([]);
  const [queueSize, setQueueSize] = React.useState<number>(0);

  // Probe cursor + exhaustion flag persist across refill cycles so we
  // don't re-probe the same coordinates. Reset only on coord change.
  const probeCursorRef = React.useRef<number>(0);
  const probeExhaustedRef = React.useRef<boolean>(false);

  // Phase P0.5 warmup · since probes can now begin BEFORE primary
  // resolves, primaryCapsuleId may be null when keep-check runs · so
  // a single-value exclusion is insufficient. Track ALL capsule ids
  // the user has been shown this session (primary + each pop) and
  // exclude them from probe results. Reset on coord change.
  const shownIdsRef = React.useRef<Set<string>>(new Set());

  // Reset everything on anchor change (user picked a different city,
  // geolocation re-resolved, manual coords override, etc.). Ordered
  // before the probe effect so the probe effect sees clean state.
  React.useEffect(() => {
    queueRef.current = [];
    setQueueSize(0);
    probeCursorRef.current = 0;
    probeExhaustedRef.current = false;
    shownIdsRef.current = new Set();
  }, [centerLat, centerLng]);

  // Phase P0.5 warmup · when primaryCapsuleId transitions to a real
  // id (after primary fetch lands, or after a queue-pop swaps in a
  // new capsule), add it to the shown set AND purge any matching
  // entry from the queue (in case a parallel probe surfaced the same
  // capsule we're now displaying). Idempotent · purge is a no-op
  // when no match found.
  React.useEffect(() => {
    if (!primaryCapsuleId) return;
    shownIdsRef.current.add(primaryCapsuleId);
    const filtered = queueRef.current.filter(
      (q) => q.capsule && !shownIdsRef.current.has(q.capsule.id),
    );
    if (filtered.length !== queueRef.current.length) {
      queueRef.current = filtered;
      setQueueSize(filtered.length);
    }
  }, [primaryCapsuleId]);

  // Background probe loop. Runs whenever:
  //   - enabled is true
  //   - queue is below target AND probe budget not exhausted
  //
  // Phase P0.5 warmup · the previous `if (!primaryCapsuleId) return`
  // gate was REMOVED so probes begin in parallel with the primary
  // fetch. This eliminates the cold-start window where the user's
  // first "Otra cápsula" tap fell through to the picker because the
  // queue hadn't started filling yet. Correctness is preserved by:
  //   - keep-check using shownIdsRef (covers primary even when null)
  //   - purge effect (above) that cleans matches on primary land
  //
  // Cleanup aborts any in-flight HTTP and sets a local cancelled flag
  // so late results are dropped.
  React.useEffect(() => {
    if (!enabled) return;
    if (queueSize >= targetSize) return;
    if (probeExhaustedRef.current) return;

    const plan = _probePlan(centerLat, centerLng, ringRadiusM);
    const controller = new AbortController();
    let cancelled = false;

    const runOneProbe = async (): Promise<void> => {
      if (cancelled) return;
      if (queueRef.current.length >= targetSize) return;
      if (probeCursorRef.current >= plan.length) {
        probeExhaustedRef.current = true;
        return;
      }
      const coords = plan[probeCursorRef.current];
      probeCursorRef.current += 1;

      const resp = await fetchCapsuleResponse(
        coords.lat,
        coords.lng,
        probeRadiusM,
        { silent: true, signal: controller.signal },
      );
      if (cancelled) return;

      // Decide whether to keep this result. Failure modes are silent:
      // we don't surface bad probes anywhere · just skip and try next.
      // Phase P0.5 · uses shownIdsRef instead of single primaryCapsuleId
      // because probes can now arrive BEFORE primary lands (warmup).
      const keep =
        resp.state === "success" &&
        resp.capsule !== null &&
        !shownIdsRef.current.has(resp.capsule.id) &&
        !queueRef.current.some((q) => q.capsule?.id === resp.capsule?.id) &&
        !inspectCapsuleQuality(resp.capsule).weak;

      track("queue_probe_completed", {
        state: resp.state,
        kept: keep,
      });

      if (keep) {
        queueRef.current = [...queueRef.current, resp];
        setQueueSize(queueRef.current.length);
      }
    };

    // Drive the loop sequentially · two probes in parallel would
    // saturate browser connection limits during a still-active primary
    // session. The user can read the capsule while we slowly fill.
    const drive = async () => {
      while (
        !cancelled &&
        queueRef.current.length < targetSize &&
        probeCursorRef.current < plan.length
      ) {
        try {
          await runOneProbe();
        } catch {
          // Defensive · runOneProbe is already try/catch internally
          // via fetchCapsuleResponse, but guard against unexpected
          // throws so the loop doesn't die mid-session.
        }
        if (cancelled) return;
        // Small idle yield between probes · keeps main thread breathing
        // and lets the primary capsule's fetch / render complete first.
        await new Promise<void>((resolve) =>
          window.setTimeout(resolve, 250),
        );
      }
      if (
        !cancelled &&
        probeCursorRef.current >= plan.length &&
        queueRef.current.length < targetSize
      ) {
        probeExhaustedRef.current = true;
      }
    };

    drive();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [
    enabled,
    // Phase P0.5 · primaryCapsuleId intentionally REMOVED from deps.
    // The probe loop reads shownIdsRef.current (mutable ref · always
    // current at probe-resolve time), so it doesn't need to restart
    // when primary lands. Avoids one wasted in-flight probe per
    // primary-land cycle.
    centerLat,
    centerLng,
    queueSize,
    targetSize,
    probeRadiusM,
    ringRadiusM,
  ]);

  const pop = React.useCallback((): CapsuleResponse | null => {
    if (!enabled) {
      track("queue_miss", { reason: "disabled" });
      return null;
    }
    if (queueRef.current.length === 0) {
      track("queue_miss", { reason: "empty" });
      return null;
    }
    const [head, ...rest] = queueRef.current;
    const sizeBefore = queueRef.current.length;
    queueRef.current = rest;
    setQueueSize(rest.length);
    track("queue_hit", {
      size_before: sizeBefore,
      depth: sizeBefore - rest.length,
    });
    return head;
  }, [enabled]);

  const reset = React.useCallback(() => {
    queueRef.current = [];
    setQueueSize(0);
    probeCursorRef.current = 0;
    probeExhaustedRef.current = false;
  }, []);

  // Stable handle · object identity only changes when queueSize does.
  // pop / reset are useCallback-stable; folding them into a memoized
  // object means consumers that depend on the whole handle don't
  // re-render on every parent render. Public shape unchanged.
  return React.useMemo<CapsuleQueueHandle>(
    () => ({ size: queueSize, pop, reset }),
    [queueSize, pop, reset],
  );
}
