"use client";

/**
 * KUDOS WORLD ENGINE · componente principal del mapa /world
 *
 * Filosofía (brand book ADN 1000M):
 *   "KUDOS NO utiliza un mapa. KUDOS CONVIERTE EL MUNDO EN INTERFAZ."
 *
 * Características:
 *   - World Surface · tile Carto Dark cinematográfico
 *   - Paleta limitada 5-6 colores
 *   - World Nodes Tier S/A/B/C visualmente diferenciados
 *   - Fog of discovery · zoom revela densidad progresivamente
 *   - Respiración sutil (Tier S/A)
 *   - Carga dinámica · core POIs + Wikidata 43k
 *   - NO labels saturando · sólo al hover
 *
 * Esta es la pantalla nueva. /mapa queda como demo.
 */

import * as React from "react";
import { getAllPois, type Poi } from "@/lib/kudos/store";
import { useGeolocation } from "@/lib/geo/useGeolocation";
import {
  WORLD_COLORS,
  WORLD_TILE_URL,
  WORLD_TILE_ATTRIB,
  WORLD_TILE_SUBDOMAINS,
  WORLD_TILE_MAX_ZOOM,
  WORLD_TILE_FILTER,
  TIER_MIN_ZOOM,
  WorldNodeTier,
  WorldNodeCategory,
  inferCategory,
} from "./world-tokens";
import { buildWorldNodeHTML, WORLD_NODE_CSS } from "./WorldNode";


// ─── Datos · POI normalizado para World Engine ─────────────────────────────

interface WorldPoi {
  id: string;
  name: string;
  lat: number;
  lng: number;
  tier: WorldNodeTier;
  category: WorldNodeCategory;
}


// IDs hardcodeados de iconos del planeta · Tier S garantizado
const LEGENDARY_IDS = new Set([
  "rome", "machu", "petra", "athens", "granada", "istanbul",
  "g-eiffel", "g-taj", "g-greatwall", "g-giza", "g-chichen",
  "g-cristored", "g-angkor", "g-stonehenge", "g-sagrada",
  "g-libertad", "g-notredame", "g-sphinx", "g-vatican",
  "g-bigben", "g-empire", "g-opera", "g-forbidden",
  "g-cordoba", "g-bluemosque", "g-rapa",
]);

function tierForPoi(p: { id: string; rating?: number; unesco?: boolean }): WorldNodeTier {
  if (LEGENDARY_IDS.has(p.id)) return "S";
  if (p.id.startsWith("g-")) return "A";
  if (p.unesco || (p.rating ?? 0) >= 9.3) return "A";
  if (p.id.startsWith("wd-")) return "B";
  return "B";
}


// ─── Componente ────────────────────────────────────────────────────────────

