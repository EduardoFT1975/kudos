"use client";

/**
 * KUDOS Experience · <CapsuleEntry /> (Phase 13 + Phase 14.5 recovery).
 *
 * Top-level entry component for the real product loop. Composes
 * geolocation acquisition + capsule session into a single mount.
 *
 * State machine:
 *
 *   geo.pending                  → CapsuleBuildingContext
 *   geo.ready + fetch.pending    → CapsuleBuildingContext (via Session)
 *   geo.ready + fetch.done       → CapsuleStateRouter routes by response
 *   geo.denied/unavailable/timeout → CapsuleGeolocationDenied (recovery)
 *
 * Phase 14.5 recovery additions:
 *   - Geo failures no longer dead-end into silent empty_zone. They
 *     route to CapsuleGeolocationDenied with two CTAs:
 *       · Reintentar permiso · re-mounts the geolocation flow
 *       · Elegir ubicación   · opens ManualLocationPicker
 *   - Internal `manualCoordsState` lets the picker take over the
 *     session without a route change.
 *   - `propManualCoords` (legacy prop) still bypasses geolocation
 *     for demo / fixed-coord embeds.
 *
 * Telemetry:
 *   page_view_aqui · mode ∈ {geolocation, manual_coords}
 *   capsule_entry_geo_failure · status (denied/unavailable/timeout)
 *                               · attempt (retry counter)
 */
import * as React from "react";
import { CapsuleSession } from "./CapsuleSession";
import { CapsuleBuildingContext } from "./states/CapsuleBuildingContext";
import { CapsuleGeolocationDenied } from "./states/CapsuleGeolocationDenied";
import { CapsulePermissionGate } from "./states/CapsulePermissionGate";
import { ManualLocationPicker } from "./ManualLocationPicker";
import { useGeolocation } from "@/hooks/useGeolocation";
import { track } from "@/lib/analytics/plausible";

interface CapsuleEntryProps {
  /** Default capsule search radius in meters. Pipeline cap 5000. */
  radiusM?: number;
  /** Optional override · skips browser geolocation entirely. */
  manualCoords?: { lat: number; lng: number };
}

