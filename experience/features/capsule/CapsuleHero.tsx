"use client";

/**
 * KUDOS Experience · <CapsuleHero />
 *
 * Hero v2 · purificado. NO action bar, NO brand badge, NO pills.
 * El usuario entra a un portal contextual, no a una pantalla de producto.
 *
 * Composición:
 *
 *   z-0  atmósfera (gradient imperial + halo radial + breath)
 *   z-1  silueta Coliseo (parallax en scroll)
 *   z-2  vignettes · light shaft cenital · corner darkening
 *   z-10 top: ghost arrow back (icon only, sin pill, sin label)
 *   z-10 contenido bajo: era · location inline + título + micro + whisper-badges
 *   z-10 scroll hint
 *
 * Save / Share / Mind viven SOLO en el footer (no aquí). El Hero priorize:
 * imagen, espacio negativo, breathing room, atmósfera, contemplación.
 */
import * as React from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowLeft } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { ColosseumSilhouette } from "@/components/capsule/ColosseumSilhouette";
import { atmosphereBreath } from "@/motion/ambient";
import { cinematicReveal, fadeRise, staggerContainer } from "@/motion/transitions";

import type { Capsule } from "@/lib/capsules";

export interface CapsuleHeroProps {
  capsule: Capsule;
}

const headerStagger = staggerContainer(0.09, 0.22);

export function CapsuleHero({ capsule }: CapsuleHeroProps) {
  const containerRef = React.useRef<HTMLElement>(null);
  const { scrollY } = useScroll({ target: containerRef, offset: ["start start", "end start"] });

  // Parallax: silueta sube ligeramente con scroll · max 60px.
  const silhouetteY = useTransform(scrollY, [0, 600], [0, -60]);
  // Atmósfera se opaca al hacer scroll.
  const atmosphereOpacity = useTransform(scrollY, [0, 500], [1, 0.6]);

  const hero = capsule.hero;

  return (
    <section
      ref={containerRef}
      className="relative flex h-[100dvh] min-h-[640px] w-full flex-col overflow-hidden"
      aria-label={`${hero.title} · Hero`}
    >
      {/* ── z-0 · ATMOSFERA con breath sutil ────────────────────────────── */}
      <motion.div
        aria-hidden
        className="absolute inset-0 z-0"
        style={{ opacity: atmosphereOpacity }}
      >
        <motion.div
          variants={atmosphereBreath}
          initial="initial"
          animate="animate"
          className="absolute inset-0"
        >
          {/* Gradient imperial profundo */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, #1a0d15 0%, #3a1424 40%, #060410 100%)",
            }}
          />
          {/* Halo central */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 70% 50% at 50% 35%, rgba(248,113,113,0.22) 0%, transparent 60%)",
            }}
          />
          {/* Tinte púrpura marca */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 60% 60% at 50% 95%, rgba(167,139,250,0.18) 0%, transparent 60%)",
            }}
          />
        </motion.div>
      </motion.div>

      {/* ── z-1 · SILUETA COLISEO con parallax ─────────────────────────── */}
      <motion.div
        aria-hidden
        className="absolute inset-x-0 bottom-0 z-[1] h-[55%] w-full"
        style={{ y: silhouetteY }}
      >
        <ColosseumSilhouette className="absolute inset-x-0 bottom-0 h-full w-full" />
      </motion.div>

      {/* ── z-2 · Edge vignette superior ───────────────────────────────── */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-[2] h-32 bg-gradient-to-b from-[#040614] to-transparent"
      />

      {/* ── z-2 · Light shaft cenital · sensación "portal" ─────────────── */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 z-[2] h-[70%] w-[55%] -translate-x-1/2"
        animate={{ opacity: [0.5, 0.78, 0.5] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background:
            "linear-gradient(to bottom, rgba(167,139,250,0.085) 0%, rgba(167,139,250,0.025) 35%, transparent 70%)",
          filter: "blur(26px)",
        }}
      />

      {/* ── z-2 · Corner vignette · focaliza el centro ─────────────────── */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[2]"
        style={{
          background:
            "radial-gradient(ellipse 100% 80% at 50% 50%, transparent 50%, rgba(4,6,20,0.55) 100%)",
        }}
      />

      {/* ── z-10 · TOP · ghost arrow back · sin pill, sin label ─────────── */}
      <header className="relative z-10 flex items-start justify-between px-6 pt-[max(28px,env(safe-area-inset-top))] sm:px-10 sm:pt-10">
        <a
          href="/"
          aria-label="Volver"
          className={cn(
            "inline-grid size-9 place-items-center rounded-full text-white/45",
            "transition-all duration-500 ease-out",
            "hover:bg-white/[0.04] hover:text-white/95",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kudos-accent)]"
          )}
        >
          <ArrowLeft className="size-[18px]" aria-hidden />
        </a>
        {/* Top-right deliberadamente vacío · sin brand chrome */}
      </header>

      {/* ── z-10 · CONTENIDO CENTRAL-BAJO · sin pills, sin action bar ──── */}
      <motion.div
        variants={headerStagger}
        initial="hidden"
        animate="visible"
        className="relative z-10 mx-auto mt-auto w-full max-w-[920px] px-6 pb-[max(40px,env(safe-area-inset-bottom))] sm:px-10 sm:pb-24"
      >
        {/* Eyebrow inline · era · location · sin pills */}
        <motion.p
          variants={fadeRise}
          className="font-mono text-[11px] uppercase tracking-[0.32em] text-white/55"
        >
          <span className="text-[var(--kudos-accent-bright)]">{hero.era_label}</span>
          <span className="mx-2 text-white/25" aria-hidden>·</span>
          <span>{hero.location}</span>
        </motion.p>

        {/* Title */}
        <motion.h1
          variants={cinematicReveal}
          className="kudos-text-glow mt-6 font-display text-[clamp(3rem,9vw,5.5rem)] font-semibold leading-[0.95] tracking-[-0.03em] text-white"
        >
          {hero.title}
        </motion.h1>

        {/* Micro-context */}
        <motion.p
          variants={fadeRise}
          className="mt-7 max-w-[640px] text-[clamp(1rem,1.7vw,1.2rem)] leading-relaxed text-white/85"
        >
          {hero.micro_context}
        </motion.p>

        {/* Whisper line de badges · sin pills, sin backgrounds */}
        <motion.p
          variants={fadeRise}
          className="mt-9 font-mono text-[10px] uppercase tracking-[0.28em] text-white/35"
        >
          {hero.badges.map((b, i) => (
            <React.Fragment key={b}>
              {i > 0 && <span className="mx-2.5 text-white/15" aria-hidden>·</span>}
              <span>{b}</span>
            </React.Fragment>
          ))}
        </motion.p>
      </motion.div>

      {/* Scroll hint */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 1, 0.5] }}
        transition={{ duration: 4.2, times: [0, 0.2, 0.7, 1], ease: "easeOut", delay: 1.4 }}
        className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2"
      >
        <div className="flex flex-col items-center gap-2 text-white/35">
          <motion.span
            className="block h-5 w-px bg-gradient-to-b from-white/0 via-white/45 to-white/0"
            animate={{ y: [0, 6, 0], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </motion.div>
    </section>
  );
}
