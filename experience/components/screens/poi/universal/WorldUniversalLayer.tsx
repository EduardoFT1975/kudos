"use client";
/**
 * KUDOS · WorldUniversalLayer · T7.3
 *
 * Capa universal POI sobre el WorldEngine v2. Encapsula:
 *   - long-press en mapa → CreatePoiModal
 *   - render markers de POIs personales (alfileres con tinte morado)
 *   - click en marker personal → PoiUniversalSheet
 *   - flujo crear/abrir cápsulas
 *
 * NO modifica WorldEngine. Se monta encima y comparte el div del mapa
 * vía un listener global del DOM. Implementación quirúrgica.
 */

import * as React from "react";
import { WorldEngine } from "@/components/screens/map/v2/WorldEngine";
import {
  loadUserPois,
  type UniversalPOI,
  type Capsule,
} from "@/lib/poi/universalPoi";
import { PoiUniversalSheet } from "./PoiUniversalSheet";
import { CreatePoiModal } from "./CreatePoiModal";
import { CreateCapsuleModal } from "./CreateCapsuleModal";


export function WorldUniversalLayer() {
  const [userPois, setUserPois] = React.useState<UniversalPOI[]>([]);
  const [openPoi, setOpenPoi] = React.useState<UniversalPOI | null>(null);
  const [creatingPoiAt, setCreatingPoiAt] = React.useState<{ lat: number; lng: number } | null>(null);
  const [creatingCapsuleFor, setCreatingCapsuleFor] = React.useState<UniversalPOI | null>(null);

  // Cargar POIs personales al montar
  React.useEffect(() => {
    setUserPois(loadUserPois());
  }, []);

  const refreshUserPois = React.useCallback(() => {
    setUserPois(loadUserPois());
  }, []);

  // Long-press detector global · escucha eventos sintéticos del map
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    let pressTimer: ReturnType<typeof setTimeout> | null = null;
    let startX = 0, startY = 0;
    let pressed = false;
    let mapLatLng: { lat: number; lng: number } | null = null;

    const findLeafletMap = (): any => {
      // Leaflet store el map en el div con clase leaflet-container, accesible via el _leaflet propietario
      const el = document.querySelector(".leaflet-container") as any;
      return el?._leaflet_id ? el : null;
    };

    const containerToLatLng = (clientX: number, clientY: number): { lat: number; lng: number } | null => {
      const el = document.querySelector(".leaflet-container") as HTMLElement | null;
      if (!el) return null;
      const w = (window as any).L;
      if (!w) return null;
      // Buscar el map instance: iteramos sobre el contenedor para encontrar el map.
      // Leaflet expone el map via el atributo _leaflet_id pero el instance vive en otro sitio.
      // Hack: usamos el evento de Leaflet directamente via DOM listeners.
      const rect = el.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      // Sin acceso directo al map, usamos el evento sintético de Leaflet.
      // Esta función queda como fallback no usado. La conversión real se hace en handlePointerUp.
      void x; void y;
      return null;
    };

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      // No activar long-press sobre POIs existentes (chips) ni controles UI
      if (target.closest(".kudos-chip") || target.closest(".kudos-hud") || target.closest("button") || target.closest("input")) {
        return;
      }
      if (!target.closest(".leaflet-container")) return;
      startX = e.clientX;
      startY = e.clientY;
      pressed = true;
      mapLatLng = null;
      if (pressTimer) clearTimeout(pressTimer);
      pressTimer = setTimeout(() => {
        if (!pressed) return;
        // Convertir clientX/Y a lat/lng usando el map de Leaflet
        const mapEl = document.querySelector(".leaflet-container") as any;
        if (!mapEl) return;
        // Intentar acceso a la instancia Leaflet vía propietary key
        // El map se almacena en mapEl._leaflet_id pero el instance está en window._kudosWorldMap si lo exponemos
        const map = (window as any)._kudosWorldMap;
        if (map && typeof map.containerPointToLatLng === "function") {
          const rect = mapEl.getBoundingClientRect();
          const point = (window as any).L.point(e.clientX - rect.left, e.clientY - rect.top);
          const latlng = map.containerPointToLatLng(point);
          mapLatLng = { lat: latlng.lat, lng: latlng.lng };
          setCreatingPoiAt(mapLatLng);
        }
      }, 650);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!pressed) return;
      const dx = Math.abs(e.clientX - startX);
      const dy = Math.abs(e.clientY - startY);
      if (dx > 8 || dy > 8) {
        pressed = false;
        if (pressTimer) clearTimeout(pressTimer);
      }
    };

    const onPointerUp = () => {
      pressed = false;
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
    document.addEventListener("pointercancel", onPointerUp);

    return () => {
      if (pressTimer) clearTimeout(pressTimer);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("pointercancel", onPointerUp);
    };
  }, []);

  // Renderizar markers de POIs personales · resiliente al remount del WorldEngine.
  // Poll hasta que el map de Leaflet este montado; si el map se destruye
  // (navegacion entre rutas), reintenta cuando vuelve.
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;
    let attachedMap: any = null;
    let attachedGroup: any = null;

    const tryAttach = () => {
      if (cancelled) return;
      const map = (window as any)._kudosWorldMap;
      const L = (window as any).L;
      if (!map || !L) {
        pollTimer = setTimeout(tryAttach, 250);
        return;
      }
      // Sanity check: el map debe tener metodo container valido
      try {
        if (typeof map.getContainer !== "function" || !map.getContainer()) {
          pollTimer = setTimeout(tryAttach, 250);
          return;
        }
      } catch {
        pollTimer = setTimeout(tryAttach, 250);
        return;
      }

      // Si el map cambio (remount), invalidar layer group anterior
      const cachedGroup = (window as any)._kudosUserPoiLayer;
      let group = cachedGroup;
      if (!group || (group._map && group._map !== map)) {
        try { group = L.layerGroup().addTo(map); } catch { pollTimer = setTimeout(tryAttach, 250); return; }
        (window as any)._kudosUserPoiLayer = group;
      } else if (!group._map) {
        // group existe pero no esta en ningun map (remount): re-attach
        try { group.addTo(map); } catch { /* */ }
      }

      try { group.clearLayers(); } catch { /* */ }

      userPois.forEach((p) => {
        try {
          const icon = L.divIcon({
            className: "kudos-user-poi-marker",
            html: `<div class="kudos-user-pin" title="${escapeHtml(p.name)}">
                     <div class="kudos-user-pin-glow-outer"></div>
                     <div class="kudos-user-pin-glow"></div>
                     <div class="kudos-user-pin-core"></div>
                   </div>`,
            iconSize: [22, 22],
            iconAnchor: [11, 11],
          });
          const marker = L.marker([p.lat, p.lng], { icon }).addTo(group);
          marker.on("click", () => setOpenPoi(p));
        } catch { /* skip POI roto */ }
      });

      attachedMap = map;
      attachedGroup = group;
    };

    tryAttach();

    return () => {
      cancelled = true;
      if (pollTimer) clearTimeout(pollTimer);
      // Limpiar markers personales al desmontar para evitar fantasmas
      try {
        if (attachedGroup && attachedMap) {
          attachedGroup.clearLayers();
        }
      } catch { /* */ }
    };

    // Inyectar CSS una vez
    if (!document.getElementById("kudos-user-poi-css")) {
      const style = document.createElement("style");
      style.id = "kudos-user-poi-css";
      style.textContent = `
        .kudos-user-poi-marker { background: transparent !important; border: none !important; }
        .kudos-user-pin {
          position: relative;
          width: 22px; height: 22px;
          cursor: pointer;
          animation: kudos-user-entrance 1.4s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        /* Halo exterior · respiracion organica · KUDOS morado */
        .kudos-user-pin-glow-outer {
          position: absolute; inset: -22px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(139,107,255,0.35) 0%, rgba(139,107,255,0.08) 40%, transparent 75%);
          filter: blur(3px);
          animation: kudos-user-breathe 4.2s ease-in-out infinite;
          pointer-events: none;
        }
        .kudos-user-pin-glow {
          position: absolute; inset: -10px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(199,165,255,0.55) 0%, rgba(139,107,255,0.18) 50%, transparent 75%);
          animation: kudos-user-breathe 3.2s ease-in-out infinite 0.6s;
          pointer-events: none;
        }
        .kudos-user-pin-core {
          position: absolute; top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          width: 12px; height: 12px;
          border-radius: 50%;
          background: linear-gradient(135deg, #d4b8ff 0%, #8B6BFF 100%);
          border: 2px solid rgba(255,255,255,0.92);
          box-shadow:
            0 2px 8px rgba(0,0,0,0.55),
            0 0 14px rgba(139,107,255,0.8),
            inset 0 0 4px rgba(255,255,255,0.45);
        }
        /* Aparicion · expansion suave del halo + nacimiento del core */
        @keyframes kudos-user-entrance {
          0%   { transform: scale(0); opacity: 0; }
          35%  { transform: scale(1.55); opacity: 1; }
          65%  { transform: scale(0.92); }
          100% { transform: scale(1); opacity: 1; }
        }
        /* Respiracion organica · dos capas en distinto compas */
        @keyframes kudos-user-breathe {
          0%, 100% { opacity: 0.55; transform: scale(0.85); }
          50%      { opacity: 1;    transform: scale(1.18); }
        }
        @media (prefers-reduced-motion: reduce) {
          .kudos-user-pin, .kudos-user-pin-glow, .kudos-user-pin-glow-outer {
            animation: none !important;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }, [userPois]);

  return (
    <>
      <WorldEngine />

      {creatingPoiAt && (
        <CreatePoiModal
          lat={creatingPoiAt.lat}
          lng={creatingPoiAt.lng}
          onClose={() => setCreatingPoiAt(null)}
          onCreated={(poi) => {
            setCreatingPoiAt(null);
            refreshUserPois();
            setOpenPoi(poi);
          }}
        />
      )}

      {openPoi && !creatingCapsuleFor && (
        <PoiUniversalSheet
          poi={openPoi}
          onClose={() => setOpenPoi(null)}
          onCreateCapsule={() => setCreatingCapsuleFor(openPoi)}
        />
      )}

      {creatingCapsuleFor && (
        <CreateCapsuleModal
          poi={creatingCapsuleFor}
          onClose={() => setCreatingCapsuleFor(null)}
          onCreated={(_cap: Capsule) => {
            setCreatingCapsuleFor(null);
            // La ficha permanece abierta y se refresca sola al re-render
          }}
        />
      )}

      {/* Hint sutil flotante de cómo crear lugar (solo primera visita) */}
      <FirstVisitHint />
    </>
  );
}


function FirstVisitHint() {
  const [visible, setVisible] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const seen = window.localStorage.getItem("kudos:upoi:hint_seen");
      if (!seen) {
        setVisible(true);
        const t = setTimeout(() => {
          setVisible(false);
          try { window.localStorage.setItem("kudos:upoi:hint_seen", "1"); } catch { /* */ }
        }, 6000);
        return () => clearTimeout(t);
      }
    } catch { /* */ }
  }, []);

  if (!visible) return null;
  return (
    <div style={HINT}>
      <span style={HINT_DOT} />
      Mantén pulsado el mapa para dejar tu primera huella
    </div>
  );
}


function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}


const HINT: React.CSSProperties = {
  position: "fixed",
  bottom: 110,
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: 9000,
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "9px 16px",
  background: "rgba(139,107,255,0.92)",
  color: "#fff",
  fontSize: 12,
  fontWeight: 500,
  borderRadius: 999,
  boxShadow: "0 8px 28px rgba(139,107,255,0.45)",
  fontFamily: '"Poppins", system-ui, sans-serif',
  pointerEvents: "none" as const,
};

const HINT_DOT: React.CSSProperties = {
  width: 6,
  height: 6,
  borderRadius: "50%",
  background: "#fff",
  boxShadow: "0 0 6px #fff",
};
