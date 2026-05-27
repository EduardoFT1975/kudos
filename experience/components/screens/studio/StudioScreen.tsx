"use client";

import * as React from "react";
import { GlassCard, PrimaryButton, SecondaryButton, Pill, Icon, color } from "@/design-system/v2";
import { ECHOES } from "@/lib/mocks-v2/fixtures";

type Mood = "misterioso" | "inspirador" | "personal" | "documental";
const MOODS: ReadonlyArray<{ id: Mood; label: string; tint: string }> = [
  { id: "misterioso",  label: "Misterioso",   tint: "#a78bfa" },
  { id: "inspirador",  label: "Inspirador",   tint: "#fbbf24" },
  { id: "personal",    label: "Personal",     tint: "#f472b6" },
  { id: "documental",  label: "Documental",   tint: "#60a5fa" },
];

const TEMPLATE_HOOKS = [
  "El Coliseo no es lo que crees.",
  "Bajo la piedra, otra historia.",
  "Si caminas por aquí, escuchas un eco.",
  "Antes de Roma, alguien ya estuvo.",
];

export function StudioScreen() {
  const [mood, setMood] = React.useState<Mood>("misterioso");
  const [hook, setHook] = React.useState(TEMPLATE_HOOKS[0]);
  const [narrative, setNarrative] = React.useState(
    "El anfiteatro se inauguró bajo Tito. Cien días de juegos. Lo que ves hoy son piedras · lo que pasa cada noche son los ecos."
  );
  const [twist, setTwist] = React.useState("Y aún hoy, alguien pronuncia palabras que ya se hablaban aquí.");
  const [cta, setCta] = React.useState("Encuentra el eco completo en KUDOS.");

  // mock viral score · changes with hook length and narrative quality
  const score = React.useMemo(() => {
    const lenHook = hook.length;
    const lenN = narrative.length;
    let s = 50;
    if (lenHook >= 18 && lenHook <= 60) s += 18;
    if (lenN >= 80 && lenN <= 220) s += 14;
    if (twist.length > 20) s += 8;
    if (cta.length > 0) s += 6;
    return Math.min(100, s);
  }, [hook, narrative, twist, cta]);

  const scoreTone = score >= 78 ? "ok" : score >= 55 ? "accent" : score >= 30 ? "warn" : "danger";

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "24px 22px 80px" }}>
      <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 22, flexWrap: "wrap" }}>
        <div>
          <div style={eyebrow()}>Studio</div>
          <h1 style={h1()}>Crea tu cápsula viral</h1>
          <p style={lead()}>Hook · Narrative · Twist · CTA. Score en vivo. Export multi-canal.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <SecondaryButton iconLeft={<Icon name="discover" size={14} />}>Vista previa</SecondaryButton>
          <PrimaryButton iconLeft={<Icon name="share" size={14} />}>Publicar</PrimaryButton>
        </div>
      </header>

      <div style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 1fr)",
        gap: 20,
      }}>
        <style>{`@media (max-width: 900px) { .studio-grid { grid-template-columns: 1fr !important; } }`}</style>
        <div className="studio-grid" style={{ display: "contents" }}>
          {/* LEFT · editor */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <GlassCard>
              <Label>Mood</Label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                {MOODS.map((m) => (
                  <button key={m.id} type="button" onClick={() => setMood(m.id)} style={{
                    padding: "6px 12px",
                    background: mood === m.id ? `${m.tint}1a` : "rgba(255,255,255,0.025)",
                    border: `1px solid ${mood === m.id ? m.tint : color.border}`,
                    borderRadius: 999,
                    color: mood === m.id ? color.ink : color.inkMid,
                    fontFamily: "var(--kudos-font-body)",
                    fontSize: 12,
                    fontWeight: mood === m.id ? 600 : 500,
                    cursor: "pointer",
                  }}>{m.label}</button>
                ))}
              </div>
            </GlassCard>

            <GlassCard>
              <Label>Hook</Label>
              <textarea value={hook} onChange={(e) => setHook(e.target.value)} rows={2} style={textareaStyle()} />
              <Hint>{hook.length} caracteres · sweet spot 18-60</Hint>
              <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                {TEMPLATE_HOOKS.map((t) => (
                  <button key={t} type="button" onClick={() => setHook(t)} style={chipBtn()}>{t}</button>
                ))}
              </div>
            </GlassCard>

            <GlassCard>
              <Label>Narrativa</Label>
              <textarea value={narrative} onChange={(e) => setNarrative(e.target.value)} rows={4} style={textareaStyle()} />
              <Hint>{narrative.length} caracteres · sweet spot 80-220</Hint>
            </GlassCard>

            <GlassCard>
              <Label>Twist</Label>
              <textarea value={twist} onChange={(e) => setTwist(e.target.value)} rows={2} style={textareaStyle()} />
            </GlassCard>

            <GlassCard>
              <Label>Call to action</Label>
              <textarea value={cta} onChange={(e) => setCta(e.target.value)} rows={1} style={textareaStyle()} />
            </GlassCard>
          </div>

          {/* RIGHT · preview + score */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14, position: "sticky", top: 84, alignSelf: "flex-start" }}>
            <GlassCard accent style={{ padding: 0, overflow: "hidden" }}>
              <div style={{
                padding: 20,
                background: `linear-gradient(135deg, ${MOODS.find((m) => m.id === mood)?.tint ?? "#a78bfa"}1a 0%, rgba(13,8,32,0.6) 100%)`,
              }}>
                <div style={eyebrow()}>Vista previa</div>
                <h3 style={{
                  margin: "8px 0 12px",
                  fontFamily: "var(--kudos-font-display)",
                  fontSize: 22,
                  fontWeight: 600,
                  color: color.ink,
                  letterSpacing: "-0.01em",
                  lineHeight: 1.2,
                }}>{hook || "(añade un hook)"}</h3>
                <p style={{
                  margin: 0,
                  color: color.inkMid,
                  fontFamily: "var(--kudos-font-body)",
                  fontSize: 13.5,
                  lineHeight: 1.55,
                  whiteSpace: "pre-wrap",
                }}>{narrative || "(añade la narrativa)"}</p>
                {twist ? (
                  <p style={{ margin: "12px 0 0", color: color.accentBright, fontFamily: "var(--kudos-font-display)", fontSize: 13, fontStyle: "italic" }}>{twist}</p>
                ) : null}
                {cta ? (
                  <p style={{ margin: "12px 0 0", color: color.ink, fontFamily: "var(--kudos-font-body)", fontSize: 12.5, fontWeight: 600 }}>{cta}</p>
                ) : null}
              </div>
            </GlassCard>

            <GlassCard>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <Label>Viral score</Label>
                <Pill tone={scoreTone} size="sm">
                  {score >= 78 ? "VIRAL" : score >= 55 ? "STRONG" : score >= 30 ? "GOOD" : "LOW"}
                </Pill>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 8 }}>
                <span style={{ fontFamily: "var(--kudos-font-body)", fontSize: 36, fontWeight: 700, color: color.ink, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{score}</span>
                <span style={{ fontFamily: "var(--kudos-font-mono)", fontSize: 12, color: color.inkMid }}>/100</span>
              </div>
              <div style={{ height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 999, overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  width: `${score}%`,
                  background: "linear-gradient(90deg, #8b5cf6 0%, #a78bfa 100%)",
                  transition: "width 320ms cubic-bezier(0.22, 0.61, 0.36, 1)",
                  boxShadow: "0 0 12px rgba(167,139,250,0.55)",
                }} />
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: "14px 0 0", display: "flex", flexDirection: "column", gap: 6 }}>
                {[
                  ["Hook density",   hook.length >= 18 && hook.length <= 60],
                  ["Narrative depth", narrative.length >= 80],
                  ["Twist landing",   twist.length > 20],
                  ["CTA clarity",     cta.length > 0],
                ].map(([k, ok]) => (
                  <li key={String(k)} style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--kudos-font-body)", fontSize: 12.5, color: ok ? color.ink : color.inkMid }}>
                    <span aria-hidden style={{ width: 6, height: 6, borderRadius: 999, background: ok ? "#4ade80" : "rgba(255,255,255,0.25)" }} />
                    {k}
                  </li>
                ))}
              </ul>
            </GlassCard>

            <GlassCard>
              <Label>Export</Label>
              <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                {["Instagram", "TikTok", "X", "WhatsApp", "Copy link"].map((p) => (
                  <button key={p} type="button" style={chipBtn()}>
                    <Icon name="share" size={12} /> {p}
                  </button>
                ))}
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontFamily: "var(--kudos-font-mono)", fontSize: 10.5, color: color.accentBright, letterSpacing: "0.16em", textTransform: "uppercase" }}>{children}</div>;
}
function Hint({ children }: { children: React.ReactNode }) {
  return <div style={{ marginTop: 6, fontFamily: "var(--kudos-font-mono)", fontSize: 10.5, color: color.inkLow, letterSpacing: "0.04em" }}>{children}</div>;
}
function textareaStyle(): React.CSSProperties {
  return {
    marginTop: 8,
    width: "100%",
    padding: "10px 12px",
    background: "rgba(255,255,255,0.025)",
    border: `1px solid ${color.border}`,
    borderRadius: 12,
    color: color.ink,
    fontFamily: "var(--kudos-font-body)",
    fontSize: 14,
    lineHeight: 1.5,
    outline: "none",
    resize: "vertical",
  };
}
function chipBtn(): React.CSSProperties {
  return {
    display: "inline-flex", alignItems: "center", gap: 4,
    padding: "5px 10px",
    background: "rgba(255,255,255,0.025)",
    border: `1px solid ${color.border}`,
    borderRadius: 999,
    color: color.inkMid,
    fontFamily: "var(--kudos-font-body)",
    fontSize: 11,
    cursor: "pointer",
  };
}
function eyebrow(): React.CSSProperties { return { fontFamily: "var(--kudos-font-mono)", fontSize: 11, color: color.accentBright, letterSpacing: "0.18em", textTransform: "uppercase" }; }
function h1(): React.CSSProperties { return { margin: "8px 0 0", fontFamily: "var(--kudos-font-display)", fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 600, letterSpacing: "-0.015em", color: color.ink }; }
function lead(): React.CSSProperties { return { margin: "8px 0 0", color: color.inkMid, fontFamily: "var(--kudos-font-body)", fontSize: 14, maxWidth: 580 }; }
