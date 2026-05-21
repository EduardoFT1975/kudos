"use client";

/**
 * KUDOS Experience · <CapsuleSystemUnavailable /> (Phase 14.10)
 *
 * The system can't reach AXÓN right now. Distinct from CapsuleEmptyZone
 * which says "this place truly has no story" · this state says
 * "the system is having a moment, try again".
 *
 * Triggered by fetchCapsuleResponse when:
 *   - network throw (offline, DNS, CORS, TLS, connection refused)
 *   - HTTP non-2xx (500, 502, 503, 504, 429 unhandled, etc.)
 *   - response body fails to parse as JSON
 *   - response shape doesn't match the contract
 *
 * The user is NEVER shown the underlying reason · operators read it
 * from the capsule_error telemetry event. Tone matches the rest of
 * the KUDOS state surfaces · whisper, glass, no error icon, no red,
 * no "Oops!". A user encountering this should still feel they're
 * inside KUDOS, not a 500 page.
 *
 * Always renders the Retry CTA (smallest action that can fix the
 * problem · backend often recovers within seconds). Manual picker
 * is offered as a side path · changing location doesn't fix infra,
 * but lets the user keep exploring.
 */
import * as React from "react";
import { motion } from "framer-motion";
import { PageAtmosphere } from "@/components/capsule/PageAtmosphere";
import { SpatialAnchor } from "@/components/capsule/SpatialAnchor";
import { RecoveryPill } from "@/features/capsule/RecoveryPill";
import { track } from "@/lib/analytics/plausible";

export interface CapsuleSystemUnavailableProps {
  /** Re-fire the request · same coords, same radius. */
  onRetry?: () => void;
  /** Open the manual city picker overlay (lets user pick somewhere
   *  else while the backend recovers). */
  onManual?: () => void;
}

export function CapsuleSystemUnavailable({
  onRetry,
  onManual,
}: CapsuleSystemUnavailableProps = {}) {
  const hasRecovery = Boolean(onRetry || onManual);

  // Single telemetry emit per mount · founder can chart how often the
  // user actually sees this surface (separate from capsule_error which
  // can fire from probes the user never witnesses).
  React.useEffect(() => {
    track("system_unavailable_shown");
  }, []);

  return (
    <main
      aria-live="polite"
      className="relative grid min-h-[100dvh] w-full place-items-center overflow-hidden"
    >
      <PageAtmosphere />
      <SpatialAnchor />

      <div className="relative z-10 grid w-full max-w-[480px] place-items-center gap-10 px-6 text-center">
        {/* Soft accent dot · slower than building, faster than empty */}
        <motion.span
          aria-hidden
          className="size-1.5 rounded-full bg-[var(--kudos-ai)]/55"
          animate={{ opacity: [0.4, 0.85, 0.4] }}
          transition={{ duration: 4.0, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Primary whisper · explanation in atmospheric tone */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: [0.45, 0, 0.55, 1] }}
          className="font-display italic font-light leading-[1.55] tracking-tight text-white/80 text-[clamp(1.15rem,2.5vw,1.45rem)]"
        >
          KUDOS está reconectando con la memoria del mundo.
        </motion.p>

        {/* Subtitle · technical reality without technical language */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.4, ease: "easeOut", delay: 0.6 }}
          className="max-w-[400px] text-[14px] leading-[1.7] text-white/55"
        >
          La conexión con nuestro sistema está temporalmente abierta a medias.
          <br />
          Suele restablecerse en segundos · prueba de nuevo o elige otro punto
          mientras tanto.
        </motion.p>

        {/* Recovery CTAs */}
        {hasRecovery ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: "easeOut", delay: 1.2 }}
            className="flex flex-col items-stretch justify-center gap-3 sm:flex-row"
          >
            {onRetry ? (
              <RecoveryPill
                primary
                onClick={() => {
                  track("system_unavailable_recovery", { action: "retry" });
                  onRetry();
                }}
              >
                Reintentar
              </RecoveryPill>
            ) : null}
            {onManual ? (
              <RecoveryPill
                onClick={() => {
                  track("system_unavailable_recovery", { action: "manual" });
                  onManual();
                }}
              >
                Elegir ubicación
              </RecoveryPill>
            ) : null}
          </motion.div>
        ) : null}

        {/* Mono label · final closing detail */}
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.6, ease: "easeOut", delay: hasRecovery ? 2.0 : 1.6 }}
          className="font-mono text-[10px] uppercase tracking-[0.32em] text-white/30"
        >
          KUDOS · reconectando
        </motion.span>
      </div>
    </main>
  );
}
