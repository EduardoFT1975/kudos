"use client";

/**
 * KUDOS Experience · <MemoryGraph /> (P0.9)
 *
 * Renderiza la lista de memorias guardadas del usuario · recent-first.
 * Cada entry es una tarjeta glass con título + factual_anchor + tiempo
 * relativo + acciones (re-abrir en mapa, olvidar).
 *
 * Estados:
 *   - hydrated=false  → skeleton ligero (evita SSR mismatch + flash)
 *   - count=0         → empty state contemplativo con CTAs hacia /mapa
 *                       y /aqui (los dos caminos para crear memorias)
 *   - count>0         → grid de tarjetas
 *
 * Una memoria se re-abre llevando al usuario a /aqui con las coords
 * congeladas (manualCoords). Como /aqui ya soporta coords vía picker,
 * usamos un hash en URL · CapsuleEntry no lee del hash hoy, pero el
 * tap pone al usuario "donde estaba" abriendo un Link a /mapa centrado.
 *
 * P0.9 alcance: vista de lectura + acción "olvidar". La re-apertura
 * full (recargar la cápsula desde las coords guardadas) requiere
 * pequeño wiring extra en CapsuleEntry que dejamos para iteración 2.
 * Por ahora el usuario tap → va a /mapa con un parámetro lat/lng que
 * MapExplorer puede leer en futuro patch.
 */
import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useMemoryGraph, type MemoryEntry } from "@/lib/memory/useMemoryGraph";
import { track } from "@/lib/analytics/plausible";

export function MemoryGraph() {
  const { entries, count, hydrated, remove } = useMemoryGraph();

  // Telemetría · una vez por hidratación
  const trackedRef = React.useRef(false);
  React.useEffect(() => {
    if (!hydrated || trackedRef.current) return;
    trackedRef.current = true;
    track("memory_graph_view", { count });
  }, [hydrated, count]);

  if (!hydrated) {
    return <Skeleton />;
  }

  if (count === 0) {
    return <EmptyState />;
  }

  return (
    <main
      className="relative mx-auto w-full max-w-[820px] px-4 pb-24 pt-24 sm:px-6"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 88px)" }}
    >
      <header className="mb-10 grid gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-[var(--kudos-accent-bright)]/80">
          KUDOS · tus memorias
        </span>
        <h1 className="font-display font-light leading-tight tracking-tight text-white/95 text-[clamp(1.8rem,4vw,2.6rem)]">
          {count} {count === 1 ? "lugar recordado" : "lugares recordados"}
        </h1>
        <p className="max-w-[520px] text-[14px] leading-[1.7] text-white/55">
          Cada lugar que marcaste con &laquo;Recordar&raquo; vive aquí. Tu
          mapa personal · no compartido · solo en este navegador.
        </p>
      </header>

      <ul className="grid gap-4">
        {entries.map((e) => (
          <li key={e.id}>
            <MemoryCard entry={e} onForget={() => remove(e.id)} />
          </li>
        ))}
      </ul>

      <p className="mt-12 text-center font-mono text-[10px] uppercase tracking-[0.32em] text-white/30">
        Almacenamiento local · puedes vaciarlo desde la configuración de tu navegador
      </p>
    </main>
  );
}

// ---------------------------------------------------------------------------
// MemoryCard · tarjeta individual
// ---------------------------------------------------------------------------

interface MemoryCardProps {
  entry: MemoryEntry;
  onForget: () => void;
}

