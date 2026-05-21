"use client";

/**
 * KUDOS Experience · <CapsuleOverlay />
 *
 * Glass aside cinematográfica que aparece al abrir un hotspot.
 * NO es un modal. NO oscurece bruscamente la escena. Mantiene el mapa
 * visible para que la sensación espacial no se rompa.
 *
 *   desktop: aside derecho · 460px · slide desde derecha
 *   mobile:  bottom sheet  · full-width · slide desde abajo
 */
import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, ArrowUpRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { formatYear } from "@/lib/utils/format";
import type { Era, Hotspot } from "@/lib/timeline/types";

export interface CapsuleOverlayProps {
  hotspot: Hotspot | null;
  era: Era;
  onClose: () => void;
}

export function CapsuleOverlay({ hotspot, era, onClose }: CapsuleOverlayProps) {
  // Cerrar con Escape.
  React.useEffect(() => {
    if (!hotspot) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [hotspot, onClose]);

  return (
    <AnimatePresence>
      {hotspot && (
        <>
          {/* Dim sutil · NO modal. Click cierra. */}
          <motion.div
            key="dim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 0.61, 0.36, 1] }}
            onClick={onClose}
            aria-hidden
            className="absolute inset-0 z-30 bg-[#040614]/35 backdrop-blur-[2px]"
          />

          {/* Glass aside */}
          <motion.aside
            key="aside"
            role="dialog"
            aria-label={hotspot.name}
            aria-modal={false}
            initial={{ opacity: 0, x: 60, y: 0 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: 60 }}
            transition={{ duration: 0.55, ease: [0.22, 0.61, 0.36, 1] }}
            className={cn(
              "absolute right-0 top-0 z-40 flex h-[100dvh] w-full flex-col",
              "sm:max-w-[460px]",
              "border-l border-white/10",
              "bg-[#080d24]/92 backdrop-blur-xl",
              "px-7 pb-10 pt-[max(28px,env(safe-area-inset-top))] sm:px-9"
            )}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar cápsula"
              className={cn(
                "absolute right-5 top-5 grid size-9 place-items-center rounded-full",
                "border border-white/15 bg-white/[0.06] text-white/85 backdrop-blur-md",
                "transition-all duration-300 hover:bg-white/[0.10] hover:border-white/30 hover:text-white",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kudos-accent)]"
              )}
            >
              <X className="size-4" />
            </button>

            {/* Era + cta_label */}
            <p className="mt-4 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.28em] text-[var(--kudos-accent-bright)] font-mono">
              <Sparkles className="size-3.5" aria-hidden />
              {era.label} · {hotspot.cta_label}
            </p>

            {/* Title */}
            <h2 className="mt-3 font-display text-[clamp(2rem,4vw,2.6rem)] font-semibold leading-[1.05] tracking-[-0.02em] text-white">
              {hotspot.name}
            </h2>

            {/* Year pill */}
            <div className="mt-5 inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-3 py-1.5">
              <span
                aria-hidden
                className="size-1.5 rounded-full bg-[var(--kudos-accent)] shadow-[0_0_10px_var(--kudos-accent-glow)]"
              />
              <span className="whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.18em] text-white/75">
                {formatYear(hotspot.primary_year)}
              </span>
            </div>

            {/* Micro-context body */}
            <p className="mt-7 text-[15px] leading-relaxed text-white/85">
              {hotspot.micro_context}
            </p>

            {/* CTAs */}
            <div className="mt-9 flex flex-wrap gap-3">
              {hotspot.capsule_slug ? (
                <Button asChild variant="glow" size="md">
                  <a
                    href={`/capsules/${hotspot.capsule_slug}`}
                    aria-label={`Explorar cápsula de ${hotspot.name}`}
                  >
                    Explorar cápsula
                    <ArrowUpRight className="size-4" />
                  </a>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="md"
                  type="button"
                  disabled
                  aria-label={`Cápsula de ${hotspot.name} en preparación`}
                  className="cursor-default opacity-70"
                >
                  Cápsula en preparación
                </Button>
              )}
              <Button variant="ghost" size="md" type="button">
                Preguntar a Mind
              </Button>
            </div>

            {/* Empty space → ambient line al pie */}
            <div className="mt-auto" />
            <p className="text-[10px] uppercase tracking-[0.28em] text-white/35 font-mono">
              KUDOS · Time Machine
            </p>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
