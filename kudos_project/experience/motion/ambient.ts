/**
 * KUDOS Experience · motion · ambient primitives
 *
 * Movimiento de fondo (no provocado por el usuario): respiración de
 * atmósferas, pulsos sutiles, revelaciones espaciales. Todo silencioso.
 */
import type { Variants } from "framer-motion";
import { duration, easing } from "@/design-system/tokens";

/** Respiración lenta · loop infinito muy sutil. */
export const atmosphereBreath: Variants = {
  initial: { scale: 1, opacity: 0.92 },
  animate: {
    scale: [1, 1.025, 1],
    opacity: [0.92, 1, 0.92],
    transition: {
      duration: 8,
      ease: [...easing.cinematic],
      repeat: Infinity,
    },
  },
};

/** Pulso del dot activo en timeline. */
export const timelinePulse: Variants = {
  initial: { scale: 1, opacity: 0.7 },
  animate: {
    scale: [1, 1.25, 1],
    opacity: [0.6, 1, 0.6],
    transition: {
      duration: 2.4,
      ease: [...easing.cinematic],
      repeat: Infinity,
    },
  },
};

/** Revelación contextual · entrada in-view de bloques. */
export const contextualReveal: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: duration.long, ease: [...easing.reveal] },
  },
};

/** Fade espacial · ligero parallax sin scroll listener pesado. */
export const spatialFade: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.medium, ease: [...easing.cinematic] },
  },
};

/**
 * Deriva memoria · movimiento horizontal lentísimo · capa de partículas
 * o textos que sugieren presencia humana acumulada sin gritar.
 *
 * Reutiliza el output como `style={{ x: memoryDriftXMv }}` cuando hay un
 * MotionValue concreto, o como variant en motion components estáticos.
 */
export const memoryDrift: Variants = {
  initial: { x: 0, opacity: 0.65 },
  animate: {
    x: [0, 12, 0, -12, 0],
    opacity: [0.55, 0.8, 0.55, 0.8, 0.55],
    transition: {
      duration: 18,
      ease: [0.45, 0, 0.55, 1],
      repeat: Infinity,
    },
  },
};

/**
 * Fade ambient · respiración de opacidad casi imperceptible. Para capas
 * decorativas (halos, gradientes secundarios) que deben sentirse vivas
 * sin distraer.
 */
export const ambientFade: Variants = {
  initial: { opacity: 0.7 },
  animate: {
    opacity: [0.55, 1, 0.55],
    transition: {
      duration: 11,
      ease: [...easing.cinematic],
      repeat: Infinity,
    },
  },
};

/** Overlay cinematográfico · toasts, sheets. */
export const cinematicOverlay: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: duration.short, ease: [...easing.cinematic] },
  },
  exit: {
    opacity: 0,
    y: 8,
    scale: 0.98,
    transition: { duration: duration.micro, ease: [...easing.exit] },
  },
};
