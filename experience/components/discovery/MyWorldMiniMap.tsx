"use client";
/**
 * KUDOS · MyWorldMiniMap · visualización geográfica del Mi Mundo personal.
 *
 * Mini-Leaflet con todos los saves del usuario · markers + líneas entre
 * POIs relacionados (si existen en el manifest relationships).
 *
 * Phase 1: muestra solo los markers · líneas en Phase 2.
 */
import * as React from "react";
import { useMyWorld } from "./useMyWorld";


// Cache de coordenadas de POIs · cargada de los JSONs Wikidata
let _coordsCache: Record<string, { lat: number; lng: number; name: string }> | null = null;


async function loadCoords(): Promise<Record<string, { lat: number; lng: number; name: string }>> {
  if (_coordsCache) return _coordsCache;
  _coordsCache = {};
  const countries = ["es", "it", "fr", "gr", "pt", "de", "gb", "jp"];
  await Promise.all(countries.map((cc) =>
    fetch(`/data/wikidata/${cc}.json`, { cache: "force-cache" })
      .then((r) => r.ok ? r.json() : null)
      .then((j) => {
        if (!j?.pois) return;
        for (const p of j.pois) {
          if (p.id && p.lat && p.lng) {
            _coordsCache![p.id] = { lat: p.lat, lng: p.lng, name: p.name || p.id };
          }
        }
      })
      .catch(() => {})
  ));
  return _coordsCache;
}


export function MyWorldMiniMap({ height = 200 }: { height?: number }) {
  const { saves } = useMyWorld();
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<any>(null);
  const [ready, setReady] = React.useState(false);
  const [savesWithCoords, setSavesWithCoords] = React.useState<{ id: string; lat: number; lng: number; name: string }[]>([]);

  // Resolver coords de los saves
  React.useEffect(() => {
    loadCoords().then((coords) => {
      const resolved = saves
        .map((id) => coords[id] ? { id, ...coords[id] } : null)
        .filter(Boolean) as { id: string; lat: number; lng: number; name: string }[];
      setSavesWithCoords(resolved);
    });
  }, [saves]);

  // Mount Leaflet
  React.useEffect(() => {
    let cancelled = false;
    let mapInstance: any = null;
    (async () => {
      if (!containerRef.current) return;
      const mod = await import("leaflet");
      if (cancelled) return;
      const L = (mod as any).default || mod;

      // CSS Leaflet
      if (!document.getElementById("leaflet-css-mini")) {
        const link = document.createElement("link");
        link.id = "leaflet-css-mini";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      const el = containerRef.current as any;
      if (el._leaflet_id != null) { try { delete el._leaflet_id; } catch {} }

      mapInstance = L.map(el, {
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: false,
        dragging: true,
        worldCopyJump: true,
      }).setView([20, 0], 1);

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png", {
        subdomains: ["a", "b", "c", "d"],
        maxZoom: 8,
      }).addTo(mapInstance);

      mapRef.current = mapInstance;
      setReady(true);
    })();
    return () => {
      cancelled = true;
      if (mapInstance) { try { mapInstance.remove(); } catch {} }
      mapRef.current = null;
    };
  }, []);

  // Render markers cuando hay saves resolved + map ready
  React.useEffect(() => {
    if (!ready || !mapRef.current || savesWithCoords.length === 0) return;
    const map = mapRef.current;
    const L = (window as any).L;

    // Limpiar markers viejos
    map.eachLayer((layer: any) => {
      if (layer.options && (layer.options.kudosMarker || layer.options.kudosLine)) {
        try { map.removeLayer(layer); } catch {}
      }
    });

    // Añadir nuevos markers
    const bounds: [number, number][] = [];
    for (const s of savesWithCoords) {
      L.circleMarker([s.lat, s.lng], {
        radius: 6,
        color: "#C9A961",
        weight: 2,
        fillColor: "#8B6BFF",
        fillOpacity: 0.9,
        kudosMarker: true,
      }).bindTooltip(s.name).addTo(map);
      bounds.push([s.lat, s.lng]);
    }

    // Fit bounds si hay saves
    if (bounds.length > 0) {
      try {
        const b = L.latLngBounds(bounds);
        map.fitBounds(b.pad(0.5), { maxZoom: 6 });
      } catch {}
    }
  }, [ready, savesWithCoords]);

  return (
    <div style={WRAP}>
      <div ref={containerRef} style={{ width: "100%", height, borderRadius: 12, overflow: "hidden", background: "#0a0814" }} />
      <div style={LEGEND}>
        <span style={LEGEND_DOT} />
        <span>{savesWithCoords.length} {savesWithCoords.length === 1 ? "lugar" : "lugares"} en Mi Mundo</span>
      </div>
    </div>
  );
}


const WRAP: React.CSSProperties = { position: "relative" };
const LEGEND: React.CSSProperties = {
  position: "absolute", bottom: 10, left: 12,
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "5px 11px", borderRadius: 999,
  background: "rgba(15,10,31,0.85)",
  fontSize: 11, color: "#fff",
  fontFamily: '"Poppins", system-ui, sans-serif',
  backdropFilter: "blur(6px)",
};
const LEGEND_DOT: React.CSSProperties = {
  width: 8, height: 8, borderRadius: "50%",
  background: "#8B6BFF",
  border: "1.5px solid #C9A961",
};
