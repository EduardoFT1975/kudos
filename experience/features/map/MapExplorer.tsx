"use client";

/**
 * KUDOS Experience · <MapExplorer /> (P0.9 MVP)
 *
 * Map-first surface usando MapLibre GL. Comportamiento:
 *   1. Mount → carga mapa OSM raster en posición default (Madrid · 40.4, -3.7)
 *   2. Si geolocation granted → centra en coords del usuario, pin azul
 *   3. Click/tap en el mapa → fija marker rojo + lanza CapsuleSession contra esas coords
 *   4. Panel inferior (40% altura) renderiza el state machine del capsule
 *
 * MapLibre GL se carga dinámicamente (import dynamic) porque depende de
 * `window` y rompe SSR. Loading spinner mientras inicializa.
 *
 * DEPENDENCY: requiere `npm install maplibre-gl` · ~250KB gzipped.
 * Sin el paquete instalado, el build falla. Añadir a package.json antes
 * del próximo deploy:
 *     "maplibre-gl": "^4.7.1"
 */
import * as React from "react";
// CRITICAL · maplibre-gl markers necesitan el CSS de la librería para
// posicionarse absolutamente sobre el mapa. Sin este import los markers
// se montan en el DOM pero quedan invisibles (default position static).
// Solo afecta a markers · tiles renderizan via canvas sin CSS.
import "maplibre-gl/dist/maplibre-gl.css";
// import CapsuleSession ELIMINADO · legacy capsule panel ya no se renderiza
// desde el mapa. La única superficie es el Echo card (provisionalView).
import { useGeolocation } from "@/hooks/useGeolocation";
import { useMemoryGraph } from "@/lib/memory/useMemoryGraph";
import { track } from "@/lib/analytics/plausible";

// MapLibre dynamic import · cargado client-side only.
type MapLibreModule = typeof import("maplibre-gl");

// Cold-start camera · NEUTRAL world view.
// Geolocation es la única autoridad sobre la cámara inicial. Si geo se
// resuelve, flyTo(userCoords). Si NUNCA se resuelve (permission denied
// / desktop sin GPS / etc.), el usuario ve un mundo neutro · jamás
// Roma por accidente. Roma solo aparece si:
//   1) el usuario está en Roma (geo)  ó
//   2) el usuario clickea Roma en CITY_PRESETS (user-initiated)
const _DEFAULT_CENTER: [number, number] = [0.0, 25.0]; // mundo neutro · vista pan-continental
const _DEFAULT_ZOOM = 2;

// Real-geo policy.
// La cámara va SIEMPRE a la posición real del usuario tras geo grant.
// CITY_PRESETS / empty-state CTA modal eliminados por mandato producto:
// rompían el feel cinematográfico. El Echo card auto-opens en cold-start
// del POI más notable cercano (north star: producto, no herramienta).
const NEARBY_RADIUS_KM = 25;

// Region inference por coords · derivación contextual sin backend.
// Devuelve { name, tags } para alimentar el tab LUGAR · cinematic chips.
// Pad regions amplios · fallback genérico nunca técnico.
function regionFromCoords(lat: number, lng: number): { name: string; tags: string[] } {
  if (lat >= 41.8 && lat <= 43.8 && lng >= -9.4 && lng <= -6.8) {
    return {
      name: "Galicia",
      tags: ["Galicia", "Atlántico", "Mariscadores", "Granito", "Niebla", "Costa", "Celta"],
    };
  }
  if (lat >= 41.0 && lat <= 43.7 && lng >= -3.5 && lng <= 0.5) {
    return {
      name: "Cantábrico",
      tags: ["Cantábrico", "Verde", "Costa", "Cordillera", "Niebla"],
    };
  }
  if (lat >= 36.0 && lat <= 38.7 && lng >= -7.5 && lng <= -1.4) {
    return {
      name: "Andalucía",
      tags: ["Andalucía", "Mediterráneo", "Al-Ándalus", "Olivar", "Flamenco", "Sol"],
    };
  }
  if (lat >= 40.0 && lat <= 41.6 && lng >= -4.5 && lng <= -2.5) {
    return {
      name: "Castilla",
      tags: ["Castilla", "Meseta", "Trigo", "Catedrales", "Páramo"],
    };
  }
  if (lat >= 40.5 && lat <= 42.9 && lng >= 0.2 && lng <= 3.5) {
    return {
      name: "Catalunya",
      tags: ["Catalunya", "Mediterráneo", "Pirineo", "Modernisme", "Costa Brava"],
    };
  }
  if (lat >= 41.5 && lat <= 42.2 && lng >= 12.2 && lng <= 12.8) {
    return {
      name: "Roma",
      tags: ["Roma", "Imperio", "Mediterráneo", "Travertino", "Latín", "Eterna"],
    };
  }
  if (lat >= 36.5 && lat <= 38.5 && lng >= 22.0 && lng <= 24.5) {
    return {
      name: "Ática",
      tags: ["Ática", "Egeo", "Mármol", "Mito", "Polis"],
    };
  }
  if (lat >= 29.5 && lat <= 30.5 && lng >= 30.5 && lng <= 32.0) {
    return {
      name: "Egipto",
      tags: ["Egipto", "Nilo", "Desierto", "Piedra", "Dinastía"],
    };
  }
  return {
    name: "Paisaje",
    tags: ["Paisaje", "Memoria", "Tierra", "Tiempo"],
  };
}

function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const la1 = toRad(a[1]);
  const la2 = toRad(b[1]);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

// Type for the cluster-expansion list panel (lifted out so the state
// type doesn't depend on the closure-local `Cap` inside fetchViewport).
type ClusterListEntry = {
  lat: number; lng: number; title?: string;
  image_url?: string; thumbnail_url?: string;
  clip_url?: string; media_type?: "image" | "video";
  temporal_media?: TemporalMediaEntry[];
};
type ClusterListState = {
  center: [number, number];
  capsules: ClusterListEntry[];
};

// Echo card · provisional view state. El primer Echo card cinematográfico
// del producto (north star: Echo Portal). El narrative y la imagen se
// fetchan async desde Wikipedia REST. Visual converge a la línea premium
// KUDOS · NO debug aesthetic, NO ingeniería visible.
type ProvisionalView = {
  entity_id: string;
  title: string;
  lat: number;
  lng: number;
  distance_m: number;
  wikidata_url: string;
  wikipedia_url_es: string;
  wikipedia_url_en: string;
  // Async-populated · backend /api/echo/synthesize/ payload.
  narrative: string | null;     // micro_narrative (cinematic)
  imageUrl: string | null;      // hero_image
  description: string | null;   // subtitle (poética del LLM)
  pageUrl: string | null;       // wikipedia_url
  culturalDna?: string[];       // LUGAR tab override · LLM-derived (optional · undefined si no llegó)
  echoSource?: string;          // cache | llm | wikipedia_fallback | minimal_fallback | pipeline_fail
  loading: boolean;
  errorMessage?: string;
};

// P1 · Temporal map · era band → CSS filter applied to map container.
// Provides visual cue without historical tile sources (those come later).
type Era = "ancient" | "medieval" | "industrial" | "modern";
function eraOfYear(year: number): Era {
  if (year < 500) return "ancient";
  if (year < 1500) return "medieval";
  if (year < 1950) return "industrial";
  return "modern";
}
function filterForEra(era: Era): string {
  switch (era) {
    case "ancient":    return "sepia(0.45) hue-rotate(-12deg) brightness(0.82)";
    case "medieval":   return "sepia(0.32) hue-rotate(10deg) brightness(0.72) contrast(1.05)";
    case "industrial": return "brightness(0.86) contrast(1.06) saturate(0.85)";
    case "modern":     return "none";
  }
}
function labelForYear(year: number): string {
  if (year < 0) return `${Math.abs(year)} a.C.`;
  if (year === 0) return "0";
  return `${year}`;
}

// P1 · Temporal historical landmarks · backend-driven via
// /api/landmarks/viewport/?bbox=&year=. NO hardcoded constants.
// Feature properties contract:
//   { title?, kind?, thumbnail_url?, clip_url?, start_year?, end_year? }
// Geometry can be Polygon or LineString (MultiPolygon support optional).

interface TemporalMapLike {
  getSource: (id: string) => { setData?: (d: unknown) => void } | undefined;
  addSource: (id: string, src: unknown) => void;
  addLayer: (layer: unknown) => void;
  getLayer?: (id: string) => unknown;
  on?: (
    type: string,
    layer: string,
    fn: (e: unknown) => void,
  ) => void;
}

interface BackendLandmarkFeature {
  type?: "Feature";
  geometry: {
    type: "Polygon" | "LineString";
    coordinates: number[][] | number[][][];
  };
  properties?: {
    title?: string;
    kind?: string;
    thumbnail_url?: string;
    clip_url?: string;
    start_year?: number;
    end_year?: number;
  };
}
interface BackendLandmarkFC {
  features?: BackendLandmarkFeature[];
}

type LandmarkHoverData = {
  title: string;
  thumbnail: string;
  year: string;
  hasClip: boolean;
};

function renderTemporalLandmarks(
  map: TemporalMapLike | null | undefined,
  fc: BackendLandmarkFC | null | undefined,
  onHover?: (point: { x: number; y: number; data: LandmarkHoverData } | null) => void,
): void {
  if (!map || typeof map.getSource !== "function") return;

  const POLY_SRC = "kudos-temporal-polygons";
  const POLY_LAYER = "kudos-temporal-polygon-fill";
  const LINE_SRC = "kudos-temporal-lines";
  const LINE_LAYER = "kudos-temporal-line-stroke";

  const features: BackendLandmarkFeature[] = Array.isArray(fc?.features)
    ? fc!.features
    : [];

  const polyFeatures = features
    .filter((f) => f?.geometry?.type === "Polygon")
    .map((f) => ({
      type: "Feature" as const,
      geometry: {
        type: "Polygon" as const,
        coordinates: f.geometry.coordinates as number[][][],
      },
      properties: f.properties ?? {},
    }));
  const lineFeatures = features
    .filter((f) => f?.geometry?.type === "LineString")
    .map((f) => ({
      type: "Feature" as const,
      geometry: {
        type: "LineString" as const,
        coordinates: f.geometry.coordinates as number[][],
      },
      properties: f.properties ?? {},
    }));

  const polyFC = { type: "FeatureCollection" as const, features: polyFeatures };
  const lineFC = { type: "FeatureCollection" as const, features: lineFeatures };

  try {
    const polySrc = map.getSource(POLY_SRC);
    if (polySrc && typeof polySrc.setData === "function") {
      polySrc.setData(polyFC);
    } else {
      map.addSource(POLY_SRC, { type: "geojson", data: polyFC });
      map.addLayer({
        id: POLY_LAYER,
        type: "fill",
        source: POLY_SRC,
        paint: {
          "fill-color": "#8b5cf6",
          "fill-opacity": 0.08,
          "fill-outline-color": "#a78bfa",
        },
      });
      // Hover handlers · attached ONCE on first layer creation.
      if (onHover && typeof map.on === "function") {
        map.on("mousemove", POLY_LAYER, (e: unknown) => {
          const ev = e as {
            features?: Array<{ properties?: Record<string, unknown> }>;
            point?: { x: number; y: number };
          };
          const f = ev.features?.[0];
          const pt = ev.point;
          if (!f || !pt) return;
          const p = f.properties ?? {};
          onHover({
            x: pt.x,
            y: pt.y,
            data: {
              title:
                typeof p.title === "string" && p.title.length > 0
                  ? p.title
                  : "Lugar histórico",
              thumbnail:
                typeof p.thumbnail_url === "string" ? p.thumbnail_url : "",
              year:
                typeof p.start_year === "number"
                  ? p.start_year < 0
                    ? `${Math.abs(p.start_year)} a.C.`
                    : `${p.start_year}`
                  : "",
              hasClip:
                typeof p.clip_url === "string" && p.clip_url.length > 0,
            },
          });
        });
        map.on("mouseleave", POLY_LAYER, () => onHover(null));
      }
    }
    const lineSrc = map.getSource(LINE_SRC);
    if (lineSrc && typeof lineSrc.setData === "function") {
      lineSrc.setData(lineFC);
    } else {
      map.addSource(LINE_SRC, { type: "geojson", data: lineFC });
      map.addLayer({
        id: LINE_LAYER,
        type: "line",
        source: LINE_SRC,
        paint: {
          "line-color": "#8b5cf6",
          "line-opacity": 0.35,
          "line-width": 1.5,
        },
      });
    }
  } catch {
    // Defensive · style may not be ready first paint · next call covers it
  }
}

