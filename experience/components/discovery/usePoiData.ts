"use client";
/**
 * KUDOS · hook usePoiData.
 *
 * Carga datos básicos de un POI desde el manifest /data/pois/index.json,
 * o desde /api/pois/{poi_id} si la API está disponible.
 * Fallback a un POI minimal cuando no encuentra nada (jamás retorna null
 * para que las pantallas no se rompan).
 */
import * as React from "react";


const API = process.env.NEXT_PUBLIC_KUDOS_API_URL || "";


export interface PoiData {
  id: string;
  name: string;
  category: string;
  country: string;
  flag?: string;
  lat?: number;
  lon?: number;
  tier?: "S" | "A" | "B" | "C";
  short_description?: string;
  image_url?: string;
  _source: "api" | "manifest" | "fallback";
}


const CATEGORY_LABELS: Record<string, string> = {
  monumento:    "MONUMENTO HISTÓRICO",
  museo:        "MUSEO",
  arqueologia:  "SITIO ARQUEOLÓGICO",
  iglesia:      "PATRIMONIO RELIGIOSO",
  parque:       "ESPACIO NATURAL",
  castillo:     "FORTALEZA",
  plaza:        "PLAZA HISTÓRICA",
  ruinas:       "RUINAS",
  default:      "LUGAR DE INTERÉS",
};


// Conocidos hardcoded (sólo como último recurso visual)
const KNOWN_POIS: Record<string, PoiData> = {
  "wd-Q10285":  { id: "wd-Q10285",  name: "Coliseo",         category: "MONUMENTO HISTÓRICO", country: "Italia",  flag: "🇮🇹", lat: 41.8902, lon: 12.4922, tier: "S", short_description: "Anfiteatro emblemático del Imperio Romano. Escenario de luchas de gladiadores y espectáculos que fascinaban al mundo.", _source: "fallback" },
  "wd-Q12892":  { id: "wd-Q12892",  name: "Alhambra",        category: "PATRIMONIO ANDALUSÍ",   country: "España", flag: "🇪🇸", lat: 37.1773, lon: -3.5986, tier: "S", short_description: "Ciudadela y palacio nazarí donde se cruzan agua, geometría y luz.", _source: "fallback" },
  "wd-Q131013": { id: "wd-Q131013", name: "Acrópolis",       category: "SITIO ARQUEOLÓGICO",    country: "Grecia", flag: "🇬🇷", lat: 37.9715, lon: 23.7267, tier: "S", short_description: "Colina sagrada de Atenas donde la democracia y la filosofía aprendieron a mirar el cielo.", _source: "fallback" },
  "wd-Q12506":  { id: "wd-Q12506",  name: "Sagrada Familia", category: "PATRIMONIO RELIGIOSO",  country: "España", flag: "🇪🇸", lat: 41.4036, lon: 2.1744, tier: "S", short_description: "Templo de Gaudí: la piedra que respira luz y todavía no ha terminado de nacer.", _source: "fallback" },
  "wd-Q2981":   { id: "wd-Q2981",   name: "Notre-Dame",      category: "PATRIMONIO RELIGIOSO",  country: "Francia", flag: "🇫🇷", lat: 48.8530, lon: 2.3499, tier: "S", short_description: "Catedral gótica de París que ha visto siglos, fuego y renacimientos.", _source: "fallback" },
  "wd-Q243":    { id: "wd-Q243",    name: "Torre Eiffel",    category: "MONUMENTO",             country: "Francia", flag: "🇫🇷", lat: 48.8584, lon: 2.2945, tier: "S", short_description: "Hierro convertido en horizonte. La estructura que enseñó al mundo a mirar hacia arriba.", _source: "fallback" },
  "wd-Q1410":   { id: "wd-Q1410",   name: "Foro Romano",     category: "SITIO ARQUEOLÓGICO",    country: "Italia", flag: "🇮🇹", lat: 41.8925, lon: 12.4853, tier: "S", short_description: "Plaza pública del antiguo Roma donde nació la política tal como la conocemos.", _source: "fallback" },
};


