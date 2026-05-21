"use client";

/**
 * KUDOS Experience · <ShareMoment />
 *
 * Phase 14.5 · lightweight share affordance shown on a successful
 * capsule. Single button · no save / bookmark machinery (the live
 * /aqui session is ephemeral and has no canonical slug to bookmark).
 *
 * Behaviour:
 *   1. If navigator.share is available · native share sheet.
 *   2. Otherwise · navigator.clipboard.writeText(window.location.href).
 *   3. Both paths surface an inline toast for 2.6s.
 *
 * Telemetry:
 *   share_attempt     · prop `method: "native" | "clipboard"`
 *   share_completed   · prop `method`
 *   share_cancelled   · prop `method` (user dismissed native sheet)
 *   share_failed      · prop `method`, `reason`
 *
 * Tone: a single pill, generous breathing, mono microcopy. Matches
 * the contemplative language of CapsuleSuccess / CapsuleSparseDiscovery.
 */
import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { track } from "@/lib/analytics/plausible";

export interface ShareMomentProps {
  /** Capsule title · used in share text. */
  title: string;
  /** Optional caption fragment · falls back to a default. */
  caption?: string;
}

const _TOAST_MS = 2600;

export function ShareMoment({ title, caption }: ShareMomentProps) {
  const [toast, setToast] = React.useState<string | null>(null);
  const [nativeAvailable, setNativeAvailable] = React.useState(false);
  const _toastTimer = React.useRef<number | null>(null);

  React.useEffect(() => {
    setNativeAvailable(
      typeof navigator !== "undefined" &&
        typeof navigator.share === "function",
    );
    return () => {
      if (_toastTimer.current !== null) {
        window.clearTimeout(_toastTimer.current);
      }
    };
  }, []);

  const showToast = React.useCallback((msg: string) => {
    setToast(msg);
    if (_toastTimer.current !== null) {
      window.clearTimeout(_toastTimer.current);
    }
    _toastTimer.current = window.setTimeout(() => setToast(null), _TOAST_MS);
  }, []);

  const onShare = React.useCallback(async () => {
    const url =
      typeof window !== "undefined" ? window.location.href : "https://kudos";
    const text =
      caption ?? `Descubre ${title} en KUDOS · la memoria de los lugares.`;
    const shareData: ShareData = {
      title: `${title} · KUDOS`,
      text,
      url,
    };

    if (nativeAvailable) {
      track("share_attempt", { method: "native" });
      try {
        await navigator.share(shareData);
        track("share_completed", { method: "native" });
        // Some browsers don't show a system confirmation · we add ours.
        showToast("Compartido");
        return;
      } catch (err) {
        const reason =
          err instanceof Error ? err.name : "unknown";
        // AbortError = user dismissed the native sheet · not a failure.
        if (reason === "AbortError") {
          track("share_cancelled", { method: "native" });
          return;
        }
        track("share_failed", { method: "native", reason });
        // Fall through to clipboard fallback.
      }
    }

    track("share_attempt", { method: "clipboard" });
    try {
      await navigator.clipboard.writeText(url);
      track("share_completed", { method: "clipboard" });
      showToast("Enlace copiado");
    } catch (err) {
      const reason = err instanceof Error ? err.name : "unknown";
      track("share_failed", { method: "clipboard", reason });
      showToast("No se pudo compartir");
    }
  }, [caption, nativeAvailable, showToast, title]);

  return (
    <div className="grid place-items-center gap-3">
      <button
        type="button"
        onClick={onShare}
        aria-label="Compartir este hallazgo"
        className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.05] px-5 py-2.5 text-[13px] font-medium text-white/85 backdrop-blur-md transition-all duration-300 ease-out hover:border-[var(--kudos-accent)]/55 hover:bg-white/[0.10] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kudos-accent)]"
      >
        <ShareIcon />
        <span>Compartir este hallazgo</span>
      </button>

      {/* Inline toast · positioned under the button so it doesn't
          shift the page layout. Aria-live for screen readers. */}
      <div aria-live="polite" className="min-h-[18px]">
        <AnimatePresence>
          {toast ? (
            <motion.span
              key={toast}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -2 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="font-mono text-[10px] uppercase tracking-[0.32em] text-[var(--kudos-accent-bright)]/75"
            >
              {toast}
            </motion.span>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Inline SVG · matches lucide-react Share2 weight without the import
// (keeps this component self-contained).
function ShareIcon() {
  return (
    <svg
      aria-hidden
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}
