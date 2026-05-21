"use client";

/**
 * KUDOS Experience · <CapsuleContext />
 *
 * Bloques de contexto cultural en pull-quote style. NO sidebar enterprise,
 * NO tabs. Glass cards en flujo vertical, cada una con eyebrow micro-tag,
 * accent vertical bar, y texto poderoso corto.
 */
import * as React from "react";
import { motion, useInView } from "framer-motion";
import { contextualReveal } from "@/motion/ambient";
import { staggerContainer } from "@/motion/transitions";
import type { CapsuleContextBlock } from "@/lib/capsules";

export interface CapsuleContextProps {
  blocks: CapsuleContextBlock[];
}

const blocksStagger = staggerContainer(0.12, 0.1);

export function CapsuleContext({ blocks }: CapsuleContextProps) {
  const ref = React.useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.15 });

  return (
    <section
      ref={ref}
      aria-label="Contexto cultural"
      // Asymmetric padding · arriba corto, abajo largo · la sección "se
      // asienta" más al fondo que arriba. Arquitectura, no landing.
      className="relative w-full px-6 pt-10 pb-20 sm:px-10 sm:pt-14 sm:pb-32"
    >
      <motion.div
        variants={blocksStagger}
        initial="hidden"
        animate={inView ? "visible" : "hidden"}
        // Off-axis right en desktop · mobile centrado.
        // Desktop: el bloque "se instala" desplazado a la derecha · los
        // accent bars caen en el centro-derecha del viewport · el espacio
        // negativo izquierdo dialoga con el SpatialAnchor far-left.
        className="mx-auto max-w-[820px] md:ml-auto md:mr-[10%] md:max-w-[640px] lg:mr-[14%]"
      >
        {/* Sin header explícito · los bloques (eyebrow + body con accent bar)
            son auto-explicativos. */}
        {/* Bloques uniformes · misma geometría, mismo peso visual.
            La sección habla con una sola voz tipográfica. */}
        <div className="flex flex-col gap-10 sm:gap-12">
          {blocks.map((block) => (
            <motion.article
              key={block.id}
              variants={contextualReveal}
              className="relative px-4 py-2 sm:px-6"
            >
              <span
                aria-hidden
                className="absolute left-0 top-3 h-12 w-[1.5px] rounded-r bg-gradient-to-b from-[var(--kudos-accent-bright)] to-[var(--kudos-accent)]"
                style={{ boxShadow: "0 0 10px var(--kudos-accent-glow-soft)" }}
              />
              <p className="ml-2 font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--kudos-accent-bright)]/80">
                {block.eyebrow}
              </p>
              <p className="ml-2 mt-4 font-display text-[clamp(1.1rem,2vw,1.4rem)] font-light leading-[1.55] tracking-tight text-white/90">
                {block.body}
              </p>
            </motion.article>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