export function WorldEngine() {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<any>(null);
  const LRef = React.useRef<any>(null);
  const markersRef = React.useRef<Map<string, any>>(new Map());

  const [allNodes, setAllNodes] = React.useState<WorldPoi[]>([]);
  const [zoom, setZoom] = React.useState(3);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [center, setCenter] = React.useState<{ lat: number; lng: number }>({ lat: 30, lng: 10 });
  const geo = useGeolocation();
  const centeredOnUserRef = React.useRef(false);

  // Auto-request geolocation al montar
  React.useEffect(() => {
    if (!geo.coords && geo.status !== "asking" && geo.status !== "denied") {
      geo.request();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cuando llegan las coords + el map está listo, centrar UNA VEZ con zoom cinematográfico
  React.useEffect(() => {
    if (centeredOnUserRef.current || !geo.coords) return;
    const map = mapRef.current;
    if (!map) return;
    try {
      map.flyTo([geo.coords.lat, geo.coords.lng], 9, {
        duration: 2.2,
        easeLinearity: 0.18,
      });
      centeredOnUserRef.current = true;
    } catch {}
  }, [geo.coords]);

  // ── Cargar POIs core + Wikidata dinámicamente ──
  React.useEffect(() => {
    const coreNodes: WorldPoi[] = getAllPois().map((p) => ({
      id: p.id,
      name: p.name,
      lat: p.lat,
      lng: p.lng,
      tier: tierForPoi({ id: p.id, rating: p.rating }),
      category: inferCategory(p.categories?.[0]),
    }));
    setAllNodes(coreNodes);

    // Wikidata · async, no bloquea
    const COUNTRIES = ["es", "it", "fr", "gr", "pt", "de", "gb", "jp"];
    (async () => {
      const wd: WorldPoi[] = [];
      await Promise.all(COUNTRIES.map(async (cc) => {
        try {
          const r = await fetch(`/data/wikidata/${cc}.json`);
          if (!r.ok) return;
          const data = await r.json();
          const items = (data?.pois ?? []) as Array<{
            id: string; name: string; lat: number; lng: number;
            category: string; unesco?: boolean;
          }>;
          for (const p of items) {
            wd.push({
              id: p.id,
              name: p.name,
              lat: p.lat,
              lng: p.lng,
              tier: tierForPoi({ id: p.id, unesco: p.unesco }),
              category: inferCategory(p.category),
            });
          }
        } catch (e) {
          console.warn(`[WORLD] no se pudo cargar ${cc}.json`);
        }
      }));
      console.warn(`[WORLD] Wikidata cargado · ${wd.length} POIs extra`);
      setAllNodes((prev) => [...prev, ...wd]);
    })();
  }, []);

  // ── Mount Leaflet ──
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
        center: [center.lat, center.lng],
        zoom: 3,
        minZoom: 2,
        maxZoom: WORLD_TILE_MAX_ZOOM,
        zoomControl: false,
        attributionControl: false,
        worldCopyJump: true,
        scrollWheelZoom: true,
        preferCanvas: false,
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
      map.on("zoomend", () => setZoom(map.getZoom()));
      console.warn("[WORLD] Leaflet listo");
      setTimeout(() => { try { map.invalidateSize(); } catch {} }, 100);
    })();
    return () => {
      cancelled = true;
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

  // ── Renderizar nodos filtrados por fog of discovery (zoom) ──
  React.useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    const visible = allNodes.filter((n) => zoom >= TIER_MIN_ZOOM[n.tier]);
    const next = new Map<string, WorldPoi>(visible.map((n) => [n.id, n]));

    // Remove stale
    markersRef.current.forEach((m, id) => {
      if (!next.has(id)) {
        try { m.remove(); } catch {}
        markersRef.current.delete(id);
      }
    });

    // Add/update
    let added = 0;
    next.forEach((n, id) => {
      if (typeof n.lat !== "number" || typeof n.lng !== "number" || isNaN(n.lat) || isNaN(n.lng)) return;
      try {
        const isActive = id === activeId;
        const html = buildWorldNodeHTML({ ...n, isActive });
        const size = n.tier === "S" ? 56 : n.tier === "A" ? 32 : n.tier === "B" ? 18 : 8;
        const icon = L.divIcon({
          className: "kudos-world-node",
          html: `<div data-name="${(n.name || "").replace(/"/g, "&quot;")}" style="position:relative">${html}</div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });
        const existing = markersRef.current.get(id);
        if (existing) {
          existing.setIcon(icon);
          existing.setLatLng([n.lat, n.lng]);
        } else {
          const m = L.marker([n.lat, n.lng], { icon }).addTo(map);
          m.on("click", () => setActiveId(id));
          markersRef.current.set(id, m);
          added++;
        }
      } catch (err) {
        console.warn("[WORLD] skip nodo con error:", id, err);
      }
    });

    console.warn(
      `[WORLD] zoom=${zoom} · visibles=${visible.length} · added=${added} · total=${markersRef.current.size}`
    );
  }, [allNodes, zoom, activeId]);

  // ── UI ──
  return (
    <div style={ROOT}>
      <div ref={containerRef} style={STAGE} />
      {/* HUD minimalista superior */}
      <div style={HUD}>
        <div style={HUD_BRAND}>
          <span style={HUD_BRAND_K}>KUDOS</span>
          <span style={HUD_BRAND_DOT}>·</span>
          <span style={HUD_BRAND_LABEL}>WORLD</span>
        </div>
        <div style={HUD_TAGLINE}>Mérito · Descubrimiento · Memoria</div>
      </div>
      {/* Contador discreto · sensación de profundidad */}
      <div style={HUD_COUNTER}>
        {allNodes.length.toLocaleString("es-ES")} nodos en el grafo · zoom {zoom}
      </div>
      {/* Control de zoom propio · minimal */}
      <div style={ZOOM_RAIL}>
        <button style={ZOOM_BTN} onClick={() => mapRef.current?.zoomIn()} aria-label="Acercar">+</button>
        <button style={ZOOM_BTN} onClick={() => mapRef.current?.zoomOut()} aria-label="Alejar">−</button>
      </div>
    </div>
  );
}


// ─── CSS global del world surface ──────────────────────────────────────────

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
      .kudos-world-stage .leaflet-tile {
        filter: ${WORLD_TILE_FILTER};
      }
      .kudos-world-node { background: transparent !important; border: none !important; }
      ${WORLD_NODE_CSS}
    `;
    document.head.appendChild(style);
  }
}


// ─── Estilos ───────────────────────────────────────────────────────────────

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