// P2 · Capsule multimedia · temporal asset resolver. Walks
// capsule.temporal_media[] looking for an entry whose [start_year,
// end_year] window contains the active year. Returns first match.
// Falls back to capsule.image_url / thumbnail_url when no temporal
// variants exist (current backend V0 shape).
interface TemporalMediaEntry {
  start_year?: number;
  end_year?: number;
  image_url?: string;
  thumbnail_url?: string;
  clip_url?: string;
  media_type?: "image" | "video";
}
interface CapsuleLike {
  title?: string;
  image_url?: string;
  thumbnail_url?: string;
  clip_url?: string;
  media_type?: "image" | "video";
  temporal_media?: TemporalMediaEntry[];
  entity_id?: string;
  context_block?: string;
}
interface ResolvedMedia {
  imageUrl: string;
  thumbnailUrl: string;
  clipUrl: string;
  mediaType: "image" | "video";
}
function resolveTemporalMedia(capsule: CapsuleLike, year: number): ResolvedMedia {
  const arr = Array.isArray(capsule.temporal_media) ? capsule.temporal_media : [];
  for (const m of arr) {
    const s = typeof m.start_year === "number" ? m.start_year : -Infinity;
    const e = typeof m.end_year === "number" ? m.end_year : Infinity;
    if (year >= s && year <= e) {
      return {
        imageUrl: m.image_url ?? capsule.image_url ?? "",
        thumbnailUrl: m.thumbnail_url ?? capsule.thumbnail_url ?? "",
        clipUrl: m.clip_url ?? "",
        mediaType: m.media_type ?? (m.clip_url ? "video" : "image"),
      };
    }
  }
  return {
    imageUrl: capsule.image_url ?? "",
    thumbnailUrl: capsule.thumbnail_url ?? "",
    clipUrl: capsule.clip_url ?? "",
    mediaType: capsule.media_type ?? (capsule.clip_url ? "video" : "image"),
  };
}

// P2 · Architecture slot for AI clip generation pipeline. Composes a
// prompt string from capsule context · NO generation invoked here.
// Future worker consumes this prompt to render motion preview.
function generateClipPrompt(capsule: CapsuleLike): string {
  const title = capsule.title ?? "lugar";
  const context = (capsule.context_block ?? "").slice(0, 200);
  return (
    `KUDOS cinematic memory clip · "${title}" · ` +
    `8-12s loop · cinematic dusk lighting · violet accent particles · ` +
    `subject context: ${context || "historical landmark"} · ` +
    `mood: contemplative, layered, contextual memory`
  );
}

// ClickedCoords / HoveredPreview interfaces ELIMINADAS · única state
// surface es ProvisionalView (Echo card). Sin paneles paralelos.

// EchoPortalLayout integration props · all optional · standalone mode
// preservado para back-compat (renderiza su propio modal).
export interface MapExplorerProps {
  /** Cuando true, el modal interno NO se renderiza · parent layout (EchoPortalLayout)
   *  consume el activeEcho via onEchoChange y lo renderiza en su propio chrome. */
  embedded?: boolean;
  /** Se llama cuando provisionalView cambia · parent puede leer activeEcho. */
  onEchoChange?: (echo: ProvisionalView | null) => void;
  /** Se llama tras cada fetch local-capsules · parent puede leer la lista. */
  onNearbyChange?: (entries: Array<{
    entity_id?: string; title?: string; lat?: number; lng?: number;
    distance_m?: number; wikipedia_url_es?: string; wikipedia_url_en?: string;
  }>) => void;
  /** Si parent quiere abrir un POI específico (ej · click en Cerca de aquí),
   *  pasa un objeto con title/lat/lng/etc · cambia identidad para gatillar. */
  externalEchoRequest?: {
    entity_id?: string; title?: string; lat?: number; lng?: number;
    distance_m?: number; wikipedia_url_es?: string; wikipedia_url_en?: string;
  } | null;
  /** Callback cuando externalEchoRequest se ha consumido · parent debe nullify. */
  onEchoRequestConsumed?: () => void;
  /** FIX 2 · parent pide pan + fetch local-capsules en nuevo centro (city preset). */
  externalPanRequest?: { lat: number; lng: number } | null;
  onPanRequestConsumed?: () => void;
}

