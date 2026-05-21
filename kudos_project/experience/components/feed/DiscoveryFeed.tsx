"use client";

/**
 * KUDOS Experience · <DiscoveryFeed />
 *
 * Orquestador del feed cinematográfico vertical. Server Component padre
 * (app/page.tsx) inyecta `items`. Aquí gestionamos:
 *   - scroll-snap vertical (CSS nativo, no JS-driven, máximo rendimiento).
 *   - tracking del card activo (IntersectionObserver) para activar motion.
 *   - keyboard nav: ↑/↓, j/k, PageUp/PageDown.
 *   - swipe táctil: heredado del scroll nativo del navegador.
 *   - estado vacío elegante (cero datos, nunca crashea).
 *
 * El componente NO renderiza shell visual extra: el background atmosférico
 * vive en globals.css (body::before grano + body bg gradient).
 */
import * as React from "react";
import { CapsuleCard } from "./CapsuleCard";
import type { FeedItem } from "@/lib/axon";

export interface DiscoveryFeedProps {
  items: FeedItem[];
}

export function DiscoveryFeed({ items }: DiscoveryFeedProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const sectionRefs = React.useRef<Array<HTMLElement | null>>([]);
  const [activeIndex, setActiveIndex] = React.useState(0);

  // -- tracking del card activo vía IntersectionObserver ----------------
  React.useEffect(() => {
    if (!containerRef.current) return;
    const targets = sectionRefs.current.filter(Boolean) as HTMLElement[];
    if (targets.length === 0) return;

    // Observer: el card "activo" es el más visible (>= 60%).
    const obs = new IntersectionObserver(
      (entries) => {
        // Buscamos el más alto ratio entre los entries que están al menos 0.5.
        let best: IntersectionObserverEntry | null = null;
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          if (!best || e.intersectionRatio > best.intersectionRatio) best = e;
        }
        if (best) {
          const idx = targets.indexOf(best.target as HTMLElement);
          if (idx >= 0) setActiveIndex(idx);
        }
      },
      {
        root: containerRef.current,
        threshold: [0.25, 0.5, 0.75, 1],
      }
    );
    targets.forEach((t) => obs.observe(t));
    return () => obs.disconnect();
  }, [items.length]);

  // -- keyboard nav ------------------------------------------------------
  React.useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const handler = (ev: KeyboardEvent) => {
      const target = ev.target as HTMLElement | null;
      // Permitir typing en inputs sin secuestrar teclas.
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;

      let delta = 0;
      switch (ev.key) {
        case "ArrowDown":
        case "j":
        case "PageDown":
        case " ":
          delta = 1;
          break;
        case "ArrowUp":
        case "k":
        case "PageUp":
          delta = -1;
          break;
        case "Home":
          delta = -activeIndex;
          break;
        case "End":
          delta = items.length - 1 - activeIndex;
          break;
        default:
          return;
      }
      ev.preventDefault();
      const target_i = Math.max(0, Math.min(items.length - 1, activeIndex + delta));
      const el = sectionRefs.current[target_i];
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeIndex, items.length]);

  if (items.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="relative h-[100dvh] w-full">
      {/* Edge fades (top/bottom) — capa decorativa fija sobre el feed. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-30 h-24 bg-gradient-to-b from-[#040614] to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-32 bg-gradient-to-t from-[#040614] via-[#040614cc] to-transparent"
      />

      {/* Feed real · scroll-snap vertical nativo. */}
      <div
        ref={containerRef}
        className="kudos-snap-y relative h-[100dvh] w-full overflow-y-scroll"
        role="feed"
        aria-busy="false"
        aria-label="Descubrimientos de KUDOS sobre el mundo físico"
        tabIndex={0}
      >
        {items.map((item, i) => (
          <article
            key={item.id}
            ref={(el) => {
              sectionRefs.current[i] = el;
            }}
            aria-posinset={i + 1}
            aria-setsize={items.length}
          >
            <CapsuleCard
              item={item}
              active={i === activeIndex}
              index={i + 1}
              total={items.length}
            />
          </article>
        ))}
      </div>

      {/* Side rail · indicador vertical de progreso (desktop). */}
      <SideRail count={items.length} active={activeIndex} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Side rail (indicador discreto del progreso del feed)
// ---------------------------------------------------------------------------
function SideRail({ count, active }: { count: number; active: number }) {
  if (count === 0) return null;
  return (
    <nav
      aria-label="Posición en el feed"
      className="pointer-events-none absolute right-4 top-1/2 z-30 hidden -translate-y-1/2 flex-col gap-2 md:flex"
    >
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          aria-current={i === active ? "true" : undefined}
          className={[
            "block w-px transition-all duration-500 ease-out",
            i === active
              ? "h-6 bg-[var(--kudos-accent)] shadow-[0_0_10px_var(--kudos-accent-glow)]"
              : "h-3 bg-white/25",
          ].join(" ")}
        />
      ))}
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Estado vacío (AXÓN sin cápsulas + curated también vacío — borde extremo)
// ---------------------------------------------------------------------------
function EmptyState() {
  return (
    <main
      role="alert"
      className="grid h-[100dvh] place-items-center px-6 text-center"
    >
      <div className="max-w-md">
        <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-[var(--kudos-accent-bright)]">
          KUDOS · Feed
        </p>
        <h1 className="mt-3 font-display text-[clamp(2rem,5vw,3rem)] font-semibold leading-[1.05] text-white">
          Sintonizando con AXÓN.
        </h1>
        <p className="mt-4 text-white/70">
          El feed cinematográfico aparece cuando hay cápsulas reales que mostrar.
          De momento, la conexión está abierta pero la sesión está vacía.
        </p>
      </div>
    </main>
  );
}
