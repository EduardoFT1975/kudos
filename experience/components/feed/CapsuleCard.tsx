"use client";

/**
 * KUDOS Experience · <CapsuleCard />
 *
 * Card full-bleed cinematográfica para el Discovery Feed.
 * Una ventana a otra capa de realidad: hero (imagen o gradient con
 * ken-burns), gradient overlay legible, era pill, título display,
 * micro-contexto, CTA glow, acciones (bookmark/share).
 *
 * Cero estados; el orquestador (DiscoveryFeed) controla activación.
 */
import * as React from "react";
import Image from "next/image";
import { motion, type Variants } from "framer-motion";
import { Bookmark, Share2, Sparkles, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { cinematicReveal, fadeRise, staggerContainer } from "@/motion/transitions";
import type { FeedItem } from "@/lib/axon";

export interface CapsuleCardProps {
  item: FeedItem;
  /** Si está activa (en viewport), arranca animaciones de entrada. */
  active: boolean;
  /** Posición 1-based para el badge de progreso. */
  index: number;
  /** Total para el progreso (n / total). */
  total: number;
}

// Variants locales — el contenedor orquesta los hijos.
const contentStagger: Variants = staggerContainer(0.06, 0.14);

export function CapsuleCard({ item, active, index, total }: CapsuleCardProps) {
  return (
    <section
      className="kudos-snap-item relative flex h-[100dvh] w-full items-end overflow-hidden"
      aria-label={item.title}
      role="region"
    >
      {/* ─── HERO: gradient + (opcional) imagen + ken-burns ──────────────── */}
      <div
        className="absolute inset-0 z-0"
        style={{ background: item.gradient }}
        aria-hidden="true"
      />
      {item.image && (
        <div className="absolute inset-0 z-[1] overflow-hidden">
          <Image
            src={item.image}
            alt=""
            fill
            sizes="100vw"
            priority={index <= 1}
            className={cn(
              "object-cover opacity-0 transition-opacity duration-[1200ms] ease-out",
              "data-[loaded=true]:opacity-100",
              active && "kudos-kenburns"
            )}
            onLoad={(e) => {
              (e.currentTarget as HTMLImageElement).dataset.loaded = "true";
            }}
          />
        </div>
      )}

      {/* ─── Overlay legibilidad: gradient bottom-up y vignette ─────────── */}
      <div
        className="absolute inset-0 z-[2] bg-gradient-to-t from-[#040614] via-[#040614cc] via-30% to-transparent"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 z-[2]"
        style={{
          background:
            "radial-gradient(ellipse 90% 60% at 50% 50%, transparent 50%, rgba(4,6,20,0.55) 100%)",
        }}
        aria-hidden="true"
      />

      {/* ─── TOP BAR: progreso + acciones ────────────────────────────────── */}
      <header className="absolute inset-x-0 top-0 z-10 flex items-start justify-between px-6 pt-[max(20px,env(safe-area-inset-top))] sm:px-10">
        <ProgressBadge index={index} total={total} />
        <CardActions />
      </header>

      {/* ─── ERA PILL ────────────────────────────────────────────────────── */}
      <div className="absolute left-6 top-20 z-10 sm:left-10 sm:top-24">
        <motion.span
          initial={{ opacity: 0, y: -8 }}
          animate={active ? { opacity: 1, y: 0 } : { opacity: 0.6, y: -4 }}
          transition={{ duration: 0.6, ease: [0.22, 0.61, 0.36, 1], delay: 0.05 }}
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-3 py-1.5",
            "border border-white/15 bg-white/[0.06] backdrop-blur-md",
            "text-[11px] font-medium uppercase tracking-[0.18em] text-white/85",
            "font-mono"
          )}
        >
          <span
            aria-hidden
            className="size-1.5 rounded-full bg-[var(--kudos-accent)] shadow-[0_0_10px_var(--kudos-accent-glow)]"
          />
          {item.era_label}
        </motion.span>
      </div>

      {/* ─── CONTENT: título + micro-context + CTA ───────────────────────── */}
      <motion.div
        className="relative z-10 mx-auto w-full max-w-[920px] px-6 pb-[max(72px,env(safe-area-inset-bottom))] sm:px-10 sm:pb-24"
        variants={contentStagger}
        initial="hidden"
        animate={active ? "visible" : "hidden"}
      >
        <motion.p
          variants={fadeRise}
          className="mb-3 inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.28em] text-[var(--kudos-accent-bright)]"
        >
          <Sparkles className="size-3.5" aria-hidden />
          {item.source === "curated" ? "Curado · KUDOS" : "Cápsula · AXÓN"}
        </motion.p>

        <motion.h2
          variants={cinematicReveal}
          className={cn(
            "kudos-text-glow font-display font-semibold text-white",
            "text-[clamp(2.5rem,6.5vw,4.5rem)] leading-[0.98] tracking-[-0.025em]"
          )}
        >
          {item.title}
        </motion.h2>

        <motion.p
          variants={fadeRise}
          className="mt-5 max-w-[640px] text-[clamp(1rem,1.6vw,1.15rem)] leading-relaxed text-white/85"
        >
          {item.micro_context}
        </motion.p>

        <motion.div variants={fadeRise} className="mt-8 flex flex-wrap items-center gap-3">
          <Button asChild variant="glow" size="lg" className="font-medium">
            <a href={item.deep_link} aria-label={`Explorar ${item.title}`}>
              Explorar
              <ArrowUpRight className="size-4" aria-hidden />
            </a>
          </Button>
          <Button variant="ghost" size="lg" className="font-medium" type="button">
            Pregunta a Mind
          </Button>
        </motion.div>
      </motion.div>

      {/* ─── HINT scroll (solo primera card) ─────────────────────────────── */}
      {index === 1 && (
        <ScrollHint />
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Sub-pieces
// ---------------------------------------------------------------------------

function ProgressBadge({ index, total }: { index: number; total: number }) {
  return (
    <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 backdrop-blur-md">
      <span className="text-[10px] font-medium uppercase tracking-[0.24em] text-white/60 font-mono">
        KUDOS · Discovery
      </span>
      <span className="text-[11px] tabular-nums text-white/80 font-mono">
        {String(index).padStart(2, "0")} <span className="text-white/30">/</span>{" "}
        {String(total).padStart(2, "0")}
      </span>
    </div>
  );
}

function CardActions() {
  return (
    <div className="flex items-center gap-2">
      <IconAction label="Guardar cápsula" icon={<Bookmark className="size-4" />} />
      <IconAction label="Compartir descubrimiento" icon={<Share2 className="size-4" />} />
    </div>
  );
}

function IconAction({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "grid size-10 place-items-center rounded-full",
        "border border-white/10 bg-white/[0.04] text-white/85 backdrop-blur-md",
        "transition-all duration-300 ease-out",
        "hover:bg-white/[0.10] hover:border-white/25 hover:text-white",
        "active:scale-95"
      )}
    >
      {icon}
    </button>
  );
}

function ScrollHint() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 1, 0.6] }}
      transition={{ duration: 3.6, times: [0, 0.2, 0.7, 1], ease: "easeOut", delay: 0.8 }}
      className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 sm:bottom-10"
      aria-hidden
    >
      <div className="flex flex-col items-center gap-2 text-white/55">
        <span className="text-[10px] font-medium uppercase tracking-[0.28em] font-mono">
          Desliza para descubrir
        </span>
        <motion.span
          className="block h-6 w-px bg-gradient-to-b from-white/0 via-white/60 to-white/0"
          animate={{ y: [0, 8, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    </motion.div>
  );
}
