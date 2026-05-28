"use client";

/**
 * KUDOS WORLD ENGINE · /world
 *
 * Refactor v2 · escalable a millones de POIs:
 *   - allNodesRef (ref) · NO entra en React state · evita re-render masivo
 *   - viewport culling · sólo iteramos POIs dentro del bbox visible
 *   - cap MAX_NODES_RENDERED · prioridad S > A > B > C
 *   - debounce moveend/zoomend para no spammear
 *   - geolocation: trigger combinado mapReady + coords
 */

import * as React from "react";
import { getAllPois } from "@/lib/kudos/store";
import { useGeolocation } from "@/lib/geo/useGeolocation";
import {
  WORLD_COLORS,
  WORLD_TILE_URL,
  WORLD_TILE_ATTRIB,
  WORLD_TILE_SUBDOMAINS,
  WORLD_TILE_MAX_ZOOM,
  WORLD_TILE_FILTER,
  TIER_MIN_ZOOM,
  MAX_NODES_RENDERED,
  WorldNodeTier,
  WorldNodeCategory,
  inferCategory,
} from "./world-tokens";
import { buildWorldNodeHTML, WORLD_NODE_CSS } from "./WorldNode";


interface WorldPoi {
  id: string;
  name: string;
  lat: number;
  lng: number;
  tier: WorldNodeTier;
  category: WorldNodeCategory;
}


const LEGENDARY_IDS = new Set([
  "rome", "machu", "petra", "athens", "granada", "istanbul",
  "g-eiffel", "g-taj", "g-greatwall", "g-giza", "g-chichen",
  "g-cristored", "g-angkor", "g-stonehenge", "g-sagrada",
  "g-libertad", "g-notredame", "g-sphinx", "g-vatican",
  "g-bigben", "g-empire", "g-opera", "g-forbidden",
  "g-cordoba", "g-bluemosque", "g-rapa",
]);

const TIER_PRIORITY: Record<WorldNodeTier, number> = { S: 0, A: 1, B: 2, C: 3 };

function tierForPoi(p: { id: string; rating?: number; unesco?: boolean }): WorldNodeTier {
  if (LEGENDARY_IDS.has(p.id)) return "S";
  if (p.id.startsWith("g-")) return "A";
  if (p.unesco || (p.rating ?? 0) >= 9.3) return "A";
  return "B";
}


