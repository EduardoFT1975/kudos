/**
 * KUDOS Experience · motion primitives
 *
 * Variants Framer Motion reutilizables. Todas siguen el lenguaje cinematic:
 * silencioso, profundo, sin rebotes. Si necesitas otra curva o duración,
 * añádela a `design-system/tokens.ts` y referénciala aquí — nunca
 * inventes valores nuevos en componentes.
 */
import type { Variants, Transition } from "framer-motion";
import { duration, easing } from "@/design-system/tokens";

/** Transition base · cinematic standard. */
export const transitionCinematic: Transition = {
  duration: duration.medium,
  ease: [...easing.cinematic],
};

export const transitionReveal: Transition = {
  duration: duration.long,
  ease: [...easing.reveal],
};

export const transitionDepth: Transition = {
  duration: duration.long,
  ease: [...easing.depth],
};

// ---------------------------------------------------------------------------
// fadeRise · entrada vertical suave (texto, chips, micro-context)
// ---------------------------------------------------------------------------
export const fadeRise: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: transitionCinematic,
  },
};

// ---------------------------------------------------------------------------
// cinematicReveal · entrada lenta y grande (titulares hero, capas)
// ---------------------------------------------------------------------------
export const cinematicReveal: Variants = {
  hidden: { opacity: 0, y: 28, filter: "blur(6px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: transitionReveal,
  },
};

// ---------------------------------------------------------------------------
// depthLayer · entrada desde lejos (cards, sheets espaciales)
// ---------------------------------------------------------------------------
export const depthLayer: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 24 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: transitionDepth,
  },
};

// ---------------------------------------------------------------------------
// staggerContainer · orquesta hijos con fadeRise/cinematicReveal
// ---------------------------------------------------------------------------
export const staggerContainer = (
  staggerSeconds: number = 0.08,
  delayChildren: number = 0.04
): Variants => ({
  hidden: {},
  visible: {
    transition: {
      staggerChildren: staggerSeconds,
      delayChildren,
    },
  },
});

// ---------------------------------------------------------------------------
// glowPulse · pulso ambient para nodos vivos (estados de IA, indicadores)
// ---------------------------------------------------------------------------
export const glowPulse: Variants = {
  initial: { opacity: 0.4, scale: 0.95 },
  animate: {
    opacity: [0.4, 1, 0.4],
    scale: [0.95, 1.08, 0.95],
    transition: {
      duration: duration.ambient,
      ease: [...easing.cinematic],
      repeat: Infinity,
    },
  },
};

// ---------------------------------------------------------------------------
// parallaxY · helper para parallax sutil dentro de un container con scroll
//   (uso típico: motion.div style={{ y: useTransform(scrollY, [0, 500], [0, -40]) }})
// ---------------------------------------------------------------------------
export const PARALLAX_RANGE = {
  /** Capa de fondo · se mueve poco (sensación lejana). */
  far: -40,
  /** Capa media · cards, hero. */
  mid: -80,
  /** Capa cercana · CTAs, foreground. */
  near: -120,
} as const;
