"use client";

/**
 * KUDOS . HomeMapPanel . Real Leaflet sticky map for Home (P12.5).
 *
 * Same Leaflet pattern as MapScreen but read-only: no controls, no
 * filters, no bottom sheet. Photo-bubble divIcons over real tiles.
 *
 * Drops in as the right column on /inicio. No store / hook / route
 * contracts are touched.
 */
import * as React from "react";
import Link from "next/link";
import { Icon } from "@/design-system/v2";
import type { Poi } from "@/lib/kudos/store";

interface Props {
  pois: ReadonlyArray<Poi>;
  activeId?: string | null;
  locationLabel?: string;
}

const LEAFLET_CSS_ID = "kudos-leaflet-css";
const LEAFLET_STYLE_ID = "kudos-leaflet-style-home";

export function HomeMapPanel({ pois, activeId, locationLabel }: Props) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<any>(null);
  const markersRef = React.useRef<Map<string, any>>(new Map());
  const LRef = React.useRef<any>(null);

  const active = React.useMemo<Poi | undefined>(
    () => pois.find((p) => p.id === activeId) ?? pois[0],
    [pois, activeId]
  );

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
      const center: [number, number] = active ? [active.lat, active.lng] : [41.9, 12.5];
      const map = L.map(el, {
        center,
        zoom: 12,
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        dragging: true,
        touchZoom: true,
        worldCopyJump: true,
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        subdomains: ["a", "b", "c"],
      }).addTo(map);
      mapRef.current = map;
      createdMap = map;
      LRef.current = L;
      setTimeout(() => { try { map.invalidateSize(); } catch {} }, 80);
      setTimeout(() => { try { map.invalidateSize(); } catch {} }, 360);
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
      if (containerRef.current) {
        const el = containerRef.current as any;
        if (el._leaflet_id != null) { try { delete el._leaflet_id; } catch {} }
        while (el.firstChild) el.removeChild(el.firstChild);
      }
    };
  }, []);

  // Render photo-bubble markers (limit 5 for the home panel)
  React.useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    const slice = pois.slice(0, 5);
    const next = new Map<string, Poi>(slice.map((p) => [p.id, p]));
    markersRef.current.forEach((m, id) => {
      if (!next.has(id)) {
        try { m.remove(); } catch {}
        markersRef.current.delete(id);
      }
    });
    next.forEach((p, id) => {
      const isActive = id === active?.id;
      const size = isActive ? 80 : 50;
      const html = buildBubbleHTML(p, isActive);
      const icon = L.divIcon({
        className: "kudos-home-bubble",
        html,
        iconSize: [size, size + 22],
        iconAnchor: [size / 2, size / 2 + 11],
      });
      const existing = markersRef.current.get(id);
      if (existing) {
        try { existing.setIcon(icon); existing.setLatLng([p.lat, p.lng]); } catch {}
      } else {
        const m = L.marker([p.lat, p.lng], { icon, interactive: false }).addTo(map);
        markersRef.current.set(id, m);
      }
    });
  }, [pois, active?.id]);

  // Re-center when active changes
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !active) return;
    try { map.setView([active.lat, active.lng], 12, { animate: true }); } catch {}
  }, [active?.id, active?.lat, active?.lng]);

  return (
    <>
      <div ref={containerRef} style={CANVAS} aria-label="Mapa contextual KUDOS" />
      <div style={LOC_CHIP} className="kudos-tap">
        <Icon name="place" size={12} />
        <span>{locationLabel ?? active?.country ?? "Roma, Italia"}</span>
        <Icon name="chevron" size={12} />
      </div>
      <div style={CTRLS}>
        <button type="button" style={CTRL_BTN} className="kudos-tap" aria-label="Navegar">
          <Icon name="arrow-right" size={14} />
        </button>
        <button type="button" style={CTRL_BTN} className="kudos-tap" aria-label="Capas">
          <Icon name="more" size={14} />
        </button>
        <button type="button" style={CTRL_BTN} className="kudos-tap" aria-label="Centrar">
          <Icon name="here" size={14} />
        </button>
      </div>
      <Link href="/mapa" style={CTA} className="kudos-tap">
        <Icon name="discover" size={16} />
        <span>Explorar esta &aacute;rea</span>
      </Link>
    </>
  );
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
      .kudos-home-bubble { background:transparent !important; border:none !important; }
    `;
    document.head.appendChild(style);
  }
}

function buildBubbleHTML(p: Poi, active: boolean): string {
  const size = active ? 80 : 50;
  const photo = escapeHTML(p.heroImage);
  const ring = active
    ? `padding:3px;background:linear-gradient(135deg,#FF9A00 0%,#FF3CAC 50%,#6C3CFF 100%);box-shadow:0 0 0 1px rgba(255,255,255,0.04), 0 12px 30px -10px rgba(255,60,172,0.55);`
    : `padding:2px;background:rgba(255,255,255,0.16);`;
  const labelBg = active ? "rgba(10,6,18,0.92)" : "rgba(10,6,18,0.85)";
  const label = active
    ? `
      <div style="margin-top:5px;display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:999px;background:${labelBg};border:1px solid rgba(255,255,255,0.10);color:#F2F2F7;font-family:Poppins,system-ui,sans-serif;font-size:10.5px;font-weight:700;">
        <span style="color:#FFD23F;font-size:10px;">★</span>
        <span style="color:#FFD23F;">${p.rating.toFixed(1)}</span>
        <span style="opacity:0.42;">·</span>
        <span>${escapeHTML(p.name)}</span>
      </div>
    `
    : `
      <div style="margin-top:4px;padding:2px 7px;border-radius:999px;background:${labelBg};color:#F2F2F7;font-family:Poppins,system-ui,sans-serif;font-size:9.5px;font-weight:600;white-space:nowrap;">
        ${escapeHTML(p.name)}
      </div>
    `;
  return `
    <div style="display:flex;flex-direction:column;align-items:center;pointer-events:auto;">
      <div style="width:${size}px;height:${size}px;border-radius:50%;${ring}">
        <div style="width:100%;height:100%;border-radius:50%;background-image:url('${photo}');background-size:cover;background-position:center;border:2px solid #1A1333;"></div>
      </div>
      ${label}
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

// ── styles ──
const CANVAS: React.CSSProperties = {
  position: "absolute", inset: 0,
};
const LOC_CHIP: React.CSSProperties = {
  position: "absolute",
  top: 14, left: 14,
  zIndex: 10,
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 14px",
  borderRadius: 999,
  background: "rgba(10,6,18,0.82)",
  border: "1px solid rgba(255,255,255,0.10)",
  color: "var(--kudos-ink)",
  fontSize: 12.5,
  fontWeight: 600,
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  cursor: "default",
};
const CTRLS: React.CSSProperties = {
  position: "absolute",
  top: 14, right: 14,
  zIndex: 10,
  display: "flex",
  flexDirection: "column",
  gap: 8,
};
const CTRL_BTN: React.CSSProperties = {
  width: 36, height: 36,
  borderRadius: 10,
  background: "rgba(10,6,18,0.82)",
  border: "1px solid rgba(255,255,255,0.10)",
  color: "var(--kudos-ink)",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
};
const CTA: React.CSSProperties = {
  position: "absolute",
  bottom: 18, left: "50%",
  transform: "translateX(-50%)",
  zIndex: 10,
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "12px 24px",
  borderRadius: 999,
  background: "var(--kudos-accent, #6C3CFF)",
  color: "#fff",
  textDecoration: "none",
  fontFamily: "var(--kudos-font-body)",
  fontSize: 13.5,
  fontWeight: 600,
  boxShadow: "0 14px 30px -10px rgba(108,60,255,0.7)",
};
