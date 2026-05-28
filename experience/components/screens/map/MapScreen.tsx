"use client";

/**
 * KUDOS . MapScreen . Canonical replica of Mapa mockup.
 *
 * Single concrete file. Inline Leaflet mount with photo-bubble divIcons.
 * Reuses store + Leaflet primitive (npm). Does NOT touch VanillaLeafletMap.
 *
 * Layout:
 *   - Tab switcher (MAPA active / DESCUBRIR / MI MUNDO)
 *   - Floating left panels: CAPAS (layers) + FILTROS (categories)
 *   - Top-right controls: location chip + weather chip + compass + 3D + center
 *   - Right rail: zoom +/-
 *   - Map canvas (Leaflet, dark filter) with photo-bubble POI markers
 *   - Bottom-right: scale bar "200 m"
 *   - Bottom sheet: preview photo + identity + actions (Guardar / Compartir / Ver capsula)
 *   - ?focus=<poi.id> centers map + opens sheet
 */

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon, type IconName } from "@/design-system/v2";
import { VideoCapsule } from "@/components/media/VideoCapsule";
import {
  getAllPois,
  getCapsuleById,
  useSaved,
  type Capsule,
  type Poi,
  type PoiCategory,
} from "@/lib/kudos/store";
import { useGeolocation } from "@/lib/geo/useGeolocation";

// =====================================================================
// Types + tokens
// =====================================================================

type CategoryChoice = "all" | PoiCategory;

interface CategoryDef { id: CategoryChoice; label: string; icon: IconName; }
const CATEGORIES: ReadonlyArray<CategoryDef> = [
  { id: "all",          label: "Todo",        icon: "place" },
  { id: "monumento",    label: "Monumentos",  icon: "history" },
  { id: "museo",        label: "Museos",      icon: "studio" },
  { id: "gastronomia",  label: "Gastronomía", icon: "gift" },
  { id: "naturaleza",   label: "Naturaleza",  icon: "nature" },
  { id: "evento",       label: "Eventos",     icon: "event" },
];

interface LayerDef { id: string; label: string; icon: IconName; active: boolean; }
const LAYERS: ReadonlyArray<LayerDef> = [
  { id: "presente",    label: "Presente",     icon: "discover",  active: true },
  { id: "historia",    label: "Historia",     icon: "history",   active: false },
  { id: "experiencia", label: "Experiencia",  icon: "play",      active: false },
  { id: "comercio",    label: "Comercio",     icon: "gift",      active: false },
  { id: "amigos",      label: "Amigos",       icon: "people",    active: false },
];

const LEAFLET_CSS_ID = "kudos-leaflet-css";
const LEAFLET_STYLE_ID = "kudos-leaflet-style-v6";

// =====================================================================
// Component
// =====================================================================