function MemoryCard({ entry, onForget }: MemoryCardProps) {
  const hasCoords =
    typeof entry.lat === "number" && typeof entry.lng === "number";

  // Link al mapa centrado en las coords · MapExplorer puede leer el hash
  // en una iteración futura para auto-centrar. Por ahora el link
  // simplemente abre /mapa · mejor que un dead-end.
  const mapHref = hasCoords
    ? `/mapa#lat=${entry.lat?.toFixed(5)},lng=${entry.lng?.toFixed(5)}`
    : "/mapa";

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 0.61, 0.36, 1] }}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025] p-6 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.05]"
    >
      {/* Header · tiempo relativo + accent dot */}
      <div className="mb-3 flex items-center gap-2">
        <span className="size-1 rounded-full bg-[var(--kudos-accent)]/70" />
        <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-white/40">
          {_relativeTime(entry.savedAt)}
        </span>
      </div>

      {/* Title · display */}
      <h2 className="mb-2 font-display font-light leading-tight text-white/95 text-[clamp(1.1rem,2.2vw,1.4rem)]">
        {entry.title}
      </h2>

      {/* Factual anchor · si existe */}
      {entry.factual_anchor ? (
        <p className="mb-4 font-display italic leading-[1.55] text-white/65 text-[14px]">
          {entry.factual_anchor}
        </p>
      ) : null}

      {/* Coords mono · si existen · diagnóstico/atribución */}
      {hasCoords ? (
        <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.28em] text-white/35">
          {entry.lat?.toFixed(4)} · {entry.lng?.toFixed(4)}
        </p>
      ) : null}

      {/* Acciones */}
      <div className="flex items-center gap-3 pt-2">
        <Link
          href={mapHref}
          onClick={() =>
            track("memory_open_in_map", {
              capsule_id_short: entry.id.slice(0, 8),
              has_coords: hasCoords ? "yes" : "no",
            })
          }
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--kudos-accent)]/40 bg-[var(--kudos-accent)]/[0.06] px-4 py-1.5 text-[12px] font-medium text-[var(--kudos-accent-bright)] transition hover:border-[var(--kudos-accent)]/70 hover:bg-[var(--kudos-accent)]/[0.12]"
        >
          Ver en mapa
          <span aria-hidden>→</span>
        </Link>

        <button
          type="button"
          onClick={() => {
            track("memory_forgotten", {
              capsule_id_short: entry.id.slice(0, 8),
            });
            onForget();
          }}
          className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.02] px-4 py-1.5 text-[12px] text-white/50 transition hover:border-white/25 hover:text-white/85"
          aria-label={`Olvidar ${entry.title}`}
        >
          Olvidar
        </button>
      </div>
    </motion.article>
  );
}

// ---------------------------------------------------------------------------
// Empty state · sin memorias todavía
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <main
      className="relative grid min-h-[calc(100dvh-200px)] w-full place-items-center px-6"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 56px)" }}
    >
      <div className="grid place-items-center gap-8 text-center">
        <motion.span
          aria-hidden
          className="size-1.5 rounded-full bg-white/40"
          animate={{ opacity: [0.35, 0.85, 0.35] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        <p className="mx-auto max-w-[440px] font-display italic font-light leading-[1.6] tracking-tight text-white/75 text-[clamp(1.15rem,2.5vw,1.45rem)]">
          Tu mapa personal todavía está vacío.
        </p>
        <p className="mx-auto max-w-[420px] text-[14px] leading-[1.7] text-white/50">
          Cuando una cápsula te haga sentir algo, márcala con
          &laquo;Recordar&raquo;. Vivirá aquí, en tu memoria local de KUDOS.
        </p>
        <div className="flex flex-col items-stretch justify-center gap-3 pt-2 sm:flex-row">
          <Link
            href="/mapa"
            className="inline-flex items-center justify-center rounded-full border border-[var(--kudos-accent)]/55 bg-[var(--kudos-accent)]/10 px-5 py-2.5 text-[13px] font-medium text-[var(--kudos-accent-bright)] transition hover:bg-[var(--kudos-accent)]/20"
          >
            Explorar el atlas
          </Link>
          <Link
            href="/aqui"
            className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/[0.05] px-5 py-2.5 text-[13px] font-medium text-white/85 transition hover:border-white/30 hover:bg-white/[0.10] hover:text-white"
          >
            Empezar donde estoy
          </Link>
        </div>
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Skeleton · evita SSR mismatch · pulso sutil
// ---------------------------------------------------------------------------

function Skeleton() {
  return (
    <main
      className="relative mx-auto w-full max-w-[820px] px-4 pb-24 sm:px-6"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 88px)" }}
    >
      <div className="mb-10 grid gap-3">
        <div className="h-3 w-32 rounded bg-white/5" />
        <div className="h-8 w-2/3 rounded bg-white/5" />
      </div>
      <ul className="grid gap-4">
        {[0, 1, 2].map((i) => (
          <li
            key={i}
            className="h-32 rounded-2xl border border-white/[0.04] bg-white/[0.015]"
          />
        ))}
      </ul>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function _relativeTime(savedAt: number): string {
  const diff = Date.now() - savedAt;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "Hace un momento";
  const min = Math.floor(sec / 60);
  if (min < 60) return `Hace ${min} min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `Hace ${hr}h`;
  const days = Math.floor(hr / 24);
  if (days < 7) return `Hace ${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `Hace ${weeks}sem`;
  // Más de un mes · fecha cruda corta
  const d = new Date(savedAt);
  return d.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
}
