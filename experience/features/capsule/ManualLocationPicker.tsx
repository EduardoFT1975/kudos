"use client";

/**
 * KUDOS Experience · <ManualLocationPicker />
 *
 * Phase 14.5 UX recovery overlay · escalation path when geolocation
 * fails or returns nothing interesting. Lets the user pick a known
 * "rich" city instead of seeing a dead end.
 *
 * Design intent:
 *   - No raw lat/lng input · that's worse UX than a denial dead-end.
 *   - 6 curated city anchors, each known to produce a strong capsule
 *     from the V0 pipeline (Salamanca being the canonical benchmark).
 *   - The picker is a full-screen overlay that hands a {lat,lng}
 *     back to the parent · the parent passes them to CapsuleEntry's
 *     `manualCoords` prop, bypassing the browser geolocation flow.
 *
 * Telemetry:
 *   manual_location_opened · overlay mounted
 *   manual_location_picked · with `city` prop
 *   manual_location_closed · dismissed without picking
 */
import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { track } from "@/lib/analytics/plausible";

export interface ManualCityPreset {
  id: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  hint: string;
  /** P0.9 WOW pilot · marcas las ciudades en las que el pipeline tiene
   *  densidad probada y emite WOW garantizado. El picker las renderiza
   *  primero, con badge "Pilot · datos densos" para guiar al usuario
   *  hacia la mejor primera impresión posible. Roma + Salamanca son las
   *  pilot cities oficiales del MVP. */
  pilot?: boolean;
}

/**
 * Curated set of locations known to produce strong capsules.
 * Coordinates are city-center / canonical-landmark, not coordinates
 * of a specific monument · the pipeline expands the radius.
 *
 * P0.9 WOW pilot · Roma + Salamanca son las pilot cities. Roma porque
 * el Time Machine (/time/rome) ya tiene 5 eras × 5 hotspots curados +
 * densidad histórica máxima en el pipeline. Salamanca porque fue la
 * ciudad benchmark del Model B en Q3 · WOW garantizado. Las otras 4 son
 * fallbacks: funcionan, pero pueden tener cápsulas más sparse según
 * coordenadas exactas.
 */
export const CITY_PRESETS: ManualCityPreset[] = [
  {
    id: "roma",
    city: "Roma",
    country: "Italia",
    lat: 41.8902,
    lng: 12.4922,
    hint: "Foro · Coliseo · 3000 años",
    pilot: true,
  },
  {
    id: "salamanca",
    city: "Salamanca",
    country: "España",
    lat: 40.9651,
    lng: -5.6640,
    hint: "Plaza Mayor · Universidad",
    pilot: true,
  },
  {
    id: "madrid",
    city: "Madrid",
    country: "España",
    lat: 40.4168,
    lng: -3.7038,
    hint: "Sol · Prado",
  },
  {
    id: "barcelona",
    city: "Barcelona",
    country: "España",
    lat: 41.3851,
    lng: 2.1734,
    hint: "Gòtic · Eixample",
  },
  {
    id: "paris",
    city: "París",
    country: "Francia",
    lat: 48.8566,
    lng: 2.3522,
    hint: "Marais · Île de la Cité",
  },
  {
    id: "lisboa",
    city: "Lisboa",
    country: "Portugal",
    lat: 38.7223,
    lng: -9.1393,
    hint: "Alfama · Baixa",
  },
];

interface ManualLocationPickerProps {
  open: boolean;
  onPick: (coords: { lat: number; lng: number }) => void;
  onClose: () => void;
}

