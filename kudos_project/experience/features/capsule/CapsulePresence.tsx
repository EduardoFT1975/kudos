"use client";

/**
 * KUDOS Experience · <CapsulePresence />
 *
 * Dirección visual del Presence System. Los 4 tipos de presencia
 * contextual que KUDOS empezará a tejer cuando el usuario conecte su
 * mundo. En este slice, todos en estado "esperando contexto" — pulsing
 * dot indicator + microcopy que insinúa el futuro sin fingir datos.
 *
 * NO notificaciones. NO push. Presencia silenciosa.
 */
import * as React from "react";
import { motion, useInView } from "framer-motion";
import { MapPin, History, Users, Calendar } from "lucide-react";
import { contextualReveal } from "@/motion/ambient";
import { staggerContainer } from "@/motion/transitions";
import { cn } from "@/lib/utils/cn";

interface PresenceLayer {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  title: string;
  hint: string;
}

const LAYERS: PresenceLayer[] = [
  {
    id: "near",
    icon: MapPin,
    label: "Hoy cerca de ti",
    title: "Capas históricas a tu alrededor",
    hint: "Cuando KUDOS conozca tu ubicación, sentirás las capas que te rodean.",
  },
  {
    id: "personal",
    icon: History,
    label: "Recordatorio personal",
    title: "Tu propia memoria del lugar",
    hint: "Tus viajes y recuerdos se tejerán con la historia del Coliseo.",
  },
  {
    id: "coincidence",
    icon: Users,
    label: "Coincidencia humana",
    title: "Quién más estuvo aquí",
    hint: "Las personas importantes de tu vida emergerán en este punto del mapa.",
  },
  {
    id: "annual",
    icon: Calendar,
    label: "Cápsula anual",
    title: "Tu resumen de este año",
    hint: "Una vez al año, KUDOS sintetizará lo que viviste en lugares como este.",
  },
];

const presenceStagger = staggerContainer(0.1, 0.08);

export function CapsulePresence() {
  const ref = React.useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.15 });

  return (
    <section
      ref={ref}
      aria-label="KUDOS Presence"
      className="relative w-full overflow-hidden px-6 py-16 sm:px-10 sm:py-22"
    >
      {/* Passive warmth bridge · pre-echo cromático del horizon de Legacy.
          Trabaja en tándem con el bleed margin estructural del LayerContainer
          siguiente — el bleed comprime spacing, este gradient anticipa color.
          Static, aria-hidden, vive en el overflow inferior del section. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-40"
        style={{
          background:
            "linear-gradient(to top, rgba(248,113,113,0.045) 0%, rgba(248,180,110,0.02) 35%, transparent 75%)",
        }}
      />

      <motion.div
        variants={presenceStagger}
        initial="hidden"
        animate={inView ? "visible" : "hidden"}
        className="mx-auto max-w-[1080px]"
      >
        {/* Whisper de apertura · una sola línea que emerge. */}
        <motion.p
          variants={contextualReveal}
          className="mx-auto max-w-[460px] text-center font-display italic font-light text-[clamp(1.05rem,2vw,1.3rem)] leading-[1.55] tracking-tight text-white/45"
        >
          Cuando conectes tu mundo, el lugar empezará a recordarte.
        </motion.p>

        {/* Layers grid */}
        <ul className="mt-12 grid grid-cols-1 gap-4 sm:mt-14 sm:grid-cols-2">
          {LAYERS.map((layer) => (
            <PresenceCard key={layer.id} layer={layer} />
          ))}
        </ul>

        {/* Pie · estado contextual · sin pill, solo dot + texto flotante */}
        <motion.div
          variants={contextualReveal}
          className="mt-14 flex items-center justify-center gap-3 sm:mt-16"
        >
          <span className="relative grid place-items-center">
            <span className="size-1 rounded-full bg-[var(--kudos-ai)]/85" />
            <motion.span
              aria-hidden
              className="absolute inset-0 rounded-full border border-[var(--kudos-ai)]/35"
              animate={{ scale: [1, 3.2, 1], opacity: [0.55, 0, 0.55] }}
              transition={{ duration: 3.6, repeat: Infinity, ease: "easeOut" }}
            />
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-white/40">
            Esperando tu contexto
          </span>
        </motion.div>
      </motion.div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// PresenceCard · disuelto · sin border visible, sin "en preparación" badge
// ---------------------------------------------------------------------------
function PresenceCard({ layer }: { layer: PresenceLayer }) {
  const Icon = layer.icon;
  return (
    <motion.li
      variants={contextualReveal}
      className={cn(
        "group relative overflow-hidden rounded-2xl p-6 sm:p-7",
        "transition-all duration-700"
      )}
    >
      {/* Icono glow · más sutil, sin border explícito */}
      <span
        aria-hidden
        className="relative grid size-10 place-items-center rounded-full"
        style={{
          background:
            "radial-gradient(circle at center, rgba(167,139,250,0.18) 0%, rgba(167,139,250,0.04) 60%, transparent 100%)",
        }}
      >
        <Icon className="size-[14px] text-[var(--kudos-accent-bright)]/85" />
      </span>

      {/* Texto */}
      <div className="mt-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--kudos-accent-bright)]/75">
          {layer.label}
        </p>
        <h3 className="mt-2 font-display text-[clamp(1.05rem,1.85vw,1.3rem)] font-light leading-snug tracking-tight text-white/92">
          {layer.title}
        </h3>
        <p className="mt-3 text-[13px] leading-relaxed text-white/55">
          {layer.hint}
        </p>
      </div>
    </motion.li>
  );
}
