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

const _DEFAULT_CENTER: [number, number] = [-3.7038, 40.4168]; // Madrid Sol [lng, lat]
const _DEFAULT_ZOOM = 13;

interface ClickedCoords {
  lat: number;
  lng: number;
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
  const [maplibre, setMaplibre] = React.useState<MapLibreModule | null>(null);
  const [mapReady, setMapReady] = React.useState(false);
  const [clicked, setClicked] = React.useState<ClickedCoords | null>(null);
  const [memoryLayerVisible, setMemoryLayerVisible] = React.useState<boolean>(true);
  // TEMP DEBUG · minimal binary-test state
  const [debug, setDebug] = React.useState<{
    viewportCount: number;
    markersMounted: number;
    fitboundsApplied: boolean;
    markerMode: string;
  }>({
    viewportCount: 0,
    markersMounted: 0,
    fitboundsApplied: false,
    markerMode: "default (no custom element)",
  });
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
          // P0 cinematic base · CartoDB Dark Matter · free, no API key.
          // Attribution required: OSM + CARTO.
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

    // P0 viewport capsule fetch · debounced 400ms on moveend
    // BINARY TEST · pure default MapLibre markers · NO custom elements.
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
          "&limit=100";
        if (viewportAbortRef.current) {
          viewportAbortRef.current.abort();
        }
        const ctrl = new AbortController();
        viewportAbortRef.current = ctrl;
        fetch(url, { signal: ctrl.signal, cache: "no-store" })
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => {
            if (!data || !Array.isArray(data.capsules)) return;
            // Clear previous markers
            for (const m of capsuleMarkersRef.current) {
              try { m.remove(); } catch { /* defensive */ }
            }
            capsuleMarkersRef.current = [];
            // Mount pure default markers + collect coords for fitBounds
            const lngLats: Array<[number, number]> = [];
            let mounted = 0;
            for (const cap of data.capsules as Array<{
              lat: number; lng: number;
            }>) {
              const lat = typeof cap.lat === "number" ? cap.lat : Number(cap.lat);
              const lng = typeof cap.lng === "number" ? cap.lng : Number(cap.lng);
              if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
              const marker = new maplibre.Marker()
                .setLngLat([lng, lat])
                .addTo(map);
              capsuleMarkersRef.current.push(marker);
              lngLats.push([lng, lat]);
              mounted += 1;
            }
            // Auto-fit to capsules so founder sees them even if currently
            // outside viewport · padding 80px · maxZoom 10 to avoid
            // over-zooming on single-point cluster.
            let fit = false;
            if (lngLats.length > 0) {
              try {
                const bounds = new maplibre.LngLatBounds(
                  lngLats[0],
                  lngLats[0],
                );
                for (const ll of lngLats) bounds.extend(ll);
                map.fitBounds(bounds, { padding: 80, maxZoom: 10, duration: 800 });
                fit = true;
              } catch {
                fit = false;
              }
            }
            setDebug({
              viewportCount: data.capsules.length,
              markersMounted: mounted,
              fitboundsApplied: fit,
              markerMode: "default (no custom element)",
            });
          })
          .catch(() => { /* swallow · UX no-op */ });
      }, 400);
    };

    map.on("moveend", fetchViewport);
    map.on("load", fetchViewport);

    map.on("click", (e: { lngLat: { lng: number; lat: number } }) => {
      const lat = e.lngLat.lat;
      const lng = e.lngLat.lng;
      setClicked({ lat, lng });
      // Marker visual del click
      if (clickMarkerRef.current && typeof (clickMarkerRef.current as { remove: () => void }).remove === "function") {
        (clickMarkerRef.current as { remove: () => void }).remove();
      }
      const el = document.createElement("div");
      el.style.cssText =
        "width:16px;height:16px;border-radius:50%;background:var(--kudos-accent);" +
        "box-shadow:0 0 16px var(--kudos-accent-glow);border:2px solid white;";
      clickMarkerRef.current = new maplibre.Marker({ element: el })
        .setLngLat([lng, lat])
        .addTo(map);
    });

    return () => {
      if (viewportFetchTimerRef.current !== null) {
        window.clearTimeout(viewportFetchTimerRef.current);
      }
      if (viewportAbortRef.current) {
        viewportAbortRef.current.abort();
      }
      for (const m of capsuleMarkersRef.current) {
        try { m.remove(); } catch { /* defensive */ }
      }
      capsuleMarkersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [maplibre]);

  // Centra el mapa en geo cuando granted · pin usuario
  React.useEffect(() => {
    if (!mapReady || !maplibre || !mapRef.current) return;
    if (geo.status !== "ready" || typeof geo.lat !== "number" || typeof geo.lng !== "number") return;
    const map = mapRef.current as {
      flyTo: (opts: { center: [number, number]; zoom: number; duration: number }) => void;
    };
    map.flyTo({ center: [geo.lng, geo.lat], zoom: 14, duration: 1200 });
    if (userMarkerRef.current && typeof (userMarkerRef.current as { remove: () => void }).remove === "function") {
      (userMarkerRef.current as { remove: () => void }).remove();
    }
    const el = document.createElement("div");
    el.style.cssText =
      "width:14px;height:14px;border-radius:50%;background:var(--kudos-ai);" +
      "box-shadow:0 0 14px var(--kudos-ai-glow);border:2px solid white;";
    userMarkerRef.current = new maplibre.Marker({ element: el })
      .setLngLat([geo.lng, geo.lat])
      .addTo(mapRef.current as Parameters<InstanceType<MapLibreModule["Marker"]>["addTo"]>[0]);
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
    <main
      className="relative w-full overflow-hidden"
      // Header global ocupa h-14 (56px). Resto del viewport para el mapa.
      style={{ height: "calc(100dvh - 56px)" }}
    >
      {/* Mapa fullscreen */}
      <div
        ref={mapContainerRef}
        className="absolute inset-0"
        style={{ background: "var(--kudos-bg)" }}
      />

      {/* TEMP DEBUG overlay · minimal binary test */}
      <div
        className="pointer-events-none absolute left-3 top-3 z-50 rounded-lg border border-red-500/40 bg-black/85 px-3 py-2 font-mono text-[11px] leading-[1.5] text-white/95 backdrop-blur-sm"
      >
        <div>viewport_capsules: {debug.viewportCount}</div>
        <div>markers_mounted: {debug.markersMounted}</div>
        <div>fitbounds_applied: {debug.fitboundsApplied ? "yes" : "no"}</div>
        <div>marker_mode: {debug.markerMode}</div>
      </div>

      {/* Overlay instruccional cuando no hay click aún */}
      {!clicked ? (
        <div className="pointer-events-none absolute left-1/2 top-6 z-10 -translate-x-1/2 transform">
          <span className="rounded-full border border-white/15 bg-[rgba(5,10,31,0.78)] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.32em] text-white/70 backdrop-blur-md">
            Tap en cualquier punto para descubrir
          </span>
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

      {/* Panel inferior con CapsuleSession cuando hay click */}
      {clicked ? (
        <div
          className="absolute inset-x-0 bottom-0 z-20 max-h-[55dvh] overflow-y-auto border-t border-white/10 bg-[rgba(5,10,31,0.92)] backdrop-blur-md"
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
          <CapsuleSession lat={clicked.lat} lng={clicked.lng} />
        </div>
      ) : null}
    </main>
  );
}
