"use client";

/**
 * KUDOS Experience · <RememberPill /> (P0.9 Memory Graph)
 *
 * Toggle "Recordar / Recordada" sobre el memory store local. Diseño
 * intencionalmente diferente de RecoveryPill · esto NO es una acción
 * de recuperación / navegación, es una acción de identidad: el usuario
 * dice "esto es mío".
 *
 * Visual:
 *   - Default (no guardada): glass sutil + outline · invitación discreta
 *   - Saved (guardada): accent fill + glow + check + "Recordada" copy
 *   - Transición motion entre estados con escala suave (no rebote, no
 *     ripple confetti · esto es contemplativo, no celebratorio)
 *
 * Telemetría:
 *   memory_remember_toggled · { action: "save" | "remove", capsule_id }
 *
 * SSR-safe via useMemoryGraph (hidratación cliente-side · botón está
 * disabled hasta hydrated=true para evitar mismatch).
 */
import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMemoryGraph, type MemoryEntry } from "@/lib/memory/useMemoryGraph";
import { track } from "@/lib/analytics/plausible";

export interface RememberPillProps {
  /** Snapshot completo para guardar · el caller arma esto desde la
   *  capsule + coords actuales. */
  entry: MemoryEntry;
}

export function RememberPill({ entry }: RememberPillProps) {
  const { isSaved, toggle, hydrated } = useMemoryGraph();
  const saved = hydrated && isSaved(entry.id);

  const onClick = () => {
    const nowSaved = toggle(entry);
    track("memory_remember_toggled", {
      action: nowSaved ? "save" : "remove",
      // Limit cardinality · solo primeros 8 chars del UUID. Suficiente
      // para correlacionar en debug sin explotar el dashboard.
      capsule_id_short: entry.id.slice(0, 8),
    });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!hydrated}
      aria-pressed={saved}
      aria-label={saved ? "Olvidar esta memoria" : "Recordar esta memoria"}
      className={
        "inline-flex items-center justify-center gap-2 rounded-full border " +
        "px-5 py-2.5 text-[13px] font-medium backdrop-blur-md " +
        "transition-all duration-300 ease-out focus-visible:outline-none " +
        "focus-visible:ring-2 focus-visible:ring-[var(--kudos-accent)] " +
        "disabled:opacity-40 disabled:cursor-not-allowed " +
        (saved
          ? "border-[var(--kudos-accent)]/70 bg-[var(--kudos-accent)]/15 text-[var(--kudos-accent-bright)] shadow-[0_0_24px_-8px_var(--kudos-accent-glow)]"
          : "border-white/20 bg-white/[0.04] text-white/85 hover:border-white/40 hover:bg-white/[0.08] hover:text-white")
      }
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={saved ? "saved" : "unsaved"}
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.7, opacity: 0 }}
          transition={{ duration: 0.24, ease: [0.22, 0.61, 0.36, 1] }}
          aria-hidden
          className="inline-flex"
        >
          {saved ? <SavedIcon /> : <UnsavedIcon />}
        </motion.span>
      </AnimatePresence>
      <span>{saved ? "Recordada" : "Recordar"}</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Inline SVG icons · evitan dependencia extra de lucide aquí y aseguran
// que el peso visual case con la tipografía display+mono de KUDOS.
// ---------------------------------------------------------------------------

function UnsavedIcon() {
  // Marker outline · invitación a marcar este lugar
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 14.5s-5-3.8-5-8a5 5 0 1 1 10 0c0 4.2-5 8-5 8z" />
      <circle cx="8" cy="6.5" r="1.7" />
    </svg>
  );
}

function SavedIcon() {
  // Marker filled · ya tiene tu marca
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="currentColor"
    >
      <path d="M8 14.5s-5-3.8-5-8a5 5 0 1 1 10 0c0 4.2-5 8-5 8z" />
      <circle cx="8" cy="6.5" r="1.6" fill="var(--kudos-bg, #050a1f)" />
    </svg>
  );
}
