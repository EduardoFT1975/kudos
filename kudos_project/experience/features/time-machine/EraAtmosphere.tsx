"use client";

/**
 * KUDOS Experience · <EraAtmosphere />
 *
 * Capa de fondo que crossfade entre eras. AnimatePresence con `mode="sync"`
 * para que la capa entrante aparezca a la vez que la saliente se desvanece
 * — sin hard-cuts, sin negro intermedio.
 *
 * Cada era aporta:
 *   - sky_gradient (gradient base)
 *   - haze (radial multiply)
 *   - glow_color (halo central)
 *
 * Sobre todo eso, el grano global de `globals.css` queda intacto.
 */
import { AnimatePresence, motion } from "framer-motion";
import type { Era } from "@/lib/timeline/types";
import { atmosphericShift } from "@/motion/temporal";

export function EraAtmosphere({ era }: { era: Era }) {
  return (
    <AnimatePresence mode="sync" initial={false}>
      <motion.div
        key={era.id}
        variants={atmosphericShift}
        initial="initial"
        animate="animate"
        exit="exit"
        className="absolute inset-0 z-0"
        aria-hidden
      >
        {/* Capa base · gradient cielo. */}
        <div
          className="absolute inset-0"
          style={{ background: era.sky_gradient }}
        />
        {/* Capa de haze · radial multiply suave. */}
        <div
          className="absolute inset-0 mix-blend-multiply"
          style={{
            background: `radial-gradient(ellipse 90% 70% at 50% 65%, transparent 35%, ${era.haze} 100%)`,
          }}
        />
        {/* Halo central · tinte era-specific. */}
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle 60% at 50% 45%, ${era.glow_color} 0%, transparent 55%)`,
            opacity: 0.45,
          }}
        />
        {/* Viñeta inferior para legibilidad del slider. */}
        <div
          className="absolute inset-x-0 bottom-0 h-1/3"
          style={{
            background:
              "linear-gradient(to top, rgba(4,6,20,0.85) 0%, rgba(4,6,20,0.3) 60%, transparent 100%)",
          }}
        />
      </motion.div>
    </AnimatePresence>
  );
}
