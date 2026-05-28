import Link from "next/link";

export default function NotFound() {
  return (
    <main
      style={{
        display: "grid",
        placeItems: "center",
        padding: "24px 20px",
        minHeight: "calc(var(--kudos-dvh, 1vh) * 80)",
      }}
    >
      <section
        aria-labelledby="kudos-not-found-title"
        style={{
          maxWidth: 480,
          width: "100%",
          textAlign: "center",
          padding: 32,
          background: "var(--kudos-glass)",
          border: "1px solid rgba(139, 92, 246, 0.32)",
          borderRadius: 22,
          boxShadow: "0 24px 48px -16px rgba(0,0,0,0.6), 0 0 32px rgba(139,92,246,0.18)",
          backdropFilter: "blur(16px) saturate(140%)",
          WebkitBackdropFilter: "blur(16px) saturate(140%)",
        }}
      >
        <div
          aria-hidden
          style={{
            margin: "0 auto 18px",
            width: 60,
            height: 60,
            borderRadius: 18,
            background: "linear-gradient(135deg, rgba(139,92,246,0.18) 0%, rgba(109,40,217,0.10) 100%)",
            border: "1px solid rgba(139,92,246,0.42)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--kudos-accent-bright)",
            fontFamily: "var(--kudos-font-mono)",
            fontSize: 18,
            letterSpacing: "0.04em",
          }}
        >
          404
        </div>
        <h1
          id="kudos-not-found-title"
          style={{
            margin: 0,
            fontFamily: "var(--kudos-font-display)",
            fontSize: 26,
            fontWeight: 600,
            color: "var(--kudos-ink)",
            letterSpacing: "-0.01em",
            lineHeight: 1.25,
          }}
        >
          Aquí no hay eco.
        </h1>
        <p style={{
          margin: "10px 0 22px",
          color: "var(--kudos-ink-mid)",
          fontFamily: "var(--kudos-font-body)",
          fontSize: 14,
          lineHeight: 1.55,
        }}>
          La ruta que buscas no existe en este mapa. Vuelve al inicio o explora un eco vivo.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
          <Link
            href="/inicio"
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "10px 16px",
              borderRadius: 999,
              background: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
              border: "1px solid #8b5cf6",
              color: "#0a0612",
              fontFamily: "var(--kudos-font-body)",
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "0.02em",
              textDecoration: "none",
              boxShadow: "0 12px 28px -12px rgba(139,92,246,0.55)",
            }}
          >
            Volver al inicio
          </Link>
          <Link
            href="/world"
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "10px 16px",
              borderRadius: 999,
              background: "transparent",
              border: "1px solid var(--kudos-border-hi)",
              color: "var(--kudos-ink)",
              fontFamily: "var(--kudos-font-body)",
              fontSize: 13,
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            Ir al mapa
          </Link>
        </div>
      </section>
    </main>
  );
}
