"use client";

/**
 * KUDOS Experience · <CapsuleExperience />
 *
 * Composer de la cápsula cinematográfica.
 *
 * Layout vertical mobile-first:
 *   1. <CapsuleHero />        · 100dvh full-bleed con silueta + acciones
 *   2. <CapsuleTimeline />     · 5 momentos, línea viva
 *   3. <CapsuleContext />      · 3 pull-quotes glass
 *   4. <CapsuleMediaStrip />   · 4 vignettes SVG arquitectónicas
 *   5. <CapsuleRelations />    · constelación de capas relacionadas
 *   6. <Footer />              · invocación final a Mind + brand line
 */
import * as React from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { CapsuleHero } from "./CapsuleHero";
import { CapsuleTimeline } from "./CapsuleTimeline";
import { CapsuleContext } from "./CapsuleContext";
import { CapsuleHumanMemory } from "./CapsuleHumanMemory";
import { CapsuleMediaStrip } from "./CapsuleMediaStrip";
import { CapsuleRelations } from "./CapsuleRelations";
import { CapsulePresence } from "./CapsulePresence";
import { CapsuleLegacy } from "./CapsuleLegacy";
import { CapsuleMindEntry } from "./CapsuleMindEntry";
import { CapsuleActions } from "./CapsuleActions";
import { PageAtmosphere } from "@/components/capsule/PageAtmosphere";
import { SpatialAnchor } from "@/components/capsule/SpatialAnchor";
import { Whisper } from "@/components/capsule/Whisper";
import { LayerContainer } from "@/components/capsule/LayerContainer";
import type { Capsule } from "@/lib/capsules";

export interface CapsuleExperienceProps {
  capsule: Capsule;
}

export function CapsuleExperience({ capsule }: CapsuleExperienceProps) {
  return (
    <main className="relative min-h-[100dvh] w-full overflow-x-hidden">
      {/* Atmósfera espacial continua detrás de TODO. Carga la continuidad
          perceptiva de la página entera — ya no hay section breaks
          explícitos, solo capas que emergen sobre este aire común. */}
      <PageAtmosphere />

      {/* Floating contextual anchor · hairline vertical fija en el lateral
          izquierdo. UN solo elemento que atraviesa toda la experiencia.
          Prueba perceptiva de continuidad espacial. */}
      <SpatialAnchor />

      {/* Portal de entrada · sin LayerContainer (es el punto de arranque) */}
      <CapsuleHero capsule={capsule} />

      {/* Whispers, EchoNodes y el final del Hero NO usan LayerContainer.
          Son pure beats — necesitan claridad propia, no coexistencia.
          Solo las capas con contenido extenso (Timeline, Context, ...) se
          envuelven para que sus edges respiren y bleed con lo adjacente. */}

      {/* Pensamiento emergente · transición orgánica al tiempo */}
      <Whisper
        text="Miles de personas contemplaron este lugar antes que tú."
        lingerMs={14000}
      />

      {/* Tiempo · sin bleed (whisper arriba ya hace la transición) */}
      <LayerContainer bleed={0}>
        <CapsuleTimeline events={capsule.timeline} />
      </LayerContainer>

      {/* Por qué importa · bleed ligero · transición directa */}
      <LayerContainer bleed={24}>
        <CapsuleContext blocks={capsule.context_blocks} />
      </LayerContainer>

      {/* Silent gap intencional entre Context y HumanMemory */}

      {/* Memoria humana acumulada · bleed PROFUNDO (96) · la sección
          colapsa contra Context · ritmo abruptamente comprimido */}
      <LayerContainer bleed={96}>
        <CapsuleHumanMemory />
      </LayerContainer>

      {/* Fragmentos visuales · bleed muy ligero · contraste con el bleed
          anterior · sensación de "pausa breve antes del siguiente paso" */}
      <LayerContainer bleed={16}>
        <CapsuleMediaStrip media={capsule.media} />
      </LayerContainer>

      {/* Pensamiento sobre persistencia · pure beat sin wrap */}
      <Whisper
        text="Las historias sobreviven más que los imperios."
        lingerMs={18000}
      />

      {/* Capas relacionadas · bleed profundo (72) · sigue Whisper inmediato */}
      <LayerContainer bleed={72}>
        <CapsuleRelations relations={capsule.relations} />
      </LayerContainer>

      {/* Presencia contextual silenciosa · bleed medio (36) · respira más
          que las anteriores · transición a momento contemplativo */}
      <LayerContainer bleed={36}>
        <CapsulePresence />
      </LayerContainer>

      {/* Late dwell whisper · solo aparece tras 12s de quietud · pure beat */}
      <Whisper
        text="El tiempo todavía pasa por aquí."
        dwellMs={12000}
        spacing="wide"
      />

      {/* Legado / futuro · bleed medio-profundo (64) · cierre contemplativo */}
      <LayerContainer bleed={64}>
        <CapsuleLegacy placeName={capsule.hero.title} />
      </LayerContainer>

      {/* Invocación final · sin wrap · el footer es el momento de
          claridad para Save/Share/Mind */}
      <CapsuleFooter capsule={capsule} />
    </main>
  );
}

// ---------------------------------------------------------------------------
// Footer · cierre cinematográfico
// ---------------------------------------------------------------------------
function CapsuleFooter({ capsule }: { capsule: Capsule }) {
  return (
    <footer className="relative w-full px-6 py-24 sm:px-10 sm:py-32">
      <div className="mx-auto max-w-[720px] text-center">
        {/* Sparkle aura · subtle */}
        <motion.span
          aria-hidden
          className="mx-auto mb-6 inline-flex"
          animate={{ rotate: [0, 8, -8, 0], scale: [1, 1.12, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        >
          <Sparkles className="size-5 text-[var(--kudos-accent-bright)]" />
        </motion.span>

        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--kudos-accent-bright)]">
          KUDOS · Mind
        </p>
        <p className="mt-4 font-display text-[clamp(1.4rem,3vw,2rem)] font-medium leading-snug tracking-tight text-white">
          ¿Y si esta piedra pudiera contestarte?
        </p>
        <p className="mx-auto mt-4 max-w-[460px] text-[14px] leading-relaxed text-white/65">
          Pregúntale a KUDOS Mind cualquier cosa sobre {capsule.hero.title}.
          Su narración contextual estará disponible pronto.
        </p>

        <div className="mt-8 flex flex-col items-center gap-4">
          <CapsuleMindEntry contextTitle={capsule.hero.title} variant="floating" />
          <CapsuleActions slug={capsule.slug} title={capsule.hero.title} variant="footer" />
        </div>

        <div className="mt-16 flex flex-col items-center gap-2 font-mono text-[10px] uppercase tracking-[0.32em] text-white/35">
          <span>{capsule.hero.location}</span>
          <span aria-hidden className="block h-px w-12 bg-white/15" />
          <span>KUDOS · La interfaz de descubrimiento de la realidad</span>
        </div>
      </div>
    </footer>
  );
}
