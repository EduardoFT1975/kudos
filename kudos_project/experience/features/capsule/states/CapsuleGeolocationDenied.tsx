"use client";

/**
 * KUDOS Experience · <CapsuleGeolocationDenied />
 *
 * Phase 14.5 UX recovery · replaces the silent empty_zone fallback
 * when the geolocation status is `denied`. The previous behaviour was
 * a zombie state · user denied permission, saw "Este lugar guarda
 * silencio" with no path forward.
 *
 * Three recovery affordances:
 *   1. Reintentar permiso · re-mounts the geolocation hook. Browsers
 *      that have hard-blocked permission will fail again instantly,
 *      which is fine · the diagnostic copy points to site settings.
 *   2. Ubicación manual · escalates to the city presets picker.
 *   3. (Implicit) reload page · always works after the user has
 *      unblocked permission in browser settings.
 *
 * Tone constraints preserved · no error language, no red, no
 * "denied" framing toward the user. We frame it as "KUDOS necesita
 * saber dónde estás · ayúdanos".
 */
import * as React from "react";
import { motion } from "framer-motion";
import { PageAtmosphere } from "@/components/capsule/PageAtmosphere";
import { SpatialAnchor } from "@/components/capsule/SpatialAnchor";
import { RecoveryPill } from "@/features/capsule/RecoveryPill";
import { track } from "@/lib/analytics/plausible";

interface CapsuleGeolocationDeniedProps {
  /** Re-mount the geolocation hook. Caller increments a key. */
  onRetryPermission: () => void;
  /** Open the manual city picker overlay. */
  onPickManual: () => void;
}

export function CapsuleGeolocationDenied({
  onRetryPermission,
  onPickManual,
}: CapsuleGeolocationDeniedProps) {
  return (
    <main
      aria-live="polite"
      className="relative grid min-h-[100dvh] w-full place-items-center overflow-hidden"
    >
      <PageAtmosphere />
      <SpatialAnchor />

      <div className="relative z-10 grid w-full max-w-[480px] place-items-center gap-10 px-6 text-center">
        {/* Soft accent dot · paused breath */}
        <motion.span
          aria-hidden
          className="size-1.5 rounded-full bg-[var(--kudos-accent)]/65"
          animate={{ opacity: [0.45, 0.85, 0.45] }}
          transition={{ duration: 5.2, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Primary whisper · the explanation */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: [0.45, 0, 0.55, 1] }}
          className="font-display italic font-light leading-[1.55] tracking-tight text-white/80 text-[clamp(1.15rem,2.5vw,1.45rem)]"
        >
          KUDOS escucha desde donde estás.
        </motion.p>

        {/* Subtitle · the gentle ask */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.4, ease: "easeOut", delay: 0.6 }}
          className="max-w-[400px] text-[14px] leading-[1.7] text-white/55"
        >
          Para contarte la historia de este lugar necesitamos tu ubicación.
          <br />
          Si bloqueaste el permiso, puedes restaurarlo desde la barra del
          navegador · o elegir un punto del mundo a mano.
        </motion.p>

        {/* Recovery CTAs · two pills, side-by-side on desktop, stacked on mobile */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 1.2 }}
          className="flex flex-col items-stretch justify-center gap-3 sm:flex-row"
        >
          <RecoveryPill
            onClick={() => {
              track("geolocation_recovery_retry");
              onRetryPermission();
            }}
            primary
          >
            Reintentar permiso
          </RecoveryPill>
          <RecoveryPill
            onClick={() => {
              track("geolocation_recovery_manual");
              onPickManual();
            }}
          >
            Elegir ubicación
          </RecoveryPill>
        </motion.div>

        {/* Mono label */}
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.6, ease: "easeOut", delay: 2.0 }}
          className="font-mono text-[10px] uppercase tracking-[0.32em] text-white/30"
        >
          KUDOS · esperándote
        </motion.span>
      </div>
    </main>
  );
}

// RecoveryPill extracted to @/features/capsule/RecoveryPill (Phase 14.6).
