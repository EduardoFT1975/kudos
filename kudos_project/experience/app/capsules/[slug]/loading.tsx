/**
 * KUDOS Experience · loading · /capsules/[slug]
 *
 * Silueta tenue + label "preparando memoria contextual". Sin spinners.
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
          className="relative h-16 w-32 rounded-full border border-white/12"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(167,139,250,0.18) 0%, transparent 70%)",
          }}
        >
          <span
            className="absolute inset-2 rounded-full border border-[var(--kudos-accent)]/35"
            style={{ animation: "kudos-cap-pulse 2.6s ease-in-out infinite" }}
          />
          <span
            className="absolute inset-5 rounded-full bg-[var(--kudos-accent)]/65"
            style={{
              boxShadow: "0 0 20px var(--kudos-accent-glow)",
              animation: "kudos-cap-core 1.6s ease-in-out infinite alternate",
            }}
          />
        </div>
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--kudos-accent-bright)]">
          Preparando memoria contextual
        </p>
      </div>
      <style>{`
        @keyframes kudos-cap-pulse {
          0%, 100% { opacity: 0.25; transform: scale(0.94); }
          50%      { opacity: 0.9;  transform: scale(1.04); }
        }
        @keyframes kudos-cap-core {
          0%   { opacity: 0.7; transform: scale(0.92); }
          100% { opacity: 1;   transform: scale(1.06); }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="kudos-cap"] { animation: none !important; opacity: 0.75 !important; }
        }
      `}</style>
    </main>
  );
}
