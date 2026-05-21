"use client";

/**
 * KUDOS Experience · <CapsuleSuccess />
 *
 * Verified-success state · rendered when the API returns
 * state="success" (confidence >= 0.75 AND no landmark override).
 *
 * Visual language mirrors CapsuleSparseDiscovery but framed positively:
 *   - Header indicator: "Memoria verificada" (vs sparse: "Trazo parcial")
 *   - Accent color: kudos-accent (vs sparse: kudos-accent-bright)
 *   - Footer microcopy invites continued reading (vs sparse: invites
 *     elsewhere)
 *
 * Content rendered from the V0 minimal API shape:
 *   - title         · the canonical place name
 *   - factual_anchor · the verified one-sentence statement
 *   - context_block · 2-3 surrounding sentences
 *   - source_refs   · cited evidence (footnote-style list)
 *
 * Future phases may swap this for the richer CapsuleExperience composer
 * (timeline + media + relations + presence) once the content engine
 * generates those layers. For V0, this minimal renderer matches the
 * pipeline output contract exactly.
 */
import * as React from "react";
import { motion } from "framer-motion";
import { PageAtmosphere } from "@/components/capsule/PageAtmosphere";
import { SpatialAnchor } from "@/components/capsule/SpatialAnchor";
import { contextualReveal } from "@/motion/ambient";
import { staggerContainer } from "@/motion/transitions";
import { ShareMoment } from "@/features/capsule/ShareMoment";
import { RecoveryPill } from "@/features/capsule/RecoveryPill";
import { RememberPill } from "@/features/memory/RememberPill";
import { track } from "@/lib/analytics/plausible";
import type { CapsuleData } from "@/types/capsule-state";

interface CapsuleSuccessProps {
  capsule: CapsuleData;
  /** Phase 14.6 loop · "Descubrir cerca" (primary). Same coords, larger
   *  radius · surfaces a different nearby landmark from the same area. */
  onExploreNearby?: () => void;
  /** Phase 14.6 loop · "Otra cápsula" (secondary). Opens the manual
   *  city picker · lets the user jump somewhere else entirely. */
  onNext?: () => void;
  /** P0.9 Memory Graph · coords con las que se solicitó la cápsula.
   *  El RememberPill las persiste en el memory store para poder volver
   *  a renderizar la memoria sin nuevo fetch al backend. Pueden ser null
   *  si la cápsula vino sin geo (e.g., /capsules/<slug> directo). */
  lat?: number | null;
  lng?: number | null;
}

const successStagger = staggerContainer(0.18, 0.1);

