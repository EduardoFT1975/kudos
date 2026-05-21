"use client";

/**
 * KUDOS Experience · <CapsuleSparseDiscovery />
 *
 * Acknowledged-limitation state · the backend returned a capsule but
 * either confidence is low or the result came via the Phase 9 landmark
 * override (signal: the original retrieval was sparse, the capsule may
 * be thinner than a confident success).
 *
 * Design philosophy:
 *   - Be honest. Don't dress sparse content as full content.
 *   - Show what we have, framed as "trazo parcial" not "result".
 *   - No urgency. No apology. No "we tried our best."
 *   - Invite continued exploration without prescribing.
 *
 * Layout: single column, generous breathing room, no Timeline /
 * Relations / Media strip / Presence System. Just the essence:
 * title, factual_anchor, optional context_block, soft acknowledgment.
 */
import * as React from "react";
import { motion } from "framer-motion";
import { PageAtmosphere } from "@/components/capsule/PageAtmosphere";
import { SpatialAnchor } from "@/components/capsule/SpatialAnchor";
import { contextualReveal } from "@/motion/ambient";
import { staggerContainer } from "@/motion/transitions";
import { ShareMoment } from "@/features/capsule/ShareMoment";
import { RecoveryPill } from "@/features/capsule/RecoveryPill";
import { track } from "@/lib/analytics/plausible";
import type { CapsuleData } from "@/types/capsule-state";

interface CapsuleSparseDiscoveryProps {
  capsule: CapsuleData;
  /** Phase 14.6 loop · "Buscar algo cerca" (primary). Expand the
   *  search radius from the same coords · the sparse result is honest
   *  about being thin, the CTA is honest about looking harder. */
  onExpand?: () => void;
  /** Phase 14.6 loop · "Probar otro punto" (secondary). Opens the
   *  manual city picker · escape hatch when the area is just sparse. */
  onPickOther?: () => void;
}

const sparseStagger = staggerContainer(0.18, 0.1);

export function CapsuleSparseDiscovery({
  capsule,
  onExpand,
  onPickOther,
}: CapsuleSparseDiscoveryProps) {
  const title = capsule.title || "Sin nombre";
  const factual = capsule.factual_anchor ?? "";
  const context = capsule.context_block ?? "";
  const hasLoop = Boolean(onExpand || onPickOther);

  return (
    <main className="relative min-h-[100dvh] w-full overflow-hidden">
      <PageAtmosphere />
      <SpatialAnchor />

      <section className="relative z-10 mx-auto grid min-h-[100dvh] max-w-[680px] place-items-center px-6 py-24">
        <motion.div
          variants={sparseStagger}
          initial="hidden"
          animate="visible"
          className="space-y-10 text-center"
        >
          {/* Soft "partial trace" indicator · accent-bright dot + mono label */}
          <motion.div
            variants={contextualReveal}
            className="flex items-center justify-center gap-3"
          >
            <span className="size-1 rounded-full bg-[var(--kudos-accent-bright)]/70" />
            <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-[var(--kudos-accent-bright)]/75">
              Trazo parcial
            </span>
          </motion.div>

          {/* Title · display, soft white */}
          <motion.h1
            variants={contextualReveal}
            className="font-display font-light leading-tight tracking-tight text-white/95 text-[clamp(1.8rem,4vw,2.6rem)]"
          >
            {title}
          </motion.h1>

          {/* Factual anchor · italic, the one verified statement */}
          {factual ? (
            <motion.p
              variants={contextualReveal}
              className="font-display italic font-light leading-[1.6] tracking-tight text-white/75 text-[clamp(1.05rem,2vw,1.3rem)]"
            >
              {factual}
            </motion.p>
          ) : null}

          {/* Context block · regular weight, dimmer */}
          {context ? (
            <motion.p
              variants={contextualReveal}
              className="text-[15px] leading-[1.7] text-white/60"
            >
              {context}
            </motion.p>
          ) : null}

          {/* Acknowledgment · italic whisper, the honesty layer */}
          <motion.p
            variants={contextualReveal}
            className="mx-auto max-w-[380px] font-display italic font-light leading-[1.6] text-white/40 text-[14px]"
          >
            Tenemos un trazo de este lugar.
            <br />
            La memoria completa todavía se está tejiendo.
          </motion.p>

          {/* Phase 14.5 · share moment · share even partial traces */}
          <motion.div variants={contextualReveal} className="pt-2">
            <ShareMoment
              title={title}
              caption={`Un trazo de ${title} en KUDOS · la memoria todavía se está tejiendo.`}
            />
          </motion.div>

          {/* Phase 14.6 loop · replaces the passive "explora alrededor"
              microcopy with real recovery affordances. The honesty
              whisper above ("Tenemos un trazo · la memoria completa
              todavía se está tejiendo") is preserved · these CTAs are
              the actionable answer to that honesty. */}
          {hasLoop ? (
            <motion.div
              variants={contextualReveal}
              className="flex flex-col items-stretch justify-center gap-3 pt-2 sm:flex-row"
            >
              {onExpand ? (
                <RecoveryPill
                  primary
                  onClick={() => {
                    track("loop_action", { from: "sparse", action: "expand" });
                    onExpand();
                  }}
                >
                  Buscar algo cerca
                </RecoveryPill>
              ) : null}
              {onPickOther ? (
                <RecoveryPill
                  onClick={() => {
                    track("loop_action", { from: "sparse", action: "pick_other" });
                    onPickOther();
                  }}
                >
                  Probar otro punto
                </RecoveryPill>
              ) : null}
            </motion.div>
          ) : (
            // Fallback when no callbacks · preserve the original
            // contemplative microcopy so a standalone mount still reads
            // as KUDOS, not as a half-broken component.
            <motion.span
              variants={contextualReveal}
              className="font-mono text-[10px] uppercase tracking-[0.32em] text-white/35"
            >
              Explora alrededor o vuelve más adelante
            </motion.span>
          )}
        </motion.div>
      </section>
    </main>
  );
}
