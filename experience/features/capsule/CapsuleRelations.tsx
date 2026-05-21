"use client";

/**
 * KUDOS Experience · <CapsuleRelations />
 *
 * "Capas relacionadas" · sensación de grafo contextual vivo.
 * Cada relación es un nodo pill conectado a los siguientes por una línea
 * sutil de gradient (constellation feel). NO grid genérico.
 * Mobile: scroll horizontal. Desktop: row con líneas trazadas.
 */
import * as React from "react";
import { motion, useInView } from "framer-motion";
import { contextualReveal } from "@/motion/ambient";
import { staggerContainer } from "@/motion/transitions";
import { cn } from "@/lib/utils/cn";
import type { CapsuleRelation } from "@/lib/capsules";

export interface CapsuleRelationsProps {
  relations: CapsuleRelation[];
}

const relStagger = staggerContainer(0.08, 0.08);

export function CapsuleRelations({ relations }: CapsuleRelationsProps) {
  const ref = React.useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.15 });

  return (
    <section
      ref={ref}
      aria-label="Capas relacionadas"
      // Asymmetric padding · paralelo a Context · ritmo orgánico irregular
      className="relative w-full px-6 pt-10 pb-24 sm:px-10 sm:pt-12 sm:pb-28"
    >
      <div className="mx-auto max-w-[1080px]">
        {/* Whisper de apertura · una línea que emerge, no un header. */}
        <p className="text-center font-mono text-[10px] uppercase tracking-[0.32em] text-white/40">
          lo que late alrededor
        </p>

        {/* Constellation rail */}
        <motion.div
          variants={relStagger}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="relative mt-10 sm:mt-12"
        >
          {/* Línea conectora sutil · desktop · detrás de los nodos */}
          <svg
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-1/2 hidden h-px w-full -translate-y-1/2 sm:block"
            preserveAspectRatio="none"
            viewBox="0 0 100 1"
          >
            <defs>
              <linearGradient id="rel-line" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(167,139,250,0)" />
                <stop offset="20%" stopColor="rgba(167,139,250,0.35)" />
                <stop offset="80%" stopColor="rgba(167,139,250,0.35)" />
                <stop offset="100%" stopColor="rgba(167,139,250,0)" />
              </linearGradient>
            </defs>
            <line
              x1="0"
              y1="0.5"
              x2="100"
              y2="0.5"
              stroke="url(#rel-line)"
              strokeWidth="0.6"
              strokeDasharray="0.6 1"
            />
          </svg>

          <ul className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3 sm:flex-wrap sm:justify-center sm:gap-4 sm:overflow-visible kudos-no-scrollbar">
            {relations.map((r) => (
              <motion.li
                key={r.id}
                variants={contextualReveal}
                className="flex-none snap-start"
              >
                <RelationPill relation={r} />
              </motion.li>
            ))}
          </ul>
        </motion.div>
      </div>

      <style>{`
        .kudos-no-scrollbar::-webkit-scrollbar { display: none; }
        .kudos-no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </section>
  );
}

// ---------------------------------------------------------------------------
// RelationPill · disuelto · sin border, sin background, sin sparkles
// ---------------------------------------------------------------------------
function RelationPill({ relation }: { relation: CapsuleRelation }) {
  const Tag = relation.slug ? "a" : "div";
  const href = relation.slug ? `/capsules/${relation.slug}` : undefined;
  const disabled = !relation.slug;

  return (
    <Tag
      {...(href ? { href } : {})}
      className={cn(
        "group relative inline-flex items-center gap-3.5 px-3 py-3 sm:px-4",
        "transition-all duration-700 ease-out",
        !disabled && "cursor-pointer hover:opacity-100",
        disabled && "cursor-default",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kudos-accent)] focus-visible:ring-offset-4 focus-visible:ring-offset-transparent rounded-md"
      )}
      aria-label={`${relation.name} · ${relation.kind}${disabled ? " · en preparación" : ""}`}
    >
      {/* Dot icon · más etéreo */}
      <span className="relative grid place-items-center">
        <span
          aria-hidden
          className={cn(
            "block size-1.5 rounded-full transition-all duration-700",
            disabled
              ? "bg-white/30"
              : "bg-[var(--kudos-accent)] shadow-[0_0_12px_var(--kudos-accent-glow)] group-hover:scale-125"
          )}
        />
        {!disabled && (
          <span
            aria-hidden
            className="absolute inset-0 -m-1 rounded-full border border-[var(--kudos-accent)]/20 opacity-0 transition-opacity duration-700 group-hover:opacity-100"
          />
        )}
      </span>
      <span className="flex flex-col items-start leading-tight">
        <span
          className={cn(
            "font-display text-[14px] font-light tracking-tight transition-colors duration-500",
            disabled ? "text-white/75" : "text-white/95 group-hover:text-white"
          )}
        >
          {relation.name}
        </span>
        <span className="mt-1 font-mono text-[9px] uppercase tracking-[0.24em] text-white/35">
          {relation.kind}
        </span>
      </span>
    </Tag>
  );
}