export function MapScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const focusId = searchParams?.get("focus") ?? null;

  const allPois = React.useMemo(() => getAllPois(), []);
  const { has, toggle } = useSaved();
  const geo = useGeolocation();

  // P32-DEBUG · siempre visible · expone también window.__KUDOS_DEBUG para inspección
  React.useEffect(() => {
    console.warn("[KUDOS-MAP-DEBUG] allPois.length =", allPois.length);
    if (typeof window !== "undefined") {
      // @ts-expect-error · global debug helper
      window.__KUDOS_DEBUG = {
        allPois_length: allPois.length,
        first_3: allPois.slice(0, 3).map(p => ({ id: p.id, name: p.name, lat: p.lat, lng: p.lng })),
        last_3: allPois.slice(-3).map(p => ({ id: p.id, name: p.name, lat: p.lat, lng: p.lng })),
      };
      console.warn("[KUDOS-MAP-DEBUG] window.__KUDOS_DEBUG poblado · escribe en consola: window.__KUDOS_DEBUG");
    }
  }, [allPois]);

  // Auto-solicitar geolocation al montar el mapa · sin esto el navegador
  // nunca pide permiso y geo.coords se queda null para siempre.
  React.useEffect(() => {
    if (!geo.coords && geo.status !== "asking" && geo.status !== "denied") {
      geo.request();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [activeId, setActiveId] = React.useState<string | null>(focusId);
  const [sheetOpen, setSheetOpen] = React.useState<boolean>(focusId != null);
  const [category, setCategory] = React.useState<CategoryChoice>("all");
  // Capas cerradas por defecto · evita tapar el mapa en móvil. El usuario las abre si quiere.
  const [capasOpen, setCapasOpen] = React.useState(false);
  const [filtrosOpen, setFiltrosOpen] = React.useState(false);
  // Layers togglables (antes inmutables · ahora se pueden activar/desactivar)
  const [layers, setLayers] = React.useState<ReadonlyArray<LayerDef>>(LAYERS);
  const toggleLayer = React.useCallback((id: string) => {
    setLayers((prev) => prev.map((l) => l.id === id ? { ...l, active: !l.active } : l));
  }, []);

  // React to query param changes
  React.useEffect(() => {
    if (focusId) {
      setActiveId(focusId);
      setSheetOpen(true);
    }
  }, [focusId]);

  // Filter pins by category
  const filteredPois = React.useMemo<ReadonlyArray<Poi>>(() => {
    if (category === "all") return allPois;
    return allPois.filter((p) => p.categories.includes(category));
  }, [allPois, category]);

  // If active POI filtered out, close sheet
  React.useEffect(() => {
    if (!activeId || !sheetOpen) return;
    const stillVisible = filteredPois.some((p) => p.id === activeId);
    if (!stillVisible) setSheetOpen(false);
  }, [filteredPois, activeId, sheetOpen]);

  const activePoi = React.useMemo<Poi | null>(() => {
    if (!activeId) return null;
    return allPois.find((p) => p.id === activeId) ?? null;
  }, [allPois, activeId]);

  const activeCap = React.useMemo<Capsule | null>(() => {
    if (!activePoi) return null;
    return getCapsuleById(activePoi.featuredCapsuleId) ?? null;
  }, [activePoi]);

  const handlePick = React.useCallback((id: string) => {
    setActiveId(id);
    setSheetOpen(true);
  }, []);

  return (
    <div className="kudos-mapa" style={ROOT}>
      {/* ── Tab switcher (MAPA active / DESCUBRIR / MI MUNDO) ─────── */}
      <div style={SWITCHER_WRAP}>
        <div style={SWITCHER}>
          <button type="button" style={PILL_ACTIVE} aria-pressed="true">
            <Icon name="map" size={14} />
            <span>MAPA</span>
          </button>
          <button type="button" style={PILL_IDLE} onClick={() => router.push("/inicio")}>
            <Icon name="discover" size={14} />
            <span>DESCUBRIR</span>
          </button>
          <button type="button" style={PILL_IDLE} onClick={() => router.push("/mi-mundo")}>
            <Icon name="saved" size={14} />
            <span>MI MUNDO</span>
          </button>
        </div>
      </div>

      {/* ── Map canvas stage (everything floats on top) ──────────── */}
      <div style={STAGE}>
        <LeafletStage
          pois={filteredPois}
          activeId={activeId}
          centerOn={activePoi}
          userCoords={geo.coords}
          onPick={handlePick}
        />

        {/* Left floating panels */}
        <aside className="kudos-mapa-left kudos-elev-2" style={LEFT_PANELS}>
          <PanelGroup
            title="CAPAS"
            open={capasOpen}
            onToggle={() => setCapasOpen((v) => !v)}
          >
            {layers.map((l) => (
              <LayerRow key={l.id} layer={l} onToggle={() => toggleLayer(l.id)} />
            ))}
          </PanelGroup>

          <PanelGroup
            title="FILTROS"
            open={filtrosOpen}
            onToggle={() => setFiltrosOpen((v) => !v)}
          >
            {CATEGORIES.map((c) => (
              <CategoryRow
                key={c.id}
                cat={c}
                active={category === c.id}
                onSelect={() => setCategory(c.id)}
              />
            ))}
          </PanelGroup>
        </aside>

        {/* Top-right controls */}
        <div style={TOP_RIGHT}>
          <div style={CHIP_ROW}>
            <button type="button" style={CTX_CHIP} className="kudos-tap" aria-label="Ubicación actual">
              <Icon name="place" size={12} />
              <span>{activePoi?.country ?? "Roma, Italia"}</span>
              <Icon name="chevron" size={12} />
            </button>
            <span style={WEATHER_CHIP}>
              <span style={{ fontSize: 14 }}>☀</span>
              <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.05 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700 }}>24°C</span>
                <span style={{ fontSize: 9.5, color: "rgba(242,242,247,0.55)" }}>Soleado</span>
              </span>
            </span>
          </div>

          <div style={COMPASS_BTN}>
            <span style={COMPASS_N}>N</span>
            <span aria-hidden style={COMPASS_NEEDLE} />
          </div>

          <button type="button" style={CTRL_BTN_SQ} className="kudos-tap kudos-elev-1">3D</button>
          <button type="button" style={CTRL_BTN_SQ} className="kudos-tap kudos-elev-1" aria-label="Centrar">
            <Icon name="here" size={14} />
          </button>
        </div>

        {/* Right rail zoom controls */}
        <div style={ZOOM_RAIL}>
          <button type="button" style={CTRL_BTN_SQ} className="kudos-tap kudos-elev-1" aria-label="Zoom in" onClick={() => leafletZoom("in")}>
            <Icon name="plus" size={16} />
          </button>
          <button type="button" style={CTRL_BTN_SQ} className="kudos-tap kudos-elev-1" aria-label="Zoom out" onClick={() => leafletZoom("out")}>
            <span aria-hidden style={{ width: 12, height: 2, background: "currentColor", borderRadius: 2 }} />
          </button>
        </div>

        {/* Scale bar */}
        <div style={SCALE_BAR}>
          <span style={SCALE_LABEL}>200 m</span>
          <span aria-hidden style={SCALE_LINE} />
        </div>

        {/* Bottom sheet */}
        {activePoi && sheetOpen ? (
          <PoiSheet
            poi={activePoi}
            capsule={activeCap}
            isSaved={has("poi", activePoi.id)}
            onClose={() => setSheetOpen(false)}
            onSave={() => toggle("poi", activePoi.id)}
            onShare={() => {
              if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("kudos:share-capsule:open", { detail: { poiId: activePoi.id } }));
              }
            }}
            onOpenPoi={() => router.push(`/poi/${encodeURIComponent(activePoi.id)}`)}
          />
        ) : null}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .kudos-mapa-left { left: 12px !important; max-width: 230px !important; top: 12px !important; }
        }
      `}</style>
    </div>
  );
}

// =====================================================================
// LeafletStage (inline custom mount with photo-bubble markers)
// =====================================================================

interface StageProps {
  pois: ReadonlyArray<Poi>;
  activeId: string | null;
  centerOn: Poi | null;
  userCoords: { lat: number; lng: number } | null;
  onPick: (id: string) => void;
}

function LeafletStage({ pois, activeId, centerOn, userCoords, onPick }: StageProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<any>(null);
  const markersRef = React.useRef<Map<string, any>>(new Map());
  const LRef = React.useRef<any>(null);
  const userMarkerRef = React.useRef<any>(null);
  const onPickRef = React.useRef(onPick);
  // P32-fix · state que se settea cuando Leaflet termina de cargar. Lo usamos
  // como dep del useEffect de markers para que se dispare cuando Leaflet
  // está listo (antes hacía early return y nunca se re-ejecutaba).
  const [mapReady, setMapReady] = React.useState(false);
  React.useEffect(() => { onPickRef.current = onPick; }, [onPick]);

  // Mount Leaflet once
  React.useEffect(() => {
    let cancelled = false;
    let createdMap: any = null;
    (async () => {
      ensureLeafletCSS();
      const mod = await import("leaflet");
      const L = (mod as any).default ?? mod;
      if (cancelled || !containerRef.current) return;
      const el = containerRef.current as any;
      if (el._leaflet_id != null) { try { delete el._leaflet_id; } catch {} }
      while (el.firstChild) el.removeChild(el.firstChild);
      // Centro inicial · prioridad: POI activo > geolocation usuario > Roma fallback.
      const initCenter: [number, number] = centerOn
        ? [centerOn.lat, centerOn.lng]
        : userCoords
          ? [userCoords.lat, userCoords.lng]
          : [41.9, 12.5];
      const initZoom = centerOn ? 14 : userCoords ? 12 : 5;
      const map = L.map(el, {
        center: initCenter,
        zoom: initZoom,
        zoomControl: false,
        attributionControl: false,
        worldCopyJump: true,
        scrollWheelZoom: true,
        preferCanvas: false,
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        subdomains: ["a", "b", "c"],
      }).addTo(map);
      // Stash for global zoom button access
      (window as any).__kudosMap = map;
      mapRef.current = map;
      createdMap = map;
      LRef.current = L;
      // P32-fix · disparar re-render del useEffect de markers · sin esto
      // los markers nunca se pintaban porque el effect [pois, activeId] se
      // ejecutaba antes que LRef estuviera disponible y hacía early return.
      setMapReady(true);
      console.warn("[KUDOS-MAP] Leaflet listo · setMapReady(true) · pois pendientes de pintar:", pois.length);
      setTimeout(() => { try { map.invalidateSize(); } catch {} }, 100);
      setTimeout(() => { try { map.invalidateSize(); } catch {} }, 400);
    })();
    return () => {
      cancelled = true;
      if (createdMap) {
        try { createdMap.off(); } catch {}
        try { createdMap.remove(); } catch {}
      }
      if (mapRef.current) { try { mapRef.current.remove(); } catch {} }
      mapRef.current = null;
      markersRef.current.clear();
      userMarkerRef.current = null;
      if (containerRef.current) {
        const el = containerRef.current as any;
        if (el._leaflet_id != null) { try { delete el._leaflet_id; } catch {} }
        while (el.firstChild) el.removeChild(el.firstChild);
      }
      (window as any).__kudosMap = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Render photo-bubble markers
  React.useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    // P32-debug · log explícito · saber EXACTO cuántos POIs recibe el mapa
    console.warn("[KUDOS-MAP] render markers · pois=", pois.length, "· activeId=", activeId);
    const next = new Map<string, Poi>(pois.map((p) => [p.id, p]));
    // Remove stale
    markersRef.current.forEach((m, id) => {
      if (!next.has(id)) {
        try { m.remove(); } catch {}
        markersRef.current.delete(id);
      }
    });
    // Add/update
    let added = 0, skipped = 0;
    next.forEach((p, id) => {
      // Skip POIs con coords inválidas (causa de crash silencioso al render)
      if (typeof p.lat !== "number" || typeof p.lng !== "number" ||
          isNaN(p.lat) || isNaN(p.lng)) {
        console.warn("[KUDOS-MAP] skip POI con coords inválidas:", id, p.lat, p.lng);
        skipped++;
        return;
      }
      try {
        const isActive = id === activeId;
        const tier = tierOf(p);
        // Tamaño actual del nuevo diseño Futurismo Humano (sincronizado con buildBubbleHTML)
        const size = isActive ? 84 : tier === "S" ? 68 : tier === "A" ? 50 : 14;
        // Tier S/A llevan label debajo · B es solo el dot
        const labelHeight = isActive ? 30 : tier === "S" ? 30 : tier === "A" ? 24 : 0;
        const totalW = tier === "B" ? 14 : Math.max(size, 140);
        const totalH = size + labelHeight;
        const html = buildBubbleHTML(p, isActive);
        const icon = L.divIcon({
          className: "kudos-bubble",
          html,
          iconSize: [totalW, totalH],
          iconAnchor: [totalW / 2, tier === "B" ? size / 2 : size / 2 + labelHeight / 2],
          popupAnchor: [0, -size / 2],
        });
        const existing = markersRef.current.get(id);
        if (existing) {
          existing.setIcon(icon);
          existing.setLatLng([p.lat, p.lng]);
        } else {
          const m = L.marker([p.lat, p.lng], { icon }).addTo(map);
          m.on("click", () => onPickRef.current(id));
          markersRef.current.set(id, m);
          added++;
        }
      } catch (err) {
        console.warn("[KUDOS-MAP] skip POI con error:", id, err);
        skipped++;
      }
    });
    console.warn("[KUDOS-MAP] markers OK · added=", added, "· skipped=", skipped, "· total=", markersRef.current.size);
  }, [pois, activeId, mapReady]);

  // Center on active POI
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !centerOn) return;
    try { map.setView([centerOn.lat, centerOn.lng], 14, { animate: true }); } catch {}
  }, [centerOn]);

  // Center on user location · primera vez que llegan las coords (si no hay POI activo).
  // La geolocation y la carga del map son async · pueden completarse en cualquier
  // orden. Usamos un interval corto que comprueba ambos y centra UNA vez cuando
  // los dos están listos. Después el usuario controla la cámara.
  const centeredOnUserRef = React.useRef(false);
  React.useEffect(() => {
    if (centerOn || centeredOnUserRef.current) return;
    if (!userCoords) return;
    let tries = 0;
    const t = setInterval(() => {
      tries += 1;
      const map = mapRef.current;
      if (map) {
        try {
          map.setView([userCoords.lat, userCoords.lng], 12, { animate: true });
          centeredOnUserRef.current = true;
        } catch {}
        clearInterval(t);
      } else if (tries > 40) {
        // ~4s · si tras 40 intentos no hay map, abandona (algo grave pasa).
        clearInterval(t);
      }
    }, 100);
    return () => clearInterval(t);
  }, [userCoords?.lat, userCoords?.lng, centerOn]);

  // User marker
  React.useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    if (userMarkerRef.current) {
      try { userMarkerRef.current.remove(); } catch {}
      userMarkerRef.current = null;
    }
    if (userCoords) {
      const icon = L.divIcon({
        className: "kudos-user",
        html: `<div style="width:18px;height:18px;border-radius:50%;background:#38BDF8;border:3px solid #fff;box-shadow:0 0 14px rgba(56,189,248,0.65);"></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });
      const m = L.marker([userCoords.lat, userCoords.lng], { icon, interactive: false }).addTo(map);
      userMarkerRef.current = m;
    }
  }, [userCoords?.lat, userCoords?.lng]);

  return (
    <div ref={containerRef} style={MAP_CANVAS} aria-label="Mapa interactivo KUDOS" />
  );
}

