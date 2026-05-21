"use client";

/**
 * KUDOS Experience · <CapsuleEmptyZone />
 *
 * Silent state · backend produced no PlaceCapsule for this query.
 * Could be any underlying failure_class (NO_CANDIDATES, LOW_RANK,
 * AMBIGUOUS_WINNER, WIKIDATA_CLIENT_ERROR, LLM_*, UNGROUNDED, etc.).
 *
 * The UX layer treats ALL of these identically. Never expose backend
 * taxonomy. Never use error language. Never apologize. Never blame
 * the system.
 *
 * Design philosophy:
 *   - "El lugar guarda silencio" · the place is silent, not the system.
 *   - The user doesn't see a failure · they see a contemplative pause.
 *   - Maintain ambient atmosphere (PageAtmosphere) so the state still
 *     feels like KUDOS, not a 404 page.
 *
 * Phase 14.5 UX recovery · optional recovery callbacks
 *   - onRetry   · re-fire the request with same coords (transient
 *                 throttle / network blip recovery).
 *   - onExpand  · re-fire with a larger radius (geographic recovery ·
 *                 "buscar cerca"). Caller decides cap.
 *   - onManual  · escalate to the manual city picker.
 *
 * If no callbacks are passed, the component renders its original
 * silent design (no CTAs, no buttons) · used when the caller cannot
 * recover (e.g., the manual picker is already mounted).
 *
 * When CTAs ARE rendered, the contemplative tone is preserved · pills
 * appear as quiet glass affordances, not loud "try again" buttons.
 */
import * as React from "react";
import { motion } from "framer-motion";
import { PageAtmosphere } from "@/components/capsule/PageAtmosphere";
import { SpatialAnchor } from "@/components/capsule/SpatialAnchor";
import { RecoveryPill } from "@/features/capsule/RecoveryPill";
import { track } from "@/lib/analytics/plausible";

export interface CapsuleEmptyZoneProps {
  /** Re-run the request with same coords. */
  onRetry?: () => void;
  /** Re-run the request with a larger radius ("buscar cerca"). */
  onExpand?: () => void;
  /** Open the manual city picker overlay. */
  onManual?: () => void;
}

export function CapsuleEmptyZone({
  onRetry,
  onExpand,
  onManual,
}: CapsuleEmptyZoneProps = {}) {
  const hasRecovery = Boolean(onRetry || onExpand || onManual);

  return (
    <main
      aria-live="polite"
      className="relative grid min-h-[100dvh] w-full place-items-center overflow-hidden"
    >
      <PageAtmosphere />
      <SpatialAnchor />

      <div className="relative z-10 grid place-items-center gap-12 px-6 text-center">
        {/* Silent dot · breathing, not pulsing · slower than building state */}
        <motion.span
          aria-hidden
          className="size-1 rounded-full bg-white/35"
          animate={{ opacity: [0.35, 0.8, 0.35] }}
          transition={{ duration: 7.0, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Primary whisper · italic display · the headline */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.4, ease: [0.45, 0, 0.55, 1], delay: 0.3 }}
          className="mx-auto max-w-[460px] font-display italic font-light leading-[1.6] tracking-tight text-white/70 text-[clamp(1.2rem,2.6vw,1.55rem)]"
        >
          Este lugar guarda silencio.
        </motion.p>

        {/* Subtitle · regular weight · the gentle context.
            P0.9 WOW pilot · el último renglón guía al usuario hacia las
            ciudades donde KUDOS tiene densidad probada (Roma · Salamanca).
            Sin promesa hueca · invitación específica. Reduce el "meh"
            cuando la geo cae en zona vacía y el usuario se va. */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.6, ease: "easeOut", delay: 1.4 }}
          className="mx-auto max-w-[420px] text-[14px] leading-[1.7] text-white/45"
        >
          Volverá a hablar cuando tenga más historia que ofrecer.
          <br />
          Mientras tanto, KUDOS escucha más fuerte en{" "}
          <span className="text-[var(--kudos-accent-bright)]/80">Roma</span> o{" "}
          <span className="text-[var(--kudos-accent-bright)]/80">Salamanca</span>.
        </motion.p>

        {/* Phase 14.5 recovery pills · only render when callbacks exist.
            Tone preserved · whisper-style copy, soft glass surface. */}
        {hasRecovery ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.4, ease: "easeOut", delay: 2.0 }}
            className="flex flex-col items-stretch justify-center gap-3 sm:flex-row"
          >
            {onExpand ? (
              <RecoveryPill
                onClick={() => {
                  track("empty_zone_recovery", { action: "expand" });
                  onExpand();
                }}
                primary
              >
                Buscar cerca
              </RecoveryPill>
            ) : null}
            {onRetry ? (
              <RecoveryPill
                onClick={() => {
                  track("empty_zone_recovery", { action: "retry" });
                  onRetry();
                }}
              >
                Reintentar
              </RecoveryPill>
            ) : null}
            {onManual ? (
              <RecoveryPill
                onClick={() => {
                  track("empty_zone_recovery", { action: "manual" });
                  onManual();
                }}
              >
                Elegir lugar
              </RecoveryPill>
            ) : null}
          </motion.div>
        ) : null}

        {/* Mono label · final closing detail */}
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.6, ease: "easeOut", delay: hasRecovery ? 3.0 : 2.4 }}
          className="font-mono text-[10px] uppercase tracking-[0.32em] text-white/30"
        >
          KUDOS · silencio
        </motion.span>
      </div>
    </main>
  );
}

// RecoveryPill extracted to @/features/capsule/RecoveryPill (Phase 14.6).