function flagFor(country: string): string {
  const map: Record<string, string> = {
    "Italia": "🇮🇹", "España": "🇪🇸", "Francia": "🇫🇷", "Grecia": "🇬🇷",
    "Reino Unido": "🇬🇧", "Alemania": "🇩🇪", "Portugal": "🇵🇹", "México": "🇲🇽",
    "Perú": "🇵🇪", "Egipto": "🇪🇬", "Japón": "🇯🇵", "China": "🇨🇳",
    "India": "🇮🇳", "Turquía": "🇹🇷", "Marruecos": "🇲🇦", "Brasil": "🇧🇷",
  };
  return map[country] || "🌍";
}


function normalizeCategory(raw: string | undefined): string {
  if (!raw) return CATEGORY_LABELS.default;
  const k = raw.toLowerCase().split(":")[0];
  return CATEGORY_LABELS[k] || raw.toUpperCase();
}


async function loadManifest(): Promise<Record<string, PoiData>> {
  try {
    const r = await fetch("/data/pois/index.json", { cache: "force-cache" });
    if (!r.ok) return {};
    const j = await r.json();
    const arr: any[] = Array.isArray(j) ? j : (j.pois || []);
    const out: Record<string, PoiData> = {};
    for (const p of arr) {
      const id = p.id || p.poi_id || p.wd_id;
      if (!id) continue;
      const country = p.country || p.country_name || "";
      out[id] = {
        id,
        name: p.name?.es || p.name?.en || p.name || id,
        category: normalizeCategory(p.category),
        country,
        flag: flagFor(country),
        lat: p.lat ?? p.latitude,
        lon: p.lon ?? p.longitude,
        tier: p.tier,
        short_description: p.short_description?.es || p.short_description?.en || p.short_description,
        image_url: p.image_url,
        _source: "manifest",
      };
    }
    return out;
  } catch {
    return {};
  }
}


let _manifestPromise: Promise<Record<string, PoiData>> | null = null;
function manifestPromise() {
  if (!_manifestPromise) _manifestPromise = loadManifest();
  return _manifestPromise;
}


async function fetchFromApi(poiId: string): Promise<PoiData | null> {
  if (!API) return null;
  try {
    const r = await fetch(`${API}/api/pois/${encodeURIComponent(poiId)}`, {
      cache: "no-store",
    });
    if (!r.ok) return null;
    const j = await r.json();
    return {
      id: j.id || poiId,
      name: j.name?.es || j.name?.en || j.name || poiId,
      category: normalizeCategory(j.category),
      country: j.country || "",
      flag: flagFor(j.country || ""),
      lat: j.lat,
      lon: j.lon,
      tier: j.tier,
      short_description: j.short_description?.es || j.short_description?.en || j.short_description,
      image_url: j.image_url,
      _source: "api",
    };
  } catch {
    return null;
  }
}


export function usePoiData(poiId: string | null | undefined) {
  const [poi, setPoi] = React.useState<PoiData | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!poiId) { setPoi(null); setLoading(false); return; }
    let alive = true;
    setLoading(true);
    (async () => {
      // 1. API
      let p = await fetchFromApi(poiId);
      // 2. manifest
      if (!p) {
        const idx = await manifestPromise();
        if (idx[poiId]) p = idx[poiId];
      }
      // 3. conocidos hardcoded
      if (!p && KNOWN_POIS[poiId]) p = KNOWN_POIS[poiId];
      // 4. último recurso: POI minimal
      if (!p) p = {
        id: poiId,
        name: poiId.replace(/^wd-Q/, "POI "),
        category: CATEGORY_LABELS.default,
        country: "",
        flag: "🌍",
        _source: "fallback",
      };
      if (!alive) return;
      setPoi(p);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [poiId]);

  return { poi, loading };
}
