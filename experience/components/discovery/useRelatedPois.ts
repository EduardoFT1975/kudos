"use client";
/**
 * KUDOS · hook useRelatedPois.
 *
 * Carga el manifest de relationships (offline · público) y devuelve
 * los POIs relacionados con un POI dado.
 *
 * Cuando exista API v2 con POIRelationship en BD, puede consumir
 * /api/pois/{id}/related en lugar del manifest.
 */
import * as React from "react";


export interface RelatedPoi {
  id: string;
  type: "geographical" | "thematic" | "historical" | "temporal";
  weight: number;
  distance_km?: number;
}


let _cache: Record<string, RelatedPoi[]> | null = null;
let _loading: Promise<any> | null = null;


async function loadIndex(): Promise<Record<string, RelatedPoi[]>> {
  if (_cache) return _cache;
  if (_loading) { await _loading; return _cache || {}; }
  _loading = fetch("/data/relationships/index.json", { cache: "force-cache" })
    .then((r) => r.ok ? r.json() : null)
    .then((j) => {
      _cache = (j && j.relationships) || {};
      return _cache;
    })
    .catch(() => { _cache = {}; return _cache; });
  await _loading;
  return _cache || {};
}


export function useRelatedPois(poiId: string | null | undefined, limit: number = 6) {
  const [related, setRelated] = React.useState<RelatedPoi[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!poiId) { setRelated([]); setLoading(false); return; }
    setLoading(true);
    loadIndex().then((idx) => {
      const list = idx[poiId] || [];
      setRelated(list.slice(0, limit));
      setLoading(false);
    });
  }, [poiId, limit]);

  return { related, loading };
}