function leafletZoom(dir: "in" | "out") {
  const map = (window as any).__kudosMap;
  if (!map) return;
  try { dir === "in" ? map.zoomIn() : map.zoomOut(); } catch {}
}

// ─── Markers "Futurismo Humano" · brand book 5D KUDOS / TIMEWISDOM ──────
// Paleta crítica:
//   - DORADO #FFD700 → mérito eterno · token $TIME · valor que perdura (Tier S)
//   - CÍAN     #00E5FF → Nexus · IA Mind · conectividad (Tier A)
//   - NEGRO    #0A0A0A → archivo universal · profundidad (fondo de todos)
//   - BLANCO   #F5F5F5 → texturas hardware
//
// Cero fotos placeholder. Símbolos geométricos vectoriales por categoría.
// Glow tecnológico que respira. Forma única para Tier S (hexágono = núcleo
// de la cápsula). Round limpio para Tier A. Dot para Tier B.

const WORLD_ICON_IDS = new Set([
  "rome", "machu", "petra", "athens", "granada", "istanbul",
  "g-eiffel", "g-taj", "g-greatwall", "g-giza", "g-chichen",
  "g-cristored", "g-angkor", "g-stonehenge", "g-sagrada",
  "g-libertad", "g-notredame", "g-sphinx", "g-vatican",
  "g-bigben", "g-empire", "g-opera", "g-forbidden",
  "g-cordoba", "g-bluemosque", "g-rapa",
]);

