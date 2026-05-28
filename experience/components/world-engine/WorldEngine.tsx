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
  WORLD_LABELS_URL,
  WORLD_TILE_ATTRIB,
  WORLD_TILE_SUBDOMAINS,
  WORLD_TILE_MAX_ZOOM,
  WORLD_TILE_FILTER,
  WORLD_LABELS_FILTER,
  TIER_MIN_ZOOM,
  maxNodesAtZoom,
  sizeFactorForZoom,
  WorldNodeTier,
  WorldNodeCategory,
  inferCategory,
} from "./world-tokens";
import { buildWorldNodeHTML, WORLD_NODE_CSS } from "./WorldNode";
import { WorldLogo } from "./WorldLogo";
import { WorldSearch, type CityPreset } from "./WorldSearch";
import { WorldWeather } from "./WorldWeather";
import { WorldHud, FILTER_TO_CATEGORIES } from "./WorldHud";


interface WorldPoi {
  id: string;
  name: string;
  lat: number;
  lng: number;
  tier: WorldNodeTier;
  category: WorldNodeCategory;
  image?: string;
  imageHero?: string;
}


// ─── Helpers UI ──────────────────────────────────────────────────────
const CATEGORY_LABEL_ES: Record<WorldNodeCategory, string> = {
  museum: "Museo",
  castle: "Castillo",
  religious: "Edificio religioso",
  megalith: "Megalito",
  park: "Naturaleza",
  plaza: "Plaza",
  monument: "Monumento",
  archaeology: "Yacimiento",
  palace: "Palacio",
  mystery: "Misterio",
};

// Glyph sutil sin texto · solo icono · misterio controlado
const CATEGORY_ICON_GLYPH: Record<WorldNodeCategory, string> = {
  museum: "▣", castle: "♜", religious: "✚", megalith: "⫯",
  park: "❀", plaza: "□", monument: "▲", archaeology: "⫯",
  palace: "♔", mystery: "◇",
};

// Líneas evocadoras · NARRATIVA PRIMERO · una sola línea que invita
const EVOCATIVE_LINES_ES: Record<WorldNodeCategory, string> = {
  museum:       "Donde el tiempo se conserva en silencio.",
  castle:       "Una piedra que vio caer reinos.",
  religious:    "Un espacio donde el aire pesa distinto.",
  megalith:     "Manos antiguas dejaron una huella aquí.",
  park:         "El mundo respira sin pedir permiso.",
  plaza:        "Aquí la ciudad se encuentra consigo misma.",
  monument:     "Alguien quiso que esto durara más que él.",
  archaeology:  "Capas de vida bajo tus pies.",
  palace:       "Decisiones que cambiaron mapas se tomaron aquí.",
  mystery:      "Algo que aún no entendemos del todo.",
};

const TIER_LABEL_ES: Record<WorldNodeTier, string> = {
  S: "Legendary",
  A: "Premium",
  B: "Descubrible",
  C: "Long tail",
};

// Convertir Wikimedia URL a hero (1024)
function wikimediaHero(url?: string): string | undefined {
  if (!url) return undefined;
  if (url.includes("Special:FilePath")) {
    return url.replace(/\?width=\d+/, "") + "?width=1024";
  }
  return url;
}


const LEGENDARY_IDS = new Set([
  "wd-Q10285",
  "wd-Q12511",
  "wd-Q12512",
  "wd-Q131013",
  "wd-Q132498",
  "wd-Q180212",
  "wd-Q150586",
  "wd-Q160422",
  "wd-Q160933",
  "wd-Q165498",
  "wd-Q179195",
  "wd-Q189814",
  "wd-Q19660",
  "wd-Q19675",
  "wd-Q207659",
  "wd-Q210298",
  "wd-Q22247",
  "wd-Q23306",
  "wd-Q243",
  "wd-Q26013",
  "wd-Q2981",
  "wd-Q4233734",
  "wd-Q4250",
  "wd-Q43332",
  "wd-Q43473",
  "wd-Q4360",
  "wd-Q47672",
  "wd-Q49093",
  "wd-Q4915",
  "wd-Q62378",
  "wd-Q9141",
  "wd-Q9259",
  "rome",
  "machu",
  "petra",
  "athens",
  "granada",
  "istanbul",
  "g-eiffel",
  "g-taj",
  "g-greatwall",
  "g-giza",
  "g-chichen",
  "g-cristored",
  "g-angkor",
  "g-stonehenge",
  "g-sagrada",
  "g-libertad",
  "g-notredame",
  "g-sphinx",
  "g-vatican",
  "g-bigben",
  "g-empire",
  "g-opera",
  "g-forbidden",
  "g-cordoba",
  "g-bluemosque",
  "g-rapa",
]);

