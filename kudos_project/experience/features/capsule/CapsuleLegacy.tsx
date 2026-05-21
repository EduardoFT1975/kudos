"use client";

/**
 * KUDOS Experience · <CapsuleLegacy />
 *
 * Cierre contemplativo antes del footer. Una cápsula para quien venga
 * después. Horizon gradient (dawn/dusk), título poderoso, CTA disabled
 * con pill "próximamente" — no fingimos backend.
 */
import * as React from "react";
import { motion, useInView } from "framer-motion";
import { Telescope } from "lucide-react";
import { contextualReveal, ambientFade } from "@/motion/ambient";
import { staggerContainer } from "@/motion/transitions";
import { FragmentTrace } from "@/components/capsule/FragmentTrace";
import { cn } from "@/lib/utils/cn";

const stagger = staggerContainer(0.1, 0.12);

export function CapsuleLegacy({ placeName }: { placeName: string }) {
  const ref = React.useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.2 });

  return (
    <section
      ref={ref}
      aria-label="Cápsula para el futuro"
      className="relative w-full overflow-hidden px-6 py-24 sm:px-10 sm:py-32"
    >
      {/* Horizon gradient · dawn / dusk ──────────────────────────────── */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-full"
        variants={ambientFade}
        initial="initial"
        animate={inView ? "animate" : "initial"}
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, rgba(248,113,113,0.04) 35%, rgba(167,139,250,0.08) 70%, rgba(167,139,250,0.15) 100%)",
        }}
      />
      {/* Distant glow · lejana presencia ──────────────────────────────── */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[55%]"
        style={{
          background:
            "radial-gradient(ellipse 50% 80% at 50% 100%, rgba(248,113,113,0.18) 0%, transparent 65%)",
        }}
      />
      {/* Horizon line · línea sutil de tierra/cielo */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-[20%] -z-10 h-px"
        style={{
          background:
            "linear-gradient(to right, transparent 0%, rgba(255,255,255,0.18) 40%, rgba(255,255,255,0.18) 60%, transparent 100%)",
        }}
      />
      {/* Single distant glow */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-1/2 bottom-[18%] -z-10 -translate-x-1/2"
        animate={{ opacity: [0.55, 1, 0.55], scale: [1, 1.15, 1] }}
        transition={{ duration: 5.8, repeat: Infinity, ease: "easeInOut" }}
      >
        <span
          className="block size-2 rounded-full bg-[var(--kudos-accent-bright)]"
          style={{ boxShadow: "0 0 22px var(--kudos-accent-glow)" }}
        />
      </motion.div>

      <motion.div
        variants={stagger}
        initial="hidden"
        animate={inView ? "visible" : "hidden"}
        className="mx-auto max-w-[680px] text-center"
      >
        <motion.span
          variants={contextualReveal}
          className="inline-flex items-center gap-2"
        >
          <Telescope className="size-3 text-[var(--kudos-accent-bright)]/75" aria-hidden />
          <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-white/45">
            Futuro · Legado
          </span>
        </motion.span>

        <motion.h2
          variants={contextualReveal}
          className="kudos-text-glow mt-7 font-display text-[clamp(2rem,4.4vw,3rem)] font-semibold leading-[1.05] tracking-tight text-white"
        >
          Una cápsula para quien venga después.
        </motion.h2>

        <motion.p
          variants={contextualReveal}
          className="mx-auto mt-6 max-w-[500px] text-[15px] leading-relaxed text-white/70"
        >
          {placeName} guarda dos mil años de presencias. La tuya también puede
          quedarse — como un mensaje pequeño para alguien que llegue dentro de
          mucho tiempo.
        </motion.p>

        <motion.div
          variants={contextualReveal}
          className="mt-12 inline-flex items-center gap-3"
        >
          {/* Pulse dot · presencia latente, sin button */}
          <span className="relative grid place-items-center">
            <span
              className="size-1 rounded-full bg-[var(--kudos-accent)]"
              style={{ boxShadow: "0 0 10px var(--kudos-accent-glow)" }}
            />
            <motion.span
              aria-hidden
              className="absolute inset-0 rounded-full border border-[var(--kudos-accent)]/35"
              animate={{ scale: [1, 4, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 5.2, repeat: Infinity, ease: "easeOut" }}
            />
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-white/45">
            Cápsula futura · en preparación
          </span>
        </motion.div>

        <motion.p
          variants={contextualReveal}
          className="mt-12 font-mono text-[10px] uppercase tracking-[0.32em] text-white/30"
        >
          El mundo recuerda contigo
        </motion.p>
      </motion.div>

      {/*
        Huella residual del cierre · horizon line tenue al bottom del
        viewport mientras Legacy sale hacia el Footer. "El cierre no
        corta limpio" — la línea persiste un momento, bleed natural
        hacia el Footer. Cálido (rgba 248,113,113) reflejando el dawn
        gradient del propio Legacy.
      */}
      <FragmentTrace triggerRef={ref} top="86%" maxOpacity={0.5}>
        <div
          className="h-px w-[60vw] max-w-[520px]"
          style={{
            background:
              "linear-gradient(to right, transparent 0%, rgba(248,113,113,0.55) 40%, rgba(248,180,110,0.6) 50%, rgba(248,113,113,0.55) 60%, transparent 100%)",
            boxShadow: "0 0 24px rgba(248,113,113,0.3)",
          }}
        />
      </FragmentTrace>
    </section>
  );
}