function tierOf(p: Poi): "S" | "A" | "B" {
  if (WORLD_ICON_IDS.has(p.id)) return "S";
  if (p.id.startsWith("g-")) return "A";
  return "B";
}

// SVG glyph minimalista por categoría · 24x24 viewBox
function categoryGlyph(cat: string | undefined, fill: string): string {
  const f = fill;
  switch (cat) {
    case "museo":
      // Columna clásica (museos / arte)
      return `<path d="M5 4h14v2H5zM5 19h14v2H5zM7 7h10v11H7zM9 8v9M12 8v9M15 8v9" stroke="${f}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
    case "naturaleza":
      // Montaña + sol
      return `<path d="M3 19h18L15 9l-3 4-2-2-7 8z" fill="${f}"/><circle cx="17" cy="6" r="2.2" fill="${f}"/>`;
    case "gastronomia":
      // Tenedor + cuchara
      return `<path d="M8 3v8a2 2 0 0 0 2 2v8M16 3v18M14 3v6h4V3M12 3v6a2 2 0 0 1-4 0V3" stroke="${f}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
    case "evento":
      // Estrella destacada
      return `<path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z" fill="${f}"/>`;
    case "historia":
      // Reloj / cronos
      return `<circle cx="12" cy="12" r="9" fill="none" stroke="${f}" stroke-width="1.8"/><path d="M12 6v6l4 2.5" stroke="${f}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
    case "cultura":
      // Símbolo "play / discover"
      return `<circle cx="12" cy="12" r="9" fill="none" stroke="${f}" stroke-width="1.8"/><path d="M10 8l6 4-6 4z" fill="${f}"/>`;
    case "misterio":
      // Ojo / portal
      return `<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" fill="none" stroke="${f}" stroke-width="1.8"/><circle cx="12" cy="12" r="3" fill="${f}"/>`;
    default:
      // Monumento (default) · triángulo + base
      return `<path d="M12 3l9 16H3z" fill="${f}"/>`;
  }
}

function buildBubbleHTML(p: Poi, active: boolean): string {
  const tier = tierOf(p);
  const cat = p.categories?.[0];

  // Colores por tier según brand book futurista
  const GOLD = "#FFD700";   // Mérito eterno · $TIME
  const CYAN = "#00E5FF";   // Nexus · Mind IA
  const NAVY = "#0A0A0A";   // Archivo universal
  const ORG  = "#F5F5F5";   // Cerámica

  // ─── Tier S · hexágono dorado + glyph blanco + pulso dorado-cyan ─────
  if (active || tier === "S") {
    const sz = active ? 84 : 68;
    return `
      <div class="kudos-bubble-wrap kudos-bubble-s" style="display:flex;flex-direction:column;align-items:center;pointer-events:auto;cursor:pointer;">
        <div style="position:relative;width:${sz}px;height:${sz}px;display:flex;align-items:center;justify-content:center;">
          <svg viewBox="0 0 100 100" width="${sz}" height="${sz}" style="position:absolute;inset:0;filter:drop-shadow(0 0 14px rgba(255,215,0,0.55)) drop-shadow(0 6px 16px rgba(0,0,0,0.6));">
            <defs>
              <linearGradient id="g${escapeHTML(p.id)}" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="${GOLD}"/>
                <stop offset="100%" stop-color="#FFA500"/>
              </linearGradient>
            </defs>
            <polygon points="50,4 92,27 92,73 50,96 8,73 8,27" fill="${NAVY}" stroke="url(#g${escapeHTML(p.id)})" stroke-width="3"/>
            <polygon points="50,12 84,30 84,70 50,88 16,70 16,30" fill="rgba(255,215,0,0.06)"/>
          </svg>
          <svg viewBox="0 0 24 24" width="${Math.round(sz*0.42)}" height="${Math.round(sz*0.42)}" style="position:relative;z-index:1;">
            ${categoryGlyph(cat, GOLD)}
          </svg>
        </div>
        <div style="margin-top:8px;padding:5px 12px;border-radius:999px;background:rgba(10,10,10,0.92);border:1px solid ${GOLD};color:${ORG};font-family:Poppins,system-ui,sans-serif;font-size:11px;font-weight:700;white-space:nowrap;letter-spacing:0.3px;box-shadow:0 6px 20px -8px rgba(255,215,0,0.6);">
          <span style="color:${GOLD};margin-right:6px;">◆</span>${escapeHTML(p.name)}
        </div>
      </div>
    `;
  }

  // ─── Tier A · círculo cyan elegante + glyph cyan + label ─────────────
  if (tier === "A") {
    const sz = 50;
    return `
      <div class="kudos-bubble-wrap kudos-bubble-a" style="display:flex;flex-direction:column;align-items:center;pointer-events:auto;cursor:pointer;">
        <div style="position:relative;width:${sz}px;height:${sz}px;border-radius:50%;background:radial-gradient(circle at 30% 30%, rgba(0,229,255,0.15), ${NAVY} 70%);border:1.5px solid ${CYAN};display:flex;align-items:center;justify-content:center;box-shadow:0 0 14px rgba(0,229,255,0.45),0 6px 14px -6px rgba(0,0,0,0.5);">
          <svg viewBox="0 0 24 24" width="22" height="22">
            ${categoryGlyph(cat, CYAN)}
          </svg>
        </div>
        <div style="margin-top:6px;padding:3px 9px;border-radius:999px;background:rgba(10,10,10,0.78);color:${ORG};font-family:Poppins,system-ui,sans-serif;font-size:10px;font-weight:600;white-space:nowrap;letter-spacing:0.2px;border:1px solid rgba(0,229,255,0.25);">
          ${escapeHTML(p.name)}
        </div>
      </div>
    `;
  }

  // ─── Tier B · dot tenue · solo dot, sin label (mantiene mapa limpio) ─
  return `
    <div class="kudos-bubble-wrap kudos-bubble-b" style="display:flex;align-items:center;justify-content:center;pointer-events:auto;cursor:pointer;" title="${escapeHTML(p.name)}">
      <div style="width:14px;height:14px;border-radius:50%;background:${CYAN};opacity:0.55;box-shadow:0 0 8px rgba(0,229,255,0.5);border:1.5px solid rgba(10,10,10,0.7);"></div>
    </div>
  `;
}