// POIs a excluir (ciudades como puntos)
const EXCLUDED_AS_POI = new Set([
  "wd-Q12892","wd-Q18287233","wd-Q1492","wd-Q1490","wd-Q2807","wd-Q641","wd-Q1085","wd-Q90","wd-Q220","wd-Q84","wd-Q1741",
]);

const TIER_PRIORITY: Record<WorldNodeTier, number> = { S: 0, A: 1, B: 2, C: 3 };

// ─── Keywords para "Selecta KUDOS" · estrictas (post-recompute) ─────────
const KEYWORDS_S = /alh[áa]mbra|sagrada familia|machu picchu|acr[óo]polis|gran pir[áa]mide|notre-dame de paris|reichstag|templo de karnak|baz[íi]lica de san pedro|gran mezquita de c[óo]rdoba/i;
const KEYWORDS_A = /catedral de |cathedral of |alc[áa]zar de |abad[íi]a de |abbey of |monasterio del |monasterio de san |monasterio de santa |palacio real de |palacio nacional de |teatro romano de |villa romana de |anfiteatro romano de |museo nacional de |biblioteca nacional de |plaza mayor de /i;
const KEYWORDS_B = /bas[íi]lica|catedral|cathedral|monasterio|abad[íi]a|abbey|alc[áa]zar|alh[áa]mbra|santuario|castillo|castle|fortaleza|fortress|murall|alcazaba|teatro romano|villa romana|anfiteatro|yacimiento arqueol[óo]gico|parque nacional|jard[íi]n bot[áa]nico|reserva natural|dolmen|menhir|m[áa]moa|t[úu]mulo|petr[óo]glifo|museo de arte|museo arqueol[óo]gico|pinacoteca/i;

