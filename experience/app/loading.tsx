/**
 * KUDOS Experience · loading global (RSC).
 *
 * Tres pulsos respirando alineados a la paleta nueva. Silencioso, ambient,
 * sin sensación SaaS. Sustituible por <CinematicLoader/> de motion/loaders/
 * cuando exista.
 */
export default function Loading() {
  return (
    <main
      aria-busy="true"
      className="relative grid min-h-[100dvh] place-items-center"
    >
      <div className="flex flex-col items-center gap-5">
        <div className="flex items-center gap-2.5" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="block size-2.5 rounded-full bg-[var(--kudos-accent)]"
              style={{
                animation: "kudos-breathe 1.4s ease-in-out infinite",
                animationDelay: `${i * 0.18}s`,
                opacity: 0.4,
                filter: "drop-shadow(0 0 8px var(--kudos-accent-glow))",
              }}
            />
          ))}
        </div>
        <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-[var(--kudos-accent-bright)] font-mono">
          KUDOS · sintonizando con AXÓN
        </p>
      </div>
      <style>{`
        @keyframes kudos-breathe {
          0%, 100% { opacity: 0.3; transform: scale(0.85); }
          50%      { opacity: 1;   transform: scale(1.18); }
        }
        @media (prefers-reduced-motion: reduce) {
          [class*="rounded-full"] { animation: none !important; opacity: 0.7 !important; }
        }
      `}</style>
    </main>
  );
}
