/**
 * KUDOS Experience · motion · temporal primitives
 *
 * Variants y transitions específicas del Time Machine. Reutilizan curvas
 * de `design-system/tokens.ts` — no inventes nuevas duraciones aquí.
 */
import type { Variants } from "framer-motion";
import { duration, easing } from "@/design-system/tokens";

/** Fade con blur · texto que aparece desde lejos en el tiempo. */
export const temporalFade: Variants = {
  hidden: { opacity: 0, filter: "blur(8px)" },
  visible: {
    opacity: 1,
    filter: "blur(0px)",
    transition: { duration: duration.long, ease: [...easing.reveal] },
  },
  exit: {
    opacity: 0,
    filter: "blur(8px)",
    transition: { duration: duration.medium, ease: [...easing.exit] },
  },
};

/** Crossfade lento del fondo · cambio de era. */
export const atmosphericShift: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: duration.ambient, ease: [...easing.reveal] },
  },
  exit: {
    opacity: 0,
    transition: { duration: duration.long, ease: [...easing.exit] },
  },
};

/** Entrada del mapa desde profundidad. */
export const mapDepthReveal: Variants = {
  hidden: { opacity: 0, scale: 1.06, filter: "blur(10px)" },
  visible: {
    opacity: 1,
    scale: 1,
    filter: "blur(0px)",
    transition: { duration: duration.ambient, ease: [...easing.reveal] },
  },
};

/** Transición vertical del label de era (cambia con el slider). */
export const eraTransition: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.short, ease: [...easing.cinematic] },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: duration.micro, ease: [...easing.exit] },
  },
};
