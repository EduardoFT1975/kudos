"use client";

/**
 * KUDOS Experience · <CapsulePermissionGate /> (Phase P0.5)
 *
 * The first surface a human sees on `/aqui`. Replaces the previous
 * pattern where the page immediately rendered "Escuchando este lugar"
 * BEFORE the browser permission prompt fired — creating cognitive
 * dissonance ("listening to what? I haven't given anything yet") and
 * triggering an unexplained location request that most cold users
 * instinctively denied.
 *
 * Two affordances, both explicit:
 *   - Activar mi lugar  · user-gesture trigger for geolocation flow
 *   - Elegir ciudad     · escape hatch into the manual city picker
 *
 * Critical constraint: this component MUST NOT call useGeolocation.
 * The whole point of the gate is to defer the browser prompt until
 * the user has actively requested it via gesture.
 *
 * Tone matches the rest of KUDOS surfaces · whisper-weight headline,
 * glass-style pills, soft accent. No marketing voice, no exclamations,
 * no "Welcome to KUDOS!". The user came here on purpose.
 */
import * as React from "react";
import { motion } from "framer-motion";
import { PageAtmosphere } from "@/components/capsule/PageAtmosphere";
import { SpatialAnchor } from "@/components/capsule/SpatialAnchor";
import { RecoveryPill } from "@/features/capsule/RecoveryPill";
import { track } from "@/lib/analytics/plausible";

export interface CapsulePermissionGateProps {
  /** User tapped "Activar mi lugar" · parent unblocks the geolocation
   *  flow on this signal · ONLY then does the browser prompt fire. */
  onActivate: () => void;
  /** User tapped "Elegir ciudad" · parent opens the manual picker
   *  directly · geolocation flow is never triggered. */
  onPickManual: () => void;
}

export function CapsulePermissionGate({
  onActivate,
  onPickManual,
}: CapsulePermissionGateProps) {
  // Single mount-time telemetry · funnel-top event. Drop-off between
  // gate_shown and (gate_activate OR gate_manual) is the permission-
  // request abandonment rate.
  React.useEffect(() => {
    track("permission_gate_shown");
  }, []);

  return (
    <main
      aria-live="polite"
      className="relative grid min-h-[100dvh] w-full place-items-center overflow-hidden"
    >
      <PageAtmosphere />
      <SpatialAnchor />

      <div className="relative z-10 grid w-full max-w-[520px] place-items-center gap-12 px-6 text-center">
        {/* Soft accent dot · the "presence is here" idiom */}
        <motion.span
          aria-hidden
          className="size-1.5 rounded-full bg-[var(--kudos-accent)]/85"
          animate={{ opacity: [0.45, 0.9, 0.45] }}
          transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Headline · the promise */}
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: [0.45, 0, 0.55, 1] }}
          className="mx-auto max-w-[460px] font-display italic font-light leading-[1.5] tracking-tight text-white/90 text-[clamp(1.4rem,3.2vw,1.9rem)]"
        >
          KUDOS te cuenta la memoria del lugar donde estás.
        </motion.h1>

        {/* Subtitle · the ask, with rationale */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.4, ease: "easeOut", delay: 0.5 }}
          className="max-w-[420px] text-[14px] leading-[1.7] text-white/55"
        >
          Necesitamos saber dónde para encontrar la historia que este punto del
          mundo guarda. Si prefieres no compartir tu ubicación, puedes elegir
          una ciudad a mano.
        </motion.p>

        {/* CTAs · primary triggers geolocation, secondary opens picker */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 1.0 }}
          className="flex flex-col items-stretch justify-center gap-3 sm:flex-row"
        >
          <RecoveryPill
            primary
            onClick={() => {
              track("permission_gate_activate");
              onActivate();
            }}
          >
            Activar mi lugar
          </RecoveryPill>
          <RecoveryPill
            onClick={() => {
              track("permission_gate_manual");
              onPickManual();
            }}
          >
            Elegir ciudad
          </RecoveryPill>
        </motion.div>

        {/* Mono label · contextual signature */}
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.6, ease: "easeOut", delay: 1.8 }}
          className="font-mono text-[10px] uppercase tracking-[0.32em] text-white/30"
        >
          KUDOS · aquí
        </motion.span>
      </div>
    </main>
  );
}