export function WorldEngine() {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<any>(null);
  const LRef = React.useRef<any>(null);
  const markersRef = React.useRef<Map<string, any>>(new Map());

  // ALL nodes viven en ref · NO en React state (evita re-render con 43k)
  const allNodesRef = React.useRef<WorldPoi[]>([]);
  // Nodos visibles · sólo subset que cabe en pantalla
  const [renderTick, setRenderTick] = React.useState(0);
  const [totalLoaded, setTotalLoaded] = React.useState(0);
  const [mapReady, setMapReady] = React.useState(false);
  const [zoom, setZoom] = React.useState(3);
  const [activeId, setActiveId] = React.useState<string | null>(null);

  const geo = useGeolocation();
  const centeredOnUserRef = React.useRef(false);
  const moveTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Cargar core POIs sincronos ──
  React.useEffect(() => {
    const core: WorldPoi[] = getAllPois().map((p) => ({
      id: p.id,
      name: p.name,
      lat: p.lat,
      lng: p.lng,
      tier: tierForPoi({ id: p.id, rating: p.rating }),
      category: inferCategory(p.categories?.[0]),
    }));
    allNodesRef.current = core;
    setTotalLoaded(core.length);
    setRenderTick((t) => t + 1);

    // Wikidata · async, carga en chunks por país sin bloquear
    const COUNTRIES = ["es", "it", "fr", "gr", "pt", "de", "gb", "jp"];
    COUNTRIES.forEach((cc, idx) => {
      // Stagger 200ms entre países · UI nunca bloquea
      setTimeout(async () => {
        try {
          const r = await fetch(`/data/wikidata/${cc}.json`);
          if (!r.ok) return;
          const data = await r.json();
          const items = (data?.pois ?? []) as Array<{
            id: string; name: string; lat: number; lng: number;
            category: string; unesco?: boolean;
          }>;
          const chunk: WorldPoi[] = items.map((p) => ({
            id: p.id,
            name: p.name,
            lat: p.lat,
            lng: p.lng,
            tier: tierForPoi({ id: p.id, unesco: p.unesco }),
            category: inferCategory(p.category),
          }));
          // Append al ref · NO setState con todo el array
          allNodesRef.current = allNodesRef.current.concat(chunk);
          setTotalLoaded(allNodesRef.current.length);
          setRenderTick((t) => t + 1);
          console.warn(`[WORLD] +${chunk.length} ${cc} · total ${allNodesRef.current.length}`);
        } catch (e) {
          console.warn(`[WORLD] no se pudo cargar ${cc}.json`, e);
        }
      }, idx * 200);
    });
  }, []);

  // ── Mount Leaflet UNA VEZ ──
  React.useEffect(() => {
    let cancelled = false;
    let createdMap: any = null;
    (async () => {
      ensureCss();
      const mod = await import("leaflet");
      const L = (mod as any).default ?? mod;
      if (cancelled || !containerRef.current) return;
      const el = containerRef.current as any;
      if (el._leaflet_id != null) { try { delete el._leaflet_id; } catch {} }
      while (el.firstChild) el.removeChild(el.firstChild);

      const map = L.map(el, {
        center: [30, 10],
        zoom: 3,
        minZoom: 2,
        maxZoom: WORLD_TILE_MAX_ZOOM,
        zoomControl: false,
        attributionControl: false,
        worldCopyJump: true,
        scrollWheelZoom: true,
        preferCanvas: false,
        inertia: true,
        inertiaDeceleration: 2200,
      });
      L.tileLayer(WORLD_TILE_URL, {
        subdomains: WORLD_TILE_SUBDOMAINS,
        attribution: WORLD_TILE_ATTRIB,
        maxZoom: WORLD_TILE_MAX_ZOOM,
      }).addTo(map);

      mapRef.current = map;
      LRef.current = L;
      createdMap = map;
      setZoom(map.getZoom());

      // Debounced re-render on pan/zoom
      const onMove = () => {
        if (moveTimeoutRef.current) clearTimeout(moveTimeoutRef.current);
        moveTimeoutRef.current = setTimeout(() => {
          setZoom(map.getZoom());
          setRenderTick((t) => t + 1);
        }, 200);
      };
      map.on("moveend", onMove);
      map.on("zoomend", onMove);

      setMapReady(true);
      console.warn("[WORLD] Leaflet listo");
      setTimeout(() => { try { map.invalidateSize(); } catch {} }, 100);
    })();
    return () => {
      cancelled = true;
      if (moveTimeoutRef.current) clearTimeout(moveTimeoutRef.current);
      if (createdMap) { try { createdMap.remove(); } catch {} }
      mapRef.current = null;
      markersRef.current.clear();
      if (containerRef.current) {
        const el = containerRef.current as any;
        if (el._leaflet_id != null) { try { delete el._leaflet_id; } catch {} }
        while (el.firstChild) el.removeChild(el.firstChild);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auto-geolocation request al montar ──
  React.useEffect(() => {
    if (!geo.coords && geo.status !== "asking" && geo.status !== "denied") {
      geo.request();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Centrar en usuario UNA VEZ · trigger combinado coords + map listo ──
  React.useEffect(() => {
    if (centeredOnUserRef.current) return;
    if (!geo.coords || !mapReady) return;
    const map = mapRef.current;
    if (!map) return;
    try {
      map.flyTo([geo.coords.lat, geo.coords.lng], 9, {
        duration: 2.2,
        easeLinearity: 0.18,
      });
      centeredOnUserRef.current = true;
      console.warn("[WORLD] centrado en usuario:", geo.coords);
    } catch (e) {
      console.warn("[WORLD] flyTo falló", e);
    }
  }, [geo.coords, mapReady]);

  // ── VIEWPORT CULLING · render sólo nodos visibles + cap absoluto ──
  React.useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map || !mapReady) return;

    const bounds = map.getBounds();
    const south = bounds.getSouth();
    const north = bounds.getNorth();
    const west = bounds.getWest();
    const east = bounds.getEast();
    const center = map.getCenter();

    // 1) Filtrar por tier-zoom + bbox
    const candidates: WorldPoi[] = [];
    const all = allNodesRef.current;
    for (let i = 0; i < all.length; i++) {
      const n = all[i];
      if (zoom < TIER_MIN_ZOOM[n.tier]) continue;
      if (n.lat < south || n.lat > north) continue;
      if (n.lng < west || n.lng > east) continue;
      candidates.push(n);
    }

    // 2) Ordenar por prioridad tier + cercanía al centro
    candidates.sort((a, b) => {
      const pa = TIER_PRIORITY[a.tier];
      const pb = TIER_PRIORITY[b.tier];
      if (pa !== pb) return pa - pb;
      const da = (a.lat - center.lat) ** 2 + (a.lng - center.lng) ** 2;
      const db = (b.lat - center.lat) ** 2 + (b.lng - center.lng) ** 2;
      return da - db;
    });

    // 3) Cap absoluto
    const visible = candidates.slice(0, MAX_NODES_RENDERED);
    const next = new Map<string, WorldPoi>(visible.map((n) => [n.id, n]));

    console.warn(
      `[WORLD] viewport · candidatos=${candidates.length} · render=${visible.length} · zoom=${zoom}`
    );

    // 4) Remove stale
    markersRef.current.forEach((m, id) => {
      if (!next.has(id)) {
        try { m.remove(); } catch {}
        markersRef.current.delete(id);
      }
    });

    // 5) Add/update visibles
    next.forEach((n, id) => {
      if (isNaN(n.lat) || isNaN(n.lng)) return;
      try {
        const isActive = id === activeId;
        const html = buildWorldNodeHTML({ ...n, isActive });
        const size = n.tier === "S" ? 56 : n.tier === "A" ? 32 : n.tier === "B" ? 14 : 6;
        const icon = L.divIcon({
          className: "kudos-world-node",
          html: `<div data-name="${(n.name || "").replace(/"/g, "&quot;")}" style="position:relative">${html}</div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });
        const existing = markersRef.current.get(id);
        if (existing) {
          existing.setIcon(icon);
        } else {
          const m = L.marker([n.lat, n.lng], { icon }).addTo(map);
          m.on("click", () => setActiveId(id));
          markersRef.current.set(id, m);
        }
      } catch (err) {
        // skip silencioso
      }
    });
  }, [renderTick, zoom, mapReady, activeId]);

  return (
    <div style={ROOT}>
      <div ref={containerRef} style={STAGE} className="kudos-world-stage" />
      <div style={HUD}>
        <div style={HUD_BRAND}>
          <span style={HUD_BRAND_K}>KUDOS</span>
          <span style={HUD_BRAND_DOT}>·</span>
          <span style={HUD_BRAND_LABEL}>WORLD</span>
        </div>
        <div style={HUD_TAGLINE}>Mérito · Descubrimiento · Memoria</div>
      </div>
      <div style={HUD_COUNTER}>
        {totalLoaded.toLocaleString("es-ES")} nodos · {markersRef.current.size} visibles · zoom {zoom}
      </div>
      <div style={ZOOM_RAIL}>
        <button style={ZOOM_BTN} onClick={() => mapRef.current?.zoomIn()} aria-label="Acercar">+</button>
        <button style={ZOOM_BTN} onClick={() => mapRef.current?.zoomOut()} aria-label="Alejar">−</button>
      </div>
    </div>
  );
}


function ensureCss() {
  if (typeof document === "undefined") return;
  if (!document.getElementById("kudos-world-leaflet-css")) {
    const link = document.createElement("link");
    link.id = "kudos-world-leaflet-css";
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
  }
  if (!document.getElementById("kudos-world-style")) {
    const style = document.createElement("style");
    style.id = "kudos-world-style";
    style.textContent = `
      .kudos-world-stage .leaflet-container {
        background: ${WORLD_COLORS.voidNavy} !important;
        font-family: "Poppins", system-ui, sans-serif;
        outline: none;
      }
      .kudos-world-stage .leaflet-tile { filter: ${WORLD_TILE_FILTER}; }
      .kudos-world-node { background: transparent !important; border: none !important; }
      ${WORLD_NODE_CSS}
    `;
    document.head.appendChild(style);
  }
}


const ROOT: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: WORLD_COLORS.voidDeep,
  overflow: "hidden",
};

const STAGE: React.CSSProperties = {
  position: "absolute",
  inset: 0,
};

const HUD: React.CSSProperties = {
  position: "absolute",
  top: 22,
  left: 26,
  zIndex: 1000,
  display: "flex",
  flexDirection: "column",
  gap: 4,
  pointerEvents: "none",
};

const HUD_BRAND: React.CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  gap: 8,
};

const HUD_BRAND_K: React.CSSProperties = {
  fontFamily: "Poppins, system-ui, sans-serif",
  fontSize: 22,
  fontWeight: 800,
  letterSpacing: 0.5,
  color: WORLD_COLORS.warmWhite,
};

const HUD_BRAND_DOT: React.CSSProperties = {
  color: WORLD_COLORS.legendary,
  fontSize: 18,
};

const HUD_BRAND_LABEL: React.CSSProperties = {
  fontFamily: "Poppins, system-ui, sans-serif",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: 3,
  color: WORLD_COLORS.legendary,
  textTransform: "uppercase",
};

const HUD_TAGLINE: React.CSSProperties = {
  fontFamily: "Poppins, system-ui, sans-serif",
  fontSize: 9.5,
  fontWeight: 600,
  letterSpacing: 2.5,
  color: WORLD_COLORS.inkTertiary,
  textTransform: "uppercase",
};

const HUD_COUNTER: React.CSSProperties = {
  position: "absolute",
  bottom: 22,
  left: 26,
  zIndex: 1000,
  fontFamily: "Poppins, system-ui, sans-serif",
  fontSize: 10.5,
  fontWeight: 500,
  color: WORLD_COLORS.inkTertiary,
  letterSpacing: 1.2,
  pointerEvents: "none",
};

const ZOOM_RAIL: React.CSSProperties = {
  position: "absolute",
  right: 22,
  bottom: 22,
  zIndex: 1000,
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const ZOOM_BTN: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 10,
  background: "rgba(16, 20, 40, 0.7)",
  backdropFilter: "blur(10px)",
  border: `1px solid ${WORLD_COLORS.earthEdge}`,
  color: WORLD_COLORS.warmWhite,
  fontFamily: "Poppins, system-ui, sans-serif",
  fontSize: 16,
  fontWeight: 600,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};
