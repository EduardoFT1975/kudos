"use client";

/**
 * KUDOS Experience · <CapsuleTimeline />
 *
 * Línea temporal contextual viva. 5 nodos conectados por una línea con
 * gradient. Click → activa el nodo (glow + scale + texto). Mobile:
 * scroll horizontal snap. Desktop: cabe en viewport.
 */
import * as React from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import { contextualReveal, timelinePulse } from "@/motion/ambient";
import { eraTransition } from "@/motion/temporal";
import type { CapsuleTimelineEvent } from "@/lib/capsules";

export interface CapsuleTimelineProps {
  events: CapsuleTimelineEvent[];
}

export function CapsuleTimeline({ events }: CapsuleTimelineProps) {
  const [activeIndex, setActiveIndex] = React.useState(1); // por defecto · inauguración
  const sectionRef = React.useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { once: true, amount: 0.2 });

  const active = events[activeIndex];
  const lastIdx = Math.max(1, events.length - 1);
  const progressPercent = (activeIndex / lastIdx) * 100;

  return (
    <section
      ref={sectionRef}
      aria-label="Línea temporal del Coliseo"
      className="relative w-full px-6 py-16 sm:px-10 sm:py-20"
    >
      <motion.div
        variants={contextualReveal}
        initial="hidden"
        animate={inView ? "visible" : "hidden"}
        className="mx-auto max-w-[1080px]"
      >
        {/* Active node text · arriba del rail · cambia con AnimatePresence.
            El propio rail con sus 5 dots ya se anuncia visualmente — no hace
            falta un header explícito. */}
        <div className="mx-auto min-h-[120px] max-w-[640px] text-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={active.id}
              variants={eraTransition}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <p className="font-mono text-[12px] uppercase tracking-[0.22em] text-[var(--kudos-accent)]">
                {active.year_label}
              </p>
              <h3 className="mt-2 font-display text-[clamp(1.6rem,3vw,2.1rem)] font-semibold leading-tight tracking-tight text-white">
                {active.title}
              </h3>
              <p className="mx-auto mt-3 max-w-[520px] text-[15px] leading-relaxed text-white/80">
                {active.micro_context}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Timeline rail */}
        <div className="mt-14 overflow-x-auto pb-2 kudos-no-scrollbar">
          <div
            className="relative mx-auto h-20 min-w-[640px] sm:min-w-0"
            style={{ width: "min(100%, 920px)" }}
          >
            {/* Rail base */}
            <div
              aria-hidden
              className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-white/12"
            />
            {/* Rail progreso */}
            <motion.div
              aria-hidden
              className="absolute left-0 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-[var(--kudos-accent)] to-[var(--kudos-accent-bright)]"
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.7, ease: [0.22, 0.61, 0.36, 1] }}
              style={{
                boxShadow: "0 0 12px var(--kudos-accent-glow)",
              }}
            />

            {/* Nodes */}
            <ul className="relative grid h-full grid-cols-5">
              {events.map((event, i) => {
                const isActive = i === activeIndex;
                const isPast = i < activeIndex;
                return (
                  <li
                    key={event.id}
                    className="relative flex flex-col items-center justify-center"
                  >
                    <button
                      type="button"
                      onClick={() => setActiveIndex(i)}
                      className={cn(
                        "group relative grid size-12 place-items-center rounded-full transition-all duration-500 ease-out",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kudos-accent)]"
                      )}
                      aria-label={`${event.year_label} · ${event.title}`}
                      aria-current={isActive ? "step" : undefined}
                    >
                      {/* Outer pulse ring · sólo activo */}
                      {isActive && (
                        <motion.span
                          aria-hidden
                          variants={timelinePulse}
                          initial="initial"
                          animate="animate"
                          className="absolute inset-0 rounded-full border border-[var(--kudos-accent)]/60"
                        />
                      )}
                      {/* Dot core */}
                      <span
                        className={cn(
                          "relative z-10 grid size-3 place-items-center rounded-full transition-all duration-500",
                          isActive
                            ? "bg-[var(--kudos-accent)]"
                            : isPast
                            ? "bg-[var(--kudos-accent)]/60"
                            : "bg-white/30 group-hover:bg-white/70"
                        )}
                        style={{
                          boxShadow: isActive
                            ? "0 0 18px var(--kudos-accent-glow)"
                            : "none",
                        }}
                      />
                    </button>
                    {/* Year label · debajo */}
                    <button
                      type="button"
                      onClick={() => setActiveIndex(i)}
                      tabIndex={-1}
                      className={cn(
                        "absolute top-full mt-3 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.16em] transition-colors duration-300",
                        isActive
                          ? "text-white"
                          : "text-white/40 hover:text-white/70"
                      )}
                    >
                      {event.year_label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </motion.div>

      {/* Ocultar scrollbar horizontal del rail · scoped */}
      <style>{`
        .kudos-no-scrollbar::-webkit-scrollbar { display: none; }
        .kudos-no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </section>
  );
}
