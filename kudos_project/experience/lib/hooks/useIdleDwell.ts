"use client";

/**
 * KUDOS Experience · useIdleDwell
 *
 * Detecta cuando el usuario lleva quieto un tiempo (sin scroll, mouse,
 * touch, ni keys). NO es un análitico — es una señal perceptiva
 * compartida por la capa atmosférica para "responder" a la atención
 * sin gamificación.
 *
 *   const { isIdle, dwellMs } = useIdleDwell(8000);
 *
 * - `isIdle` se vuelve true tras `thresholdMs` sin actividad.
 * - `dwellMs` tic-tac sube cada 1s mientras isIdle.
 * - Cualquier evento de input lo resetea a false / 0.
 *
 * Diseñado para 0 frame-thrashing: solo actualiza estado al cambiar
 * el flag de isIdle y cada 1 segundo mientras idle. NO re-renders por
 * frame.
 */
import * as React from "react";

export interface IdleDwell {
  /** true tras `thresholdMs` de inactividad. */
  isIdle: boolean;
  /** ms acumulados desde que entró en idle (tic-tac cada 1s). 0 si no idle. */
  dwellMs: number;
}

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  "scroll",
  "mousemove",
  "touchstart",
  "touchmove",
  "keydown",
  "click",
  "pointerdown",
];

export function useIdleDwell(thresholdMs: number = 8000): IdleDwell {
  const [isIdle, setIsIdle] = React.useState(false);
  const [dwellMs, setDwellMs] = React.useState(0);

  const idleTimerRef = React.useRef<number | null>(null);
  const idleSinceRef = React.useRef<number>(0);

  React.useEffect(() => {
    const clear = () => {
      if (idleTimerRef.current !== null) {
        window.clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
    };

    const markActive = () => {
      clear();
      idleSinceRef.current = 0;
      // Solo emitimos cambio de estado si está saliendo de idle.
      setIsIdle((prev) => (prev ? false : prev));
      setDwellMs((prev) => (prev !== 0 ? 0 : prev));
      idleTimerRef.current = window.setTimeout(() => {
        idleSinceRef.current = Date.now();
        setIsIdle(true);
      }, thresholdMs);
    };

    ACTIVITY_EVENTS.forEach((e) =>
      window.addEventListener(e, markActive, { passive: true })
    );
    markActive();

    return () => {
      clear();
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, markActive));
    };
  }, [thresholdMs]);

  // Tic-tac cada 1s mientras está idle.
  React.useEffect(() => {
    if (!isIdle) return;
    const interval = window.setInterval(() => {
      if (idleSinceRef.current > 0) {
        setDwellMs(Date.now() - idleSinceRef.current);
      }
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isIdle]);

  return { isIdle, dwellMs };
}
