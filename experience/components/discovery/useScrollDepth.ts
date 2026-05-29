"use client";
/**
 * KUDOS HDG · hook useScrollDepth.
 *
 * Captura automáticamente la profundidad de scroll del usuario.
 * Dispara Track.scrollDepth cuando se alcanzan thresholds (25%, 50%, 75%, 100%).
 * 1 dispatch por threshold por sesión · evita spam.
 */
import * as React from "react";
import { trackEvent } from "./kudosTelemetry";


const THRESHOLDS = [0.25, 0.5, 0.75, 1.0];


export function useScrollDepth(poiId?: string) {
  const firedRef = React.useRef<Set<number>>(new Set());

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    function onScroll() {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      if (max <= 0) return;
      const depth = window.scrollY / max;
      for (const t of THRESHOLDS) {
        if (depth >= t && !firedRef.current.has(t)) {
          firedRef.current.add(t);
          trackEvent({
            event: "scroll_depth",
            poi_id: poiId,
            scroll_depth: t,
          });
        }
      }
    }
    let timer: number | undefined;
    function throttled() {
      if (timer) return;
      timer = window.setTimeout(() => { onScroll(); timer = undefined; }, 250);
    }
    window.addEventListener("scroll", throttled, { passive: true });
    return () => {
      window.removeEventListener("scroll", throttled);
      if (timer) window.clearTimeout(timer);
    };
  }, [poiId]);
}
