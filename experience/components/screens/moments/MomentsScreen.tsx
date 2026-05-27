"use client";

import * as React from "react";
import { GlassCard, PrimaryButton, Pill, Icon, type IconName, color } from "@/design-system/v2";
import { SmartImage } from "@/components/shared/SmartImage";
import { MOMENTS, type MockMoment } from "@/lib/mocks-v2/fixtures";

type Filter = "all" | "audio" | "image" | "text";
const FILTERS: ReadonlyArray<{ id: Filter; label: string; icon: IconName }> = [
  { id: "all",   label: "Todos",   icon: "moments" },
  { id: "audio", label: "Audio",   icon: "play" },
  { id: "image", label: "Imagen",  icon: "discover" },
  { id: "text",  label: "Texto",   icon: "studio" },
];

export function MomentsScreen() {
  const [filter, setFilter] = React.useState<Filter>("all");
  const visible = MOMENTS.filter((m) => filter === "all" || m.type === filter);
  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 22px 80px" }}>
      <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 22, flexWrap: "wrap" }}>
        <div>
          <div style={eyebrow()}>Momentos</div>
          <h1 style={h1()}>Captura el ahora</h1>
          <p style={lead()}>Audio, imagen o texto. Geo-anclado y privacidad granular.</p>
        </div>
        <PrimaryButton iconLeft={<Icon name="plus" size={14} />}>Grabar momento</PrimaryButton>
      </header>

      <div role="tablist" style={{ display: "flex", gap: 6, marginBottom: 18, overflowX: "auto", padding: "2px 0" }} className="kudos-no-scrollbar">
        {FILTERS.map((f) => (
          <button key={f.id} role="tab" aria-selected={filter === f.id}
            onClick={() => setFilter(f.id)}
            style={tabBtn(filter === f.id)}>
            <Icon name={f.icon} size={14} /> {f.label}
            <span style={{ fontFamily: "var(--kudos-font-mono)", fontSize: 10.5, color: color.inkLow, marginLeft: 4 }}>
              {f.id === "all" ? MOMENTS.length : MOMENTS.filter((m) => m.type === f.id).length}
            </span>
          </button>
        ))}
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        gap: 14,
      }}>
        {visible.map((m) => <MomentCard key={m.id} m={m} />)}
      </div>
    </div>
  );
}