function escapeHTML(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function ensureLeafletCSS() {
  if (typeof document === "undefined") return;
  if (!document.getElementById(LEAFLET_CSS_ID)) {
    const link = document.createElement("link");
    link.id = LEAFLET_CSS_ID;
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    link.crossOrigin = "";
    document.head.appendChild(link);
  }
  if (!document.getElementById(LEAFLET_STYLE_ID)) {
    const style = document.createElement("style");
    style.id = LEAFLET_STYLE_ID;
    style.textContent = `
      .leaflet-container { background:#1A1333 !important; outline:none; font-family:Poppins, system-ui, sans-serif; }
      .leaflet-tile { filter: hue-rotate(220deg) saturate(0.62) brightness(0.55) contrast(1.05); }
      .kudos-bubble { background:transparent !important; border:none !important; }
      .kudos-user   { background:transparent !important; border:none !important; }
      .kudos-bubble-wrap { transition: transform 0.18s ease; }
      .kudos-bubble-wrap:hover { transform: scale(1.10); z-index: 1000 !important; }
      @keyframes kudos-pulse-gold {
        0%, 100% { filter: drop-shadow(0 0 6px rgba(255,215,0,0.4)) drop-shadow(0 6px 14px rgba(0,0,0,0.6)); }
        50%      { filter: drop-shadow(0 0 22px rgba(255,215,0,0.9)) drop-shadow(0 0 36px rgba(0,229,255,0.4)) drop-shadow(0 6px 14px rgba(0,0,0,0.6)); }
      }
      .kudos-bubble-s svg:first-of-type { animation: kudos-pulse-gold 3s ease-in-out infinite; }
      @keyframes kudos-pulse-cyan {
        0%, 100% { box-shadow: 0 0 10px rgba(0,229,255,0.35), 0 4px 10px -4px rgba(0,0,0,0.5); }
        50%      { box-shadow: 0 0 18px rgba(0,229,255,0.7),  0 4px 10px -4px rgba(0,0,0,0.5); }
      }
      .kudos-bubble-a > div:first-child { animation: kudos-pulse-cyan 4s ease-in-out infinite; }
      @media (prefers-reduced-motion: reduce) {
        .kudos-bubble-s svg:first-of-type, .kudos-bubble-a > div:first-child { animation: none; }
        .kudos-bubble-wrap:hover { transform: none; }
      }
    `;
    document.head.appendChild(style);
  }
}

// =====================================================================
// Sub-renders (inline, concrete)
// =====================================================================

function PanelGroup({ title, open, onToggle, children }: { title: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <section style={PANEL}>
      <button type="button" onClick={onToggle} style={PANEL_HEAD} aria-expanded={open}>
        <span style={PANEL_HEAD_LEFT}>
          <Icon name="more" size={14} />
          <span>{title}</span>
        </span>
        <Icon name="chevron" size={14} style={{ transform: open ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 160ms" }} />
      </button>
      {open ? <div style={PANEL_BODY}>{children}</div> : null}
    </section>
  );
}

function LayerRow({ layer, onToggle }: { layer: LayerDef; onToggle?: () => void }) {
  const active = layer.active;
  return (
    <button type="button" onClick={onToggle} style={{ ...(active ? LAYER_ROW_ACTIVE : LAYER_ROW), border: "none", textAlign: "left", cursor: "pointer", width: "100%" }} aria-pressed={active}>
      <span style={active ? LAYER_ICON_ACTIVE : LAYER_ICON}><Icon name={layer.icon} size={14} /></span>
      <span style={{ flex: 1, fontWeight: active ? 700 : 500, color: active ? "var(--kudos-accent-bright, #8B6BFF)" : "var(--kudos-ink)" }}>{layer.label}</span>
      <span style={active ? EYE_BTN_ACTIVE : EYE_BTN}>
        <Icon name={active ? "discover" : "discover"} size={12} />
      </span>
    </button>
  );
}

function CategoryRow({ cat, active, onSelect }: { cat: CategoryDef; active: boolean; onSelect: () => void }) {
  return (
    <button type="button" onClick={onSelect} style={active ? LAYER_ROW_ACTIVE : LAYER_ROW}>
      <span style={active ? LAYER_ICON_ACTIVE : LAYER_ICON}><Icon name={cat.icon} size={14} /></span>
      <span style={{ flex: 1, textAlign: "left", fontWeight: active ? 700 : 500, color: active ? "var(--kudos-accent-bright, #8B6BFF)" : "var(--kudos-ink)" }}>{cat.label}</span>
      <span style={active ? RADIO_ACTIVE : RADIO}>
        {active ? <span style={RADIO_DOT} /> : null}
      </span>
    </button>
  );
}

function PoiSheet({ poi, capsule, isSaved, onClose, onSave, onShare, onOpenPoi }: {
  poi: Poi; capsule: Capsule | null; isSaved: boolean;
  onClose: () => void; onSave: () => void; onShare: () => void; onOpenPoi: () => void;
}) {
  return (
    <aside style={SHEET} className="kudos-glass-strong kudos-elev-3" aria-label={`Detalles de ${poi.name}`}>
      <button type="button" onClick={onClose} aria-label="Cerrar" style={SHEET_CLOSE} className="kudos-tap">
        <Icon name="close" size={16} />
      </button>

      <div style={SHEET_INNER}>
        {/* LEFT · media · VideoCapsule (real video when capsule.clipSrc, else poster + motion) */}
        <div style={{ width: 200, height: 150 }}>
          <VideoCapsule
            posterUrl={capsule?.poster ?? poi.heroImage}
            videoSrc={capsule?.clipSrc}
            duration={capsule?.duration ?? "0:15"}
            aspectRatio="200/150"
            rounded={16}
            ariaLabel={poi.name}
          />
        </div>

        {/* CENTER · hierarchy */}
        <div style={SHEET_CONTENT}>
          <h2 style={SHEET_TITLE}>{poi.name}</h2>
          <div style={SHEET_META}>
            <span style={SHEET_RATING}>
              <span style={STAR}>★</span>
              <span style={{ fontWeight: 700 }}>{poi.rating.toFixed(1)}</span>
            </span>
            <span style={SHEET_DIVIDER} aria-hidden>|</span>
            <span style={SHEET_CAT}>{cap(poi.categories[0] ?? "lugar")} hist&oacute;rico</span>
          </div>
          <p style={SHEET_DESC}>{poi.short}</p>
          <div style={SHEET_CHIPS}>
            {poi.categories.slice(0, 1).map((c) => (
              <span key={c} style={SHEET_CHIP}>{cap(c)}</span>
            ))}
            <span style={SHEET_CHIP}>{eraLabel(poi.era)}</span>
            {capsule?.epochLabel ? <span style={SHEET_CHIP_EPOCH}>&Eacute;poca: {capsule.epochLabel}</span> : null}
          </div>
        </div>

        {/* RIGHT · CTA block */}
        <div style={SHEET_ACTIONS}>
          <button type="button" onClick={onSave} style={isSaved ? SHEET_SAVE_ACTIVE : SHEET_SAVE} className="kudos-tap">
            <Icon name={isSaved ? "saved" : "saved"} size={15} />
            <span>{isSaved ? "Guardado" : "Guardar"}</span>
          </button>
          <button type="button" onClick={onOpenPoi} style={SHEET_CTA} className="kudos-tap">
            <span style={SHEET_CTA_PLAY_BADGE}>
              <Icon name="play" size={11} />
            </span>
            <span>Ver c&aacute;psula</span>
          </button>
          <button type="button" onClick={onShare} style={SHEET_GHOST} className="kudos-tap" aria-label="Compartir">
            <Icon name="share" size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}

// =====================================================================
// Utilities
// =====================================================================

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function eraLabel(era: Poi["era"]): string {
  switch (era) {
    case "roman":       return "Imperio Romano";
    case "medieval":    return "Edad Media";
    case "renaissance": return "Renacimiento";
    case "modern":      return "Era Moderna";
    case "today":       return "Hoy";
    default:            return "Histórico";
  }
}

// =====================================================================
// Styles
// =====================================================================

const ROOT: React.CSSProperties = {
  width: "100%",
  maxWidth: 1440,
  margin: "0 auto",
  padding: "0 12px",
  color: "var(--kudos-ink)",
  fontFamily: "var(--kudos-font-body)",
};

// Tab switcher
const SWITCHER_WRAP: React.CSSProperties = {
  display: "flex",
  justifyContent: "stretch",
  padding: "8px 0 14px",
};
const SWITCHER: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
  width: "100%",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 14,
  padding: 4,
  gap: 4,
};
const PILL_BASE: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  padding: "10px 16px",
  borderRadius: 10,
  border: "none",
  fontFamily: "var(--kudos-font-body)",
  fontSize: 11.5,
  fontWeight: 700,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  cursor: "pointer",
  background: "transparent",
};
const PILL_ACTIVE: React.CSSProperties = {
  ...PILL_BASE,
  background: "rgba(255,255,255,0.06)",
  color: "var(--kudos-ink)",
  backgroundImage: "linear-gradient(rgba(255,255,255,0.04), rgba(255,255,255,0.04)), var(--kudos-gradient-cta)",
  backgroundOrigin: "border-box",
  backgroundClip: "padding-box, border-box",
  borderBottom: "2px solid transparent",
};
const PILL_IDLE: React.CSSProperties = {
  ...PILL_BASE,
  color: "rgba(242,242,247,0.5)",
};

// Stage + map canvas
const STAGE: React.CSSProperties = {
  position: "relative",
  width: "100%",
  height: "calc(var(--kudos-dvh, 1vh) * 100 - var(--app-topbar-h, 56px) - var(--app-bottomnav-h, 72px) - var(--kudos-safe-top, 0px) - var(--kudos-safe-bottom, 0px) - 80px)",
  minHeight: 540,
  borderRadius: 18,
  overflow: "hidden",
  border: "1px solid rgba(255,255,255,0.06)",
};
const MAP_CANVAS: React.CSSProperties = {
  position: "absolute", inset: 0,
};

// Left panels
const LEFT_PANELS: React.CSSProperties = {
  position: "absolute",
  top: 18, left: 18,
  zIndex: 600,
  display: "flex",
  flexDirection: "column",
  gap: 10,
  width: 240,
  pointerEvents: "auto",
};
const PANEL: React.CSSProperties = {
  background: "rgba(10,6,18,0.78)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 14,
  backdropFilter: "blur(14px) saturate(160%)",
  WebkitBackdropFilter: "blur(14px) saturate(160%)",
  overflow: "hidden",
};
const PANEL_HEAD: React.CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "12px 14px",
  background: "transparent",
  border: "none",
  color: "var(--kudos-ink)",
  cursor: "pointer",
  fontFamily: "var(--kudos-font-body)",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
};
const PANEL_HEAD_LEFT: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 8,
};
const PANEL_BODY: React.CSSProperties = {
  display: "flex", flexDirection: "column",
  padding: "0 6px 8px",
  gap: 2,
};
const LAYER_ROW: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "9px 10px",
  borderRadius: 10,
  background: "transparent",
  border: "none",
  color: "var(--kudos-ink)",
  cursor: "pointer",
  fontFamily: "var(--kudos-font-body)",
  fontSize: 13,
};
const LAYER_ROW_ACTIVE: React.CSSProperties = {
  ...LAYER_ROW,
  background: "rgba(108,60,255,0.14)",
};
const LAYER_ICON: React.CSSProperties = {
  width: 26, height: 26,
  borderRadius: 8,
  background: "rgba(255,255,255,0.05)",
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  color: "rgba(242,242,247,0.65)",
  flexShrink: 0,
};
const LAYER_ICON_ACTIVE: React.CSSProperties = {
  ...LAYER_ICON,
  background: "rgba(108,60,255,0.20)",
  color: "var(--kudos-accent-bright, #8B6BFF)",
};
const EYE_BTN: React.CSSProperties = {
  width: 20, height: 20,
  borderRadius: 6,
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  color: "rgba(242,242,247,0.45)",
};
const EYE_BTN_ACTIVE: React.CSSProperties = {
  ...EYE_BTN,
  background: "var(--kudos-accent, #6C3CFF)",
  border: "1px solid var(--kudos-accent, #6C3CFF)",
  color: "#fff",
};

