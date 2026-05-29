"use client";
/**
 * KUDOS HDG · hook useSignals.
 *
 * Lee /api/signals/{poi_id} del Capsule Engine v2.
 * Devuelve los 5 scores agregados del Human Discovery Graph:
 *   - discovery_score  (cuánto la humanidad descubre)
 *   - importance_score (cuánto la gente lo guarda con motivación)
 *   - memory_score     (cuánto persiste en el tiempo)
 *   - emotion_score    (intensidad emocional agregada)
 *   - future_value_score (% saves con "quiero visitarlo")
 *
 * Fallback heurístico cuando API no responde, basado en hash del poi_id
 * y POIs legendarios conocidos (para que la UI nunca quede vacía en demo).
 */
import * as React from "react";


const API = process.env.NEXT_PUBLIC_KUDOS_API_URL || "";


export interface PoiSignalsData {
  poi_id: string;
  discovery_score: number;
  importance_score: number;
  memory_score: number;
  emotion_score: number;
  future_value_score: number;
  emotion_profile: Record<string, number>;
  total_views: number;
  total_saves: number;
  total_visits: number;
  total_resonances: number;
  last_signal_at: string | null;
  updated_at: string;
  // marcador para distinguir datos reales vs fallback
  _source: "api" | "fallback";
}


// POIs legendarios con scores muy altos (heurística cuando API offline)
const LEGENDARY_SCORES: Record<string, Partial<PoiSignalsData>> = {
  "wd-Q10285":  { discovery_score: 95, importance_score: 92, memory_score: 88, emotion_score: 90, future_value_score: 86 }, // Coliseo
  "wd-Q12892":  { discovery_score: 93, importance_score: 89, memory_score: 85, emotion_score: 88, future_value_score: 92 }, // Alhambra
  "wd-Q131013": { discovery_score: 96, importance_score: 94, memory_score: 91, emotion_score: 92, future_value_score: 89 }, // Acrópolis
  "wd-Q12506":  { discovery_score: 94, importance_score: 91, memory_score: 87, emotion_score: 93, future_value_score: 90 }, // Sagrada Familia
  "wd-Q2981":   { discovery_score: 92, importance_score: 90, memory_score: 86, emotion_score: 89, future_value_score: 84 }, // Notre-Dame
  "wd-Q243":    { discovery_score: 90, importance_score: 88, memory_score: 84, emotion_score: 87, future_value_score: 91 }, // Torre Eiffel
  "wd-Q1410":   { discovery_score: 88, importance_score: 85, memory_score: 82, emotion_score: 86, future_value_score: 88 }, // Foro Romano
};


function hashScore(poiId: string, salt: string, min: number, max: number): number {
  let h = 0;
  const s = poiId + ":" + salt;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i);
  const norm = Math.abs(h) % 1000 / 1000;
  return Math.round(min + norm * (max - min));
}


function fallbackSignals(poiId: string): PoiSignalsData {
  const legendary = LEGENDARY_SCORES[poiId] || {};
  const discovery = legendary.discovery_score ?? hashScore(poiId, "discovery", 35, 78);
  const importance = legendary.importance_score ?? hashScore(poiId, "importance", 30, 75);
  const memory = legendary.memory_score ?? hashScore(poiId, "memory", 25, 70);
  const emotion = legendary.emotion_score ?? hashScore(poiId, "emotion", 28, 75);
  const future = legendary.future_value_score ?? hashScore(poiId, "future", 30, 80);
  return {
    poi_id: poiId,
    discovery_score: discovery,
    importance_score: importance,
    memory_score: memory,
    emotion_score: emotion,
    future_value_score: future,
    emotion_profile: {
      asombro: 0.32 + (hashScore(poiId, "as", 0, 18) / 100),
      aprendizaje: 0.24 + (hashScore(poiId, "ap", 0, 14) / 100),
      inspiracion: 0.18 + (hashScore(poiId, "in", 0, 12) / 100),
      conexion: 0.14 + (hashScore(poiId, "co", 0, 10) / 100),
      nostalgia: 0.08 + (hashScore(poiId, "no", 0, 8) / 100),
    },
    total_views: hashScore(poiId, "views", 200, 12000),
    total_saves: hashScore(poiId, "saves", 50, 3500),
    total_visits: hashScore(poiId, "visits", 20, 1200),
    total_resonances: hashScore(poiId, "reso", 30, 1800),
    last_signal_at: null,
    updated_at: new Date().toISOString(),
    _source: "fallback",
  };
}


// Cache en memoria por poi_id (TTL 5 min)
const _cache = new Map<string, { data: PoiSignalsData; ts: number }>();
const TTL_MS = 5 * 60 * 1000;


async function fetchSignals(poiId: string): Promise<PoiSignalsData> {
  if (!API) return fallbackSignals(poiId);
  try {
    const r = await fetch(`${API}/api/signals/${encodeURIComponent(poiId)}`, {
      cache: "no-store",
      headers: { "Accept": "application/json" },
    });
    if (!r.ok) return fallbackSignals(poiId);
    const j = await r.json();
    return { ...j, _source: "api" as const };
  } catch {
    return fallbackSignals(poiId);
  }
}


export function useSignals(poiId: string | null | undefined) {
  const [data, setData] = React.useState<PoiSignalsData | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!poiId) { setData(null); setLoading(false); return; }
    const cached = _cache.get(poiId);
    if (cached && (Date.now() - cached.ts) < TTL_MS) {
      setData(cached.data);
      setLoading(false);
      return;
    }
    setLoading(true);
    let alive = true;
    fetchSignals(poiId).then((d) => {
      if (!alive) return;
      _cache.set(poiId, { data: d, ts: Date.now() });
      setData(d);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [poiId]);

  return { data, loading };
}


/** Score compuesto Merit (ponderación canónica HDG 25/25/20/15/15). */
export function meritScore(s: PoiSignalsData): number {
  return Math.round(
    s.discovery_score * 0.25 +
    s.importance_score * 0.25 +
    s.emotion_score * 0.20 +
    s.memory_score * 0.15 +
    s.future_value_score * 0.15
  );
}


/** Etiqueta humana del score */
export function meritLabel(score: number): string {
  if (score >= 90) return "Excepcional";
  if (score >= 80) return "Sobresaliente";
  if (score >= 70) return "Notable";
  if (score >= 60) return "Relevante";
  if (score >= 50) return "Estimable";
  return "Emergente";
}