function tierForPoi(p: {
  id: string;
  rating?: number;
  unesco?: boolean;
  name?: string;
  category?: string;
  image_url?: string;
  type?: string;
}): WorldNodeTier {
  // Excluir ciudades como puntos
  if (EXCLUDED_AS_POI.has(p.id)) return "C";
  // Tier S · LEGENDARY hardcoded (wd-IDs canónicos)
  if (LEGENDARY_IDS.has(p.id)) return "S";
  const nm = p.name || "";
  // Tier S débil · keyword icónica
  if (KEYWORDS_S.test(nm)) return "S";

  // Globals curados siempre Tier A
  if (p.id.startsWith("g-")) return "A";

  const hasImage = !!p.image_url;

  // Tier A · ICÓNICO · foto + keyword premium
  if (hasImage && KEYWORDS_A.test(nm)) return "A";

  // Tier B · foto + (UNESCO o keyword secundaria)
  if (hasImage && (p.unesco || KEYWORDS_B.test(nm))) return "B";

  // Score legacy
  if ((p.rating ?? 0) >= 9.3) return "A";

  return "C";
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
  const [visibleCount, setVisibleCount] = React.useState(0);
  const [activeLayers, setActiveLayers] = React.useState<Set<string>>(
    new Set(["presente", "historia", "experiencia", "amigos"])
  );
  const [activeFilter, setActiveFilter] = React.useState<string>("todo");
  const [mapCenter, setMapCenter] = React.useState<{lat:number; lng:number} | null>(null);
  const [currentCity, setCurrentCity] = React.useState<string>("Explora el mundo");
  const blueDotRef = React.useRef<any>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const toastTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = React.useCallback((msg: string, durationMs: number = 2200) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(msg);
    toastTimerRef.current = setTimeout(() => setToast(null), durationMs);
  }, []);

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

    // Wikidata · stagger MUY generoso · UI siempre responsive
    // Cada país tarda ~300ms en parsear · 1.5s entre fetches da margen
    const COUNTRIES = ["es", "it", "fr", "gr", "pt", "de", "gb", "jp"];
    COUNTRIES.forEach((cc, idx) => {
      setTimeout(async () => {
        try {
          const r = await fetch(`/data/wikidata/${cc}.json`);
          if (!r.ok) return;
          const data = await r.json();
          const items = (data?.pois ?? []) as Array<{
            id: string; name: string; lat: number; lng: number;
            category?: string; type?: string; unesco?: boolean;
            image_url?: string;
            tier?: "S" | "A" | "B" | "C";   // pre-computado por recompute_tiers.py
          }>;
          const chunk: WorldPoi[] = items.map((p: any) => {
            // Fallback: si category genérico devuelve "monument", probar con name
            let cat = inferCategory(p.type || p.category);
            if (cat === "monument") cat = inferCategory(p.name);
            const img = typeof p.image_url === "string"
              ? p.image_url.replace(/^http:\/\//, "https://")
              : undefined;
            return {
              id: p.id,
              name: p.name,
              lat: p.lat,
              lng: p.lng,
              // Pre-computado por scripts/recompute_tiers.py · fallback JS por si falta
              tier: (p.tier as WorldNodeTier | undefined) ?? tierForPoi({
                id: p.id, unesco: p.unesco,
                name: p.name, category: p.category, type: p.type, image_url: p.image_url,
              }),
              category: cat,
              image: img,
            };
          });
          // Append al ref · NO setState con todo el array
          allNodesRef.current = allNodesRef.current.concat(chunk);
          setTotalLoaded(allNodesRef.current.length);
          setRenderTick((t) => t + 1);
          console.warn(`[WORLD] +${chunk.length} ${cc} · total ${allNodesRef.current.length}`);
        } catch (e) {
          console.warn(`[WORLD] no se pudo cargar ${cc}.json`, e);
        }
      }, 600 + idx * 1500);  // primer país tras 600ms · resto cada 1.5s
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
      // Base oscura cinematográfica
      L.tileLayer(WORLD_TILE_URL, {
        subdomains: WORLD_TILE_SUBDOMAINS,
        attribution: WORLD_TILE_ATTRIB,
        maxZoom: WORLD_TILE_MAX_ZOOM,
        className: "kudos-tile-base",
      }).addTo(map);
      // Overlay · SOLO labels (ciudades, países) · permite situarse
      // sin que compita con los World Nodes
      L.tileLayer(WORLD_LABELS_URL, {
        subdomains: WORLD_TILE_SUBDOMAINS,
        maxZoom: WORLD_TILE_MAX_ZOOM,
        className: "kudos-tile-labels",
        pane: "shadowPane",  // por encima de la base, por debajo de markers
      }).addTo(map);

      mapRef.current = map;
      LRef.current = L;
      createdMap = map;
      setZoom(map.getZoom());

      // F3.4 · Escala Leaflet nativa · esquina inferior izquierda
      try {
        L.control.scale({ metric: true, imperial: false, position: "bottomleft" }).addTo(map);
      } catch {}

      // Inicializar mapCenter
      const c0 = map.getCenter();
      setMapCenter({ lat: c0.lat, lng: c0.lng });

      // Debounced re-render on pan/zoom + tracking del centro para weather
      const onMove = () => {
        if (moveTimeoutRef.current) clearTimeout(moveTimeoutRef.current);
        moveTimeoutRef.current = setTimeout(() => {
          setZoom(map.getZoom());
          const c = map.getCenter();
          setMapCenter({ lat: c.lat, lng: c.lng });
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

  // ── IP geolocation fallback · si el navegador rechaza o tarda >4s ──
  const [ipCoords, setIpCoords] = React.useState<{ lat: number; lng: number } | null>(null);
  React.useEffect(() => {
    const t = setTimeout(async () => {
      if (geo.coords || centeredOnUserRef.current) return;
      try {
        const r = await fetch("https://ipapi.co/json/");
        if (!r.ok) return;
        const j = await r.json();
        if (typeof j.latitude === "number" && typeof j.longitude === "number") {
          setIpCoords({ lat: j.latitude, lng: j.longitude });
          console.warn("[WORLD] IP geolocation fallback:", j.latitude, j.longitude, j.city, j.country_name);
        }
      } catch (e) {
        console.warn("[WORLD] IP fallback falló", e);
      }
    }, 4000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Centrar en usuario UNA VEZ · prioriza geo navegador > IP ──
  // ── Blue dot · F3.4 · circleMarker pulsante en la posición del usuario ──
  React.useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map || !mapReady) return;
    const coords = geo.coords || ipCoords;
    if (!coords) return;
    try {
      if (blueDotRef.current) {
        blueDotRef.current.setLatLng([coords.lat, coords.lng]);
      } else {
        const dot = L.circleMarker([coords.lat, coords.lng], {
          radius: 7,
          color: "#fff",
          weight: 3,
          fillColor: "#3478f6",
          fillOpacity: 1,
          interactive: false,
          pane: "overlayPane",
        });
        dot.addTo(map);
        blueDotRef.current = dot;
      }
    } catch {}
  }, [geo.coords, ipCoords, mapReady]);

    React.useEffect(() => {
    if (centeredOnUserRef.current) return;
    const coords = geo.coords || ipCoords;
    if (!coords || !mapReady) return;
    const map = mapRef.current;
    if (!map) return;
    try {
      // Zoom 11 · ciudad · "veo mi entorno con detalle"
      map.flyTo([coords.lat, coords.lng], 11, {
        duration: 2.4,
        easeLinearity: 0.18,
      });
      centeredOnUserRef.current = true;
      console.warn("[WORLD] centrado en:", coords, "(precisión:", geo.coords ? "GPS" : "IP", ")");
    } catch (e) {
      console.warn("[WORLD] flyTo falló", e);
    }
  }, [geo.coords, ipCoords, mapReady]);

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

    // 1) Filtrar por tier-zoom + bbox + filtro de categoría activo
    const allowedCats = FILTER_TO_CATEGORIES[activeFilter];   // null = todas
    const candidates: WorldPoi[] = [];
    const all = allNodesRef.current;
    for (let i = 0; i < all.length; i++) {
      const n = all[i];
      if (zoom < TIER_MIN_ZOOM[n.tier]) continue;
      if (n.lat < south || n.lat > north) continue;
      if (n.lng < west || n.lng > east) continue;
      if (allowedCats && !allowedCats.has(n.category)) continue;
      candidates.push(n);
    }

    // 2) Ordenar por prioridad tier + cercanía al centro
    candidates.sort((a, b) => {
      const pa = TIER_PRIORITY[a.tier];
      const pb = TIER_PRIORITY[b.tier];
      if (pa !== pb) return pa - pb;
      // Sub-prioridad dentro de Tier S · LEGENDARY hardcoded gana
      const la = LEGENDARY_IDS.has(a.id) ? 0 : 1;
      const lb = LEGENDARY_IDS.has(b.id) ? 0 : 1;
      if (la !== lb) return la - lb;
      // Después por cercanía al centro del viewport
      const da = (a.lat - center.lat) ** 2 + (a.lng - center.lng) ** 2;
      const db = (b.lat - center.lat) ** 2 + (b.lng - center.lng) ** 2;
      return da - db;
    });

    // 3) Cap DINÁMICO según zoom · respira más en lejanía
    const cap = maxNodesAtZoom(zoom);
    const visible: WorldPoi[] = candidates.slice(0, cap);
    const next = new Map<string, WorldPoi>(visible.map((n) => [n.id, n]));

    // 3.4) Spatial deduplication · distancia centro-a-centro Apple-style.
    // Si dos chips están a menos de (sz_a + sz_b)/2 × 1.10, ocultamos el
    // de menor tier (orden de candidates ya garantiza prioridad S>A>B>C).
    // "Los chips no pueden tocarse · debe haber 10% de aire entre ellos".
    const chipCenters: { cx: number; cy: number; sz: number }[] = [];
    const dedupVisible: typeof visible = [];
    for (const n of visible) {
      try {
        const p = map.latLngToContainerPoint([n.lat, n.lng]);
        const baseSize = n.tier === "S" ? 44 : n.tier === "A" ? 32 : n.tier === "B" ? 14 : 6;
        const sz = baseSize * sizeFactorForZoom(zoom);
        let overlaps = false;
        for (const c of chipCenters) {
          const dx = p.x - c.cx;
          const dy = p.y - c.cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = (sz + c.sz) / 2 * 1.10;
          if (dist < minDist) { overlaps = true; break; }
        }
        if (!overlaps) {
          chipCenters.push({ cx: p.x, cy: p.y, sz });
          dedupVisible.push(n);
        }
      } catch { dedupVisible.push(n); }
    }
    visible.length = 0;
    visible.push(...dedupVisible);
    next.clear();
    visible.forEach((n) => next.set(n.id, n));

    // 3.5) Label collision detection greedy en pixel space
    // Sólo Tier S y A obtienen showLabel; los descartados por colisión
    // siguen visibles como chip pero sin label permanente.
    const showLabelIds = new Set<string>();
    const placedBoxes: { x1: number; y1: number; x2: number; y2: number }[] = [];
    for (const n of visible) {
      if (n.tier === "C") continue;   // Tier C no muestra label · sólo S, A, B (Apple-style)
      try {
        const p = map.latLngToContainerPoint([n.lat, n.lng]);
        const labelText = n.name || "";
        // Estimación ancho · 6.4px por char + 22px padding · max 200
        const w = Math.min(200, labelText.length * 6.4 + 22);
        const h = 20;
        // Label aparece debajo del chip · offset 30 = chip + gap
        const box = {
          x1: p.x - w / 2,
          y1: p.y + 22,
          x2: p.x + w / 2,
          y2: p.y + 22 + h,
        };
        // ¿Colisiona con algún ya colocado?
        const collides = placedBoxes.some(
          (b) => !(box.x2 < b.x1 || box.x1 > b.x2 || box.y2 < b.y1 || box.y1 > b.y2)
        );
        if (!collides) {
          placedBoxes.push(box);
          showLabelIds.add(n.id);
        }
      } catch { /* skip */ }
    }


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
        // Tamaño dinámico · escala con zoom
        const baseSize = n.tier === "S" ? 44 : n.tier === "A" ? 32 : n.tier === "B" ? 14 : 6;
        const dynSize = Math.round(baseSize * sizeFactorForZoom(zoom));
        const html = buildWorldNodeHTML({
          ...n, isActive, showLabel: showLabelIds.has(id), image: n.image,
          sizeOverride: dynSize,
        });
        const size = dynSize;
        const icon = L.divIcon({
          className: "kudos-world-node",
          html: `<div style="position:relative">${html}</div>`,
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
    setVisibleCount(next.size);
  }, [renderTick, zoom, mapReady, activeId, activeFilter]);

  return (
    <div style={ROOT}>
      <div ref={containerRef} style={STAGE} className="kudos-world-stage" />
      {/* Logo KUDOS · F3.6 · arriba izquierda (junto al hamburger del HUD) */}
      <div style={LOGO_WRAP}>
        <WorldLogo size={26} variant="dark" />
      </div>

      {/* Search bar + city picker · F3.2 */}
      <WorldSearch
        currentCity={currentCity}
        onSelect={(c: CityPreset) => {
          centeredOnUserRef.current = true;
          setCurrentCity(c.name);
          mapRef.current?.flyTo([c.lat, c.lng], c.zoom, { duration: 1.8 });
        }}
      />

      {/* Weather widget · F3.3 */}
      <WorldWeather lat={mapCenter?.lat} lng={mapCenter?.lng} />

      {/* HUD lateral · Capas + Filtros · F3.1 */}
      <WorldHud
        activeLayers={activeLayers}
        onToggleLayer={(id) => {
          setActiveLayers((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
          });
        }}
        activeFilter={activeFilter}
        onSelectFilter={(id) => {
          setActiveFilter(id);
          setRenderTick((t) => t + 1);
        }}
      />
      <div style={HUD_COUNTER}>
        {totalLoaded.toLocaleString("es-ES")} nodos · {visibleCount} visibles · zoom {zoom}
      </div>

      {/* Bottom Sheet · F4 · narrativa primero · misterio controlado 70/30 */}
      {activeId && (() => {
        const poi = allNodesRef.current.find((p) => p.id === activeId);
        if (!poi) return null;
        const heroUrl = wikimediaHero(poi.image);
        const catIcon = CATEGORY_ICON_GLYPH[poi.category];
        const tierShine = poi.tier === "S" ? "tier-s" : poi.tier === "A" ? "tier-a" : "";
        const evocative = EVOCATIVE_LINES_ES[poi.category] || "Una pieza del mundo esperándote.";
        return (
          <div style={SHEET_BACKDROP} onClick={() => setActiveId(null)}>
            <div style={SHEET} className={`kudos-sheet ${tierShine}`} onClick={(ev) => ev.stopPropagation()}>
              <button style={SHEET_CLOSE} onClick={() => setActiveId(null)} aria-label="Cerrar">×</button>
              {heroUrl && (
                <div style={SHEET_HERO_WRAP}>
                  <img src={heroUrl} alt={poi.name}
                       style={{width:"100%", height:"100%", objectFit:"cover", display:"block"}}
                       onError={(ev) => { (ev.target as HTMLImageElement).style.display = "none"; }} />
                  {/* Icono categoría sutil esquina superior izquierda · sin texto */}
                  <div style={SHEET_CAT_GLYPH} title={CATEGORY_LABEL_ES[poi.category]}>
                    {catIcon}
                  </div>
                  {/* Halo dorado sutil solo Tier S · sin texto "LEGENDARY" */}
                  {poi.tier === "S" && <div style={SHEET_TIER_S_DOT} title="Legendary" />}
                </div>
              )}
              <div style={SHEET_BODY}>
                <h2 style={SHEET_TITLE}>{poi.name}</h2>
                <p style={SHEET_EVOCATIVE}>{evocative}</p>
                <div style={SHEET_ACTIONS}>
                  <button style={SHEET_BTN_GHOST} onClick={() => {
                    try {
                      const k = "kudos:saves";
                      const saves = JSON.parse(localStorage.getItem(k) || "[]");
                      if (!saves.includes(poi.id)) {
                        saves.push(poi.id);
                        localStorage.setItem(k, JSON.stringify(saves));
                        showToast("Guardado en Mi Mundo");
                      } else {
                        showToast("Ya estaba en Mi Mundo");
                      }
                    } catch { showToast("No se pudo guardar"); }
                  }}>
                    Guardar
                  </button>
                  <button style={SHEET_BTN_PRIMARY} onClick={() => {
                    showToast("Cápsula en preparación · pronto disponible", 3200);
                  }}>
                    Descubrir
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Toast KUDOS inline · sustituye alert() nativo */}
      {toast && (
        <div style={TOAST_WRAP}>
          <div style={TOAST}>{toast}</div>
        </div>
      )}

      <div style={ZOOM_RAIL}>
        <button style={ZOOM_BTN} onClick={() => mapRef.current?.zoomIn()} aria-label="Acercar">+</button>
        <button style={ZOOM_BTN} onClick={() => mapRef.current?.zoomOut()} aria-label="Alejar">−</button>
        <button
          style={{ ...ZOOM_BTN, marginTop: 6 }}
          onClick={() => {
            centeredOnUserRef.current = false;
            if (!geo.coords) {
              geo.request();
            } else if (mapRef.current) {
              mapRef.current.flyTo([geo.coords.lat, geo.coords.lng], 11, { duration: 1.6 });
            }
          }}
          aria-label="Centrar en mi ubicación"
          title="Centrar en mi ubicación"
        >◉</button>
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
      @keyframes kudos-sheet-fade { from { opacity: 0; } to { opacity: 1; } }
      @keyframes kudos-sheet-slide-up {
        from { transform: translateY(60px); opacity: 0; }
        to   { transform: translateY(0); opacity: 1; }
      }
      @keyframes kudos-toast-up {
        from { transform: translate(-50%, 24px); opacity: 0; }
        to   { transform: translate(-50%, 0); opacity: 1; }
      }
      /* F4 · halo dorado sutil cuando el sheet es Tier S */
      .kudos-sheet.tier-s {
        box-shadow: 0 -8px 32px rgba(0,0,0,0.25),
                    0 0 0 1.5px rgba(201,169,97,0.55),
                    0 0 28px rgba(201,169,97,0.32);
      }
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
  fontFamily: '"Poppins", system-ui, sans-serif',
  fontWeight: 600,
  fontSize: 16,
  letterSpacing: "0.06em",
  color: WORLD_COLORS.legendary,
};

const HUD_BRAND_DOT: React.CSSProperties = {
  fontSize: 18,
  color: WORLD_COLORS.inkSecondary,
};

const HUD_BRAND_LABEL: React.CSSProperties = {
  fontFamily: '"Poppins", system-ui, sans-serif',
  fontWeight: 400,
  fontSize: 10,
  letterSpacing: "0.24em",
  color: WORLD_COLORS.inkSecondary,
  textTransform: "lowercase",
};

const HUD_TAGLINE: React.CSSProperties = {
  fontFamily: '"Poppins", system-ui, sans-serif',
  fontSize: 9.5,
  letterSpacing: "0.42em",
  textTransform: "uppercase",
  color: WORLD_COLORS.inkTertiary,
  marginTop: 2,
};

const HUD_COUNTER: React.CSSProperties = {
  position: "absolute",
  bottom: 16,
  left: 18,
  zIndex: 1000,
  fontFamily: '"Poppins", system-ui, sans-serif',
  fontSize: 9,
  letterSpacing: "0.14em",
  color: WORLD_COLORS.inkTertiary,
  pointerEvents: "none",
};

const ZOOM_RAIL: React.CSSProperties = {
  position: "absolute",
  bottom: 22,
  right: 22,
  zIndex: 1000,
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const ZOOM_BTN: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 10,
  background: "rgba(255,255,255,0.92)",
  border: `1px solid rgba(0,0,0,0.08)`,
  color: WORLD_COLORS.inkPrimary,
  fontFamily: '"Poppins", system-ui, sans-serif',
  fontSize: 15,
  fontWeight: 500,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
  transition: "background 0.2s ease",
};


// ─── Logo KUDOS arriba izquierda · debajo del hamburger ──────────────
const LOGO_WRAP: React.CSSProperties = {
  position: "absolute",
  top: 18,
  left: 64,           // hamburger ocupa los primeros 50px
  zIndex: 1800,
  pointerEvents: "none",
};


// ─── Bottom Sheet styles · F3.5 ──────────────────────────────────────
const SHEET_BACKDROP: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(20, 18, 16, 0.45)",
  zIndex: 5000,
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "center",
  backdropFilter: "blur(2px)",
  animation: "kudos-sheet-fade 0.25s ease both",
};

const SHEET: React.CSSProperties = {
  width: "100%",
  maxWidth: 520,
  background: "#fff",
  borderRadius: "20px 20px 0 0",
  boxShadow: "0 -8px 32px rgba(0,0,0,0.25)",
  overflow: "hidden",
  position: "relative",
  animation: "kudos-sheet-slide-up 0.32s cubic-bezier(0.22,1,0.36,1) both",
  maxHeight: "82vh",
  display: "flex",
  flexDirection: "column",
};

const SHEET_CLOSE: React.CSSProperties = {
  position: "absolute",
  top: 10,
  right: 12,
  width: 30,
  height: 30,
  borderRadius: "50%",
  border: "none",
  background: "rgba(255,255,255,0.92)",
  fontSize: 22,
  lineHeight: 1,
  cursor: "pointer",
  zIndex: 10,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#333",
  boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
};

const SHEET_HERO_WRAP: React.CSSProperties = {
  width: "100%",
  height: 180,
  background: "linear-gradient(135deg, #e8dbb0 0%, #c9a961 100%)",
  flexShrink: 0,
};

const SHEET_BODY: React.CSSProperties = {
  padding: "16px 20px 22px",
  fontFamily: '"Poppins", system-ui, sans-serif',
};

const SHEET_BADGES: React.CSSProperties = {
  display: "flex",
  gap: 6,
  marginBottom: 8,
};

const SHEET_BADGE: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: "0.06em",
  textTransform: "uppercase" as const,
  padding: "3px 10px",
  borderRadius: 999,
  background: WORLD_COLORS.legendary,
  color: "white",
};

const SHEET_BADGE_LIGHT: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 500,
  letterSpacing: "0.04em",
  padding: "3px 10px",
  borderRadius: 999,
  background: "#f0ebe0",
  color: "#666",
};

const SHEET_TITLE: React.CSSProperties = {
  margin: "4px 0 6px",
  fontSize: 20,
  fontWeight: 700,
  color: "#1f1b18",
  lineHeight: 1.25,
};

const SHEET_DESC: React.CSSProperties = {
  margin: "0 0 14px",
  fontSize: 13.5,
  lineHeight: 1.45,
  color: "#5a544d",
};

const SHEET_ACTIONS: React.CSSProperties = {
  display: "flex",
  gap: 8,
};

const SHEET_BTN_GHOST: React.CSSProperties = {
  flex: 1,
  padding: "11px 14px",
  borderRadius: 12,
  border: "1px solid rgba(0,0,0,0.1)",
  background: "white",
  fontFamily: '"Poppins", system-ui, sans-serif',
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  color: "#1f1b18",
};

const SHEET_BTN_PRIMARY: React.CSSProperties = {
  flex: 1.4,
  padding: "11px 14px",
  borderRadius: 12,
  border: "none",
  background: "linear-gradient(135deg, #c9a961 0%, #a78848 100%)",
  fontFamily: '"Poppins", system-ui, sans-serif',
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  color: "white",
  boxShadow: "0 2px 8px rgba(201,169,97,0.45)",
};


// ─── F4 · narrativa primero · estilos nuevos ─────────────────────────
const SHEET_EVOCATIVE: React.CSSProperties = {
  margin: "6px 0 18px",
  fontSize: 15,
  lineHeight: 1.4,
  color: "#3d3833",
  fontStyle: "italic" as const,
  fontWeight: 400,
  letterSpacing: "0.005em",
};

const SHEET_CAT_GLYPH: React.CSSProperties = {
  position: "absolute",
  top: 12, left: 14,
  width: 30, height: 30,
  borderRadius: "50%",
  background: "rgba(255,255,255,0.92)",
  color: "#5a544d",
  fontSize: 14,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 2px 6px rgba(0,0,0,0.18)",
  backdropFilter: "blur(6px)",
};

const SHEET_TIER_S_DOT: React.CSSProperties = {
  position: "absolute",
  top: 14, right: 50,
  width: 10, height: 10,
  borderRadius: "50%",
  background: "#C9A961",
  boxShadow: "0 0 12px rgba(201,169,97,0.85), 0 0 4px rgba(201,169,97,1)",
};

const TOAST_WRAP: React.CSSProperties = {
  position: "fixed",
  bottom: 28,
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: 6000,
  pointerEvents: "none",
  animation: "kudos-toast-up 0.3s cubic-bezier(0.22,1,0.36,1) both",
};

const TOAST: React.CSSProperties = {
  background: "rgba(20,18,16,0.92)",
  color: "#f0ebe0",
  padding: "11px 22px",
  borderRadius: 999,
  fontFamily: '"Poppins", system-ui, sans-serif',
  fontSize: 13,
  fontWeight: 500,
  letterSpacing: "0.01em",
  boxShadow: "0 6px 24px rgba(0,0,0,0.35)",
  backdropFilter: "blur(8px)",
  border: "1px solid rgba(255,255,255,0.08)",
};
