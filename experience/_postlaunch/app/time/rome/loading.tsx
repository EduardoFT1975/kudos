/**
 * KUDOS Experience · loading · /time/rome
 *
 * Loader silencioso · sintonizando capas temporales. Sin texto largo,
 * sin spinners genéricos.
 */
export default function Loading() {
  return (
    <main
      aria-busy="true"
      className="relative grid min-h-[100dvh] place-items-center"
    >
      <div className="flex flex-col items-center gap-6">
        <div
          aria-hidden
          className="relative size-24 rounded-full border border-white/10"
        >
          <span
            className="absolute inset-2 rounded-full border border-[var(--kudos-accent)]/40"
            style={{ animation: "kudos-tm-pulse 2.6s ease-in-out infinite" }}
          />
          <span
            className="absolute inset-5 rounded-full border border-[var(--kudos-accent)]/70"
            style={{ animation: "kudos-tm-pulse 2.6s ease-in-out infinite", animationDelay: "0.4s" }}
          />
          <span
            className="absolute inset-9 rounded-full bg-[var(--kudos-accent)]"
            style={{
              boxShadow: "0 0 20px var(--kudos-accent-glow)",
              animation: "kudos-tm-core 1.6s ease-in-out infinite alternate",
            }}
          />
        </div>
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--kudos-accent-bright)]">
          Sintonizando capas temporales
        </p>
      </div>
      <style>{`
        @keyframes kudos-tm-pulse {
          0%, 100% { opacity: 0.25; transform: scale(0.94); }
          50%      { opacity: 0.9;  transform: scale(1.06); }
        }
        @keyframes kudos-tm-core {
          0%   { opacity: 0.7; transform: scale(0.9); }
          100% { opacity: 1;   transform: scale(1.1); }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="kudos-tm"] { animation: none !important; opacity: 0.75 !important; }
        }
      `}</style>
    </main>
  );
}
