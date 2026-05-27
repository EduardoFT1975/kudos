"use client";

import * as React from "react";
import { GlassCard, Pill, Icon, color } from "@/design-system/v2";
import { MOMENTS } from "@/lib/mocks-v2/fixtures";

const STATS = [
  { value: "24",  label: "Ecos creados" },
  { value: "56",  label: "Guardados" },
  { value: "128", label: "Conexiones" },
  { value: "9",   label: "Momentos" },
];

export function MemoriesScreen() {
  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "24px 22px 80px" }}>
      <header style={{ marginBottom: 22 }}>
        <div style={{ fontFamily: "var(--kudos-font-mono)", fontSize: 11, color: color.accentBright, letterSpacing: "0.18em", textTransform: "uppercase" }}>Mis memorias</div>
        <h1 style={{ margin: "8px 0 0", fontFamily: "var(--kudos-font-display)", fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 600, letterSpacing: "-0.015em", color: color.ink }}>Tu archivo</h1>
        <p style={{ margin: "8px 0 0", color: color.inkMid, fontFamily: "var(--kudos-font-body)", fontSize: 14, maxWidth: 580 }}>Todo lo que has grabado, guardado y conectado · agrupado por momento.</p>
      </header>

      {/* Stats row */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        gap: 10,
        marginBottom: 22,
      }}>
        {STATS.map((s) => (
          <GlassCard key={s.label} style={{ padding: 14, textAlign: "center" }}>
            <div style={{ fontFamily: "var(--kudos-font-body)", fontSize: 22, fontWeight: 600, color: color.ink, fontVariantNumeric: "tabular-nums" }}>{s.value}</div>
            <div style={{ fontFamily: "var(--kudos-font-mono)", fontSize: 10.5, color: color.inkMid, letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 4 }}>{s.label}</div>
          </GlassCard>
        ))}
      </div>

      {/* Timeline grouped by date */}
      <Group title="Esta semana">
        {MOMENTS.slice(0, 3).map((m) => <MemoryRow key={m.id} m={m} />)}
      </Group>
      <Group title="Este mes">
        {MOMENTS.slice(3, 6).map((m) => <MemoryRow key={m.id} m={m} />)}
      </Group>
      <Group title="Antes">
        {MOMENTS.slice(6).map((m) => <MemoryRow key={m.id} m={m} />)}
      </Group>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2 style={{
        margin: "0 0 12px",
        fontFamily: "var(--kudos-font-mono)",
        fontSize: 11,
        color: color.inkMid,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
      }}>{title}</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{children}</div>
    </section>
  );
}

function MemoryRow({ m }: { m: (typeof MOMENTS)[number] }) {
  const iconName = m.type === "audio" ? "play" : m.type === "image" ? "discover" : "studio";
  return (
    <GlassCard interactive style={{ padding: 14, display: "flex", alignItems: "center", gap: 14 }}>
      <div aria-hidden style={{
        width: 44, height: 44, borderRadius: 12,
        background: "rgba(139,92,246,0.10)",
        border: "1px solid rgba(139,92,246,0.28)",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        color: color.accentBright, flexShrink: 0,
      }}>
        <Icon name={iconName} size={18} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
          <Pill tone={m.privacy === "public" ? "ok" : m.privacy === "circle" ? "accent" : "default"} size="sm">
            {m.privacy === "public" ? "Público" : m.privacy === "circle" ? "Círculo" : "Privado"}
          </Pill>
          <span style={{ fontFamily: "var(--kudos-font-mono)", fontSize: 10.5, color: color.inkLow }}>{m.when}</span>
        </div>
        <div style={{ fontFamily: "var(--kudos-font-display)", fontSize: 14.5, fontWeight: 600, color: color.ink }}>{m.title}</div>
        <div style={{ fontFamily: "var(--kudos-font-body)", fontSize: 11.5, color: color.inkMid, marginTop: 2 }}>{m.place}</div>
      </div>
      <Icon name="chevron-right" size={16} />
    </GlassCard>
  );
}
