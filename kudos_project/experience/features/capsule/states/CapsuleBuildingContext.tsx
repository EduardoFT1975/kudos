"use client";

/**
 * KUDOS Experience · <CapsuleBuildingContext />
 *
 * Loading state · shown while the backend pipeline is processing.
 * Premium minimal · no spinner, no progress bar, no "Loading..." copy.
 *
 * Phase 14.6 cadence (tightened from 0/4/10/18s):
 *
 *   t=0    · "Escuchando este lugar."
 *   t=3s   · "Buscando una memoria cercana."
 *   t=6s   · CTA block appears (Reintentar / Buscar cerca) · the user
 *           gets agency before the wait becomes uncomfortable. The
 *           progression copy stops here · longer waits already had a
 *           way out, so we don't keep rotating "tejiendo memorias"
 *           microcopy past the moment recovery is offered.
 *
 * The CTAs only render when the corresponding callback is wired. With
 * no callbacks (e.g., the geolocation-pending path in CapsuleEntry,
 * where there's nothing to retry / expand · the geolocation hook is
 * already doing that), the component degrades to the pure loading
 * state · no awkward dead buttons.
 *
 * Visual anchor · single pulsing dot (Presence System idiom).
 * Background · PageAtmosphere + SpatialAnchor preserved so the
 * transition into success/sparse_discovery is seamless (no jarring
 * layout shift between states).
 */
import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PageAtmosphere } from "@/components/capsule/PageAtmosphere";
import { SpatialAnchor } from "@/components/capsule/SpatialAnchor";
import { RecoveryPill } from "@/features/capsule/RecoveryPill";
import { track } from "@/lib/analytics/plausible";

interface ProgressionStep {
  delayMs: number;
  text: string;
}

const PROGRESSION: ProgressionStep[] = [
  { delayMs: 0,    text: "Escuchando este lugar." },
  { delayMs: 3000, text: "Buscando una memoria cercana." },
];

const _STALL_CTA_DELAY_MS = 6000;

export interface CapsuleBuildingContextProps {
  /** Re-run the request with same coords. */
  onRetry?: () => void;
  /** Re-run the request with a larger radius. */
  onExpand?: () => void;
}

export function CapsuleBuildingContext({
  onRetry,
  onExpand,
}: CapsuleBuildingContextProps = {}) {
  const [step, setStep] = React.useState(0);
  const [stalled, setStalled] = React.useState(false);
  const _stallReported = React.useRef(false);
  const hasRecovery = Boolean(onRetry || onExpand);

  React.useEffect(() => {
    const stepTimer = window.setTimeout(() => setStep(1), PROGRESSION[1].delayMs);
    const stallTimer = window.setTimeout(() => {
      setStalled(true);
      if (!_stallReported.current) {
        _stallReported.current = true;
        track("capsule_loading_stall", { threshold_ms: _STALL_CTA_DELAY_MS });
      }
    }, _STALL_CTA_DELAY_MS);
    return () => {
      window.clearTimeout(stepTimer);
      window.clearTimeout(stallTimer);
    };
  }, []);

  return (
    <main
      aria-busy="true"
      aria-live="polite"
      className="relative grid min-h-[100dvh] w-full place-items-center overflow-hidden"
    >
      <PageAtmosphere />
      <SpatialAnchor />

      <div className="relative z-10 grid place-items-center gap-10 px-6 text-center">
        {/* Pulsing presence indicator · same idiom as the Presence System */}
        <span className="relative grid place-items-center">
          <span className="size-1.5 rounded-full bg-[var(--kudos-ai)]/85" />
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-full border border-[var(--kudos-ai)]/35"
            animate={{ scale: [1, 3.6, 1], opacity: [0.55, 0, 0.55] }}
            transition={{ duration: 4.2, repeat: Infinity, ease: "easeOut" }}
          />
        </span>

        {/* Microcopy · evolves with time · cross-fade between stages */}
        <AnimatePresence mode="wait">
          <motion.p
            key={step}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 1.0, ease: [0.45, 0, 0.55, 1] }}
            className="mx-auto max-w-[420px] font-display italic font-light leading-[1.55] tracking-tight text-white/70 text-[clamp(1.1rem,2.3vw,1.4rem)]"
          >
            {PROGRESSION[step].text}
          </motion.p>
        </AnimatePresence>

        {/* Phase 14.6 stall recovery · CTAs appear at 6s. Only rendered
            when callbacks are wired (avoids dead buttons in the
            geolocation-pending mount path). */}
        <AnimatePresence>
          {hasRecovery && stalled ? (
            <motion.div
              key="stall-ctas"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-stretch justify-center gap-3 sm:flex-row"
            >
              {onExpand ? (
                <RecoveryPill
                  primary
                  onClick={() => {
                    track("loop_action", { from: "building", action: "expand" });
                    onExpand();
                  }}
                >
                  Buscar cerca
                </RecoveryPill>
              ) : null}
              {onRetry ? (
                <RecoveryPill
                  onClick={() => {
                    track("loop_action", { from: "building", action: "retry" });
                    onRetry();
                  }}
                >
                  Reintentar
                </RecoveryPill>
              ) : null}
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Persistent mono label · status without being technical */}
        <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-white/35">
          KUDOS · escuchando
        </span>
      </div>
    </main>
  );
}