const RADIO: React.CSSProperties = {
  width: 18, height: 18,
  borderRadius: "50%",
  border: "1.5px solid rgba(255,255,255,0.18)",
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  flexShrink: 0,
};
const RADIO_ACTIVE: React.CSSProperties = {
  ...RADIO,
  borderColor: "var(--kudos-accent, #6C3CFF)",
  background: "var(--kudos-accent, #6C3CFF)",
};
const RADIO_DOT: React.CSSProperties = {
  width: 6, height: 6,
  borderRadius: "50%",
  background: "#fff",
};

// Top-right controls
const TOP_RIGHT: React.CSSProperties = {
  position: "absolute",
  top: 18, right: 18,
  zIndex: 600,
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  gap: 10,
};
const CHIP_ROW: React.CSSProperties = {
  display: "flex", gap: 8,
};
const CTX_CHIP: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 14px",
  borderRadius: 999,
  background: "rgba(10,6,18,0.82)",
  border: "1px solid rgba(255,255,255,0.10)",
  color: "var(--kudos-ink)",
  cursor: "pointer",
  fontFamily: "var(--kudos-font-body)",
  fontSize: 12.5,
  fontWeight: 600,
  backdropFilter: "blur(10px)",
};
const WEATHER_CHIP: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "6px 14px",
  borderRadius: 999,
  background: "rgba(10,6,18,0.82)",
  border: "1px solid rgba(255,255,255,0.10)",
  color: "var(--kudos-ink)",
  backdropFilter: "blur(10px)",
};
const COMPASS_BTN: React.CSSProperties = {
  position: "relative",
  width: 44, height: 44,
  borderRadius: "50%",
  background: "rgba(10,6,18,0.82)",
  border: "1px solid rgba(255,255,255,0.10)",
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  backdropFilter: "blur(10px)",
};
const COMPASS_N: React.CSSProperties = {
  position: "absolute",
  top: 4, left: "50%",
  transform: "translateX(-50%)",
  fontSize: 9, fontWeight: 700,
  color: "rgba(242,242,247,0.78)",
};
const COMPASS_NEEDLE: React.CSSProperties = {
  position: "absolute",
  top: 8, left: "50%",
  transform: "translateX(-50%)",
  width: 0, height: 0,
  borderLeft: "5px solid transparent",
  borderRight: "5px solid transparent",
  borderBottom: "14px solid #FF3CAC",
};
const CTRL_BTN_SQ: React.CSSProperties = {
  width: 44, height: 44,
  borderRadius: 12,
  background: "rgba(10,6,18,0.82)",
  border: "1px solid rgba(255,255,255,0.10)",
  color: "var(--kudos-ink)",
  cursor: "pointer",
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  fontFamily: "var(--kudos-font-body)",
  fontSize: 12,
  fontWeight: 700,
  backdropFilter: "blur(10px)",
};

