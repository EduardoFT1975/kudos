"use client";
/**
 * KUDOS HDG · hook useTimeOnScreen.
 *
 * Captura duración_ms que el usuario pasa en una pantalla.
 * Dispara al unmount o al cambiar de ruta.
 */
import * as React from "react";
import { trackEvent } from "./kudosTelemetry";


export function useTimeOnScreen(eventName: string, poiId?: string) {
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const t0 = performance.now();
    return () => {
      const duration_ms = Math.round(performance.now() - t0);
      if (duration_ms < 500) return;       // <500ms · sin valor
      trackEvent({ event: eventName, poi_id: poiId, duration_ms });
    };
  }, [eventName, poiId]);
}
