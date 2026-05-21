/**
 * KUDOS Experience · 404 · /capsules/[slug]
 *
 * Cuando la cápsula no existe (todavía). Tono contemplativo, no SaaS-error.
 */
export default function CapsuleNotFound() {
  return (
    <main className="relative grid min-h-[100dvh] place-items-center px-6">
      <div className="max-w-[520px] text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--kudos-accent-bright)]">
          KUDOS · Capsule
        </p>
        <h1 className="mt-4 font-display text-[clamp(2rem,5vw,3rem)] font-semibold leading-[1.05] tracking-tight text-white">
          Esta capa aún no existe.
        </h1>
        <p className="mt-5 text-[15px] leading-relaxed text-white/70">
          La cápsula que buscas no está todavía en el universo KUDOS.
          Cuando AXÓN la tenga curada, su contexto aparecerá aquí.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <a
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--kudos-accent)]/55 bg-[var(--kudos-accent)] px-5 py-2.5 text-[13px] font-medium text-[var(--kudos-ink-invert)] shadow-[0_0_28px_-6px_var(--kudos-accent-glow)] transition-all duration-300 hover:shadow-[0_0_44px_-4px_var(--kudos-accent-glow)]"
          >
            Volver al Discovery
          </a>
          <a
            href="/time/rome"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.05] px-5 py-2.5 text-[13px] font-medium text-white/85 backdrop-blur-md transition-all duration-300 hover:border-white/30 hover:bg-white/[0.10]"
          >
            Ir al Time Machine
          </a>
        </div>
      </div>
    </main>
  );
}
