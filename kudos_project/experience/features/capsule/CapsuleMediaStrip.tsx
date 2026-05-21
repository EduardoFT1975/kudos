"use client";

/**
 * KUDOS Experience · <CapsuleMediaStrip />
 *
 * Tira de vignettes arquitectónicas. SVG vectoriales (ver MediaVignette).
 * Mobile: scroll horizontal snap. Desktop: grid 4-cols.
 * Hover depth · scale 1.02 + glow border on focus/hover.
 */
import * as React from "react";
import { motion, useInView } from "framer-motion";
import { contextualReveal } from "@/motion/ambient";
import { staggerContainer } from "@/motion/transitions";
import { MediaVignette } from "@/components/capsule/MediaVignette";
import type { CapsuleMedia } from "@/lib/capsules";

export interface CapsuleMediaStripProps {
  media: CapsuleMedia[];
}

const mediaStagger = staggerContainer(0.08, 0.05);

export function CapsuleMediaStrip({ media }: CapsuleMediaStripProps) {
  const ref = React.useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.15 });

  return (
    <section
      ref={ref}
      aria-label="Fragmentos arquitectónicos"
      className="relative w-full py-14 sm:py-18"
    >
      {/* Sin header · las vignettes con sus captions ya hablan por sí
          mismas. El contenido emerge, no se anuncia. */}

      {/* Mobile: scroll-x snap. Desktop: grid. */}
      <motion.ul
        variants={mediaStagger}
        initial="hidden"
        animate={inView ? "visible" : "hidden"}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-6 sm:px-10 md:grid md:grid-cols-4 md:gap-5 md:overflow-visible kudos-no-scrollbar"
      >
        {media.map((item, i) => (
          <motion.li
            key={item.id}
            variants={contextualReveal}
            className="group relative aspect-[4/5] w-[78vw] flex-none snap-start snap-always overflow-hidden rounded-2xl md:w-auto"
            style={{ background: item.gradient }}
          >
            {/* SVG vignette */}
            <MediaVignette kind={item.kind} />

            {/* Top edge fade */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-black/35 to-transparent"
            />

            {/* Caption bottom · sin borde, sin background card */}
            <figcaption className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-[#040614] via-[#040614]/80 to-transparent p-5 sm:p-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/45">
                {String(i + 1).padStart(2, "0")}
              </p>
              <p className="mt-2 font-display text-[15px] font-light leading-snug tracking-tight text-white/95">
                {item.caption}
              </p>
            </figcaption>

            {/* Hover depth · solo glow, sin border visible */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-2xl transition-all duration-700 group-hover:shadow-[0_0_36px_-12px_var(--kudos-accent-glow)]"
            />
          </motion.li>
        ))}
      </motion.ul>

      <style>{`
        .kudos-no-scrollbar::-webkit-scrollbar { display: none; }
        .kudos-no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </section>
  );
}
