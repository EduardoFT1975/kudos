"use client";

/**
 * KUDOS Experience · <Whisper />
 *
 * Pensamiento contemplativo que emerge entre secciones. UNA frase a la
 * vez. NO carrusel, NO rotación.
 *
 * Reglas perceptivas (calibradas a v2):
 *   - opacity máxima 0.4 (nunca grita; antes 0.55 era demasiado UI)
 *   - blur(8px) → blur(0px) al entrar en viewport · 3s duración
 *   - sin caja, sin borde, sin background
 *
 * Props de escasez:
 *   - `dwellMs`   solo aparece tras ese ms de quietud del usuario
 *                 (le da sensación de "pensamiento que requiere atención")
 *   - `lingerMs`  tras este tiempo en view, se desvanece aunque siga
 *                 visible (se "pierde" si no lo lees a tiempo)
 *
 * NO es UI. Es un pensamiento que aparece, se queda un momento y se va.
 */
import * as React from "react";
import { motion, useInView } from "framer-motion";
import { useIdleDwell } from "@/lib/hooks/useIdleDwell";
import { cn } from "@/lib/utils/cn";

export interface WhisperProps {
  text: string;
  /** Margen vertical · default contemplativo. */
  spacing?: "regular" | "wide";
  /** Solo aparece tras X ms de quietud del usuario. */
  dwellMs?: number;
  /** Tras este tiempo en view, se desvanece (auto-fade-out). */
  lingerMs?: number;
}

export function Whisper({
  text,
  spacing = "regular",
  dwellMs,
  lingerMs,
}: WhisperProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.4, once: false });
  const { isIdle } = useIdleDwell(dwellMs ?? 8000);

  const [lingered, setLingered] = React.useState(false);

  // Linger timer · si el whisper lleva visible en viewport demasiado tiempo,
  // se desvanece (sensación de "se fue antes de leerlo entero").
  React.useEffect(() => {
    if (!lingerMs) return;
    if (!inView) {
      setLingered(false);
      return;
    }
    const t = window.setTimeout(() => setLingered(true), lingerMs);
    return () => window.clearTimeout(t);
  }, [inView, lingerMs]);

  // Lógica de visibilidad:
  //   - Sin dwellMs: visible cuando está in view
  //   - Con dwellMs: visible cuando in view + el usuario está idle
  //   - Linger expirado: invisible aunque siga en view
  let visible = inView;
  if (dwellMs) visible = visible && isIdle;
  if (lingered) visible = false;

  return (
    <div
      ref={ref}
      aria-hidden
      className={cn(
        "relative w-full px-6 sm:px-10",
        spacing === "wide" ? "py-32 sm:py-40" : "py-24 sm:py-32"
      )}
    >
      <motion.p
        initial={{ opacity: 0, filter: "blur(8px)", y: 8 }}
        animate={{
          opacity: visible ? 0.4 : 0.04,
          filter: visible ? "blur(0px)" : "blur(8px)",
          y: visible ? 0 : 8,
        }}
        transition={{ duration: 3.0, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "mx-auto max-w-[560px] text-center font-display italic font-light",
          "text-[clamp(1.05rem,2.2vw,1.4rem)] leading-[1.6] tracking-tight",
          "text-white"
        )}
        style={{
          textShadow: "0 0 22px rgba(167, 139, 250, 0.08)",
        }}
      >
        {text}
      </motion.p>
    </div>
  );
}
