"use client";

/**
 * KUDOS Experience · <FragmentTrace />
 *
 * Huella residual selectiva. NO ghost UI. NO whole-layer persistence.
 *
 * Filosofía:
 *   "Not persistence. Trace."
 *   "Not ghosting. Residual memory."
 *   "The active layer remains sovereign."
 *
 * Cómo funciona:
 *   - Recibe un `triggerRef` (la sección cuya exit dispara la huella).
 *   - Usa useScroll con offset ["end end", "end start"] para track SOLO
 *     la ventana del exit (de "section bottom toca viewport bottom" a
 *     "section bottom toca viewport top").
 *   - Opacity curve [0, 0.4, 0.7, 1] → [0, maxOpacity, maxOpacity, 0]:
 *       · 0 → 0.4: emerge desde 0 mientras la sección sale
 *       · 0.4 → 0.7: hold breve en peak (la huella es visible)
 *       · 0.7 → 1: fade limpio a 0 mientras seguimos scrolleando
 *   - position: fixed → anclado al viewport, no scrollea con contenido.
 *
 * Cuando la sección está activa (en viewport): trace invisible.
 * Cuando la sección sale: trace brilla brevemente.
 * Cuando ya estás en la siguiente sección: trace ya desapareció limpio.
 *
 * Tamaño visual del trace: PEQUEÑO. Atmosférico. No competitivo.
 * Si parece UI, está mal. Si parece huella, está bien.
 */
import * as React from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils/cn";

export interface FragmentTraceProps {
  /** Ref a la sección cuya exit dispara la huella. */
  triggerRef: React.RefObject<HTMLElement | null>;
  /** Contenido visual del trace (dot, line, glow). Debe ser tiny. */
  children: React.ReactNode;
  /** Posición vertical en viewport · default 10% (cerca del top). */
  top?: string;
  /** Posición horizontal en viewport · default 50%. */
  left?: string;
  /** Opacity peak · default 0.4. */
  maxOpacity?: number;
  className?: string;
}

export function FragmentTrace({
  triggerRef,
  children,
  top = "10%",
  left = "50%",
  maxOpacity = 0.4,
  className,
}: FragmentTraceProps) {
  const prefersReducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: triggerRef,
    offset: ["end end", "end start"],
  });

  const opacity = useTransform(
    scrollYProgress,
    [0, 0.4, 0.7, 1],
    [0, maxOpacity, maxOpacity, 0]
  );

  if (prefersReducedMotion) return null;

  return (
    <motion.div
      aria-hidden
      className={cn("pointer-events-none fixed z-[5] -translate-x-1/2", className)}
      style={{ top, left, opacity }}
    >
      {children}
    </motion.div>
  );
}