export function CapsuleSuccess({
  capsule,
  onExploreNearby,
  onNext,
  lat = null,
  lng = null,
}: CapsuleSuccessProps) {
  const hasRefs = capsule.source_refs && capsule.source_refs.length > 0;
  const hasLoop = Boolean(onExploreNearby || onNext);

  // P0.9 Memory Graph · snapshot del entry para el RememberPill. Memoized
  // para que el botón no se re-renderice en cada parent render.
  const memoryEntry = React.useMemo(
    () => ({
      id: capsule.id,
      title: capsule.title,
      factual_anchor: capsule.factual_anchor ?? "",
      lat: typeof lat === "number" ? lat : null,
      lng: typeof lng === "number" ? lng : null,
      savedAt: Date.now(),
    }),
    [capsule.id, capsule.title, capsule.factual_anchor, lat, lng],
  );

  // Phase P0.5 · sources collapsed by default. The previous always-
  // visible "Fuentes verificadas" footnote block exposed raw Wikidata
  // Q-IDs and Wikipedia slugs on first read · which framed the product
  // as a Wikipedia skin instead of a memory product. Disclosure pattern
  // keeps verification reachable without leaking infrastructure to a
  // first-time human. Resets on capsule change via React.useState
  // (key={capsule.id} on parent forces fresh mount anyway).
  const [sourcesOpen, setSourcesOpen] = React.useState(false);

  return (
    <main
      className="relative min-h-[100dvh] w-full overflow-hidden"
      // P0.6 · safe-area-inset-bottom · prevents the loop CTAs ("Otra
      // cápsula" / "Descubrir cerca") from being half-eaten by the iOS
      // home indicator on iPhone X-and-newer.
      style={{
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <PageAtmosphere />
      <SpatialAnchor />

      <section className="relative z-10 mx-auto grid min-h-[100dvh] max-w-[680px] place-items-center px-6 py-24">
        <motion.div
          // Phase 14.7 · key on capsule.id forces a clean re-mount when
          // the session swaps to a queue-popped capsule. Without this,
          // the new content snaps in (CapsuleSuccess isn't unmounted
          // by the parent since coords are unchanged) and the stagger
          // reveal never re-plays.
          key={capsule.id}
          variants={successStagger}
          initial="hidden"
          animate="visible"
          className="space-y-10 text-center"
        >
          {/* P1.2 · Inline hero placeholder · zero-dependency visual
              hierarchy hasta que backend exponga media fields. */}
          <motion.div variants={contextualReveal}>
            <div className="aspect-video w-full rounded-2xl bg-gradient-to-br from-indigo-900 via-slate-900 to-black mb-8 flex items-center justify-center text-white/40 text-sm">
              MEMORIA VISUAL · COMING SOON
            </div>
          </motion.div>

          {/* Verified indicator · accent dot + mono label */}
          <motion.div
            variants={contextualReveal}
            className="flex items-center justify-center gap-3"
          >
            <span className="size-1 rounded-full bg-[var(--kudos-accent)]/85" />
            <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-[var(--kudos-accent)]/85">
              Memoria verificada
            </span>
          </motion.div>

          {/* Title · display font, soft white */}
          <motion.h1
            variants={contextualReveal}
            className="font-display font-light leading-tight tracking-tight text-white/95 text-[clamp(1.8rem,4vw,2.6rem)]"
          >
            {capsule.title}
          </motion.h1>

          {/* Factual anchor · italic, the verified one-sentence claim */}
          {capsule.factual_anchor ? (
            <motion.p
              variants={contextualReveal}
              className="font-display italic font-light leading-[1.6] tracking-tight text-white/80 text-[clamp(1.05rem,2vw,1.3rem)]"
            >
              {capsule.factual_anchor}
            </motion.p>
          ) : null}

          {/* Context block · narrative depth */}
          {capsule.context_block ? (
            <motion.p
              variants={contextualReveal}
              className="text-[15px] leading-[1.7] text-white/65"
            >
              {capsule.context_block}
            </motion.p>
          ) : null}

          {/* Source refs · Phase P0.5 · collapsed by default behind
              "Ver fuentes" disclosure. Raw Q-IDs / Wikipedia slugs no
              longer hit first-read attention. */}
          {hasRefs ? (
            <motion.div
              variants={contextualReveal}
              className="mx-auto mt-2 w-full max-w-[520px]"
            >
              {sourcesOpen ? (
                <div className="border-t border-white/10 pt-6">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="font-mono text-[9px] uppercase tracking-[0.32em] text-white/35">
                      Fuentes verificadas
                    </p>
                    <button
                      type="button"
                      onClick={() => setSourcesOpen(false)}
                      className="font-mono text-[9px] uppercase tracking-[0.32em] text-white/35 underline-offset-2 hover:text-white/65 hover:underline"
                      aria-label="Ocultar fuentes"
                    >
                      Ocultar
                    </button>
                  </div>
                  <ul className="space-y-1.5">
                    {capsule.source_refs.map((ref) => (
                      <li key={ref.index} className="text-[12px] leading-[1.5]">
                        <a
                          href={ref.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-white/45 underline-offset-2 hover:text-white/75 hover:underline"
                        >
                          [{ref.index}] {ref.source_type} · {ref.source_id}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setSourcesOpen(true)}
                  className="font-mono text-[10px] uppercase tracking-[0.32em] text-white/35 underline-offset-2 hover:text-white/65 hover:underline"
                  aria-expanded={sourcesOpen}
                  aria-controls="capsule-sources"
                >
                  Ver fuentes
                </button>
              )}
            </motion.div>
          ) : null}

          {/* P0.9 Memory Graph + Phase 14.5 share · ambos quiet CTAs
              side-by-side. "Recordar" es la acción de identidad personal ·
              "Compartir" es la acción social. Stack en mobile, fila en
              desktop. */}
          <motion.div
            variants={contextualReveal}
            className="flex flex-col items-center justify-center gap-3 pt-2 sm:flex-row"
          >
            <RememberPill entry={memoryEntry} />
            <ShareMoment title={capsule.title} />
          </motion.div>

          {/* Phase 14.6 loop · primary/secondary CTAs that keep the
              session moving. Only rendered when at least one callback
              is wired · CapsuleSuccess remains valid when mounted
              standalone (e.g., a future canonical /capsules/<id> page). */}
          {hasLoop ? (
            <motion.div
              variants={contextualReveal}
              className="flex flex-col items-stretch justify-center gap-3 pt-2 sm:flex-row"
            >
              {onExploreNearby ? (
                <RecoveryPill
                  primary
                  onClick={() => {
                    track("loop_action", { from: "success", action: "explore_nearby" });
                    onExploreNearby();
                  }}
                >
                  Descubrir cerca
                </RecoveryPill>
              ) : null}
              {onNext ? (
                <RecoveryPill
                  onClick={() => {
                    track("loop_action", { from: "success", action: "next" });
                    onNext();
                  }}
                >
                  Otra memoria
                </RecoveryPill>
              ) : null}
            </motion.div>
          ) : null}

          {/* Footer mono · invitation to dwell */}
          <motion.span
            variants={contextualReveal}
            className="font-mono text-[10px] uppercase tracking-[0.32em] text-white/35"
          >
            KUDOS · memoria viva
          </motion.span>
        </motion.div>
      </section>
    </main>
  );
}