function MomentCard({ m }: { m: MockMoment }) {
  return (
    <GlassCard interactive style={{ padding: 0, display: "flex", flexDirection: "column" }}>
      <Preview m={m} />
      <div style={{ padding: "12px 16px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <Pill tone={m.privacy === "public" ? "ok" : m.privacy === "circle" ? "accent" : "default"} size="sm">
            {m.privacy === "public" ? "Público" : m.privacy === "circle" ? "Círculo" : "Privado"}
          </Pill>
          <span style={{ fontFamily: "var(--kudos-font-mono)", fontSize: 10, color: color.inkLow, letterSpacing: "0.04em" }}>{m.when}</span>
        </div>
        <div style={{ fontFamily: "var(--kudos-font-display)", fontSize: 15, fontWeight: 600, color: color.ink, lineHeight: 1.3 }}>{m.title}</div>
        {m.body ? (
          <p style={{
            margin: "6px 0 0", color: color.inkMid, fontFamily: "var(--kudos-font-body)",
            fontSize: 12.5, lineHeight: 1.5,
            display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
          }}>{m.body}</p>
        ) : null}
        <div style={{ marginTop: 8, fontFamily: "var(--kudos-font-body)", fontSize: 11.5, color: color.inkMid }}>{m.place}</div>
      </div>
    </GlassCard>
  );
}

function Preview({ m }: { m: MockMoment }) {
  if (m.type === "audio") {
    return (
      <div style={{
        position: "relative",
        aspectRatio: "16 / 9",
        background: "linear-gradient(135deg, rgba(139,92,246,0.18), rgba(13,8,32,1))",
        display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden",
      }}>
        <WaveformVis />
        <span style={{
          position: "absolute", bottom: 10, right: 12,
          fontFamily: "var(--kudos-font-mono)", fontSize: 11, color: color.accentBright,
          padding: "3px 8px", background: "rgba(0,0,0,0.55)", borderRadius: 999,
          letterSpacing: "0.04em",
        }}>{m.duration ?? "0:00"}</span>
        <span style={{
          position: "absolute", top: 10, left: 12,
          width: 36, height: 36, borderRadius: 999,
          background: "rgba(139,92,246,0.18)", border: "1px solid rgba(139,92,246,0.45)",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          color: color.accentBright,
        }}>
          <Icon name="play" size={14} />
        </span>
      </div>
    );
  }
  if (m.type === "image" && m.image) {
    return (
      <div style={{ position: "relative", aspectRatio: "16 / 9", overflow: "hidden", background: "rgba(255,255,255,0.04)" }}>
        <SmartImage
          src={m.image}
          alt={m.title}
          fallbackSilhouette="mountain"
          gradientFrom="rgba(139,92,246,0.20)"
          gradientTo="rgba(13,8,32,1)"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        />
      </div>
    );
  }
  // text
  return (
    <div style={{
      position: "relative",
      aspectRatio: "16 / 9",
      background: "linear-gradient(135deg, rgba(139,92,246,0.12), rgba(13,8,32,1))",
      padding: 16,
      display: "flex", alignItems: "center", justifyContent: "center",
      overflow: "hidden",
    }}>
      <span style={{
        position: "absolute", top: 8, left: 12,
        fontFamily: "var(--kudos-font-mono)", fontSize: 10.5, color: color.accentBright,
        letterSpacing: "0.16em", textTransform: "uppercase",
      }}>TEXTO</span>
      <p style={{
        margin: 0,
        fontFamily: "var(--kudos-font-display)",
        fontSize: 18, fontWeight: 500,
        color: color.ink, lineHeight: 1.35,
        letterSpacing: "-0.005em",
        textAlign: "center",
        opacity: 0.9,
        display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
      }}>&ldquo;{m.body?.slice(0, 130) ?? ""}&rdquo;</p>
    </div>
  );
}

function WaveformVis() {
  const bars = React.useMemo(() => Array.from({ length: 36 }, (_, i) => 8 + Math.round(40 * Math.abs(Math.sin(i * 0.7 + 1.2)))), []);
  return (
    <div aria-hidden style={{ display: "flex", alignItems: "center", gap: 3, padding: "0 20px" }}>
      {bars.map((h, i) => (
        <span key={i} style={{
          width: 3, height: h,
          background: i < 12 ? "#a78bfa" : "rgba(167,139,250,0.32)",
          borderRadius: 2,
        }} />
      ))}
    </div>
  );
}

function eyebrow(): React.CSSProperties { return { fontFamily: "var(--kudos-font-mono)", fontSize: 11, color: color.accentBright, letterSpacing: "0.18em", textTransform: "uppercase" }; }
function h1(): React.CSSProperties { return { margin: "8px 0 0", fontFamily: "var(--kudos-font-display)", fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 600, letterSpacing: "-0.015em", color: color.ink }; }
function lead(): React.CSSProperties { return { margin: "8px 0 0", color: color.inkMid, fontFamily: "var(--kudos-font-body)", fontSize: 14, maxWidth: 580 }; }
function tabBtn(active: boolean): React.CSSProperties {
  return {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "8px 14px",
    background: active ? "rgba(139,92,246,0.16)" : "rgba(255,255,255,0.025)",
    border: `1px solid ${active ? "rgba(139,92,246,0.45)" : color.border}`,
    borderRadius: 999,
    color: active ? color.ink : color.inkMid,
    fontFamily: "var(--kudos-font-body)",
    fontSize: 12,
    fontWeight: active ? 600 : 500,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };
}