export function ManualLocationPicker({
  open,
  onPick,
  onClose,
}: ManualLocationPickerProps) {
  // Telemetry · mount/dismiss events
  React.useEffect(() => {
    if (open) track("manual_location_opened");
  }, [open]);

  // Escape key dismiss
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        track("manual_location_closed", { via: "escape" });
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // P0.6 · body scroll lock on open. Without this, on iOS Safari the
  // background page (CapsuleGeolocationDenied / CapsuleSuccess) remains
  // scrollable behind the modal · touch-drags leak through, atmosphere
  // shifts, and the user loses sense of which surface is interactive.
  // Restores prior overflow value on close to play nicely with any
  // parent that already set it.
  React.useEffect(() => {
    if (!open) return;
    if (typeof document === "undefined") return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Elegir ubicación"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          // P0.6 · safe-area top + bottom padding ensures the card
          // never sits under the iOS notch / home-indicator. overflow-y-auto
          // on the overlay lets the user scroll the card itself if it
          // exceeds viewport height on small phones (iPhone SE / mini).
          className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[rgba(5,10,31,0.78)] backdrop-blur-md"
          style={{
            paddingTop: "max(env(safe-area-inset-top), 16px)",
            paddingBottom: "max(env(safe-area-inset-bottom), 16px)",
          }}
          onClick={(e) => {
            // P0.6 · click-outside dismiss · only when the click hits the
            // overlay itself, not children. Background dismissal is the
            // expected modal pattern on mobile.
            if (e.target === e.currentTarget) {
              track("manual_location_closed", { via: "backdrop" });
              onClose();
            }
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            // P0.6 · max-h prevents card from extending past viewport.
            // overflow-y-auto enables internal scroll for 6+ city list
            // on tall content / short viewports. my-auto keeps centering.
            className="relative my-auto grid w-full max-w-[520px] gap-6 overflow-y-auto rounded-2xl border border-white/10 bg-[rgba(10,16,40,0.85)] p-7 shadow-[0_20px_80px_-20px_rgba(0,0,0,0.7)] mx-4"
            style={{
              maxHeight: "calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 32px)",
            }}
          >
            {/* Close · top right · P0.6 · bumped from size-7 (28px) to
                size-9 (36px) for closer-to-iOS-44pt touch target. */}
            <button
              type="button"
              aria-label="Cerrar"
              onClick={() => {
                track("manual_location_closed", { via: "button" });
                onClose();
              }}
              className="absolute right-4 top-4 grid size-9 place-items-center rounded-full border border-white/12 bg-white/[0.04] text-white/55 transition hover:border-white/30 hover:text-white/95"
            >
              <span aria-hidden className="text-[18px] leading-none">×</span>
            </button>

            {/* Header */}
            <div className="grid gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-white/45">
                KUDOS · ubicación
              </span>
              <h2 className="font-display font-light leading-tight text-white/95 text-[clamp(1.3rem,3vw,1.7rem)]">
                Elige un punto del mundo
              </h2>
              <p className="text-[13px] leading-[1.6] text-white/55">
                Mientras configuras tu ubicación, KUDOS puede contarte la
                memoria de cualquiera de estos lugares.
              </p>
            </div>

            {/* City grid · P0.9 WOW pilot · las pilot cities (Roma,
                Salamanca) van primero y llevan un eyebrow accent que
                señala al usuario dónde está la densidad real. Resto sigue
                como fallback funcional, sin badge. */}
            <ul className="grid gap-2 sm:grid-cols-2">
              {CITY_PRESETS.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => {
                      track("manual_location_picked", {
                        city: c.id,
                        pilot: c.pilot ? "yes" : "no",
                      });
                      onPick({ lat: c.lat, lng: c.lng });
                    }}
                    className={
                      "group flex w-full items-baseline justify-between gap-3 rounded-xl border px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kudos-accent)] " +
                      (c.pilot
                        ? "border-[var(--kudos-accent)]/40 bg-[var(--kudos-accent)]/[0.06] hover:border-[var(--kudos-accent)]/70 hover:bg-[var(--kudos-accent)]/[0.1]"
                        : "border-white/10 bg-white/[0.025] hover:border-[var(--kudos-accent)]/55 hover:bg-white/[0.06]")
                    }
                  >
                    <span className="grid">
                      {c.pilot ? (
                        <span className="mb-0.5 font-mono text-[9px] uppercase tracking-[0.32em] text-[var(--kudos-accent-bright)]/85">
                          Pilot · datos densos
                        </span>
                      ) : null}
                      <span className="text-[14px] font-medium text-white/90 group-hover:text-white">
                        {c.city}
                      </span>
                      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/40">
                        {c.country} · {c.hint}
                      </span>
                    </span>
                    <span
                      aria-hidden
                      className={
                        "text-[12px] transition group-hover:translate-x-0.5 " +
                        (c.pilot
                          ? "text-[var(--kudos-accent-bright)]/70 group-hover:text-[var(--kudos-accent-bright)]"
                          : "text-white/30 group-hover:text-[var(--kudos-accent-bright)]")
                      }
                    >
                      →
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            {/* Footer microcopy */}
            <p className="text-center font-mono text-[10px] uppercase tracking-[0.32em] text-white/30">
              Esc · cerrar
            </p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
