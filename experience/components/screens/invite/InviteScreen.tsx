"use client";

import * as React from "react";
import { GlassCard, PrimaryButton, SecondaryButton, Pill, Icon, color } from "@/design-system/v2";

const SHARE_TARGETS = ["WhatsApp", "Email", "Instagram", "X", "Copiar link"];

export function InviteScreen() {
  const [copied, setCopied] = React.useState(false);
  const link = "https://kudos.app/i/eduardo-x9k";
  const onCopy = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(link).then(() => setCopied(true)).catch(() => undefined);
      window.setTimeout(() => setCopied(false), 1800);
    }
  };
  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "24px 22px 80px" }}>
      <header style={{ marginBottom: 22 }}>
        <div style={{ fontFamily: "var(--kudos-font-mono)", fontSize: 11, color: color.accentBright, letterSpacing: "0.18em", textTransform: "uppercase" }}>Invitar amigos</div>
        <h1 style={{ margin: "8px 0 0", fontFamily: "var(--kudos-font-display)", fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 600, letterSpacing: "-0.015em", color: color.ink }}>Más personas, más capas</h1>
        <p style={{ margin: "8px 0 0", color: color.inkMid, fontFamily: "var(--kudos-font-body)", fontSize: 14, maxWidth: 540 }}>
          Cada persona que invitas trae sus propios ecos. KUDOS crece cuando crece el círculo.
        </p>
      </header>

      <GlassCard accent style={{ padding: 28, marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <div aria-hidden style={{
            width: 56, height: 56, borderRadius: 16,
            background: "linear-gradient(135deg, rgba(139,92,246,0.32) 0%, rgba(109,40,217,0.18) 100%)",
            border: "1px solid rgba(139,92,246,0.55)",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            color: color.accentBright,
          }}><Icon name="gift" size={26} /></div>
          <div>
            <div style={{ fontFamily: "var(--kudos-font-display)", fontSize: 17, fontWeight: 600, color: color.ink }}>Tu enlace personal</div>
            <div style={{ fontFamily: "var(--kudos-font-body)", fontSize: 12.5, color: color.inkMid, marginTop: 2 }}>Comparte y recibe un eco regalo al primer ingreso.</div>
          </div>
        </div>
        <div style={{
          marginTop: 18,
          padding: "10px 14px",
          background: "rgba(255,255,255,0.04)",
          border: `1px solid ${color.border}`,
          borderRadius: 12,
          display: "flex", alignItems: "center", gap: 10, justifyContent: "space-between",
        }}>
          <code style={{
            fontFamily: "var(--kudos-font-mono)",
            fontSize: 12.5,
            color: color.ink,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            flex: 1, minWidth: 0,
          }}>{link}</code>
          <PrimaryButton size="sm" onClick={onCopy}>
            {copied ? "Copiado" : "Copiar"}
          </PrimaryButton>
        </div>
        <div style={{ marginTop: 14, display: "flex", gap: 6, flexWrap: "wrap" }}>
          {SHARE_TARGETS.map((s) => (
            <SecondaryButton key={s} size="sm" iconLeft={<Icon name="share" size={12} />}>{s}</SecondaryButton>
          ))}
        </div>
      </GlassCard>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
        {[
          ["12",  "Enviadas",  "default"],
          ["7",   "Aceptadas", "accent"],
          ["58%", "Conversión", "ok"],
        ].map(([v, l, t]) => (
          <GlassCard key={String(l)} style={{ padding: 16 }}>
            <div style={{ fontFamily: "var(--kudos-font-body)", fontSize: 24, fontWeight: 700, color: color.ink, fontVariantNumeric: "tabular-nums" }}>{v}</div>
            <div style={{ fontFamily: "var(--kudos-font-mono)", fontSize: 10.5, color: color.inkMid, letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 4 }}>{l}</div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
