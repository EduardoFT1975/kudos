"use client";

import * as React from "react";
import { GlassCard, PrimaryButton, SecondaryButton, SectionHeader, SearchBar, StatTile, Pill, Icon, color } from "@/design-system/v2";

export function DesignSystemScreen() {
  return (
    <div style={{ padding: "32px 22px 48px", maxWidth: 1100, margin: "0 auto" }}>
      <header style={{ marginBottom: 28 }}>
        <div style={{
          fontFamily: "var(--kudos-font-mono)",
          fontSize: 11.5,
          letterSpacing: "0.16em",
          color: color.accentBright,
          textTransform: "uppercase",
        }}>KUDOS · v2</div>
        <h1 style={{
          margin: "8px 0 0",
          fontFamily: "var(--kudos-font-display)",
          fontSize: 32,
          fontWeight: 600,
          color: color.ink,
          letterSpacing: "-0.015em",
        }}>Design System</h1>
        <p style={{ margin: "8px 0 0", color: color.inkMid, fontFamily: "var(--kudos-font-body)" }}>
          Referencia de tokens y componentes · útil durante rebuild · oculta en producción.
        </p>
      </header>

      {/* Colors */}
      <section style={{ marginBottom: 32 }}>
        <SectionHeader title="Color" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
          {[
            ["bg",          "#0a0612"],
            ["surface",     "#0d0820"],
            ["accent",      "#8b5cf6"],
            ["accent br.",  "#a78bfa"],
            ["accent deep", "#6d28d9"],
            ["ink",         "#f7f6fb"],
            ["danger",      "#f87171"],
            ["ok",          "#4ade80"],
          ].map(([n, c]) => (
            <div key={n} style={{
              padding: 12,
              background: "var(--kudos-glass)",
              border: "1px solid var(--kudos-border)",
              borderRadius: 14,
            }}>
              <div style={{ height: 56, borderRadius: 10, background: c, border: "1px solid var(--kudos-border)" }} />
              <div style={{ marginTop: 8, fontFamily: "var(--kudos-font-mono)", fontSize: 11, color: color.inkMid }}>{c}</div>
              <div style={{ fontSize: 12.5, color: color.ink, marginTop: 2 }}>{n}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Typography */}
      <section style={{ marginBottom: 32 }}>
        <SectionHeader title="Typography" />
        <GlassCard>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontFamily: "var(--kudos-font-display)", fontSize: 36, fontWeight: 600, letterSpacing: "-0.02em" }}>Display · Fraunces</div>
            <div style={{ fontFamily: "var(--kudos-font-display)", fontSize: 22, fontWeight: 600 }}>Display M · headline</div>
            <div style={{ fontFamily: "var(--kudos-font-body)", fontSize: 14.5 }}>Body · Inter · texto continuo y UI labels.</div>
            <div style={{ fontFamily: "var(--kudos-font-mono)", fontSize: 12, color: color.inkMid, letterSpacing: "0.06em" }}>MONO · JETBRAINS · tabular nums 12 345</div>
          </div>
        </GlassCard>
      </section>

      {/* Buttons */}
      <section style={{ marginBottom: 32 }}>
        <SectionHeader title="Buttons" />
        <GlassCard>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <PrimaryButton size="sm">Pequeño</PrimaryButton>
            <PrimaryButton>Primario</PrimaryButton>
            <PrimaryButton size="lg" iconRight={<Icon name="arrow-right" size={14} />}>Grande</PrimaryButton>
            <SecondaryButton iconLeft={<Icon name="play" size={14} />}>Secundario</SecondaryButton>
            <SecondaryButton>Pequeño</SecondaryButton>
          </div>
        </GlassCard>
      </section>

      {/* Pills */}
      <section style={{ marginBottom: 32 }}>
        <SectionHeader title="Pills" />
        <GlassCard>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Pill>Histórica</Pill>
            <Pill tone="accent">Cultural</Pill>
            <Pill tone="warn">Inspiradora</Pill>
            <Pill tone="danger">Crítica</Pill>
            <Pill tone="ok">Verde</Pill>
          </div>
        </GlassCard>
      </section>

      {/* Stats */}
      <section style={{ marginBottom: 32 }}>
        <SectionHeader title="Stat Tile" />
        <GlassCard>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
            <StatTile value="24.5K" label="Ecos creados" icon={<Icon name="place" size={16} />} />
            <StatTile value="128"   label="Países"      icon={<Icon name="globe" size={16} />} />
            <StatTile value="15.8K" label="Usuarios"    icon={<Icon name="people" size={16} />} />
            <StatTile value="2.4M"  label="Historias"   icon={<Icon name="share" size={16} />} />
          </div>
        </GlassCard>
      </section>

      {/* Search */}
      <section style={{ marginBottom: 32 }}>
        <SectionHeader title="Search Bar" />
        <GlassCard>
          <SearchBar />
        </GlassCard>
      </section>

      {/* Glass cards */}
      <section style={{ marginBottom: 32 }}>
        <SectionHeader title="Cards" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <GlassCard>
            <div style={{ fontFamily: "var(--kudos-font-body)", fontWeight: 600 }}>Default</div>
            <div style={{ color: color.inkMid, fontSize: 12.5, marginTop: 4 }}>Sin acento</div>
          </GlassCard>
          <GlassCard accent>
            <div style={{ fontFamily: "var(--kudos-font-body)", fontWeight: 600 }}>Accent</div>
            <div style={{ color: color.inkMid, fontSize: 12.5, marginTop: 4 }}>Borde violeta</div>
          </GlassCard>
          <GlassCard interactive>
            <div style={{ fontFamily: "var(--kudos-font-body)", fontWeight: 600 }}>Interactive</div>
            <div style={{ color: color.inkMid, fontSize: 12.5, marginTop: 4 }}>Hover lift</div>
          </GlassCard>
        </div>
      </section>

      {/* Icons */}
      <section>
        <SectionHeader title="Icons" />
        <GlassCard>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))", gap: 10 }}>
            {(["home","map","here","discover","timeline","moments","studio","memories","connections","saved","mind","bell","gift","settings","search","place","history","people","event","culture","nature","heart","share","plus","play","founder","ai","globe"] as const).map((n) => (
              <div key={n} style={{
                padding: "10px 6px",
                background: "rgba(255,255,255,0.02)",
                border: "1px solid var(--kudos-border)",
                borderRadius: 10,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                color: color.inkMid,
              }}>
                <Icon name={n} size={22} />
                <div style={{ fontFamily: "var(--kudos-font-mono)", fontSize: 10, color: color.inkLow }}>{n}</div>
              </div>
            ))}
          </div>
        </GlassCard>
      </section>
    </div>
  );
}
