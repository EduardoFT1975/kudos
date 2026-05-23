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
import { CapsuleSession } from "@/features/capsule/CapsuleSession";
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
// Si no hay memorias propias dentro de NEARBY_RADIUS_KM, mostramos el
// empty-state panel con ciudades sembradas como CTAs OPCIONALES de
// exploración (Roma/Atenas/Egipto en CITY_PRESETS). Nunca teleportamos
// automáticamente — KUDOS es geolocalizado.
const NEARBY_RADIUS_KM = 25;
const CITY_PRESETS: ReadonlyArray<{
  id: string;
  label: string;
  center: [number, number];
}> = [
  { id: "roma",   label: "Roma",            center: [12.4922, 41.8902] },
  { id: "atenas", label: "Atenas",          center: [23.7261, 37.9755] },
  { id: "egipto", label: "Egipto · Gizeh",  center: [31.1342, 29.9792] },
];

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

interface ClickedCoords {
  lat: number;
  lng: number;
  title?: string;
  hero?: ResolvedMedia;
}
interface HoveredPreview {
  x: number;
  y: number;
  title: string;
  thumbnail: string;
  year: string;
  hasClip: boolean;
}

export function MapExplorer() {
  const mapContainerRef = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<unknown>(null); // maplibre.Map · lazy typed
  const userMarkerRef = React.useRef<unknown>(null);
  const clickMarkerRef = React.useRef<unknown>(null);
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
  const [maplibre, setMaplibre] = React.useState<MapLibreModule | null>(null);
  const [mapReady, setMapReady] = React.useState(false);
  const [clicked, setClicked] = React.useState<ClickedCoords | null>(null);
  const [memoryLayerVisible, setMemoryLayerVisible] = React.useState<boolean>(true);
  // P2 · Floating media preview on marker hover
  const [hoveredPreview, setHoveredPreview] =
    React.useState<HoveredPreview | null>(null);
  // Real-geo decision · emptyNearby=true cuando geo está ready, memory
  // hidratado, y no hay memorias dentro de NEARBY_RADIUS_KM. Dispara
  // el CTA panel con ciudades sembradas (Roma/Atenas/Egipto).
  const [emptyNearby, setEmptyNearby] = React.useState<boolean>(false);
  // Cluster-expansion list · cuando un cluster se clickea pero el mapa
  // ya está al máximo zoom razonable, en vez de hacer más zoom abrimos
  // un panel con la lista de cápsulas del grupo.
  const [clusterList, setClusterList] =
    React.useState<ClusterListState | null>(null);
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
                    // eslint-disable-next-line no-console
                    console.log("FLYTO CLUSTER", [avgLng, avgLat], { fromZoom: currentZoom });
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
                  const hero = resolveTemporalMedia(cap, selectedYearRef.current);
                  setClicked({
                    lat: cap.lat,
                    lng: cap.lng,
                    title: cap.title,
                    hero,
                  });
                });
                // P2 · floating preview on hover · positioned via map.project
                el.addEventListener("mouseenter", () => {
                  const pt = map.project([cap.lng, cap.lat]);
                  const hero = resolveTemporalMedia(cap, selectedYearRef.current);
                  setHoveredPreview({
                    x: pt.x,
                    y: pt.y,
                    title: cap.title ?? "Cápsula",
                    thumbnail: hero.thumbnailUrl || hero.imageUrl,
                    year: labelForYear(selectedYearRef.current),
                    hasClip: Boolean(hero.clipUrl),
                  });
                });
                el.addEventListener("mouseleave", () => {
                  setHoveredPreview(null);
                });
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
                  // eslint-disable-next-line no-console
                  console.log("FLYTO VIEWPORT (fitBounds)", { count: lngLats.length });
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
                  // eslint-disable-next-line no-console
                  console.log("FLYTO VIEWPORT (single)", lngLats[0]);
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
              (pt) => {
                if (!pt) {
                  setHoveredPreview(null);
                  return;
                }
                setHoveredPreview({
                  x: pt.x,
                  y: pt.y,
                  title: pt.data.title,
                  thumbnail: pt.data.thumbnail,
                  year: pt.data.year,
                  hasClip: pt.data.hasClip,
                });
              },
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

    map.on("click", (e: { lngLat: { lng: number; lat: number } }) => {
      setClicked({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    });

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

    // Memorias propias dentro del radio cercano · suficiente para que
    // la zona "valga la pena" como cold-start. Capsules públicas del
    // viewport fetch no cuentan aquí (esas se cargan después y no
    // sabemos en este momento si la zona está poblada).
    let hasNearby = false;
    for (const entry of memory.entries) {
      if (typeof entry.lat !== "number" || typeof entry.lng !== "number") continue;
      if (haversineKm(userLngLat, [entry.lng, entry.lat]) <= NEARBY_RADIUS_KM) {
        hasNearby = true;
        break;
      }
    }

    // Política: la cámara va SIEMPRE a la posición real del usuario.
    // Geolocation es la única autoridad sobre la cámara inicial.
    // eslint-disable-next-line no-console
    console.log("FLYTO GEO", userLngLat, { hasNearby });
    map.flyTo({ center: userLngLat, zoom: 14, duration: 1200 });
    setEmptyNearby(!hasNearby);

    // TEMP DEBUG · verifica que el effect corre con coords válidas.
    // Quitar tras confirmar pin visible en producción.
    // eslint-disable-next-line no-console
    console.log("[KUDOS · map] USER GEO:", userLngLat);

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

  // Local Capsule Generator (MVP · Phase 1)
  // Cuando geo está ready, pide al backend Wikidata POIs cercanos al
  // usuario (radio 10 km) y los pinta como provisional markers cyan.
  // Mantiene el mapa con contenido aunque no haya capsules verificadas
  // ni memorias propias. Endpoint /api/local-capsules/ devuelve entidades
  // reales (sin LLM, sin alucinación) sourced de Wikidata SPARQL.
  React.useEffect(() => {
    if (!mapReady || !maplibre || !mapRef.current) return;
    if (geo.status !== "ready" || typeof geo.lat !== "number" || typeof geo.lng !== "number") return;
    const map = mapRef.current as Parameters<InstanceType<MapLibreModule["Marker"]>["addTo"]>[0];

    // Cyan AI provisional marker · más sutil que el violet KUDOS marker
    // para indicar "esto es exploración asistida, no curado humano".
    const buildProvisionalMarkerEl = (title: string) => {
      const root = document.createElement("div");
      root.title = title;
      root.style.cssText =
        "position:relative;width:22px;height:22px;cursor:pointer;";
      const halo = document.createElement("div");
      halo.style.cssText =
        "position:absolute;inset:0;border-radius:9999px;" +
        "background:#38bdf8;opacity:0.18;filter:blur(3px);";
      const core = document.createElement("div");
      core.style.cssText =
        "position:absolute;top:50%;left:50%;" +
        "transform:translate(-50%,-50%);" +
        "width:8px;height:8px;border-radius:9999px;" +
        "background:radial-gradient(circle at 35% 35%," +
        "#ffffff 0%,#7dd3fc 25%,#38bdf8 60%,rgba(56,189,248,0) 100%);" +
        "transition:transform .18s ease;" +
        "border:1px solid rgba(125,211,252,0.55);";
      root.appendChild(halo);
      root.appendChild(core);
      root.addEventListener("mouseenter", () => {
        core.style.transform = "translate(-50%,-50%) scale(1.4)";
      });
      root.addEventListener("mouseleave", () => {
        core.style.transform = "translate(-50%,-50%) scale(1)";
      });
      return root;
    };

    // Debounce + abort previous request
    if (localCapsuleTimerRef.current !== null) {
      window.clearTimeout(localCapsuleTimerRef.current);
    }
    localCapsuleTimerRef.current = window.setTimeout(() => {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
      const url =
        apiBase +
        "/api/local-capsules/?lat=" + (geo.lat as number).toFixed(5) +
        "&lng=" + (geo.lng as number).toFixed(5) +
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
          // eslint-disable-next-line no-console
          console.log("LOCAL CAPSULES", data?.capsules?.length ?? 0, data);
          // Clear previous provisional markers
          for (const m of localCapsuleMarkersRef.current) {
            try { m.remove(); } catch { /* defensive */ }
          }
          localCapsuleMarkersRef.current = [];
          if (!data || !Array.isArray(data.capsules)) return;
          for (const cap of data.capsules) {
            if (typeof cap.lat !== "number" || typeof cap.lng !== "number") continue;
            const el = buildProvisionalMarkerEl(cap.title ?? "Lugar");
            el.addEventListener("click", (ev) => {
              ev.stopPropagation();
              setClicked({
                lat: cap.lat as number,
                lng: cap.lng as number,
                title: cap.title,
              });
            });
            const marker = new maplibre.Marker({ element: el })
              .setLngLat([cap.lng as number, cap.lat as number])
              .addTo(map);
            localCapsuleMarkersRef.current.push(marker);
          }
        })
        .catch(() => { /* swallow · UX no-op */ });
    }, 600);

    return () => {
      if (localCapsuleTimerRef.current !== null) {
        window.clearTimeout(localCapsuleTimerRef.current);
      }
      if (localCapsuleAbortRef.current) {
        localCapsuleAbortRef.current.abort();
      }
      for (const m of localCapsuleMarkersRef.current) {
        try { m.remove(); } catch { /* defensive */ }
      }
      localCapsuleMarkersRef.current = [];
    };
  }, [mapReady, maplibre, geo.status, geo.lat, geo.lng]);

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
        setClicked({ lat: entry.lat as number, lng: entry.lng as number });
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
      {/* Mapa fullscreen · no bg / no opacity / no blur · z-0 base */}
      <div
        ref={mapContainerRef}
        className="absolute inset-0 w-full h-full z-0"
      />

      {/* Overlay instruccional cuando no hay click aún */}
      {!clicked ? (
        <div className="pointer-events-none absolute left-1/2 top-6 z-10 -translate-x-1/2 transform">
          <span className="rounded-full border border-white/15 bg-[rgba(5,10,31,0.78)] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.32em] text-white/70 backdrop-blur-md">
            Tap en cualquier punto para descubrir
          </span>
        </div>
      ) : null}

      {/* EMPTY-NEARBY CTA · usuario está en zona sin memorias propias en
          radio NEARBY_RADIUS_KM. Tras fallback flyTo Roma, ofrecemos
          ciudades sembradas como puntos de partida. Auto-dismiss al
          abrir capsule o cluster panel. */}
      {emptyNearby && !clicked && !clusterList ? (
        <div className="pointer-events-auto absolute left-1/2 top-1/2 z-20 w-[min(320px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 transform">
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/12 bg-[rgba(5,10,31,0.88)] px-5 py-5 text-center backdrop-blur-md">
            <p className="font-display text-[15px] font-light leading-snug text-white/88">
              Todavía no hay memorias aquí
            </p>
            <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-white/45">
              Explora una ciudad con historia sembrada
            </p>
            <div className="flex flex-wrap justify-center gap-2 pt-1">
              {CITY_PRESETS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    const m = mapRef.current as {
                      flyTo: (opts: { center: [number, number]; zoom: number; duration: number }) => void;
                    } | null;
                    if (m) {
                      // eslint-disable-next-line no-console
                      console.log("FLYTO PRESET", c.id, c.center);
                      m.flyTo({ center: c.center, zoom: 14, duration: 1400 });
                      setEmptyNearby(false);
                    }
                  }}
                  className="rounded-full border border-[var(--kudos-accent)]/40 bg-[var(--kudos-accent)]/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--kudos-accent-bright)] transition-colors hover:bg-[var(--kudos-accent)]/22"
                >
                  {c.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setEmptyNearby(false)}
              className="mt-1 font-mono text-[9px] uppercase tracking-[0.24em] text-white/35 hover:text-white/65 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      ) : null}

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
                      const hero = resolveTemporalMedia(cap, selectedYearRef.current);
                      setClicked({
                        lat: cap.lat,
                        lng: cap.lng,
                        title: cap.title,
                        hero,
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

      {/* P1 · Temporal map · year slider · bottom centered.
          Range -500 (500 a.C.) → 2026. Hide when capsule panel open. */}
      {!clicked ? (
        <div className="pointer-events-auto absolute bottom-6 left-1/2 z-30 -translate-x-1/2 transform">
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-[var(--kudos-accent)]/30 bg-[rgba(5,10,31,0.78)] px-5 py-3 backdrop-blur-md">
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-white/45">
                {eraOfYear(selectedYear)}
              </span>
              <span className="font-display text-[18px] font-light tracking-tight text-[var(--kudos-accent-bright)]">
                {labelForYear(selectedYear)}
              </span>
            </div>
            <input
              type="range"
              min={-500}
              max={2026}
              step={10}
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              aria-label="Año del mapa temporal"
              className="kudos-year-slider w-[280px] cursor-pointer appearance-none bg-transparent"
              style={{
                ["--track" as string]: "rgba(139,92,246,0.20)",
                ["--fill" as string]: "rgba(139,92,246,0.70)",
              }}
            />
            <div className="flex w-[280px] justify-between font-mono text-[9px] uppercase tracking-[0.28em] text-white/35">
              <span>500 a.C.</span>
              <span>2026</span>
            </div>
          </div>
        </div>
      ) : null}

      {/* P2 · Floating preview on marker hover · glass mini-card
          positioned via map.project · pointer-events-none so it can't
          intercept marker click */}
      {hoveredPreview && !clicked ? (
        <div
          className="pointer-events-none absolute z-40"
          style={{
            left: hoveredPreview.x + 18,
            top: hoveredPreview.y - 56,
          }}
        >
          <div className="flex items-center gap-3 rounded-2xl border border-[var(--kudos-accent)]/30 bg-[rgba(5,10,31,0.92)] p-2 pr-3 backdrop-blur-md shadow-[0_8px_30px_-8px_rgba(139,92,246,0.4)]">
            {hoveredPreview.thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={hoveredPreview.thumbnail}
                alt=""
                className="size-12 rounded-lg object-cover"
              />
            ) : (
              <div
                className="size-12 rounded-lg"
                style={{
                  background:
                    "radial-gradient(circle at 35% 30%, #a78bfa 0%, #8b5cf6 60%, #6d28d9 100%)",
                }}
              />
            )}
            <div className="flex flex-col gap-0.5">
              <span className="max-w-[160px] truncate font-display text-[13px] font-light text-white/95">
                {hoveredPreview.title}
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.28em] text-white/45">
                {hoveredPreview.year}
                {hoveredPreview.hasClip ? " · clip" : ""}
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {/* Panel inferior con CapsuleSession cuando hay click.
          P2 · hero media (video preferido si clip_url · else image) se
          renderiza ENCIMA del CapsuleSession standard · cero touch a
          CapsuleSession internals. */}
      {clicked ? (
        <div
          className="absolute inset-x-0 bottom-0 z-20 max-h-[65dvh] overflow-y-auto border-t border-white/10 bg-[rgba(5,10,31,0.92)] backdrop-blur-md"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <button
            type="button"
            onClick={() => setClicked(null)}
            aria-label="Cerrar capsule"
            className="absolute right-3 top-3 z-30 grid size-8 place-items-center rounded-full border border-white/15 bg-white/[0.05] text-white/60 transition hover:text-white/95"
          >
            ×
          </button>
          {clicked.hero && (clicked.hero.clipUrl || clicked.hero.imageUrl) ? (
            <div className="relative w-full overflow-hidden" style={{ aspectRatio: "16 / 9" }}>
              {clicked.hero.clipUrl && clicked.hero.mediaType === "video" ? (
                <video
                  src={clicked.hero.clipUrl}
                  poster={clicked.hero.imageUrl || undefined}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={clicked.hero.imageUrl}
                  alt={clicked.title ?? ""}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[rgba(5,10,31,0.95)] via-[rgba(5,10,31,0.4)] to-transparent"
              />
              {clicked.title ? (
                <div className="absolute bottom-3 left-4 right-12 font-display text-[18px] font-light text-white/95 truncate">
                  {clicked.title}
                </div>
              ) : null}
            </div>
          ) : null}
          <CapsuleSession lat={clicked.lat} lng={clicked.lng} />
        </div>
      ) : null}
    </div>
  );
}