export function MapExplorer(props: MapExplorerProps = {}) {
  const {
    embedded, onEchoChange, onNearbyChange,
    externalEchoRequest, onEchoRequestConsumed,
    externalPanRequest, onPanRequestConsumed,
  } = props;
  // FIX 2 · override de coords cuando parent fuerza pan (city preset).
  // Cuando set, local-capsules fetch usa estas coords en vez de geo.lat/lng.
  // Reset a null tras el siguiente fetch.
  const panOverrideRef = React.useRef<{ lat: number; lng: number } | null>(null);
  const mapContainerRef = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<unknown>(null); // maplibre.Map · lazy typed
  const userMarkerRef = React.useRef<unknown>(null);
  // clickMarkerRef retirado · ya no hay map-tap → click marker.
  // P0.9 Memory Graph · markers persistentes de las memorias guardadas.
  // Cada entry crea un Marker propio · los acumulamos en una ref para
  // poder limpiarlos cuando el set de memorias cambie sin tener que
  // re-init el mapa entero.
  const memoryMarkersRef = React.useRef<Array<{ remove: () => void }>>([]);
  // P0 viewport capsule markers · markers de cápsulas existentes en el bbox
  // del mapa · se re-cargan en cada moveend (debounce 400ms).
  const capsuleMarkersRef = React.useRef<Array<{ remove: () => void }>>([]);
  const viewportFetchTimerRef = React.useRef<number | null>(null);
  const viewportAbortRef = React.useRef<AbortController | null>(null);
  // P3 · landmark viewport fetch · same lifecycle pattern
  const landmarksAbortRef = React.useRef<AbortController | null>(null);
  const landmarksFetchTimerRef = React.useRef<number | null>(null);
  // Local Capsule Generator (MVP) · provisional Wikidata POIs fetched
  // around the user. Painted with cyan AI markers · separate ref set
  // so they're independent of verified capsule markers.
  const localCapsuleMarkersRef = React.useRef<Array<{ remove: () => void }>>([]);
  const localCapsuleAbortRef = React.useRef<AbortController | null>(null);
  const localCapsuleTimerRef = React.useRef<number | null>(null);
  // One-shot · auto-open Echo card del POI más notable en cold-start.
  // Evita que se re-dispare en cada update de geo (watchPosition tick).
  const autoOpenedEchoRef = React.useRef<boolean>(false);
  // Cache de la última fetched list · feed el tab ECOS (otros lugares
  // cercanos al actualmente abierto).
  const localCapsulesCacheRef = React.useRef<Array<{
    entity_id?: string; title?: string; lat?: number; lng?: number;
    distance_m?: number; wikipedia_url_es?: string; wikipedia_url_en?: string;
  }>>([]);
  // Mapa entity_id → root element del marker · habilita aplicar estado
  // ACTIVE/INACTIVE en respuesta a provisionalView sin re-render del map.
  const localMarkerElMapRef = React.useRef<Map<string, HTMLDivElement>>(new Map());
  const [maplibre, setMaplibre] = React.useState<MapLibreModule | null>(null);
  const [mapReady, setMapReady] = React.useState(false);
  // clicked / hoveredPreview state ELIMINADOS · solo provisionalView.
  const [memoryLayerVisible, setMemoryLayerVisible] = React.useState<boolean>(true);
  // emptyNearby state retired · CTA modal eliminado por mandato producto.
  // (hasNearby computado in-effect ya no necesita exterior state.)
  // Cluster-expansion list · cuando un cluster se clickea pero el mapa
  // ya está al máximo zoom razonable, en vez de hacer más zoom abrimos
  // un panel con la lista de cápsulas del grupo.
  const [clusterList, setClusterList] =
    React.useState<ClusterListState | null>(null);
  // Local Capsule Generator · vista provisional al click. Wikipedia
  // summary se fetcha desde el frontend (CORS-enabled, no backend).
  // Phase 3 (next): swap to backend pipeline.generate_place_capsule
  // para LLM-synthesized cinematic narrative.
  const [provisionalView, setProvisionalView] =
    React.useState<ProvisionalView | null>(null);
  // Echo tab state · HISTORIA (default) / LUGAR / ECOS · mini portal.
  const [echoTab, setEchoTab] = React.useState<"historia" | "lugar" | "ecos">("historia");
  // Closing flag · run exit animation antes de nullify provisionalView.
  // Evita el snap brutal · cinematic close.
  const [closing, setClosing] = React.useState<boolean>(false);
  const closeEchoCinematic = React.useCallback(() => {
    setClosing(true);
    window.setTimeout(() => {
      setProvisionalView(null);
      setClosing(false);
    }, 280);
  }, []);
  // Image error state · si Wikipedia thumbnail falla (404, CORS,
  // broken host) caemos al poster fallback sin mostrar broken-image.
  const [heroImgFailed, setHeroImgFailed] = React.useState<boolean>(false);
  React.useEffect(() => {
    setHeroImgFailed(false);
  }, [provisionalView?.entity_id, provisionalView?.title, provisionalView?.imageUrl]);
  // Dev mode flag · si localStorage.kudos_dev === "1" mostramos source
  // badge (LLM/CACHE/FALLBACK). Founder-only · invisible al user.
  const isDevMode = React.useMemo(() => {
    if (typeof window === "undefined") return false;
    try { return window.localStorage.getItem("kudos_dev") === "1"; } catch { return false; }
  }, []);
  // P1 · Temporal map · year slider state. Range -500 BC → 2026.
  // Default 2026 (present). Future capsules filter by year via viewport
  // API param. Visual tint switches by era band.
  const [selectedYear, setSelectedYear] = React.useState<number>(2026);
  // Mirror in ref so fetchViewport closure reads current value at call time
  const selectedYearRef = React.useRef<number>(2026);
  React.useEffect(() => { selectedYearRef.current = selectedYear; }, [selectedYear]);
  const geo = useGeolocation({ enableHighAccuracy: true });
  // P0.9 Memory Graph · lee las memorias del store local. SSR-safe ·
  // entries=[] hasta hydrated. Reactivo a writes en otras pestañas y
  // a writes en esta misma pestaña (toggle desde una capsule abierta).
  const memory = useMemoryGraph();

  // Dynamic import MapLibre · evita SSR break + permite tree-shake
  React.useEffect(() => {
    let cancelled = false;
    import("maplibre-gl").then((mod) => {
      if (!cancelled) setMaplibre(mod);
    }).catch((err) => {
      // eslint-disable-next-line no-console
      console.error("[KUDOS · map] failed to load maplibre-gl:", err);
    });
    return () => { cancelled = true; };
  }, []);

  // Init mapa cuando MapLibre y container están listos
  React.useEffect(() => {
    if (!maplibre || !mapContainerRef.current || mapRef.current) return;
    const map = new maplibre.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          carto_dark: {
            type: "raster",
            tiles: [
              "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
              "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
              "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
              "https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
            ],
            tileSize: 256,
            attribution:
              "© <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> · © <a href='https://carto.com/attributions'>CARTO</a>",
          },
        },
        layers: [{ id: "carto_dark", type: "raster", source: "carto_dark" }],
        glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
      },
      center: _DEFAULT_CENTER,
      zoom: _DEFAULT_ZOOM,
      attributionControl: false,
    });

    map.on("load", () => {
      mapRef.current = map;
      setMapReady(true);
    });

    // Force resize 300ms post-init · cover late layout shift (React +
    // browser font load + flex/grid settle). MapLibre canvas needs the
    // container's final size to render tiles correctly.
    window.setTimeout(() => {
      try { map.resize(); } catch { /* defensive */ }
    }, 300);

    // KUDOS energy node · single capsule marker
    //   ┌─ halo (26px violet blur · pulse breathing)
    //   └─ core (10px solid #a78bfa · glow)
    // Web Animation API · no <style> injection needed.
    const buildKudosMarkerEl = (title: string) => {
      const root = document.createElement("div");
      root.title = title;
      root.style.cssText =
        "position:relative;width:26px;height:26px;cursor:pointer;";

      const halo = document.createElement("div");
      halo.style.cssText =
        "position:absolute;inset:0;border-radius:9999px;" +
        "background:#8b5cf6;opacity:0.22;filter:blur(4px);" +
        "transform-origin:center;will-change:transform,opacity;";
      halo.animate(
        [
          { transform: "scale(1)", opacity: 0.22 },
          { transform: "scale(1.18)", opacity: 0.08 },
          { transform: "scale(1)", opacity: 0.22 },
        ],
        { duration: 4200, iterations: Infinity, easing: "ease-in-out" },
      );

      const core = document.createElement("div");
      core.style.cssText =
        "position:absolute;top:50%;left:50%;" +
        "transform:translate(-50%,-50%);" +
        "width:10px;height:10px;border-radius:9999px;" +
        "background:radial-gradient(circle at 35% 35%," +
        "#ffffff 0%,#c4b5fd 20%,#a78bfa 45%,#8b5cf6 70%," +
        "rgba(139,92,246,0) 100%);" +
        "transition:transform .18s ease;";

      root.appendChild(halo);
      root.appendChild(core);
      root.addEventListener("mouseenter", () => {
        core.style.transform = "translate(-50%,-50%) scale(1.45)";
      });
      root.addEventListener("mouseleave", () => {
        core.style.transform = "translate(-50%,-50%) scale(1)";
      });
      return root;
    };

    // KUDOS energy cluster · subtle violet node with count + ambient halo
    const buildClusterEl = (count: number) => {
      const root = document.createElement("div");
      root.title = `${count} cápsulas`;
      root.style.cssText =
        "position:relative;width:34px;height:34px;cursor:pointer;";

      const halo = document.createElement("div");
      halo.style.cssText =
        "position:absolute;inset:0;border-radius:9999px;" +
        "background:#8b5cf6;opacity:0.22;filter:blur(6px);" +
        "transform-origin:center;will-change:transform,opacity;";
      halo.animate(
        [
          { transform: "scale(1)", opacity: 0.22 },
          { transform: "scale(1.18)", opacity: 0.08 },
          { transform: "scale(1)", opacity: 0.22 },
        ],
        { duration: 4200, iterations: Infinity, easing: "ease-in-out" },
      );

      const orb = document.createElement("div");
      orb.style.cssText =
        "position:absolute;top:50%;left:50%;" +
        "transform:translate(-50%,-50%);" +
        "width:26px;height:26px;border-radius:9999px;" +
        "background:radial-gradient(circle at 35% 30%," +
        "#a78bfa 0%,#8b5cf6 70%,#6d28d9 100%);" +
        "display:flex;align-items:center;justify-content:center;" +
        "color:white;font-weight:700;font-size:10px;" +
        "letter-spacing:-0.2px;opacity:0.92;" +
        "box-shadow:0 0 10px rgba(139,92,246,.4)," +
        "0 0 20px rgba(139,92,246,.22);" +
        "transition:transform .18s ease,box-shadow .18s ease;";
      orb.textContent = String(count);

      root.appendChild(halo);
      root.appendChild(orb);
      root.addEventListener("mouseenter", () => {
        orb.style.transform = "translate(-50%,-50%) scale(1.1)";
        orb.style.boxShadow =
          "0 0 14px rgba(139,92,246,.6),0 0 28px rgba(139,92,246,.38)";
      });
      root.addEventListener("mouseleave", () => {
        orb.style.transform = "translate(-50%,-50%) scale(1)";
        orb.style.boxShadow =
          "0 0 10px rgba(139,92,246,.4),0 0 20px rgba(139,92,246,.22);";
      });
      return root;
    };

    const fetchViewport = () => {
      if (viewportFetchTimerRef.current !== null) {
        window.clearTimeout(viewportFetchTimerRef.current);
      }
      viewportFetchTimerRef.current = window.setTimeout(() => {
        const b = map.getBounds();
        const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
        const url =
          apiBase +
          "/api/capsules/viewport/?bbox=" +
          [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]
            .map((n) => n.toFixed(5))
            .join(",") +
          "&limit=100" +
          "&year=" + selectedYearRef.current;
        if (viewportAbortRef.current) {
          viewportAbortRef.current.abort();
        }
        const ctrl = new AbortController();
        viewportAbortRef.current = ctrl;
        fetch(url, { signal: ctrl.signal, cache: "no-store" })
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => {
            if (!data || !Array.isArray(data.capsules)) return;
            for (const m of capsuleMarkersRef.current) {
              try { m.remove(); } catch { /* defensive */ }
            }
            capsuleMarkersRef.current = [];

            // Proximity clustering · grid bucket ~100m (0.001° lat/lng).
            // P2 · Cap shape extended with media fields for hover preview
            // + click panel hero.
            type Cap = {
              lat: number; lng: number; title?: string;
              image_url?: string; thumbnail_url?: string;
              clip_url?: string; media_type?: "image" | "video";
              temporal_media?: TemporalMediaEntry[];
            };
            const buckets = new Map<string, Cap[]>();
            for (const cap of data.capsules as Cap[]) {
              const lat = typeof cap.lat === "number" ? cap.lat : Number(cap.lat);
              const lng = typeof cap.lng === "number" ? cap.lng : Number(cap.lng);
              if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
              const key = `${Math.round(lat * 1000)}|${Math.round(lng * 1000)}`;
              const arr = buckets.get(key);
              const entry: Cap = {
                lat, lng,
                title: cap.title,
                image_url: cap.image_url,
                thumbnail_url: cap.thumbnail_url,
                clip_url: cap.clip_url,
                media_type: cap.media_type,
                temporal_media: cap.temporal_media,
              };
              if (arr) arr.push(entry);
              else buckets.set(key, [entry]);
            }

            const lngLats: Array<[number, number]> = [];
            for (const group of buckets.values()) {
              // Centroid of group · stable rendering point
              const avgLat = group.reduce((s, c) => s + c.lat, 0) / group.length;
              const avgLng = group.reduce((s, c) => s + c.lng, 0) / group.length;
              lngLats.push([avgLng, avgLat]);

              let el: HTMLDivElement;
              if (group.length > 1) {
                el = buildClusterEl(group.length);
                // Cluster UX:
                //   · zoom < 14 → zoom in (intenta expandir)
                //   · zoom ≥ 14 → ya no podemos separarlos visualmente,
                //     abrimos lista de memorias del grupo. El círculo
                //     con número NUNCA se queda muerto sin acción.
                el.addEventListener("click", (ev) => {
                  ev.stopPropagation();
                  const currentZoom = map.getZoom();
                  if (currentZoom < 14) {
                    map.flyTo({
                      center: [avgLng, avgLat],
                      zoom: Math.min(currentZoom + 2, 16),
                      duration: 600,
                    });
                  } else {
                    setClusterList({
                      center: [avgLng, avgLat],
                      capsules: group.map((c) => ({
                        lat: c.lat, lng: c.lng, title: c.title,
                        image_url: c.image_url,
                        thumbnail_url: c.thumbnail_url,
                        clip_url: c.clip_url,
                        media_type: c.media_type,
                        temporal_media: c.temporal_media,
                      })),
                    });
                  }
                });
              } else {
                const cap = group[0];
                el = buildKudosMarkerEl(cap.title ?? "Cápsula");
                el.addEventListener("click", (ev) => {
                  ev.stopPropagation();
                  // Verified capsule marker → Echo card (single surface).
                  setProvisionalView({
                    entity_id: "",
                    title: cap.title ?? "Lugar",
                    lat: cap.lat,
                    lng: cap.lng,
                    distance_m: 0,
                    wikidata_url: "",
                    wikipedia_url_es: "",
                    wikipedia_url_en: "",
                    narrative: null,
                    imageUrl: null,
                    description: null,
                    pageUrl: null,
                    loading: true,
                  });
                });
                // hover preview ELIMINADO · feel engineering.
              }

              const marker = new maplibre.Marker({ element: el })
                .setLngLat([avgLng, avgLat])
                .addTo(map);
              capsuleMarkersRef.current.push(marker);
            }

            // Subtle connection lines between centroids within ~400m.
            // Renders relational language without animation overhead.
            try {
              const SRC_ID = "kudos-connections";
              const LAYER_ID = "kudos-connection-lines";
              const THRESHOLD_M = 400;
              const haversineM = (a: [number, number], b: [number, number]) => {
                const R = 6371000;
                const toRad = (d: number) => (d * Math.PI) / 180;
                const dLat = toRad(b[1] - a[1]);
                const dLng = toRad(b[0] - a[0]);
                const la1 = toRad(a[1]);
                const la2 = toRad(b[1]);
                const x =
                  Math.sin(dLat / 2) ** 2 +
                  Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
                return 2 * R * Math.asin(Math.sqrt(x));
              };
              const features: Array<{
                type: "Feature";
                geometry: { type: "LineString"; coordinates: number[][] };
                properties: Record<string, never>;
              }> = [];
              for (let i = 0; i < lngLats.length; i++) {
                for (let j = i + 1; j < lngLats.length; j++) {
                  if (haversineM(lngLats[i], lngLats[j]) <= THRESHOLD_M) {
                    features.push({
                      type: "Feature",
                      geometry: {
                        type: "LineString",
                        coordinates: [lngLats[i], lngLats[j]],
                      },
                      properties: {},
                    });
                  }
                }
              }
              const geojson = {
                type: "FeatureCollection" as const,
                features,
              };
              const existing = (map as unknown as {
                getSource: (id: string) => { setData?: (d: unknown) => void } | undefined;
                addSource: (id: string, src: unknown) => void;
                addLayer: (layer: unknown) => void;
              });
              const src = existing.getSource(SRC_ID);
              if (src && typeof src.setData === "function") {
                src.setData(geojson);
              } else {
                existing.addSource(SRC_ID, { type: "geojson", data: geojson });
                existing.addLayer({
                  id: LAYER_ID,
                  type: "line",
                  source: SRC_ID,
                  paint: {
                    "line-color": "#8b5cf6",
                    "line-opacity": 0.14,
                    "line-width": 1,
                  },
                });
              }
            } catch { /* defensive · style may not be ready first paint */ }

            // MVP · auto-fit camera DISABLED. Cuando el viewport fetch
            // devuelve capsules dispersas (España/Galicia para el founder),
            // fitBounds(maxZoom:10) zoom-out a escala continental y rompe
            // el cold-start cinemático sobre Coliseo. Mantenemos resize
            // + repaint para que los tiles pinten correctamente, pero NO
            // movemos la cámara. Restaurar post-MVP cuando exista cobertura
            // global de TemporalLandmarks o cuando el cold-start sea
            // condicionado por el primer-click del usuario.
            const ENABLE_AUTO_FIT = false;
            if (ENABLE_AUTO_FIT && lngLats.length >= 2) {
              try {
                requestAnimationFrame(() => {
                  map.resize();
                  const bounds = new maplibre.LngLatBounds(lngLats[0], lngLats[0]);
                  for (const ll of lngLats) bounds.extend(ll);
                  map.fitBounds(bounds, { padding: 80, maxZoom: 10, duration: 0 });
                });
                map.once("moveend", () => {
                  map.resize();
                  map.triggerRepaint();
                });
              } catch { /* defensive */ }
            } else if (ENABLE_AUTO_FIT && lngLats.length === 1) {
              try {
                requestAnimationFrame(() => {
                  map.resize();
                  map.flyTo({ center: lngLats[0], zoom: 12, duration: 0 });
                });
                map.once("moveend", () => {
                  map.resize();
                  map.triggerRepaint();
                });
              } catch { /* defensive */ }
            } else {
              // MVP path · only resize+repaint, no camera movement.
              try {
                requestAnimationFrame(() => {
                  map.resize();
                  map.triggerRepaint();
                });
              } catch { /* defensive */ }
            }
          })
          .catch(() => { /* swallow · UX no-op */ });
      }, 400);
    };

    map.on("moveend", fetchViewport);
    map.on("load", fetchViewport);

    // P3 · landmark viewport fetch · same debounce pattern.
    // Backend: GET /api/landmarks/viewport/?bbox=&year=  → { features: [...] }
    // If endpoint absent / fails, layers update to empty FC (no error UI).
    const fetchLandmarks = () => {
      if (landmarksFetchTimerRef.current !== null) {
        window.clearTimeout(landmarksFetchTimerRef.current);
      }
      landmarksFetchTimerRef.current = window.setTimeout(() => {
        const b = map.getBounds();
        const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
        const url =
          apiBase +
          "/api/landmarks/viewport/?bbox=" +
          [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]
            .map((n) => n.toFixed(5))
            .join(",") +
          "&year=" + selectedYearRef.current;
        if (landmarksAbortRef.current) landmarksAbortRef.current.abort();
        const ctrl = new AbortController();
        landmarksAbortRef.current = ctrl;
        fetch(url, { signal: ctrl.signal, cache: "no-store" })
          .then((r) => (r.ok ? r.json() : null))
          .then((data: BackendLandmarkFC | null) => {
            renderTemporalLandmarks(
              map as unknown as TemporalMapLike,
              data ?? { features: [] },
              // onHover removed · hover preview path eliminado.
            );
          })
          .catch(() => {
            // Empty payload on failure · clears layer so stale features
            // don't persist across regions.
            renderTemporalLandmarks(
              map as unknown as TemporalMapLike,
              { features: [] },
            );
          });
      }, 400);
    };
    map.on("moveend", fetchLandmarks);
    map.on("load", fetchLandmarks);

    // map.on("click", ...) ELIMINADO · cualquier tap-anywhere en el mapa
    // gatillaba CapsuleSession → "Este lugar guarda silencio". Ahora la
    // navegación es solo por markers (provisional/memory/cluster) → Echo
    // card. El mapa es background, no surface accionable.

    return () => {
      if (viewportFetchTimerRef.current !== null) {
        window.clearTimeout(viewportFetchTimerRef.current);
      }
      if (viewportAbortRef.current) {
        viewportAbortRef.current.abort();
      }
      if (landmarksFetchTimerRef.current !== null) {
        window.clearTimeout(landmarksFetchTimerRef.current);
      }
      if (landmarksAbortRef.current) {
        landmarksAbortRef.current.abort();
      }
      for (const m of capsuleMarkersRef.current) {
        try { m.remove(); } catch { /* defensive */ }
      }
      capsuleMarkersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [maplibre]);

  // P1 · Temporal map · react to selectedYear changes.
  // Re-fire moveend → triggers BOTH fetchViewport AND fetchLandmarks
  // (with the new ?year param). Landmark layer self-updates from the
  // backend response · no direct render call needed here.
  // Apply CSS filter tint to container based on era.
  React.useEffect(() => {
    if (!mapReady) return;
    const m = mapRef.current as { fire?: (e: string) => void } | null;
    if (m && typeof m.fire === "function") {
      try { m.fire("moveend"); } catch { /* defensive */ }
    }
    if (mapContainerRef.current) {
      mapContainerRef.current.style.filter = filterForEra(eraOfYear(selectedYear));
      mapContainerRef.current.style.transition = "filter 600ms ease";
    }
  }, [selectedYear, mapReady]);

  // REAL-GEO PRIORITY · MVP fallback policy.
  // Cuando geo está ready Y memory hidratado:
  //   · cámara → SIEMPRE coords reales del usuario (autoridad única)
  //   · si NO hay memorias dentro de NEARBY_RADIUS_KM (25 km)
  //     → emptyNearby=true (dispara CTA panel con ciudades sembradas)
  // El pin del usuario se planta SIEMPRE en su ubicación real.
  // KUDOS es un producto geolocalizado: nunca teleportamos al usuario.
  React.useEffect(() => {
    if (!mapReady || !maplibre || !mapRef.current) return;
    if (geo.status !== "ready" || typeof geo.lat !== "number" || typeof geo.lng !== "number") return;
    // NOTA · NO esperamos a memory.hydrated. Si memory aún no hidrató,
    // memory.entries=[] y hasNearby=false (correcto · emptyNearby
    // panel se mostrará). Cuando memory finalmente hidrate, el effect
    // re-corre (memory.hydrated está en deps) y re-evalúa hasNearby.
    // Esto evita que la cámara se quede atascada en _DEFAULT_CENTER
    // esperando la hidratación de un store local.

    const map = mapRef.current as {
      flyTo: (opts: { center: [number, number]; zoom: number; duration: number }) => void;
    };
    const userLngLat: [number, number] = [geo.lng, geo.lat];

    // Política: la cámara va SIEMPRE a la posición real del usuario.
    // Geolocation es la única autoridad sobre la cámara inicial.
    map.flyTo({ center: userLngLat, zoom: 14, duration: 1200 });

    // Destroy + recreate · evita marker zombie con coords viejas si el
    // effect re-corre (geo update / memory change).
    if (userMarkerRef.current && typeof (userMarkerRef.current as { remove: () => void }).remove === "function") {
      (userMarkerRef.current as { remove: () => void }).remove();
      userMarkerRef.current = null;
    }

    // Pin built-in MapLibre · SVG teardrop nativo en color cyan KUDOS
    // (#00D1FF). Más fiable que un div custom: no depende de CSS vars
    // cascadeando hasta el wrapper de marker, no se ve afectado por
    // overflow/z-index de containers ni por failed paint del border-radius.
    // El built-in marker está garantizado visible mientras el LngLat
    // esté dentro del viewport actual.
    const userMap = mapRef.current as Parameters<
      InstanceType<MapLibreModule["Marker"]>["addTo"]
    >[0];
    userMarkerRef.current = new maplibre.Marker({ color: "#00D1FF" })
      .setLngLat(userLngLat)
      .addTo(userMap);

    // Force repaint · garantiza que el canvas + marker DOM se pinten en
    // el mismo frame tras flyTo programático.
    try {
      const repaintable = mapRef.current as {
        resize?: () => void;
        triggerRepaint?: () => void;
      };
      if (typeof repaintable.resize === "function") repaintable.resize();
      if (typeof repaintable.triggerRepaint === "function") repaintable.triggerRepaint();
    } catch { /* defensive */ }
  }, [mapReady, maplibre, geo.status, geo.lat, geo.lng, memory.hydrated, memory.entries]);

  // Reset Echo tab a HISTORIA cuando abre un nuevo POI · evita que
  // quede pegado el tab de la cápsula anterior.
  React.useEffect(() => {
    if (provisionalView) setEchoTab("historia");
  }, [provisionalView?.entity_id, provisionalView?.title]);

  // EMBEDDED MODE · notifica al parent (EchoPortalLayout) cada cambio
  // de provisionalView para que el portal sincronice left/right/bottom.
  React.useEffect(() => {
    if (onEchoChange) onEchoChange(provisionalView);
  }, [provisionalView, onEchoChange]);

  // FIX 2 · EXTERNAL PAN · parent pide flyTo + re-fetch en nuevo centro.
  // Setea panOverrideRef y dispara fetch manual via state-tick.
  const [panTick, setPanTick] = React.useState<number>(0);
  React.useEffect(() => {
    if (!externalPanRequest) return;
    if (!mapRef.current) return;
    const map = mapRef.current as {
      flyTo: (opts: { center: [number, number]; zoom: number; duration: number }) => void;
    };
    panOverrideRef.current = { lat: externalPanRequest.lat, lng: externalPanRequest.lng };
    map.flyTo({ center: [externalPanRequest.lng, externalPanRequest.lat], zoom: 14, duration: 1400 });
    autoOpenedEchoRef.current = false; // allow new auto-open after pan
    setPanTick((t) => t + 1);
    if (onPanRequestConsumed) onPanRequestConsumed();
  }, [externalPanRequest, onPanRequestConsumed]);

  // EXTERNAL PICK · el parent pide abrir un POI específico (ej · click
  // en módulo "Cerca de aquí"). Lo abrimos via setProvisionalView y
  // notificamos al parent que consumimos la petición.
  React.useEffect(() => {
    if (!externalEchoRequest) return;
    if (typeof externalEchoRequest.lat !== "number" || typeof externalEchoRequest.lng !== "number") return;
    setProvisionalView({
      entity_id: externalEchoRequest.entity_id ?? "",
      title: externalEchoRequest.title ?? "Lugar",
      lat: externalEchoRequest.lat,
      lng: externalEchoRequest.lng,
      distance_m: typeof externalEchoRequest.distance_m === "number" ? externalEchoRequest.distance_m : 0,
      wikidata_url: "",
      wikipedia_url_es: externalEchoRequest.wikipedia_url_es ?? "",
      wikipedia_url_en: externalEchoRequest.wikipedia_url_en ?? "",
      narrative: null,
      imageUrl: null,
      description: null,
      pageUrl: null,
      loading: true,
    });
    if (onEchoRequestConsumed) onEchoRequestConsumed();
  }, [externalEchoRequest, onEchoRequestConsumed]);

  // ACTIVE MARKER LINK · cuando Echo card abre, el marker seleccionado
  // se vuelve protagonista (scale + glow boost) · resto baja opacity.
  // Cuando se cierra, todos vuelven a estado normal. Animado vía CSS
  // transitions ya presentes en el el.style.transition del marker.
  React.useEffect(() => {
    const map = localMarkerElMapRef.current;
    const activeKey = provisionalView ? (provisionalView.entity_id || provisionalView.title) : "";
    map.forEach((el, key) => {
      const isActive = key === activeKey;
      if (!provisionalView) {
        // Reset all to default
        el.style.transform = "scale(1)";
        el.style.opacity = "1";
        el.style.zIndex = "";
        const core = el.children[1] as HTMLDivElement | undefined;
        if (core) {
          core.style.transform = "translate(-50%,-50%) scale(1)";
          core.style.boxShadow =
            "0 0 12px rgba(167,139,250,0.85)," +
            "0 0 2px rgba(255,255,255,0.6) inset," +
            "0 2px 4px rgba(0,0,0,0.55)";
        }
        return;
      }
      if (isActive) {
        // Active · scale up, full opacity, raised, intense glow
        el.style.transform = "scale(1.55)";
        el.style.opacity = "1";
        el.style.zIndex = "10";
        const core = el.children[1] as HTMLDivElement | undefined;
        if (core) {
          core.style.transform = "translate(-50%,-50%) scale(1.5)";
          core.style.boxShadow =
            "0 0 26px rgba(196,181,253,1)," +
            "0 0 10px rgba(255,255,255,0.6)," +
            "0 0 4px rgba(255,255,255,0.95) inset," +
            "0 3px 8px rgba(0,0,0,0.7)";
        }
      } else {
        // Inactive · dim, slightly smaller
        el.style.transform = "scale(0.85)";
        el.style.opacity = "0.32";
        el.style.zIndex = "";
        const core = el.children[1] as HTMLDivElement | undefined;
        if (core) {
          core.style.transform = "translate(-50%,-50%) scale(1)";
          core.style.boxShadow =
            "0 0 6px rgba(167,139,250,0.4)," +
            "0 1px 2px rgba(0,0,0,0.4)";
        }
      }
    });
  }, [provisionalView?.entity_id, provisionalView?.title, provisionalView]);

  // Echo Synthesis · Phase 3 backend pipeline.
  // Cuando se abre provisionalView con loading=true, llamamos al backend
  // /api/echo/synthesize/ que devuelve subtitle + micro_narrative +
  // cultural_dna + hero_image · cache-first (30d TTL), LLM via Anthropic
  // tool-use, fallback a Wikipedia-derived KUDOS-tone si no hay API key.
  React.useEffect(() => {
    if (!provisionalView || !provisionalView.loading) return;
    let cancelled = false;
    const ctrl = new AbortController();

    // Hard timeout · 30s absorbe cold-start Render free (~20s) +
    // backend Wikipedia (~8s) + Anthropic (~14s) en el peor caso.
    // Tras 30s abortamos y mostramos errorMessage cinematic en vez de
    // shimmer infinito. Cache hits subsiguientes son sub-segundo.
    const timeoutId = window.setTimeout(() => {
      try { ctrl.abort(); } catch { /* defensive */ }
    }, 30000);

    const fetchEcho = async () => {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
      const params = new URLSearchParams({
        entity_id: provisionalView.entity_id || "",
        title: provisionalView.title,
        lat: provisionalView.lat.toFixed(5),
        lng: provisionalView.lng.toFixed(5),
        wikipedia_url_es: provisionalView.wikipedia_url_es || "",
        wikipedia_url_en: provisionalView.wikipedia_url_en || "",
        wikidata_url: provisionalView.wikidata_url || "",
      });
      const url = `${apiBase}/api/echo/synthesize/?${params.toString()}`;
      try {
        const r = await fetch(url, {
          signal: ctrl.signal,
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        if (cancelled) return;
        setProvisionalView((prev) => {
          const sameTarget =
            prev &&
            (prev.entity_id
              ? prev.entity_id === provisionalView.entity_id
              : prev.title === provisionalView.title);
          if (!sameTarget) return prev;
          return {
            ...prev,
            narrative: typeof j?.micro_narrative === "string" ? j.micro_narrative : null,
            imageUrl: typeof j?.hero_image === "string" && j.hero_image ? j.hero_image : null,
            description: typeof j?.subtitle === "string" && j.subtitle ? j.subtitle : null,
            pageUrl: typeof j?.wikipedia_url === "string" && j.wikipedia_url ? j.wikipedia_url : null,
            culturalDna: Array.isArray(j?.cultural_dna)
              ? j.cultural_dna.filter((x: unknown) => typeof x === "string" && (x as string).trim().length > 0)
              : [],
            echoSource: typeof j?.source === "string" ? j.source : "",
            loading: false,
          };
        });
      } catch (err) {
        if (cancelled) return;
        if ((err as { name?: string })?.name === "AbortError") return;
        setProvisionalView((prev) =>
          prev && prev.entity_id === provisionalView.entity_id
            ? {
                ...prev,
                narrative: null,
                loading: false,
                errorMessage: "El eco no llegó a despertarse. Intenta de nuevo en un instante.",
              }
            : prev,
        );
      }
    };

    void fetchEcho();
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      ctrl.abort();
    };
  }, [provisionalView]);

  // Local Capsule Generator (MVP · Phase 1)
  // Cuando geo está ready, pide al backend Wikidata POIs cercanos al
  // usuario (radio 10 km) y los pinta como provisional markers cyan.
  // Mantiene el mapa con contenido aunque no haya capsules verificadas
  // ni memorias propias. Endpoint /api/local-capsules/ devuelve entidades
  // reales (sin LLM, sin alucinación) sourced de Wikidata SPARQL.
  React.useEffect(() => {
    if (!mapReady || !maplibre || !mapRef.current) return;
    // FIX 2 · si parent forzó pan (panOverrideRef), proceder aunque geo
    // esté denied / pending · el city preset es agencia válida del user.
    const hasOverride = panOverrideRef.current !== null;
    if (!hasOverride && (geo.status !== "ready" || typeof geo.lat !== "number" || typeof geo.lng !== "number")) return;
    const map = mapRef.current as Parameters<InstanceType<MapLibreModule["Marker"]>["addTo"]>[0];

    // Premium Echo node · north-star marker.
    //   · Outer ring (28px) · violet hairline + breathing pulse
    //   · Inner core (8px) · radial gradient · violet glow
    //   · Drop shadow profundidad
    //   · Hover · scale + glow boost (magnetic feel)
    // NO mas debug dots · esto se siente producto.
    const buildProvisionalMarkerEl = (title: string) => {
      const root = document.createElement("div");
      root.title = title;
      root.setAttribute("aria-label", `Echo: ${title}`);
      root.style.cssText =
        "position:relative;width:28px;height:28px;cursor:pointer;" +
        "transition:transform .28s cubic-bezier(.2,.7,.2,1);";

      // Outer ring · breathing
      const ring = document.createElement("div");
      ring.style.cssText =
        "position:absolute;inset:0;border-radius:50%;" +
        "border:1px solid rgba(167,139,250,0.55);" +
        "box-shadow:0 0 0 1px rgba(167,139,250,0.08)," +
          "0 8px 20px -8px rgba(0,0,0,0.6);" +
        "will-change:transform,opacity;";
      ring.animate(
        [
          { transform: "scale(1)",    opacity: 0.55 },
          { transform: "scale(1.18)", opacity: 0.15 },
          { transform: "scale(1)",    opacity: 0.55 },
        ],
        { duration: 3600, iterations: Infinity, easing: "ease-in-out" },
      );

      // Inner core · violet gradient sphere
      const core = document.createElement("div");
      core.style.cssText =
        "position:absolute;top:50%;left:50%;" +
        "transform:translate(-50%,-50%);" +
        "width:10px;height:10px;border-radius:50%;" +
        "background:radial-gradient(circle at 32% 32%," +
          "#ffffff 0%,#e9e3ff 14%,#c4b5fd 38%,#a78bfa 62%,#7c3aed 100%);" +
        "box-shadow:0 0 12px rgba(167,139,250,0.85)," +
          "0 0 2px rgba(255,255,255,0.6) inset," +
          "0 2px 4px rgba(0,0,0,0.55);" +
        "transition:transform .22s cubic-bezier(.2,.7,.2,1);";

      root.appendChild(ring);
      root.appendChild(core);

      root.addEventListener("mouseenter", () => {
        root.style.transform = "scale(1.18)";
        core.style.transform = "translate(-50%,-50%) scale(1.35)";
        core.style.boxShadow =
          "0 0 22px rgba(196,181,253,0.95)," +
          "0 0 4px rgba(255,255,255,0.85) inset," +
          "0 2px 6px rgba(0,0,0,0.65)";
      });
      root.addEventListener("mouseleave", () => {
        root.style.transform = "scale(1)";
        core.style.transform = "translate(-50%,-50%) scale(1)";
        core.style.boxShadow =
          "0 0 12px rgba(167,139,250,0.85)," +
          "0 0 2px rgba(255,255,255,0.6) inset," +
          "0 2px 4px rgba(0,0,0,0.55)";
      });
      return root;
    };

    // Debounce + abort previous request
    if (localCapsuleTimerRef.current !== null) {
      window.clearTimeout(localCapsuleTimerRef.current);
    }
    localCapsuleTimerRef.current = window.setTimeout(() => {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
      // FIX 2 · si parent forzó pan, usar esas coords; else geo del user.
      const override = panOverrideRef.current;
      const useLat = override ? override.lat : (geo.lat as number);
      const useLng = override ? override.lng : (geo.lng as number);
      const url =
        apiBase +
        "/api/local-capsules/?lat=" + useLat.toFixed(5) +
        "&lng=" + useLng.toFixed(5) +
        "&radius_km=10&limit=8";
      if (localCapsuleAbortRef.current) localCapsuleAbortRef.current.abort();
      const ctrl = new AbortController();
      localCapsuleAbortRef.current = ctrl;
      fetch(url, { signal: ctrl.signal, cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { capsules?: Array<{
          id?: string; title?: string;
          lat?: number; lng?: number;
          distance_m?: number;
          wikidata_url?: string;
          wikipedia_url_es?: string;
          wikipedia_url_en?: string;
        }> } | null) => {
          // Clear previous provisional markers
          for (const m of localCapsuleMarkersRef.current) {
            try { m.remove(); } catch { /* defensive */ }
          }
          localCapsuleMarkersRef.current = [];
          if (!data || !Array.isArray(data.capsules)) return;
          localCapsulesCacheRef.current = data.capsules.slice();
          // Notify embedded parent (EchoPortalLayout) of nearby list update.
          if (onNearbyChange) {
            try { onNearbyChange(data.capsules.slice()); } catch { /* defensive */ }
          }
          localMarkerElMapRef.current.clear();
          for (const cap of data.capsules) {
            if (typeof cap.lat !== "number" || typeof cap.lng !== "number") continue;

            // Capture full provisional context in marker closure · used
            // por el panel provisional al hacer click para fetch del
            // Wikipedia summary y resolver el narrative real.
            const provCtx = {
              entity_id: (cap as { entity_id?: string }).entity_id ?? "",
              title: cap.title ?? "Lugar",
              lat: cap.lat as number,
              lng: cap.lng as number,
              wikidata_url: cap.wikidata_url ?? "",
              wikipedia_url_es: cap.wikipedia_url_es ?? "",
              wikipedia_url_en: cap.wikipedia_url_en ?? "",
              distance_m: typeof cap.distance_m === "number" ? cap.distance_m : 0,
            };

            const el = buildProvisionalMarkerEl(provCtx.title);
            // Index el por entity_id (o title como fallback) para que
            // el effect de active-marker pueda re-estilar al abrir Echo.
            const indexKey = provCtx.entity_id || provCtx.title;
            if (indexKey) localMarkerElMapRef.current.set(indexKey, el);
            el.addEventListener("click", (ev) => {
              ev.stopPropagation();
              setProvisionalView({
                ...provCtx,
                narrative: null,
                imageUrl: null,
                description: null,
                pageUrl: null,
                loading: true,
              });
            });
            const marker = new maplibre.Marker({ element: el })
              .setLngLat([provCtx.lng, provCtx.lat])
              .addTo(map);
            localCapsuleMarkersRef.current.push(marker);
          }

          // ECHO AUTO-OPEN · cold-start UX. Si todavía no hay nada abierto,
          // abrimos el Echo card del POI más notable (top de la lista, ya
          // ordenado por sitelinks_count desc). One-shot via ref · no
          // re-fire en updates de geo. KUDOS arranca sintiéndose producto,
          // no mapa vacío.
          if (!autoOpenedEchoRef.current && data.capsules.length > 0) {
            const top = data.capsules[0];
            if (typeof top.lat === "number" && typeof top.lng === "number") {
              autoOpenedEchoRef.current = true;
              setProvisionalView({
                entity_id: (top as { entity_id?: string }).entity_id ?? "",
                title: top.title ?? "Lugar",
                lat: top.lat as number,
                lng: top.lng as number,
                distance_m: typeof top.distance_m === "number" ? top.distance_m : 0,
                wikidata_url: top.wikidata_url ?? "",
                wikipedia_url_es: top.wikipedia_url_es ?? "",
                wikipedia_url_en: top.wikipedia_url_en ?? "",
                narrative: null,
                imageUrl: null,
                description: null,
                pageUrl: null,
                loading: true,
              });
            }
          }
        })
        .catch(() => { /* swallow · UX no-op */ });
    }, 600);

    return () => {
      // CRITICAL: solo abort + cancel timer. NO removemos markers aquí
      // porque useGeolocation watchPosition con enableHighAccuracy=true
      // dispara updates de geo.lat/lng repetidos → cleanup correría en
      // bucle → markers se borrarían tras ~600ms de ser creados → user
      // ve mapa vacío. La rama de fetch ya limpia markers viejos antes
      // de añadir los nuevos. Cleanup real solo necesario en unmount,
      // que el GC handles correctamente con los markers en ref.
      if (localCapsuleTimerRef.current !== null) {
        window.clearTimeout(localCapsuleTimerRef.current);
      }
      if (localCapsuleAbortRef.current) {
        localCapsuleAbortRef.current.abort();
      }
    };
  }, [mapReady, maplibre, geo.status, geo.lat, geo.lng, panTick]);

  // P0.9 Memory Graph · render markers persistentes de las memorias
  // guardadas. Se ejecuta cuando:
  //   - El mapa está listo
  //   - El set de memorias cambia (save/remove en cualquier pestaña)
  //   - El usuario hace toggle del layer
  //
  // Estrategia: limpia TODOS los markers previos y los re-crea desde el
  // array actual. Más simple que diffing incremental y la cardinalidad
  // realista (decenas-cientos de memorias máximo) lo hace barato.
  //
  // Click en un memory marker → re-abre el panel CapsuleSession en esas
  // coords · permite al usuario volver a una memoria desde el mapa sin
  // ir a /mis-memorias. Cierra el ciclo: guardar → ver en mapa → re-abrir.
  React.useEffect(() => {
    if (!mapReady || !maplibre || !mapRef.current) return;

    // Limpia markers anteriores incondicionalmente
    for (const m of memoryMarkersRef.current) {
      try { m.remove(); } catch { /* defensive · marker ya removido */ }
    }
    memoryMarkersRef.current = [];

    // Si el layer está oculto · stop · refs ya limpias
    if (!memoryLayerVisible) return;
    if (!memory.hydrated || memory.entries.length === 0) return;

    const map = mapRef.current as Parameters<InstanceType<MapLibreModule["Marker"]>["addTo"]>[0];

    for (const entry of memory.entries) {
      // Solo entries con coords reales · skip entries sin geo (e.g.,
      // guardadas desde /capsules/<slug> directo).
      if (typeof entry.lat !== "number" || typeof entry.lng !== "number") continue;

      const el = document.createElement("div");
      // Visual distinto del click marker (accent solid) y del user
      // marker (ai blue): outline accent + relleno glass · "ya tiene
      // tu marca pero es persistente, no acción activa".
      el.style.cssText =
        "width:12px;height:12px;border-radius:50%;" +
        "background:rgba(167,139,250,0.45);" + // accent translúcido
        "border:1.5px solid var(--kudos-accent-bright);" +
        "box-shadow:0 0 10px var(--kudos-accent-glow);" +
        "cursor:pointer;";
      el.setAttribute("role", "button");
      el.setAttribute("aria-label", `Memoria: ${entry.title}`);
      el.title = entry.title;
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        track("memory_marker_clicked", {
          capsule_id_short: entry.id.slice(0, 8),
        });
        // Memory marker → Echo card · misma surface única.
        setProvisionalView({
          entity_id: "",
          title: entry.title || "Memoria",
          lat: entry.lat as number,
          lng: entry.lng as number,
          distance_m: 0,
          wikidata_url: "",
          wikipedia_url_es: "",
          wikipedia_url_en: "",
          narrative: null,
          imageUrl: null,
          description: null,
          pageUrl: null,
          loading: true,
        });
      });

      const marker = new maplibre.Marker({ element: el })
        .setLngLat([entry.lng as number, entry.lat as number])
        .addTo(map);

      memoryMarkersRef.current.push(marker);
    }

    return () => {
      // Cleanup al cambio de deps · evita acumulación de markers en hot
      // reload. El próximo run del effect re-crea limpiamente.
      for (const m of memoryMarkersRef.current) {
        try { m.remove(); } catch { /* defensive */ }
      }
      memoryMarkersRef.current = [];
    };
  }, [mapReady, maplibre, memory.entries, memory.hydrated, memoryLayerVisible]);

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      {/* One-time keyframe injection · Echo motion vocabulary.
          Todo en mismo lenguaje cinematográfico · sin gimmicks. */}
      <style>{`
        @keyframes kudos-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes kudos-hero-rise {
          0%   { opacity: 0; transform: translate(-50%, calc(-50% + 28px)); filter: blur(10px); }
          60%  { opacity: 1; filter: blur(0px); }
          100% { opacity: 1; transform: translate(-50%, -50%); filter: blur(0px); }
        }
        @keyframes kudos-marker-rise {
          from { opacity: 0; transform: scale(0.6); }
          to   { opacity: 1; transform: scale(1); }
        }
        /* Ken Burns · scale + drift lento · cinematic hero alive */
        @keyframes kudos-ken-burns {
          0%   { transform: scale(1.00) translate(0, 0); }
          100% { transform: scale(1.08) translate(-1.5%, -1.2%); }
        }
        @keyframes kudos-tab-fade {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes kudos-float {
          0%, 100% { transform: translate(-50%, -50%) translateY(0); }
          50%      { transform: translate(-50%, -50%) translateY(-4px); }
        }
        @keyframes kudos-hero-exit {
          0%   { opacity: 1; transform: translate(-50%, -50%); filter: blur(0px); }
          100% { opacity: 0; transform: translate(-50%, calc(-50% + 16px)); filter: blur(6px); }
        }
        /* Soundless cinema · ambient waveform mini glyph */
        @keyframes kudos-wave-1 { 0%,100% { transform: scaleY(0.35); } 50% { transform: scaleY(1); } }
        @keyframes kudos-wave-2 { 0%,100% { transform: scaleY(1); } 50% { transform: scaleY(0.45); } }
        @keyframes kudos-wave-3 { 0%,100% { transform: scaleY(0.55); } 50% { transform: scaleY(0.85); } }
        /* Skeleton shimmer · loading premium · no dead state */
        @keyframes kudos-shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      {/* Mapa · background layer · NO protagonista.
          Tiles renderizan a z-0 con un filter sutil que reduce contraste
          de roads + dims overall · empuja el mapa visualmente atrás. */}
      <div
        ref={mapContainerRef}
        className="absolute inset-0 z-0 h-full w-full"
        style={{
          // Cinematic grade · mapa se siente "telón de fondo".
          // En standalone mode, cuando Echo card open hace deep dim +
          // scale-down ilusión. En embedded mode el portal controla el
          // tratamiento visual del map column · keep mapa legible.
          filter: !embedded && provisionalView
            ? "saturate(0.45) contrast(0.82) brightness(0.48) blur(0.4px)"
            : "saturate(0.85) contrast(0.94) brightness(0.85)",
          transform: !embedded && provisionalView ? "scale(1.04)" : "scale(1)",
          transformOrigin: "50% 50%",
          transition: "filter 700ms ease, transform 900ms cubic-bezier(.2,.7,.2,1)",
        }}
      />

      {/* Atmospheric vignette · radial fade desde centro a esquinas.
          Empuja la atención al Echo (centro). pointer-events-none para
          no interceptar clicks de markers/mapa. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 50%, rgba(7,11,28,0) 35%, rgba(7,11,28,0.35) 70%, rgba(7,11,28,0.75) 100%)",
          opacity: provisionalView ? 1 : 0.7,
          transition: "opacity 600ms ease",
        }}
      />

      {/* Auto hero focus · dim suave sobre el mapa cuando Echo card
          está abierto. Reforzado por vignette + filter. Click-through
          NO: este overlay también captura para cerrar al tap-out.
          (Cierra Echo card al click fuera del card.) */}
      {!embedded && provisionalView ? (
        <div
          className="absolute inset-0 z-[2] cursor-default"
          style={{
            background:
              "radial-gradient(80% 60% at 50% 50%, rgba(7,11,28,0) 0%, rgba(7,11,28,0.45) 75%, rgba(7,11,28,0.72) 100%)",
            animation: closing
              ? "kudos-fade-in 280ms ease reverse both"
              : "kudos-fade-in 360ms ease both",
          }}
          onClick={closeEchoCinematic}
        />
      ) : null}

      {/* Empty-state CTA modal y banner instruccional ELIMINADOS por
          mandato producto: rompen el feel cinematográfico. El Echo card
          auto-opens en cold-start (north star), los markers son la
          invitación, el mapa es background no protagonista. */}

      {/* HERO ECHO CARD V1 · standalone mode only.
          Cuando embedded=true, el parent (EchoPortalLayout) renderiza
          su propio chrome a partir del onEchoChange callback · este
          bloque NO se monta. Mantiene el feature standalone para
          back-compat y demos isolados. */}
      {!embedded && provisionalView ? (() => {
        // Subtitle poético · si Wikipedia da description corta usable
        // (≤ 80 chars), la usamos; si no, fallback rotado deterministicamente
        // por entity_id hash · siempre cinematic, nunca dev label.
        const POETIC_FALLBACKS = [
          "Una memoria que sigue caminando entre estos pasos.",
          "Un eco que el lugar nunca llegó a callar.",
          "Donde el tiempo dobla la esquina y mira atrás.",
          "Lo que el lugar recuerda cuando nadie lo escucha.",
          "Aquí algo respira más despacio que el presente.",
          "El paisaje guarda nombres que no pronuncia.",
        ];
        const hashSeed = (provisionalView.entity_id || provisionalView.title).split("")
          .reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7);
        const fallbackSubtitle = POETIC_FALLBACKS[Math.abs(hashSeed) % POETIC_FALLBACKS.length];
        const rawDesc = (provisionalView.description ?? "").trim();
        const subtitle = rawDesc && rawDesc.length <= 80 ? rawDesc : fallbackSubtitle;

        // Micro story · 3-5 líneas · primera frase O 320 chars (más que
        // antes para llenar visual hero card sin saturar).
        const story = (() => {
          if (!provisionalView.narrative) return null;
          const raw = provisionalView.narrative.trim();
          const firstStop = raw.search(/(?<=[.!?])\s/);
          const sentenceEnd = firstStop > 100 && firstStop < 360 ? firstStop + 1 : 320;
          const cut = raw.slice(0, sentenceEnd).trim();
          return raw.length > cut.length ? cut + " …" : cut;
        })();

        const sourceUrl =
          provisionalView.pageUrl ||
          provisionalView.wikipedia_url_es ||
          provisionalView.wikipedia_url_en ||
          provisionalView.wikidata_url ||
          "";

        return (
          <div
            className="pointer-events-auto absolute left-1/2 top-1/2 z-40 w-[min(440px,calc(100vw-32px))]"
            style={{
              transform: "translate(-50%, -50%)",
              animation: closing
                ? "kudos-hero-exit 260ms cubic-bezier(.6,.0,.7,.2) both"
                : "kudos-hero-rise 520ms cubic-bezier(.16,.84,.28,1) both," +
                  " kudos-float 8s ease-in-out 1s infinite",
            }}
          >
            <div
              className="flex h-[min(70vh,720px)] flex-col overflow-hidden rounded-[32px]"
              style={{
                background:
                  "linear-gradient(180deg, rgba(11,16,38,0.96) 0%, rgba(7,11,28,0.96) 100%)",
                border: "1px solid rgba(167,139,250,0.12)",
                backdropFilter: "blur(24px) saturate(140%)",
                WebkitBackdropFilter: "blur(24px) saturate(140%)",
                // Multi-layer depth stack · float premium object
                boxShadow:
                  "0 48px 120px -32px rgba(0,0,0,0.85)," +     // deep drop
                  "0 24px 60px -20px rgba(0,0,0,0.55)," +       // mid drop
                  "0 0 0 1px rgba(167,139,250,0.12)," +         // hairline ring
                  "0 0 120px -24px rgba(139,92,246,0.42)," +    // violet ambient halo
                  "inset 0 1px 0 rgba(255,255,255,0.08)," +     // top glass highlight
                  "inset 0 -1px 0 rgba(0,0,0,0.4)",             // bottom seal
              }}
            >
              {/* HERO · 45% height · poster-like con lockup overlay */}
              <div className="relative w-full overflow-hidden bg-[rgba(11,15,34,1)]" style={{ flex: "0 0 45%" }}>
                {provisionalView.imageUrl && !heroImgFailed ? (
                  // Ken Burns · scale + drift slow · cinematic alive sin video.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={provisionalView.imageUrl}
                    alt=""
                    className="h-full w-full object-cover"
                    style={{
                      filter: "saturate(0.94) contrast(1.08) brightness(0.88)",
                      animation: "kudos-ken-burns 22s ease-out both",
                      transformOrigin: "55% 40%",
                    }}
                    onError={() => setHeroImgFailed(true)}
                  />
                ) : (() => {
                  // Premium fallback poster · feel intentional, no "missing image".
                  // Iniciales del título (max 2) sobre textura ambient + frase poética.
                  const initials = provisionalView.title
                    .split(/\s+/)
                    .filter((w) => w.length > 0)
                    .slice(0, 2)
                    .map((w) => w.charAt(0).toUpperCase())
                    .join("");
                  return (
                    <div className="relative h-full w-full overflow-hidden">
                      {/* Capa textura abstracta · radial violet + cyan + dust */}
                      <div
                        className="absolute inset-0"
                        style={{
                          background:
                            "radial-gradient(140% 90% at 25% 20%, rgba(196,181,253,0.38) 0%, rgba(109,40,217,0.26) 32%, rgba(7,11,28,0) 65%)," +
                            "radial-gradient(90% 70% at 78% 88%, rgba(56,189,248,0.22) 0%, rgba(7,11,28,0) 58%)," +
                            "radial-gradient(60% 40% at 60% 40%, rgba(167,139,250,0.18) 0%, rgba(7,11,28,0) 70%)",
                          animation: "kudos-ken-burns 22s ease-out both",
                          transformOrigin: "40% 50%",
                        }}
                      />
                      {/* Grain/dust pattern · imágenes inexistentes pero usamos
                          radial dot pattern micro para textura premium. */}
                      <div
                        aria-hidden
                        className="absolute inset-0 mix-blend-overlay opacity-30"
                        style={{
                          background:
                            "radial-gradient(circle, rgba(255,255,255,0.08) 0.5px, transparent 1px) 0 0/8px 8px",
                        }}
                      />
                      {/* Iniciales gigantes · letterpress display */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span
                          aria-hidden
                          className="font-display font-extralight tracking-[-0.04em] text-white/[0.045] select-none"
                          style={{
                            fontSize: "clamp(120px, 28vw, 200px)",
                            lineHeight: 1,
                            textShadow: "0 4px 24px rgba(0,0,0,0.4)",
                          }}
                        >
                          {initials || "·"}
                        </span>
                      </div>
                    </div>
                  );
                })()}
                {/* Edge vignette · oscurece esquinas para enfocar centro */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background:
                      "radial-gradient(110% 80% at 50% 45%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.55) 100%)",
                  }}
                />
                {/* Title glow zone · soft violet wash detrás del lockup */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-[60%]"
                  style={{
                    background:
                      "radial-gradient(80% 100% at 20% 100%, rgba(139,92,246,0.22) 0%, rgba(7,11,28,0) 60%)",
                  }}
                />
                {/* Gradient fade to body */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-[62%]"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(7,11,28,0) 0%, rgba(7,11,28,0.55) 50%, rgba(7,11,28,0.95) 90%, rgba(11,16,38,0.96) 100%)",
                  }}
                />

                {/* LOCKUP OVERLAY · bottom-left poster-feel.
                    Echo glyph + small title repeat + poetic subtitle.
                    Esto convierte el hero en cartel, no foto + body. */}
                <div className="absolute bottom-4 left-5 right-12 flex flex-col gap-1">
                  <div className="flex items-center gap-2.5">
                    <span
                      aria-hidden
                      className="inline-block size-1.5 rounded-full"
                      style={{
                        background: "var(--kudos-accent-bright)",
                        boxShadow: "0 0 14px var(--kudos-accent-glow), 0 0 4px rgba(0,0,0,0.55)",
                        animation: "kudos-breathe 3.2s ease-in-out infinite",
                      }}
                    />
                    <span className="font-mono text-[9px] uppercase tracking-[0.40em] text-white/55">
                      Echo
                    </span>
                    {/* Soundless cinema · waveform mini glyph · "alive" feel */}
                    <span aria-hidden className="ml-1 inline-flex h-3 items-end gap-[2px]">
                      <span
                        className="block w-[2px] rounded-sm"
                        style={{
                          height: "100%",
                          background: "var(--kudos-accent-bright)",
                          opacity: 0.55,
                          transformOrigin: "bottom",
                          animation: "kudos-wave-1 1.6s ease-in-out infinite",
                        }}
                      />
                      <span
                        className="block w-[2px] rounded-sm"
                        style={{
                          height: "100%",
                          background: "var(--kudos-accent-bright)",
                          opacity: 0.55,
                          transformOrigin: "bottom",
                          animation: "kudos-wave-2 1.6s ease-in-out infinite",
                        }}
                      />
                      <span
                        className="block w-[2px] rounded-sm"
                        style={{
                          height: "100%",
                          background: "var(--kudos-accent-bright)",
                          opacity: 0.55,
                          transformOrigin: "bottom",
                          animation: "kudos-wave-3 1.6s ease-in-out infinite",
                        }}
                      />
                    </span>
                  </div>
                  <p
                    className="truncate font-display text-[15px] font-light tracking-tight text-white/92"
                    style={{ textShadow: "0 2px 12px rgba(0,0,0,0.6)" }}
                  >
                    {provisionalView.title}
                  </p>
                </div>

                {/* Top-right close · glass, NOT dev chrome */}
                <button
                  type="button"
                  onClick={closeEchoCinematic}
                  aria-label="Cerrar"
                  className="absolute right-4 top-4 grid size-8 place-items-center rounded-full border border-white/14 bg-[rgba(7,11,28,0.5)] text-[15px] leading-none text-white/75 backdrop-blur-md transition-all hover:bg-[rgba(7,11,28,0.82)] hover:text-white"
                  style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.4)" }}
                >
                  ×
                </button>
              </div>

              {/* BODY · Mini Echo Portal · tabs HISTORIA / LUGAR / ECOS.
                  55% height, internal scroll en el tab content (no la
                  card entera). Card permanece bounded · portal feel. */}
              <div className="flex min-h-0 flex-1 flex-col gap-3 px-6 pb-5 pt-4">
                {/* Title + poetic subtitle · siempre visible.
                    Mientras backend sintetiza subtitle, mostramos shimmer
                    line en vez del fallback poético · evita flash. */}
                <div className="flex flex-col gap-1.5">
                  <h2 className="font-display text-[clamp(24px,5.5vw,34px)] font-extralight leading-[1.05] tracking-[-0.01em] text-white/97">
                    {provisionalView.title}
                  </h2>
                  {provisionalView.loading && !provisionalView.description ? (
                    <span
                      aria-hidden
                      className="block h-3.5 w-[78%] rounded-full"
                      style={{
                        background:
                          "linear-gradient(90deg, rgba(196,181,253,0.10) 0%, rgba(196,181,253,0.28) 50%, rgba(196,181,253,0.10) 100%)",
                        backgroundSize: "200% 100%",
                        animation: "kudos-shimmer 1.6s ease-in-out infinite",
                      }}
                    />
                  ) : (
                    <p className="font-display text-[14px] font-light italic leading-snug text-[var(--kudos-accent-bright)]/82">
                      {subtitle}
                    </p>
                  )}
                </div>

                {/* TAB STRIP · 3 premium glass chips */}
                {(() => {
                  const tabs: Array<{ id: "historia" | "lugar" | "ecos"; label: string }> = [
                    { id: "historia", label: "Historia" },
                    { id: "lugar",    label: "Lugar" },
                    { id: "ecos",     label: "Ecos" },
                  ];
                  return (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {tabs.map((t) => {
                        const active = echoTab === t.id;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setEchoTab(t.id)}
                            className="relative inline-flex items-center rounded-full px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.30em] transition-all"
                            style={{
                              background: active
                                ? "rgba(167,139,250,0.14)"
                                : "rgba(255,255,255,0.025)",
                              border: active
                                ? "1px solid rgba(167,139,250,0.55)"
                                : "1px solid rgba(255,255,255,0.06)",
                              color: active
                                ? "var(--kudos-accent-bright)"
                                : "rgba(255,255,255,0.5)",
                              boxShadow: active
                                ? "0 0 16px -4px rgba(167,139,250,0.55), inset 0 1px 0 rgba(255,255,255,0.06)"
                                : "none",
                            }}
                          >
                            {t.label}
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* TAB CONTENT · single scrollable region · cross-fade
                    via key prop · React remounts → keyframe re-triggers. */}
                <div
                  key={echoTab}
                  className="-mr-2 min-h-[120px] flex-1 overflow-y-auto pr-2"
                  style={{ animation: "kudos-tab-fade 340ms cubic-bezier(.2,.7,.2,1) both" }}
                >
                  {echoTab === "historia" ? (
                    provisionalView.loading ? (
                      // Skeleton · shimmer lines premium · no "loading" text feel.
                      <div className="flex flex-col gap-2 py-1">
                        <span
                          aria-hidden
                          className="block h-3 w-[88%] rounded-full"
                          style={{
                            background:
                              "linear-gradient(90deg, rgba(167,139,250,0.08) 0%, rgba(167,139,250,0.22) 50%, rgba(167,139,250,0.08) 100%)",
                            backgroundSize: "200% 100%",
                            animation: "kudos-shimmer 1.6s ease-in-out infinite",
                          }}
                        />
                        <span
                          aria-hidden
                          className="block h-3 w-[72%] rounded-full"
                          style={{
                            background:
                              "linear-gradient(90deg, rgba(167,139,250,0.08) 0%, rgba(167,139,250,0.22) 50%, rgba(167,139,250,0.08) 100%)",
                            backgroundSize: "200% 100%",
                            animation: "kudos-shimmer 1.6s ease-in-out 0.2s infinite",
                          }}
                        />
                        <span
                          aria-hidden
                          className="block h-3 w-[55%] rounded-full"
                          style={{
                            background:
                              "linear-gradient(90deg, rgba(167,139,250,0.08) 0%, rgba(167,139,250,0.22) 50%, rgba(167,139,250,0.08) 100%)",
                            backgroundSize: "200% 100%",
                            animation: "kudos-shimmer 1.6s ease-in-out 0.4s infinite",
                          }}
                        />
                      </div>
                    ) : story ? (
                      <p className="font-display text-[15.5px] font-light leading-[1.6] text-white/82">
                        {story}
                      </p>
                    ) : (
                      <p className="font-display text-[14px] font-light italic leading-relaxed text-white/55">
                        El lugar guarda silencio · todavía no encuentra palabras propias.
                      </p>
                    )
                  ) : null}

                  {echoTab === "lugar" ? (() => {
                    const region = regionFromCoords(provisionalView.lat, provisionalView.lng);
                    // ADN cultural · prefer LLM-derived dna del backend Echo
                    // synthesis; cae a region table fallback solo si el
                    // backend no devolvió nada.
                    const llmDna = (provisionalView.culturalDna ?? []).filter((t) => t && t !== region.name);
                    const dna = llmDna.length > 0
                      ? llmDna.slice(0, 6)
                      : region.tags.filter((t) => t !== region.name).slice(0, 6);
                    return (
                      <div className="flex flex-col gap-5 pt-1">
                        {/* Region name · editorial big */}
                        <div className="flex flex-col gap-1">
                          <span className="font-mono text-[9px] uppercase tracking-[0.40em] text-white/35">
                            Región
                          </span>
                          <h3 className="font-display text-[26px] font-extralight tracking-tight text-white/95">
                            {region.name}
                          </h3>
                        </div>

                        {/* ADN cultural · editorial chip cluster */}
                        <div className="flex flex-col gap-2">
                          <span className="font-mono text-[9px] uppercase tracking-[0.40em] text-white/35">
                            ADN cultural
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {dna.map((c, i) => (
                              <span
                                key={`${c}-${i}`}
                                className="rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.32em] text-white/72"
                                style={{
                                  background: "rgba(255,255,255,0.028)",
                                  border: "1px solid rgba(255,255,255,0.07)",
                                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
                                }}
                              >
                                {c}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Coordenadas · editorial row */}
                        <div className="flex flex-col gap-2 border-t border-white/6 pt-3">
                          <span className="font-mono text-[9px] uppercase tracking-[0.40em] text-white/35">
                            Coordenadas
                          </span>
                          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
                            <div className="flex flex-col">
                              <span className="font-mono text-[8.5px] uppercase tracking-[0.30em] text-white/30">lat</span>
                              <span className="font-display text-[15px] font-light tracking-tight text-white/82">
                                {provisionalView.lat.toFixed(4)}°
                              </span>
                            </div>
                            <span aria-hidden className="h-5 w-px bg-white/10" />
                            <div className="flex flex-col">
                              <span className="font-mono text-[8.5px] uppercase tracking-[0.30em] text-white/30">lng</span>
                              <span className="font-display text-[15px] font-light tracking-tight text-white/82">
                                {provisionalView.lng.toFixed(4)}°
                              </span>
                            </div>
                            {provisionalView.distance_m > 0 ? (
                              <>
                                <span aria-hidden className="h-5 w-px bg-white/10" />
                                <div className="flex flex-col">
                                  <span className="font-mono text-[8.5px] uppercase tracking-[0.30em] text-white/30">distancia</span>
                                  <span className="font-display text-[15px] font-light tracking-tight text-[var(--kudos-accent-bright)]/85">
                                    {(provisionalView.distance_m / 1000).toFixed(2)} km
                                  </span>
                                </div>
                              </>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })() : null}

                  {echoTab === "ecos" ? (() => {
                    const others = localCapsulesCacheRef.current
                      .filter((c) =>
                        typeof c.lat === "number" &&
                        typeof c.lng === "number" &&
                        (c.entity_id ? c.entity_id !== provisionalView.entity_id : true) &&
                        (c.title ?? "") !== provisionalView.title,
                      )
                      .slice(0, 4);
                    // Poetic stubs · deterministic hash → subtitle.
                    // Da textura emocional sin backend ni data extra.
                    const ECO_STUBS = [
                      "Un eco que aún respira.",
                      "El paisaje lo recuerda.",
                      "Vivo entre olas y piedra.",
                      "Memoria que el viento guarda.",
                      "Voz que no calla nunca.",
                      "Donde la tierra escucha.",
                      "Pequeña historia eterna.",
                    ];
                    const stubFor = (id: string) => {
                      const h = id.split("").reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 11);
                      return ECO_STUBS[Math.abs(h) % ECO_STUBS.length];
                    };
                    if (others.length === 0) {
                      return (
                        <p className="font-display text-[13px] font-light italic leading-relaxed text-white/50">
                          Otros ecos cercanos aparecerán cuando el mapa explore más territorio.
                        </p>
                      );
                    }
                    return (
                      <div className="flex flex-col gap-3 pt-1">
                        <div className="flex items-baseline justify-between">
                          <p className="font-display text-[13px] font-light italic leading-snug text-white/55">
                            Otros lugares que resuenan cerca.
                          </p>
                          <span className="font-mono text-[9px] uppercase tracking-[0.30em] text-white/30">
                            {others.length}
                          </span>
                        </div>
                        <div className="relative flex flex-col gap-2">
                          {/* Constellation rail · hairline vertical violet
                              que conecta los stubs · memorias relacionadas */}
                          {others.length > 1 ? (
                            <span
                              aria-hidden
                              className="pointer-events-none absolute left-[27px] top-3 bottom-3 w-px"
                              style={{
                                background:
                                  "linear-gradient(180deg, rgba(167,139,250,0) 0%, rgba(167,139,250,0.32) 18%, rgba(167,139,250,0.32) 82%, rgba(167,139,250,0) 100%)",
                              }}
                            />
                          ) : null}
                          {others.map((o, i) => {
                            const dKm = typeof o.distance_m === "number"
                              ? (o.distance_m / 1000).toFixed(1) + " km"
                              : "";
                            const stub = stubFor((o.entity_id ?? "") + (o.title ?? ""));
                            return (
                              <button
                                key={(o.entity_id ?? "") + i}
                                type="button"
                                onClick={() => {
                                  if (typeof o.lat !== "number" || typeof o.lng !== "number") return;
                                  setProvisionalView({
                                    entity_id: o.entity_id ?? "",
                                    title: o.title ?? "Lugar",
                                    lat: o.lat,
                                    lng: o.lng,
                                    distance_m: typeof o.distance_m === "number" ? o.distance_m : 0,
                                    wikidata_url: "",
                                    wikipedia_url_es: o.wikipedia_url_es ?? "",
                                    wikipedia_url_en: o.wikipedia_url_en ?? "",
                                    narrative: null,
                                    imageUrl: null,
                                    description: null,
                                    pageUrl: null,
                                    loading: true,
                                  });
                                }}
                                className="group relative flex items-center gap-3 rounded-2xl px-3.5 py-3 text-left"
                                style={{
                                  background: "rgba(255,255,255,0.028)",
                                  border: "1px solid rgba(255,255,255,0.06)",
                                  transition: "transform .28s cubic-bezier(.2,.7,.2,1), background .25s ease, border-color .25s ease, box-shadow .3s ease",
                                }}
                                onMouseEnter={(e) => {
                                  const el = e.currentTarget;
                                  el.style.transform = "translateY(-2px)";
                                  el.style.background = "rgba(167,139,250,0.06)";
                                  el.style.borderColor = "rgba(167,139,250,0.30)";
                                  el.style.boxShadow = "0 8px 24px -10px rgba(139,92,246,0.45), inset 0 1px 0 rgba(255,255,255,0.06)";
                                }}
                                onMouseLeave={(e) => {
                                  const el = e.currentTarget;
                                  el.style.transform = "translateY(0)";
                                  el.style.background = "rgba(255,255,255,0.028)";
                                  el.style.borderColor = "rgba(255,255,255,0.06)";
                                  el.style.boxShadow = "none";
                                }}
                              >
                                {/* Thumbnail placeholder · violet gradient orb · feel
                                    de "memory stub" sin requerir thumbnail data. */}
                                <span
                                  aria-hidden
                                  className="grid size-10 shrink-0 place-items-center rounded-xl"
                                  style={{
                                    background:
                                      "radial-gradient(circle at 30% 30%, rgba(196,181,253,0.45) 0%, rgba(139,92,246,0.22) 60%, rgba(7,11,28,0.4) 100%)",
                                    border: "1px solid rgba(167,139,250,0.22)",
                                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
                                  }}
                                >
                                  <span
                                    className="inline-block size-1.5 rounded-full"
                                    style={{
                                      background: "var(--kudos-accent-bright)",
                                      boxShadow: "0 0 10px var(--kudos-accent-glow)",
                                    }}
                                  />
                                </span>
                                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                                  <span className="truncate font-display text-[14.5px] font-light tracking-tight text-white/92">
                                    {o.title ?? "Lugar"}
                                  </span>
                                  <span className="truncate font-display text-[11.5px] font-light italic text-[var(--kudos-accent-bright)]/65">
                                    {stub}
                                  </span>
                                  {dKm ? (
                                    <span className="font-mono text-[9px] uppercase tracking-[0.28em] text-white/35">
                                      {dKm}
                                    </span>
                                  ) : null}
                                </div>
                                <span
                                  aria-hidden
                                  className="font-mono text-[13px] text-white/30 transition-all group-hover:translate-x-1 group-hover:text-[var(--kudos-accent-bright)]"
                                >
                                  →
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })() : null}
                </div>

                {/* CTA ZONE · primary + secondary actions */}
                <div className="flex flex-col items-center gap-2 pt-1">
                  <a
                    href={sourceUrl || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => { if (!sourceUrl) e.preventDefault(); }}
                    className="group inline-flex items-center gap-3 rounded-full border border-[var(--kudos-accent)]/60 bg-[var(--kudos-accent)]/15 px-7 py-3.5 font-mono text-[11px] uppercase tracking-[0.36em] text-[var(--kudos-accent-bright)] transition-all hover:bg-[var(--kudos-accent)]/25 hover:tracking-[0.40em]"
                    style={{
                      boxShadow:
                        "0 0 0 1px rgba(167,139,250,0.12)," +
                        "0 16px 32px -12px rgba(139,92,246,0.55)," +
                        "0 0 32px -8px rgba(167,139,250,0.45)",
                    }}
                  >
                    <span>Entrar en este Echo</span>
                    <span
                      aria-hidden
                      className="transition-transform group-hover:translate-x-0.5"
                      style={{ letterSpacing: 0 }}
                    >
                      →
                    </span>
                  </a>

                  {/* Source badge · dev mode only (localStorage.kudos_dev=1).
                      Invisible al user normal · founder debug truth. */}
                  {isDevMode && provisionalView.echoSource ? (
                    <span
                      className="mx-auto font-mono text-[8.5px] uppercase tracking-[0.36em] text-white/30"
                      style={{
                        textShadow: "0 1px 0 rgba(0,0,0,0.4)",
                      }}
                    >
                      {provisionalView.echoSource}
                    </span>
                  ) : null}

                  {/* Secondary actions · glass pills · wrap-safe en mobile. */}
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    {(() => {
                      const pillStyle: React.CSSProperties = {
                        background: "rgba(255,255,255,0.035)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
                        transition: "all .25s ease",
                      };
                      const liftIn = (e: React.MouseEvent<HTMLElement>) => {
                        const el = e.currentTarget as HTMLElement;
                        el.style.background = "rgba(167,139,250,0.10)";
                        el.style.borderColor = "rgba(167,139,250,0.35)";
                        el.style.boxShadow =
                          "inset 0 1px 0 rgba(255,255,255,0.06)," +
                          "0 6px 16px -8px rgba(139,92,246,0.45)";
                      };
                      const liftOut = (e: React.MouseEvent<HTMLElement>) => {
                        const el = e.currentTarget as HTMLElement;
                        el.style.background = "rgba(255,255,255,0.035)";
                        el.style.borderColor = "rgba(255,255,255,0.08)";
                        el.style.boxShadow = "inset 0 1px 0 rgba(255,255,255,0.04)";
                      };
                      return (
                        <>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 font-mono text-[9.5px] uppercase tracking-[0.28em] text-white/65"
                            style={pillStyle}
                            onMouseEnter={liftIn}
                            onMouseLeave={liftOut}
                          >
                            <span aria-hidden style={{ fontSize: "12px", lineHeight: 1 }}>♡</span>
                            Guardar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (typeof navigator !== "undefined" && navigator.share && sourceUrl) {
                                navigator.share({
                                  title: provisionalView.title,
                                  text: subtitle,
                                  url: sourceUrl,
                                }).catch(() => { /* user cancel · ignore */ });
                              }
                            }}
                            className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 font-mono text-[9.5px] uppercase tracking-[0.28em] text-white/65"
                            style={pillStyle}
                            onMouseEnter={liftIn}
                            onMouseLeave={liftOut}
                          >
                            <span aria-hidden style={{ fontSize: "12px", lineHeight: 1 }}>↗</span>
                            Compartir
                          </button>
                          {sourceUrl ? (
                            <a
                              href={sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 font-mono text-[9.5px] uppercase tracking-[0.28em] text-white/65"
                              style={pillStyle}
                              onMouseEnter={liftIn}
                              onMouseLeave={liftOut}
                            >
                              <span aria-hidden style={{ fontSize: "12px", lineHeight: 1 }}>◐</span>
                              Fuente
                            </a>
                          ) : null}
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })() : null}

      {/* CLUSTER-LIST PANEL · cuando un cluster ya está al máximo zoom
          razonable (≥14) y el usuario lo clickea, en vez de hacer más
          zoom mostramos la lista de cápsulas agrupadas. Click en una
          fila abre el capsule panel normal. */}
      {clusterList ? (
        <div className="pointer-events-auto absolute left-1/2 top-1/2 z-30 w-[min(320px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 transform">
          <div className="flex flex-col gap-2 rounded-2xl border border-[var(--kudos-accent)]/30 bg-[rgba(5,10,31,0.94)] p-4 backdrop-blur-md">
            <div className="mb-1 flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/55">
                {clusterList.capsules.length} memorias aquí
              </span>
              <button
                type="button"
                onClick={() => setClusterList(null)}
                aria-label="Cerrar"
                className="text-[18px] leading-none text-white/45 transition-colors hover:text-white/85"
              >
                ×
              </button>
            </div>
            <ul className="flex max-h-[280px] flex-col gap-1.5 overflow-y-auto">
              {clusterList.capsules.map((cap, idx) => (
                <li key={`${cap.lat}-${cap.lng}-${idx}`}>
                  <button
                    type="button"
                    onClick={() => {
                      // Cluster list item → Echo card surface única.
                      setProvisionalView({
                        entity_id: "",
                        title: cap.title ?? "Lugar",
                        lat: cap.lat,
                        lng: cap.lng,
                        distance_m: 0,
                        wikidata_url: "",
                        wikipedia_url_es: "",
                        wikipedia_url_en: "",
                        narrative: null,
                        imageUrl: null,
                        description: null,
                        pageUrl: null,
                        loading: true,
                      });
                      setClusterList(null);
                    }}
                    className="block w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-left transition-colors hover:border-[var(--kudos-accent)]/45 hover:bg-white/[0.06]"
                  >
                    <div className="truncate font-display text-[13px] font-light text-white/90">
                      {cap.title ?? "Cápsula"}
                    </div>
                    <div className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.24em] text-white/40">
                      {cap.lat.toFixed(4)}, {cap.lng.toFixed(4)}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {/* P0.9 Memory Graph · toggle del layer personal · solo aparece
          cuando el usuario tiene >0 memorias guardadas. Posicionado
          arriba-derecha (esquina sin interferencia con click marker) ·
          glass button consistente con el resto del chrome. */}
      {memory.hydrated && memory.entries.length > 0 ? (
        <div className="absolute right-4 top-6 z-10">
          <button
            type="button"
            onClick={() => {
              const next = !memoryLayerVisible;
              setMemoryLayerVisible(next);
              track("map_memory_layer_toggled", {
                visible: next ? "yes" : "no",
                count: memory.entries.length,
              });
            }}
            aria-pressed={memoryLayerVisible}
            className={
              "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 " +
              "font-mono text-[10px] uppercase tracking-[0.28em] " +
              "backdrop-blur-md transition-all duration-300 " +
              (memoryLayerVisible
                ? "border-[var(--kudos-accent)]/55 bg-[var(--kudos-accent)]/15 text-[var(--kudos-accent-bright)]"
                : "border-white/15 bg-[rgba(5,10,31,0.78)] text-white/55 hover:text-white/85")
            }
          >
            <span
              aria-hidden
              className="size-1.5 rounded-full"
              style={{
                background: memoryLayerVisible
                  ? "var(--kudos-accent-bright)"
                  : "rgba(255,255,255,0.4)",
                boxShadow: memoryLayerVisible
                  ? "0 0 8px var(--kudos-accent-glow)"
                  : "none",
              }}
            />
            <span>Mis memorias · {memory.entries.length}</span>
          </button>
        </div>
      ) : null}

      {/* MICRO TIMELINE · Netflix-grade pill · era + year + thin track.
          Auto-fade cuando Echo card abre · cinematic focus shift. */}
      {!embedded && !provisionalView ? (
        <div
          className="pointer-events-auto absolute left-1/2 z-30"
          style={{
            bottom: "max(1.5rem, env(safe-area-inset-bottom))",
            transform: "translateX(-50%)",
            animation: "kudos-fade-in 480ms ease 200ms both",
          }}
        >
          <div
            className="flex items-center gap-4 rounded-full border border-white/6 px-5 py-2.5"
            style={{
              background: "rgba(7,11,28,0.55)",
              backdropFilter: "blur(20px) saturate(140%)",
              WebkitBackdropFilter: "blur(20px) saturate(140%)",
              boxShadow: "0 12px 32px -16px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)",
            }}
          >
            <span className="font-mono text-[9px] uppercase tracking-[0.36em] text-white/35">
              {eraOfYear(selectedYear)}
            </span>
            <span
              aria-hidden
              className="h-3 w-px bg-white/10"
            />
            <span className="font-display text-[13.5px] font-extralight tracking-tight text-[var(--kudos-accent-bright)]">
              {labelForYear(selectedYear)}
            </span>
            <input
              type="range"
              min={-500}
              max={2026}
              step={10}
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              aria-label="Año"
              className="kudos-year-slider w-[160px] cursor-pointer appearance-none bg-transparent"
              style={{
                ["--track" as string]: "rgba(167,139,250,0.12)",
                ["--fill" as string]: "rgba(196,181,253,0.75)",
              }}
            />
          </div>
        </div>
      ) : null}

      {/* PURGED: hover preview mini-card y bottom CapsuleSession panel.
          Eran la fuente del "Este lugar guarda silencio" y del feel
          engineering. Reemplazados por el Echo card único (provisionalView).
          Cualquier click ahora se enruta a setProvisionalView · una sola
          superficie cinematográfica para todo el producto. */}
    </div>
  );
}
