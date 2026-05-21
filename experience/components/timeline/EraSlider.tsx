"use client";

/**
 * KUDOS Experience · <EraSlider />
 *
 * Slider temporal premium. NO input range nativo.
 *
 *   ── track (h-1) ───────────────────────────
 *      ●          ●          ●          ●          ●     ← ticks (clickables)
 *                              ┌─────┐
 *                              │80 d.C.│  ← year pill que flota sobre el handle
 *                              └─────┘
 *                                ◉  ← handle draggable con glow
 *
 * Características:
 *   - drag horizontal con snap on release
 *   - mientras se arrastra, la era cambia EN VIVO (onChange continuo)
 *   - clic en cualquier tick salta a esa era con animación
 *   - keyboard: ← / → / Home / End
 *   - ARIA role="slider" con aria-valuetext humano
 */
import * as React from "react";
import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useTransform,
  animate,
  AnimatePresence,
} from "framer-motion";
import { cn } from "@/lib/utils/cn";
import { eraTransition } from "@/motion/temporal";
import type { Era } from "@/lib/timeline/types";

export interface EraSliderProps {
  eras: Era[];
  activeEraId: string;
  onChange: (id: string) => void;
}

export function EraSlider({ eras, activeEraId, onChange }: EraSliderProps) {
  const trackRef = React.useRef<HTMLDivElement>(null);
  const [trackWidth, setTrackWidth] = React.useState(0);
  const trackWidthRef = React.useRef(0);
  const isDragging = React.useRef(false);
  const initialized = React.useRef(false);

  const activeIndex = Math.max(0, eras.findIndex((e) => e.id === activeEraId));
  const lastTick = Math.max(1, eras.length - 1);

  // Posición del handle en píxeles dentro del track.
  const handleX = useMotionValue(0);

  // ─── Medir track ────────────────────────────────────────────────────
  React.useEffect(() => {
    const node = trackRef.current;
    if (!node) return;
    const measure = () => {
      const w = node.getBoundingClientRect().width;
      setTrackWidth(w);
      trackWidthRef.current = w;
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  // ─── Sincronizar handle con activeEraId externo ─────────────────────
  React.useEffect(() => {
    if (trackWidth === 0) return;
    const targetX = (activeIndex / lastTick) * trackWidth;
    if (!initialized.current) {
      handleX.set(targetX);
      initialized.current = true;
      return;
    }
    if (isDragging.current) return;
    const controls = animate(handleX, targetX, {
      duration: 0.65,
      ease: [0.22, 0.61, 0.36, 1],
    });
    return () => controls.stop();
  }, [activeIndex, lastTick, trackWidth, handleX]);

  // ─── Durante drag, emitir era en vivo ───────────────────────────────
  useMotionValueEvent(handleX, "change", (v) => {
    if (!isDragging.current) return;
    const w = trackWidthRef.current;
    if (w === 0) return;
    const ratio = v / w;
    const idx = Math.max(0, Math.min(lastTick, Math.round(ratio * lastTick)));
    const next = eras[idx];
    if (next && next.id !== activeEraId) onChange(next.id);
  });

  // ─── Drag handlers ──────────────────────────────────────────────────
  const onDragStart = () => {
    isDragging.current = true;
  };
  const onDragEnd = () => {
    isDragging.current = false;
    const w = trackWidthRef.current;
    if (w === 0) return;
    const ratio = handleX.get() / w;
    const idx = Math.max(0, Math.min(lastTick, Math.round(ratio * lastTick)));
    const targetX = (idx / lastTick) * w;
    animate(handleX, targetX, { duration: 0.42, ease: [0.16, 1, 0.3, 1] });
    onChange(eras[idx].id);
  };

  // ─── Keyboard ───────────────────────────────────────────────────────
  const onKeyDown = (e: React.KeyboardEvent) => {
    let nextIdx = activeIndex;
    switch (e.key) {
      case "ArrowRight":
      case "ArrowUp":
        nextIdx = Math.min(lastTick, activeIndex + 1);
        break;
      case "ArrowLeft":
      case "ArrowDown":
        nextIdx = Math.max(0, activeIndex - 1);
        break;
      case "Home":
        nextIdx = 0;
        break;
      case "End":
        nextIdx = lastTick;
        break;
      default:
        return;
    }
    e.preventDefault();
    if (nextIdx !== activeIndex) onChange(eras[nextIdx].id);
  };

  // ─── Derivados motion ───────────────────────────────────────────────
  // Width del segmento "lleno" del track (de izquierda al handle).
  const filledWidth = useTransform(handleX, (v) => {
    const w = trackWidthRef.current;
    if (w === 0) return "0%";
    return `${Math.max(0, Math.min(100, (v / w) * 100))}%`;
  });

  const activeEra = eras[activeIndex];

  return (
    <div className="w-full select-none">
      <div className="relative mx-auto w-full max-w-[820px] px-8 sm:px-10">
        {/* Year pill flotante sobre el handle */}
        <div className="relative h-12">
          <motion.div
            aria-hidden
            className="pointer-events-none absolute left-0 top-1 -translate-x-1/2"
            style={{ x: handleX }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={activeEraId}
                variants={eraTransition}
                initial="hidden"
                animate="visible"
                exit="exit"
                className={cn(
                  "rounded-full border border-white/15 bg-[#080d24]/85 px-4 py-1.5 backdrop-blur-md",
                  "shadow-[0_8px_24px_-12px_rgba(0,0,0,0.6)]"
                )}
              >
                <span className="whitespace-nowrap font-mono text-[12px] uppercase tracking-[0.16em] text-white">
                  {activeEra.label}
                </span>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Track */}
        <div
          ref={trackRef}
          role="slider"
          aria-label="Línea temporal de Roma"
          aria-valuemin={0}
          aria-valuemax={lastTick}
          aria-valuenow={activeIndex}
          aria-valuetext={`${activeEra.label} · ${activeEra.name}`}
          tabIndex={0}
          onKeyDown={onKeyDown}
          className={cn(
            "relative h-1 rounded-full bg-white/10",
            "outline-none focus-visible:ring-2 focus-visible:ring-[var(--kudos-accent)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--kudos-bg)]"
          )}
        >
          {/* Filled segment */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-[var(--kudos-accent)] to-[var(--kudos-accent-bright)]"
            style={{ width: filledWidth }}
          />

          {/* Ticks (clickables) */}
          {eras.map((era, i) => {
            const isActive = i === activeIndex;
            return (
              <button
                key={era.id}
                type="button"
                onClick={() => onChange(era.id)}
                aria-label={`Ir a ${era.label} · ${era.name}`}
                className={cn(
                  "absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border transition-all duration-300 ease-out",
                  isActive
                    ? "border-[var(--kudos-accent)] bg-[var(--kudos-accent)] shadow-[0_0_14px_var(--kudos-accent-glow)]"
                    : "border-white/30 bg-[#040614] hover:scale-[1.15] hover:border-white/65"
                )}
                style={{ left: `${(i / lastTick) * 100}%` }}
              />
            );
          })}

          {/* Handle draggable */}
          {trackWidth > 0 && (
            <motion.div
              drag="x"
              dragConstraints={{ left: 0, right: trackWidth }}
              dragMomentum={false}
              dragElastic={0}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              style={{ x: handleX }}
              className="absolute -top-3 left-0 -translate-x-1/2 cursor-grab touch-none active:cursor-grabbing"
              aria-hidden
            >
              <span
                className="block size-7 rounded-full bg-gradient-to-br from-[var(--kudos-accent-bright)] to-[var(--kudos-accent)] ring-1 ring-white/25 ring-inset"
                style={{
                  boxShadow:
                    "0 0 26px var(--kudos-accent-glow), 0 6px 18px -8px rgba(0,0,0,0.5)",
                }}
              />
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 -m-2 rounded-full ring-1 ring-[var(--kudos-accent-glow-soft)]"
              />
            </motion.div>
          )}
        </div>

        {/* Static tick labels */}
        <div className="relative mt-4 h-5">
          {eras.map((era, i) => (
            <button
              key={era.id}
              type="button"
              onClick={() => onChange(era.id)}
              tabIndex={-1}
              className={cn(
                "absolute -translate-x-1/2 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.16em] transition-colors duration-300",
                i === activeIndex
                  ? "text-white"
                  : "text-white/35 hover:text-white/70"
              )}
              style={{ left: `${(i / lastTick) * 100}%` }}
            >
              {era.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
