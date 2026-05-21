"use client";

/**
 * KUDOS Experience · <TimeMachine />
 *
 * Compositor del slice. Mantiene state mínimo:
 *   - activeEraId   · era seleccionada (driver del atmosphere, hotspots, label)
 *   - openHotspotId · hotspot abierto (driver del overlay)
 *
 * Layout (z-index ascendente):
 *   z-0   <EraAtmosphere />   · fondo cinematográfico que crossfade
 *   z-10  <RomaMap />          · SVG + hotspots
 *   z-20  HEADER + SLIDER      · UI sobre el mapa
 *   z-30  dim                  · sutilísimo
 *   z-40  <CapsuleOverlay />   · glass aside cuando hay hotspot abierto
 */
import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";

import { ROME_ERAS, DEFAULT_ERA_ID, ROME_ERA_INDEX } from "@/lib/timeline/eras";
import { ROME_HOTSPOTS, ROME_HOTSPOT_INDEX } from "@/lib/timeline/hotspots";

import { EraAtmosphere } from "./EraAtmosphere";
import { RomaMap } from "./RomaMap";
import { CapsuleOverlay } from "./CapsuleOverlay";
import { EraSlider } from "@/components/timeline/EraSlider";
import { temporalFade } from "@/motion/temporal";

export function TimeMachine() {
  const [activeEraId, setActiveEraId] = React.useState<string>(DEFAULT_ERA_ID);
  const [openHotspotId, setOpenHotspotId] = React.useState<string | null>(null);

  const activeEra = ROME_ERA_INDEX[activeEraId] ?? ROME_ERAS[0];
  const openHotspot = openHotspotId ? ROME_HOTSPOT_INDEX[openHotspotId] ?? null : null;

  // Si la era activa cambia y el hotspot abierto ya no está en esa era,
  // cerramos el overlay para evitar referencias huérfanas.
  React.useEffect(() => {
    if (!openHotspot) return;
    if (!openHotspot.appears_in.includes(activeEra.id)) {
      setOpenHotspotId(null);
    }
  }, [activeEra.id, openHotspot]);

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden">
      {/* z-0 · atmósfera */}
      <EraAtmosphere era={activeEra} />

      {/* z-10 · mapa + hotspots */}
      <RomaMap
        era={activeEra}
        hotspots={ROME_HOTSPOTS}
        openHotspotId={openHotspotId}
        onOpen={setOpenHotspotId}
      />

      {/* z-20 · UI (header + slider) */}
      <TimeMachineUI eraId={activeEraId} />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20">
        <div className="pointer-events-auto pb-[max(28px,env(safe-area-inset-bottom))] pt-6">
          <EraSlider
            eras={ROME_ERAS}
            activeEraId={activeEraId}
            onChange={setActiveEraId}
          />
        </div>
      </div>

      {/* z-40 · overlay */}
      <CapsuleOverlay
        hotspot={openHotspot}
        era={activeEra}
        onClose={() => setOpenHotspotId(null)}
      />

      {/* Edge fades verticales para focus cinematográfico */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-[5] h-24 bg-gradient-to-b from-[#040614] to-transparent"
      />
    </main>
  );
}

// ---------------------------------------------------------------------------
// Header in-canvas (back link + era name/micro-context)
// ---------------------------------------------------------------------------
function TimeMachineUI({ eraId }: { eraId: string }) {
  const era = ROME_ERA_INDEX[eraId] ?? ROME_ERAS[0];

  return (
    <>
      {/* Back link (top-left) */}
      <div className="pointer-events-none absolute left-6 top-6 z-20 sm:left-10 sm:top-8">
        <a
          href="/"
          className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.2em] text-white/75 backdrop-blur-md transition-all duration-300 hover:border-white/25 hover:bg-white/[0.08] hover:text-white font-mono"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          Discovery
        </a>
      </div>

      {/* Brand badge (top-right) */}
      <div className="pointer-events-none absolute right-6 top-6 z-20 sm:right-10 sm:top-8">
        <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 backdrop-blur-md">
          <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/60">
            KUDOS · Time Machine · Roma
          </span>
        </div>
      </div>

      {/* Era headline + micro_context (center-bottom area, above slider) */}
      <div className="pointer-events-none absolute inset-x-0 bottom-[180px] z-20 px-6 sm:bottom-[200px] sm:px-10">
        <div className="mx-auto max-w-[820px] text-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={era.id}
              variants={temporalFade}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--kudos-accent-bright)]">
                {era.label} · {era.name}
              </p>
              <p className="mx-auto mt-3 max-w-[640px] text-[15px] leading-relaxed text-white/85 kudos-text-glow">
                {era.micro_context}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}