export function CapsuleEntry({
  radiusM,
  manualCoords: propManualCoords,
}: CapsuleEntryProps = {}) {
  // User-picked coords (via ManualLocationPicker). Overrides geolocation
  // for the rest of the session. propManualCoords (if passed) still
  // wins · it represents an intentional demo / embed configuration.
  const [pickedCoords, setPickedCoords] = React.useState<
    { lat: number; lng: number } | null
  >(null);

  // Permission retry counter · incrementing this remounts the geo
  // sub-component via key, which re-runs useGeolocation's effect and
  // triggers a fresh permission prompt (only effective if the user has
  // unblocked the permission at the OS / browser level in the interim).
  const [permissionAttempt, setPermissionAttempt] = React.useState(0);

  // Picker overlay state · owned at the entry level so the geo-denied
  // path can open it. CapsuleSession owns its own picker instance for
  // the empty-zone recovery path · they're never both open because
  // the user can only be in one of those states at a time.
  const [pickerOpen, setPickerOpen] = React.useState(false);

  // Phase P0.5 · pre-permission gate state. Default false so the gate
  // is the FIRST surface on every fresh `/aqui` mount. Once the user
  // explicitly taps "Activar mi lugar", `gateAccepted` flips to true
  // for the rest of the session and GeolocationFlow mounts. Manual-
  // coords path (propManualCoords OR pickedCoords) implicitly bypasses
  // the gate · those callers know what they want.
  const [gateAccepted, setGateAccepted] = React.useState(false);

  const activeManualCoords = propManualCoords ?? pickedCoords;

  // P0.6 telemetry · page_view_aqui dedup. Previous behavior fired on
  // every mount (including bare gate display) AND re-fired when
  // activeManualCoords changed · producing TWO events for users who
  // landed → picked city. Now fires exactly when session ACTUALLY begins
  // (gate accepted OR manual coords set), once per mode transition.
  // Gate-only landing is captured by permission_gate_shown.
  const lastFiredModeRef = React.useRef<"geolocation" | "manual_coords" | null>(null);
  React.useEffect(() => {
    let currentMode: "geolocation" | "manual_coords" | null = null;
    if (activeManualCoords) currentMode = "manual_coords";
    else if (gateAccepted) currentMode = "geolocation";

    if (currentMode && currentMode !== lastFiredModeRef.current) {
      lastFiredModeRef.current = currentMode;
      track("page_view_aqui", { mode: currentMode });
    }
  }, [gateAccepted, activeManualCoords]);

  const handlePickerPick = React.useCallback(
    (coords: { lat: number; lng: number }) => {
      setPickerOpen(false);
      setPickedCoords(coords);
    },
    [],
  );

  // P0.6 · debounce rage taps on "Reintentar permiso". Without this,
  // a spam-tap user fires N permissionAttempt increments → N
  // GeolocationFlow remounts → N useGeolocation effect runs in
  // milliseconds. Browser-level deny is instant so each cycle blinks
  // the screen. 600ms guard preserves real-user retries while killing
  // spam.
  const _lastRetryPermissionAt = React.useRef<number>(0);
  const handleRetryPermission = React.useCallback(() => {
    const now = Date.now();
    if (now - _lastRetryPermissionAt.current < 600) return;
    _lastRetryPermissionAt.current = now;
    setPermissionAttempt((n) => n + 1);
  }, []);

  // Manual coords branch · skip geolocation entirely.
  if (activeManualCoords) {
    return (
      <CapsuleSession
        lat={activeManualCoords.lat}
        lng={activeManualCoords.lng}
        radiusM={radiusM}
        onManualCoordsPicked={setPickedCoords}
      />
    );
  }

  // Phase P0.5 · pre-permission gate. Renders BEFORE GeolocationFlow,
  // which means useGeolocation is never called until the user explicitly
  // taps "Activar mi lugar". Browser permission prompt is gated behind
  // a user gesture · no more ambush prompts on cold load.
  if (!gateAccepted) {
    return (
      <>
        <CapsulePermissionGate
          onActivate={() => setGateAccepted(true)}
          onPickManual={() => setPickerOpen(true)}
        />
        <ManualLocationPicker
          open={pickerOpen}
          onPick={handlePickerPick}
          onClose={() => setPickerOpen(false)}
        />
      </>
    );
  }

  return (
    <>
      <GeolocationFlow
        // Re-mount on retry · re-runs useGeolocation effect cleanly.
        key={permissionAttempt}
        attempt={permissionAttempt}
        radiusM={radiusM}
        onPickManual={() => setPickerOpen(true)}
        onRetryPermission={handleRetryPermission}
        onManualCoordsPicked={setPickedCoords}
      />
      <ManualLocationPicker
        open={pickerOpen}
        onPick={handlePickerPick}
        onClose={() => setPickerOpen(false)}
      />
    </>
  );
}

// ----------------------------------------------------------------------------
// GeolocationFlow · the part that actually calls useGeolocation. Kept
// as a sub-component so it can be re-mounted by key when the user clicks
// "Reintentar permiso" · this is the cleanest way to re-run a hook's
// internal useEffect without leaking re-trigger machinery into the hook.
// ----------------------------------------------------------------------------
interface GeolocationFlowProps {
  attempt: number;
  radiusM?: number;
  onPickManual: () => void;
  onRetryPermission: () => void;
  onManualCoordsPicked: (coords: { lat: number; lng: number }) => void;
}

function GeolocationFlow({
  attempt,
  radiusM,
  onPickManual,
  onRetryPermission,
  onManualCoordsPicked,
}: GeolocationFlowProps) {
  const geo = useGeolocation();

  // Telemetry · surface the UX-level geo failure (separate from the
  // hook-level events which fire for every status transition).
  React.useEffect(() => {
    if (
      geo.status === "denied" ||
      geo.status === "unavailable" ||
      geo.status === "timeout"
    ) {
      track("capsule_entry_geo_failure", {
        status: geo.status,
        attempt,
      });
    }
  }, [geo.status, attempt]);

  if (geo.status === "pending") {
    return <CapsuleBuildingContext />;
  }

  if (
    geo.status === "ready" &&
    typeof geo.lat === "number" &&
    typeof geo.lng === "number"
  ) {
    return (
      <CapsuleSession
        lat={geo.lat}
        lng={geo.lng}
        radiusM={radiusM}
        onManualCoordsPicked={onManualCoordsPicked}
      />
    );
  }

  // denied / unavailable / timeout · all route to the guided recovery
  // surface. The user sees the same affordances regardless of the
  // specific failure mode (no leaked taxonomy).
  return (
    <CapsuleGeolocationDenied
      onRetryPermission={onRetryPermission}
      onPickManual={onPickManual}
    />
  );
}
