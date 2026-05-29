"use client";
/**
 * KUDOS · hook useNarratives.
 *
 * Carga manifest de narratives (estático). Cache en memoria.
 * Cuando no haya narrativas para un POI, devuelve fallback por categoría.
 */
import * as React from "react";


export interface Narrative {
  title: string;
  hook: string;
  type: string;       // Hidden Truth | Human Story | Transformation | Mystery | Lost World | Present Connection
  duration_s: number;
  emotion: string;
}


let _cache: Record<string, Narrative[]> | null = null;
let _loading: Promise<any> | null = null;


async function loadIndex(): Promise<Record<string, Narrative[]>> {
  if (_cache) return _cache;
  if (_loading) { await _loading; return _cache || {}; }
  _loading = fetch("/data/narratives/index.json", { cache: "force-cache" })
    .then((r) => r.ok ? r.json() : null)
    .then((j) => {
      _cache = (j && j.narratives) || {};
      return _cache;
    })
    .catch(() => { _cache = {}; return _cache; });
  await _loading;
  return _cache || {};
}


export function useNarratives(poiId: string | null | undefined) {
  const [narratives, setNarratives] = React.useState<Narrative[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!poiId) { setNarratives([]); setLoading(false); return; }
    setLoading(true);
    loadIndex().then((idx) => {
      setNarratives(idx[poiId] || []);
      setLoading(false);
    });
  }, [poiId]);

  return { narratives, loading };
}


// Iconos por tipo
export const TYPE_ICON: Record<string, string> = {
  "Hidden Truth":       "🔎",
  "Human Story":        "👤",
  "Transformation":     "⚙",
  "Mystery":            "❓",
  "Lost World":         "🏛",
  "Present Connection": "💭",
};
