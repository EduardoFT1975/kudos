/**
 * KUDOS Experience · global loading
 *
 * Tres pulsos respirando · paleta v2.
 */
export default function Loading() {
  return (
    <main
      aria-busy="true"
      style={{
        minHeight: "calc(var(--kudos-dvh, 1vh) * 80)",
        display: "grid",
        placeItems: "center",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
        <div aria-hidden style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              style={{
                display: "block",
                width: 10,
                height: 10,
                borderRadius: 999,
                background: "var(--kudos-accent-bright)",
                animation: "kudos-breathe 1.4s ease-in-out infinite",
                animationDelay: `${i * 0.18}s`,
                opacity: 0.55,
                boxShadow: "0 0 12px var(--kudos-accent-glow)",
              }}
            />
          ))}
        </div>
        <p style={{
          margin: 0,
          fontFamily: "var(--kudos-font-mono)",
          fontSize: 11,
          fontWeight: 500,
          color: "var(--kudos-accent-bright)",
          letterSpacing: "0.28em",
          textTransform: "uppercase",
        }}>
          KUDOS · cargando
        </p>
      </div>
    </main>
  );
}
