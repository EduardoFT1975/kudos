"use client";

/**
 * KUDOS Experience · <CapsuleHumanMemory />
 *
 * Ecos humanos acumulados. Sección contemplativa que insinúa la
 * presencia de quienes pasaron por este lugar antes — sin nombres,
 * sin datos, sin caer en lo dramático.
 *
 * Visual: constelación de dots tenues a la deriva (memoryDrift) en el
 * fondo + 3 ecos en glass cards con typography poderosa corta.
 */
import * as React from "react";
import { motion, useInView } from "framer-motion";
import { Users, Clock, Feather } from "lucide-react";
import { contextualReveal } from "@/motion/ambient";
import { staggerContainer } from "@/motion/transitions";

const ECHOES = [
  {
    id: "thousands",
    icon: Users,
    label: "Multitud",
    text: "Miles de personas estuvieron aquí. Cada una con su propia historia.",
  },
  {
    id: "generations",
    icon: Clock,
    label: "Tiempo",
    text: "Generaciones atravesaron este lugar antes que tú.",
  },
  {
    id: "stone-remembers",
    icon: Feather,
    label: "Permanencia",
    text: "La piedra recuerda lo que las palabras olvidan.",
  },
] as const;

const echoStagger = staggerContainer(0.16, 0.1);

export function CapsuleHumanMemory() {
  const ref = React.useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.15 });

  return (
    <section
      ref={ref}
      aria-label="Ecos humanos acumulados"
      className="relative w-full overflow-hidden px-6 py-20 sm:px-10 sm:py-24"
    >
      {/* Sin background local · PageAtmosphere es el único ambient field. */}
      <motion.div
        variants={echoStagger}
        initial="hidden"
        animate={inView ? "visible" : "hidden"}
        // Off-axis left en desktop · mobile centrado.
        // Contrapunto al Context (que empuja a la derecha) · zig-zag
        // horizontal entre dos capas adyacentes · tensión arquitectónica.
        className="mx-auto max-w-[820px] md:ml-[10%] md:mr-auto md:max-w-[640px] lg:ml-[14%]"
      >
        {/* Whisper de apertura · un solo pensamiento, NO header anunciando
            sección. Italic display, opacidad baja. */}
        <motion.p
          variants={contextualReveal}
          className="mx-auto max-w-[460px] text-center font-display italic font-light text-[clamp(1.05rem,2vw,1.3rem)] leading-[1.55] tracking-tight text-white/45"
        >
          No se ven. No tienen nombre aquí. Pero estuvieron, todos.
        </motion.p>

        <ul className="mt-10 flex flex-col gap-5 sm:mt-12">
          {ECHOES.map((echo) => {
            const Icon = echo.icon;
            return (
              <motion.li
                key={echo.id}
                variants={contextualReveal}
                className="group relative flex items-start gap-5 rounded-2xl border border-white/8 bg-white/[0.02] p-6 backdrop-blur-md transition-colors duration-700 hover:border-white/15 sm:p-7"
              >
                {/* Icono en círculo glow */}
                <span
                  aria-hidden
                  className="relative grid size-12 flex-none place-items-center rounded-full border border-[var(--kudos-accent)]/25 bg-[var(--kudos-accent)]/[0.06] backdrop-blur-md"
                  style={{
                    boxShadow:
                      "inset 0 0 12px rgba(167,139,250,0.10), 0 0 18px -10px var(--kudos-accent-glow)",
                  }}
                >
                  <Icon className="size-4 text-[var(--kudos-accent-bright)]" />
                  <motion.span
                    aria-hidden
                    className="absolute inset-0 rounded-full border border-[var(--kudos-accent)]/30"
                    animate={{ scale: [1, 1.18, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
                  />
                </span>
                {/* Texto */}
                <div className="flex-1">
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/45">
                    {echo.label}
                  </p>
                  <p className="mt-2 font-display text-[clamp(1rem,1.7vw,1.2rem)] font-medium leading-[1.55] tracking-tight text-white/90">
                    {echo.text}
                  </p>
                </div>
              </motion.li>
            );
          })}
        </ul>
      </motion.div>
    </section>
  );
}
