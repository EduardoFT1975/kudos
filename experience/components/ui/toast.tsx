"use client";

/**
 * KUDOS Experience · <Toast />
 *
 * Toast minimal cinematográfico. NO librería; estado local + AnimatePresence.
 * Posición fija bottom-center con safe-area inset. Auto-cierra a los 2.6s.
 */
import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cinematicOverlay } from "@/motion/ambient";

export interface ToastProps {
  open: boolean;
  message: string;
  /** ms · default 2600 */
  duration?: number;
  onClose: () => void;
  /** Icono opcional al inicio. */
  icon?: React.ReactNode;
}

export function Toast({ open, message, duration = 2600, onClose, icon }: ToastProps) {
  React.useEffect(() => {
    if (!open) return;
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [open, duration, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="status"
          aria-live="polite"
          variants={cinematicOverlay}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="pointer-events-none fixed inset-x-0 bottom-[max(28px,env(safe-area-inset-bottom))] z-[80] flex justify-center px-4"
        >
          <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-white/15 bg-[#080d24]/92 px-5 py-3 backdrop-blur-xl shadow-[0_18px_48px_-16px_rgba(0,0,0,0.65)]">
            {icon && (
              <span className="text-[var(--kudos-accent-bright)]">{icon}</span>
            )}
            <span className="text-[13px] text-white/90">{message}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Hook conveniente para mostrar un toast puntual. */
export function useToast() {
  const [open, setOpen] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [icon, setIcon] = React.useState<React.ReactNode>(null);

  const show = React.useCallback(
    (msg: string, opts?: { icon?: React.ReactNode }) => {
      setMessage(msg);
      setIcon(opts?.icon ?? null);
      setOpen(true);
    },
    []
  );
  const close = React.useCallback(() => setOpen(false), []);

  return { open, message, icon, show, close };
}
