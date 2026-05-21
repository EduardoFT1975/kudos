"use client";

/**
 * KUDOS Experience · <HotspotMarker />
 *
 * Punto de glow sobre el mapa con label monospace debajo. Las dos
 * características clave:
 *   - se desvanece cuando NO está en la era activa (no se borra; se
 *     vuelve fantasma para mantener continuidad espacial).
 *   - al hover crece sutilmente y emerge un ping ring.
 */
import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import type { Hotspot } from "@/lib/timeline/types";

export interface HotspotMarkerProps {
  hotspot: Hotspot;
  visible: boolean;
  isOpen: boolean;
  onOpen: (id: string) => void;
}

export function HotspotMarker({ hotspot, visible, isOpen, onOpen }: HotspotMarkerProps) {
  return (
    <motion.button
      type="button"
      onClick={() => onOpen(hotspot.id)}
      aria-label={`${hotspot.name} · ${hotspot.cta_label}`}
      title={hotspot.name}
      className={cn(
        "pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer",
        "outline-none focus-visible:ring-2 focus-visible:ring-[var(--kudos-accent)] focus-visible:ring-offset-4 focus-visible:ring-offset-transparent rounded-full",
        // Cuando no es visible en la era, queda fantasmal pero seguible
        !visible && "pointer-events-none"
      )}
      style={{
        left: `${hotspot.position.x}%`,
        top: `${hotspot.position.y}%`,
      }}
      initial={false}
      animate={{
        opacity: visible ? 1 : 0.18,
        scale: visible ? (isOpen ? 1.15 : 1) : 0.78,
      }}
      whileHover={visible ? { scale: 1.18 } : undefined}
      whileTap={visible ? { scale: 0.95 } : undefined}
      transition={{ duration: 0.7, ease: [0.22, 0.61, 0.36, 1] }}
    >
      <span className="relative flex flex-col items-center">
        {/* Dot core */}
        <span className="relative grid place-items-center">
          <span
            className={cn(
              "block size-3 rounded-full",
              visible
                ? "bg-[var(--kudos-accent)]"
                : "bg-white/40"
            )}
            style={{
              boxShadow: visible
                ? "0 0 18px var(--kudos-accent-glow), 0 0 0 1.5px rgba(255,255,255,0.25) inset"
                : "none",
            }}
          />
          {/* Ping ring (solo visible y no abierto) */}
          {visible && !isOpen && (
            <motion.span
              aria-hidden
              className="absolute inset-0 -m-1 rounded-full border border-[var(--kudos-accent-glow-soft)]"
              initial={{ opacity: 0.6, scale: 0.8 }}
              animate={{ opacity: [0.6, 0, 0.6], scale: [0.8, 1.5, 0.8] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: "easeOut" }}
            />
          )}
          {/* Open ring · cuando el overlay está abierto */}
          {isOpen && (
            <span
              aria-hidden
              className="absolute inset-0 -m-1.5 rounded-full border border-[var(--kudos-accent)]"
            />
          )}
        </span>

        {/* Label */}
        <span
          className={cn(
            "pointer-events-none mt-2 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.16em] transition-opacity duration-500",
            visible ? "text-white/80" : "text-white/30"
          )}
          style={{ textShadow: "0 1px 8px rgba(0,0,0,0.6)" }}
        >
          {hotspot.name}
        </span>
      </span>
    </motion.button>
  );
}
