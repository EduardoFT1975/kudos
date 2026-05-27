"use client";

import * as React from "react";
import Link from "next/link";
import { GlassCard, PrimaryButton, Pill, color } from "@/design-system/v2";
import { Silhouette } from "@/components/shared/Silhouette";
import { ECHOES } from "@/lib/mocks-v2/fixtures";

const ERAS = [
  { id: "imperial",    label: "Imperial",     years: "27 a.C. - 476 d.C.", from: "#7c2d12", to: "#1c1917", body: "El imperio se levanta sobre piedra y sangre. El Coliseo se inaugura · Roma se vuelve modelo." },
  { id: "medieval",    label: "Medieval",     years: "500 - 1400",          from: "#581c87", to: "#0a0612", body: "Roma se duerme · solo el papado la mantiene viva. El Foro se cubre de pasto." },
  { id: "renacimiento", label: "Renacimiento", years: "1400 - 1700",        from: "#92400e", to: "#1c1917", body: "Miguel Ángel, Bernini, Caravaggio. Roma se reescribe en cúpulas y plazas." },
  { id: "moderna",     label: "Moderna",       years: "1700 - 2000",        from: "#1e3a8a", to: "#0a0612", body: "Capital de Italia unificada · luego dictadura, reconstrucción, Federico Fellini." },
  { id: "hoy",         label: "Hoy",            years: "Presente",            from: "#6d28d9", to: "#0a0612", body: "Capa digital sobre 27 siglos · KUDOS lee lo que el turismo no ve." },
];

export function TimeRomeScreen() {
  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "24px 22px 80px" }}>
      <header style={{ marginBottom: 22 }}>
        <div style={{ fontFamily: "var(--kudos-font-mono)", fontSize: 11, color: color.accentBright, letterSpacing: "0.18em", textTransform: "uppercase" }}>Time Machine · Roma</div>
        <h1 style={{ margin: "8px 0 0", fontFamily: "var(--kudos-font-display)", fontSize: "clamp(28px, 4.4vw, 40px)", fontWeight: 600, letterSpacing: "-0.015em", color: color.ink }}>27 siglos en una sola ciudad</h1>
        <p style={{ margin: "8px 0 0", color: color.inkMid, fontFamily: "var(--kudos-font-body)", fontSize: 14, maxWidth: 600 }}>
          Desliza por las eras de Roma · atmósfera, luz y color cambian con cada siglo.
        </p>
      </header>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {ERAS.map((era) => (
          <GlassCard key={era.id} accent padded={false} style={{
            overflow: "hidden",
            background: `linear-gradient(135deg, ${era.from} 0%, ${era.to} 100%)`,
            borderColor: "rgba(139,92,246,0.32)",
          }}>
            <div style={{ position: "relative", padding: 24, minHeight: 180 }}>
              <Silhouette kind="colosseum" opacity={0.18} />
              <div aria-hidden style={{ position: "absolute", inset: 0, background: "radial-gradient(80% 100% at 100% 100%, rgba(10,6,18,0) 30%, rgba(10,6,18,0.65) 100%)" }} />
              <div style={{ position: "relative" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <Pill tone="accent" size="sm">{era.label}</Pill>
                  <span style={{ fontFamily: "var(--kudos-font-mono)", fontSize: 10.5, color: color.inkMid, letterSpacing: "0.12em" }}>{era.years}</span>
                </div>
                <p style={{ margin: 0, color: color.ink, fontFamily: "var(--kudos-font-display)", fontSize: "clamp(16px, 2.4vw, 19px)", lineHeight: 1.45, maxWidth: 620, letterSpacing: "-0.005em" }}>{era.body}</p>
              </div>
            </div>
          </GlassCard>
        ))}

        <GlassCard>
          <div style={{ fontFamily: "var(--kudos-font-mono)", fontSize: 11, color: color.accentBright, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 8 }}>Cápsulas romanas</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
            {ECHOES.filter((e) => e.placeId === "rome").map((e) => (
              <Link key={e.id} href={`/echo/${e.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                <GlassCard interactive padded={false}>
                  <div style={{ position: "relative", aspectRatio: "16/10", background: `linear-gradient(180deg, ${e.gradientFrom}, ${e.gradientTo})`, overflow: "hidden" }}>
                    <Silhouette kind={e.silhouette} opacity={0.55} />
                    <div aria-hidden style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(10,6,18,0) 55%, rgba(10,6,18,0.85) 100%)" }} />
                    <div style={{ position: "absolute", bottom: 10, left: 12 }}>
                      <Pill tone={e.tone} size="sm">{e.year}</Pill>
                    </div>
                  </div>
                  <div style={{ padding: "10px 12px 12px" }}>
                    <div style={{ fontFamily: "var(--kudos-font-display)", fontSize: 14, fontWeight: 600, color: color.ink }}>{e.title}</div>
                  </div>
                </GlassCard>
              </Link>
            ))}
          </div>
          <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
            <PrimaryButton as="link" href="/mapa" size="sm">Abrir en mapa</PrimaryButton>
            <PrimaryButton as="link" href="/studio" size="sm">Crear cápsula romana</PrimaryButton>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
