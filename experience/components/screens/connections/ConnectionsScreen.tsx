"use client";

import * as React from "react";
import { GlassCard, PrimaryButton, SecondaryButton, Pill, color } from "@/design-system/v2";
import { PEOPLE } from "@/lib/mocks-v2/fixtures";

type Tab = "following" | "followers" | "recommended";
const TABS: ReadonlyArray<{ id: Tab; label: string }> = [
  { id: "following",   label: "Siguiendo" },
  { id: "followers",   label: "Seguidores" },
  { id: "recommended", label: "Recomendados" },
];

export function ConnectionsScreen() {
  const [tab, setTab] = React.useState<Tab>("following");
  const visible = React.useMemo(() => {
    if (tab === "following") return PEOPLE.filter((p) => p.following);
    if (tab === "followers") return PEOPLE.slice(0, 5);
    return PEOPLE.filter((p) => !!p.reason);
  }, [tab]);

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "24px 22px 80px" }}>
      <header style={{ marginBottom: 22 }}>
        <div style={eyebrow()}>Conexiones</div>
        <h1 style={h1()}>Tu red KUDOS</h1>
        <p style={lead()}>Personas que comparten tu mundo · ecosistemas cercanos · curadores afines.</p>
      </header>

      <div role="tablist" style={{
        display: "inline-flex", gap: 4, padding: 4,
        background: "rgba(255,255,255,0.025)",
        border: `1px solid ${color.border}`,
        borderRadius: 999, marginBottom: 18,
      }}>
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: "8px 16px",
              background: tab === t.id ? color.accent : "transparent",
              color: tab === t.id ? "#0a0612" : color.inkMid,
              border: "none",
              borderRadius: 999,
              fontFamily: "var(--kudos-font-body)",
              fontSize: 12.5,
              fontWeight: tab === t.id ? 600 : 500,
              cursor: "pointer",
            }}>{t.label}</button>
        ))}
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: 12,
      }}>
        {visible.map((p) => (
          <GlassCard key={p.id} style={{ padding: 16, display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div aria-hidden style={{
              width: 48, height: 48, borderRadius: 999,
              background: `linear-gradient(135deg, ${p.avatarFrom} 0%, ${p.avatarTo} 100%)`,
              flexShrink: 0,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              color: "#0a0612", fontWeight: 700, fontSize: 16,
              fontFamily: "var(--kudos-font-body)",
            }}>{p.name.charAt(0)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "var(--kudos-font-body)", fontSize: 14, fontWeight: 600, color: color.ink }}>{p.name}</div>
              <div style={{ fontFamily: "var(--kudos-font-mono)", fontSize: 11, color: color.inkMid, marginTop: 2 }}>{p.handle} · {p.location}</div>
              <p style={{ margin: "6px 0 8px", color: color.inkMid, fontFamily: "var(--kudos-font-body)", fontSize: 12.5, lineHeight: 1.45 }}>{p.bio}</p>
              {p.reason && tab === "recommended" ? (
                <div style={{ fontFamily: "var(--kudos-font-mono)", fontSize: 10.5, color: color.accentBright, letterSpacing: "0.06em", marginBottom: 8 }}>{p.reason}</div>
              ) : null}
              <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontFamily: "var(--kudos-font-mono)", fontSize: 11, color: color.inkMid, fontVariantNumeric: "tabular-nums" }}>{p.echoesCount} ecos · {p.followersCount.toLocaleString()} seguidores</span>
              </div>
              <div style={{ marginTop: 10 }}>
                {p.following
                  ? <SecondaryButton size="sm">Siguiendo</SecondaryButton>
                  : <PrimaryButton size="sm">Seguir</PrimaryButton>}
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

function eyebrow(): React.CSSProperties { return { fontFamily: "var(--kudos-font-mono)", fontSize: 11, color: color.accentBright, letterSpacing: "0.18em", textTransform: "uppercase" }; }
function h1(): React.CSSProperties { return { margin: "8px 0 0", fontFamily: "var(--kudos-font-display)", fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 600, letterSpacing: "-0.015em", color: color.ink }; }
function lead(): React.CSSProperties { return { margin: "8px 0 0", color: color.inkMid, fontFamily: "var(--kudos-font-body)", fontSize: 14, maxWidth: 580 }; }