// Zoom rail (right middle)
const ZOOM_RAIL: React.CSSProperties = {
  position: "absolute",
  right: 18,
  bottom: 110,
  zIndex: 600,
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

// Scale bar
const SCALE_BAR: React.CSSProperties = {
  position: "absolute",
  bottom: 14, right: 18,
  zIndex: 590,
  display: "flex", alignItems: "center", gap: 6,
  color: "rgba(242,242,247,0.78)",
  fontFamily: "var(--kudos-font-mono)",
  fontSize: 10.5,
};
const SCALE_LABEL: React.CSSProperties = {
  background: "rgba(10,6,18,0.62)",
  padding: "2px 6px",
  borderRadius: 4,
};
const SCALE_LINE: React.CSSProperties = {
  display: "inline-block",
  width: 70,
  height: 2,
  background: "rgba(242,242,247,0.55)",
};

// Bottom sheet
const SHEET: React.CSSProperties = {
  position: "absolute",
  left: 16, right: 16, bottom: 16,
  zIndex: 700,
  background: "rgba(10,6,18,0.96)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 18,
  padding: 16,
  backdropFilter: "blur(18px) saturate(160%)",
  WebkitBackdropFilter: "blur(18px) saturate(160%)",
  boxShadow: "0 24px 50px -12px rgba(0,0,0,0.65)",
};
const SHEET_CLOSE: React.CSSProperties = {
  position: "absolute",
  top: 12, right: 12,
  zIndex: 5,
  width: 30, height: 30,
  borderRadius: "50%",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.10)",
  color: "var(--kudos-ink)",
  cursor: "pointer",
  display: "inline-flex", alignItems: "center", justifyContent: "center",
};
const SHEET_INNER: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "200px minmax(0, 1fr) 200px",
  gap: 22,
  alignItems: "center",
};
const SHEET_PREVIEW: React.CSSProperties = {
  position: "relative",
  width: 200,
  height: 150,
  borderRadius: 16,
  backgroundSize: "cover",
  backgroundPosition: "center",
  overflow: "hidden",
  border: "1px solid rgba(255,255,255,0.08)",
  boxShadow: "0 14px 28px -12px rgba(0,0,0,0.55)",
};
const SHEET_PLAY_BADGE: React.CSSProperties = {
  position: "absolute",
  top: 10, left: 10,
  display: "inline-flex", alignItems: "center", gap: 4,
  padding: "3px 8px",
  borderRadius: 999,
  background: "rgba(10,6,18,0.78)",
  border: "1px solid rgba(255,255,255,0.10)",
  color: "var(--kudos-ink)",
  fontSize: 10, fontWeight: 500,
};
const SHEET_PLAY_OVERLAY: React.CSSProperties = {
  position: "absolute",
  bottom: 10, left: 10,
  width: 30, height: 30,
  borderRadius: "50%",
  background: "rgba(255,255,255,0.18)",
  border: "1px solid rgba(255,255,255,0.32)",
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  color: "#fff",
  backdropFilter: "blur(6px)",
};
const SHEET_CONTENT: React.CSSProperties = {
  display: "flex", flexDirection: "column", gap: 6, minWidth: 0,
};
const SHEET_TITLE: React.CSSProperties = {
  margin: 0,
  fontFamily: "var(--kudos-font-display)",
  fontSize: 26, fontWeight: 800,
  letterSpacing: "-0.02em",
  lineHeight: 1.1,
  color: "var(--kudos-ink)",
};
const SHEET_META: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 8,
  fontSize: 12.5,
};
const SHEET_RATING: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 4,
  color: "var(--kudos-accent-yellow, #FFD23F)",
};
const SHEET_DOT: React.CSSProperties = {
  color: "rgba(242,242,247,0.42)",
};
const SHEET_GHOST: React.CSSProperties = {
  appearance: "none",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "rgba(242,242,247,0.92)",
  padding: "8px 12px",
  borderRadius: 12,
  fontSize: 12.5,
  fontWeight: 600,
  cursor: "pointer",
  letterSpacing: 0.2,
};
const SHEET_CAT: React.CSSProperties = {
  color: "rgba(242,242,247,0.72)",
};
const SHEET_DESC: React.CSSProperties = {
  margin: 0,
  fontSize: 12.5,
  lineHeight: 1.45,
  color: "rgba(242,242,247,0.78)",
  maxWidth: 480,
};
const SHEET_CHIPS: React.CSSProperties = {
  display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4,
};
const SHEET_CHIP: React.CSSProperties = {
  padding: "4px 10px",
  borderRadius: 999,
  background: "rgba(108,60,255,0.20)",
  border: "1px solid rgba(108,60,255,0.45)",
  color: "var(--kudos-accent-bright, #8B6BFF)",
  fontSize: 10.5,
  fontWeight: 600,
};
const SHEET_ACTIONS: React.CSSProperties = {
  display: "flex", flexDirection: "column", gap: 8,
  alignSelf: "stretch",
  justifyContent: "center",
};
const SHEET_BTN_BASE: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  gap: 6,
  padding: "11px 18px",
  borderRadius: 12,
  fontFamily: "var(--kudos-font-body)",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  border: "1px solid transparent",
  whiteSpace: "nowrap",
};
const SHEET_SAVE: React.CSSProperties = {
  ...SHEET_BTN_BASE,
  background: "transparent",
  border: "1px solid rgba(255,255,255,0.20)",
  color: "var(--kudos-ink)",
};
const SHEET_SAVE_ACTIVE: React.CSSProperties = {
  ...SHEET_BTN_BASE,
  background: "rgba(108,60,255,0.20)",
  border: "1px solid rgba(108,60,255,0.55)",
  color: "var(--kudos-accent-bright, #8B6BFF)",
};
const SHEET_CTA: React.CSSProperties = {
  ...SHEET_BTN_BASE,
  background: "var(--kudos-accent, #6C3CFF)",
  border: "1px solid var(--kudos-accent, #6C3CFF)",
  color: "#fff",
  boxShadow: "0 14px 28px -10px rgba(108,60,255,0.7)",
};

const SHEET_DIVIDER: React.CSSProperties = {
  color: "rgba(255,255,255,0.16)",
  fontWeight: 300,
  margin: "0 2px",
};
const SHEET_CHIP_EPOCH: React.CSSProperties = {
  padding: "4px 10px",
  borderRadius: 999,
  background: "rgba(255,154,0,0.16)",
  border: "1px solid rgba(255,154,0,0.45)",
  color: "var(--kudos-accent-orange, #FF9A00)",
  fontSize: 10.5,
  fontWeight: 600,
};
const SHEET_CTA_PLAY_BADGE: React.CSSProperties = {
  width: 22, height: 22,
  borderRadius: "50%",
  background: "rgba(255,255,255,0.22)",
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  color: "#fff",
  fontSize: 11,
  fontWeight: 700,
};
const STAR: React.CSSProperties = {
  color: "var(--kudos-accent-yellow, #FFD23F)",
  fontSize: 13,
  lineHeight: 1,
};
