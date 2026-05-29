"use client";
/**
 * KUDOS HDG · Hook captura automática Discovery Signals.
 *
 * Usar dentro de cualquier componente que muestre POIs:
 *   useDiscoverySignals(visiblePoiIds, activePoiId);
 *
 * Auto-dispara:
 *   - Track.poiView cuando un POI entra en lista visible (1 vez por sesión)
 *   - Track.nodeOpen cuando activePoiId cambia
 *   - exploration_chain · mantiene secuencia de POIs explorados
 */
import * as React from "react";
import { trackEvent, Track } from "./kudosTelemetry";


export function useDiscoverySignals(visibleIds: string[], activeId: string | null) {
  const seenRef = React.useRef<Set<string>>(new Set());
  const chainRef = React.useRef<string[]>([]);
  const lastActiveRef = React.useRef<string | null>(null);

  // POI views (1 vez por POI por sesión)
  React.useEffect(() => {
    for (const id of visibleIds) {
      if (!seenRef.current.has(id)) {
        seenRef.current.add(id);
        Track.poiView(id);
      }
    }
  }, [visibleIds]);

  // Node open + exploration chain
  React.useEffect(() => {
    if (activeId && activeId !== lastActiveRef.current) {
      lastActiveRef.current = activeId;
      chainRef.current.push(activeId);
      if (chainRef.current.length > 20) chainRef.current.shift();

      Track.nodeOpen(activeId);

      // Si la cadena es >= 3 · disparar exploration_depth (cumulative)
      if (chainRef.current.length >= 3) {
        trackEvent({
          event: "exploration_depth",
          poi_id: activeId,
          exploration_chain: [...chainRef.current],
        });
      }
    }
  }, [activeId]);
}
