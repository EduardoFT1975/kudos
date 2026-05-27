"use client";

import * as React from "react";
import { GlassCard, Pill, SecondaryButton, Icon, type IconName, color } from "@/design-system/v2";

type SectionId = "cuenta" | "privacidad" | "notificaciones" | "founder" | "datos";
const SECTIONS: ReadonlyArray<{ id: SectionId; label: string; icon: IconName }> = [
  { id: "cuenta",         label: "Cuenta",          icon: "people" },
  { id: "privacidad",     label: "Privacidad",      icon: "saved" },
  { id: "notificaciones", label: "Notificaciones",  icon: "bell" },
  { id: "founder",        label: "Modo Fundador",   icon: "founder" },
  { id: "datos",          label: "Datos",           icon: "studio" },
];

export function SettingsScreen() {
  const [section, setSection] = React.useState<SectionId>("cuenta");
  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: "24px 22px 80px" }}>
      <header style={{ marginBottom: 22 }}>
        <div style={eyebrow()}>Ajustes</div>
        <h1 style={h1()}>Tu cuenta</h1>
        <p style={lead()}>Perfil, privacidad, notificaciones, modo fundador y exportaciones.</p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "240px minmax(0, 1fr)", gap: 20 }}>
        <style>{`@media (max-width: 768px) { .settings-grid { grid-template-columns: 1fr !important; } .settings-side { display: flex !important; overflow-x: auto !important; gap: 6px !important; } }`}</style>
        <div className="settings-grid" style={{ display: "contents" }}>
          {/* Side nav */}
          <aside className="settings-side" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {SECTIONS.map((s) => (
              <button key={s.id} type="button" onClick={() => setSection(s.id)} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px",
                background: section === s.id ? "rgba(139,92,246,0.12)" : "transparent",
                border: `1px solid ${section === s.id ? "rgba(139,92,246,0.32)" : "transparent"}`,
                borderRadius: 12,
                color: section === s.id ? color.ink : color.inkMid,
                fontFamily: "var(--kudos-font-body)",
                fontSize: 13.5,
                fontWeight: section === s.id ? 600 : 500,
                cursor: "pointer",
                textAlign: "left",
                whiteSpace: "nowrap",
              }}>
                <Icon name={s.icon} size={16} /> {s.label}
              </button>
            ))}
          </aside>

          {/* Content */}
          <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 14 }}>
            {section === "cuenta" ? <AccountSection /> : null}
            {section === "privacidad" ? <PrivacySection /> : null}
            {section === "notificaciones" ? <NotifSection /> : null}
            {section === "founder" ? <FounderSection /> : null}
            {section === "datos" ? <DataSection /> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function AccountSection() {
  return (
    <>
      <GlassCard>
        <SectionTitle>Perfil</SectionTitle>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 12 }}>
          <div aria-hidden style={{
            width: 64, height: 64, borderRadius: 999,
            background: "linear-gradient(135deg, #a78bfa 0%, #6d28d9 100%)",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            color: "#0a0612", fontWeight: 700, fontSize: 22,
          }}>E</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "var(--kudos-font-body)", fontSize: 15, fontWeight: 600, color: color.ink }}>Eduardo</div>
            <div style={{ fontFamily: "var(--kudos-font-mono)", fontSize: 12, color: color.inkMid, marginTop: 2 }}>efertrobo@gmail.com</div>
          </div>
          <SecondaryButton size="sm">Editar</SecondaryButton>
        </div>
      </GlassCard>
      <GlassCard>
        <SectionTitle>Información</SectionTitle>
        <InfoRow label="Nombre" value="Eduardo" />
        <InfoRow label="Usuario" value="@eduardo" />
        <InfoRow label="Email" value="efertrobo@gmail.com" />
        <InfoRow label="País" value="España" />
        <InfoRow label="Idioma" value="Español" />
      </GlassCard>
    </>
  );
}

function PrivacySection() {
  return (
    <GlassCard>
      <SectionTitle>Privacidad por defecto</SectionTitle>
      <ToggleRow label="Perfil público" desc="Cualquiera puede ver tus ecos públicos." initial={true} />
      <ToggleRow label="Mostrar ubicación" desc="Permitir que tus ecos muestren coordenadas aproximadas." initial={true} />
      <ToggleRow label="Mostrar conexiones" desc="Tu lista de seguidores y siguiendo es visible." initial={false} />
      <ToggleRow label="Permitir mensajes" desc="Otros usuarios pueden iniciar conversación contigo." initial={true} />
    </GlassCard>
  );
}

function NotifSection() {
  return (
    <GlassCard>
      <SectionTitle>Notificaciones por categoría</SectionTitle>
      {[
        ["Ecos cercanos",           "Cuando un eco aparece cerca de ti.",         true],
        ["Actividad de creador",    "Cuando tu cápsula se mueve o cruza hitos.",   true],
        ["Lugares despiertan",      "Cuando un lugar guardado abre una capa.",     true],
        ["Eventos temporales",       "Cuando una era despierta en el mapa.",        true],
        ["Mérito y niveles",          "Cuando subes en tu nivel KUDOS.",              true],
        ["Resonancia social",         "Cuando tu share se propaga.",                  false],
        ["Sistema",                    "Avisos críticos · siempre recomendado.",      true],
      ].map(([l, d, init]) => (
        <ToggleRow key={String(l)} label={String(l)} desc={String(d)} initial={Boolean(init)} />
      ))}
    </GlassCard>
  );
}

function FounderSection() {
  return (
    <>
      <GlassCard accent>
        <SectionTitle>Modo Fundador</SectionTitle>
        <p style={{ margin: "10px 0 0", color: color.inkMid, fontFamily: "var(--kudos-font-body)", fontSize: 13, lineHeight: 1.6 }}>
          Activa el modo fundador para acceder a herramientas internas: launch panel, hardening audits, mobile diagnostics y simulación de errores.
        </p>
        <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Pill tone="accent">founder</Pill>
          <Pill tone="default">beta</Pill>
          <Pill tone="default">public</Pill>
        </div>
        <div style={{ marginTop: 14 }}>
          <SecondaryButton size="sm" iconLeft={<Icon name="founder" size={14} />}>Activar Modo Fundador</SecondaryButton>
        </div>
      </GlassCard>
    </>
  );
}

function DataSection() {
  return (
    <GlassCard>
      <SectionTitle>Tus datos</SectionTitle>
      <p style={{ margin: "10px 0 14px", color: color.inkMid, fontFamily: "var(--kudos-font-body)", fontSize: 13, lineHeight: 1.6 }}>
        Exporta todo tu archivo personal o borra tu cuenta de forma permanente. Las exportaciones llegan en menos de 24 horas.
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <SecondaryButton size="sm">Exportar mis datos</SecondaryButton>
        <SecondaryButton size="sm" style={{ borderColor: "rgba(248,113,113,0.45)", color: "#f87171" }}>Borrar cuenta</SecondaryButton>
      </div>
    </GlassCard>
  );
}

function ToggleRow({ label, desc, initial }: { label: string; desc: string; initial: boolean }) {
  const [on, setOn] = React.useState(initial);
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "12px 0",
      borderBottom: `1px solid ${color.border}`,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "var(--kudos-font-body)", fontSize: 13.5, fontWeight: 500, color: color.ink }}>{label}</div>
        <div style={{ fontFamily: "var(--kudos-font-body)", fontSize: 11.5, color: color.inkMid, marginTop: 2 }}>{desc}</div>
      </div>
      <button type="button" role="switch" aria-checked={on} onClick={() => setOn((v) => !v)} style={{
        width: 40, height: 22, borderRadius: 999,
        background: on ? color.accent : "rgba(255,255,255,0.10)",
        border: `1px solid ${on ? color.accent : "rgba(255,255,255,0.18)"}`,
        cursor: "pointer",
        padding: 0,
        position: "relative",
        flexShrink: 0,
      }}>
        <span aria-hidden style={{
          position: "absolute", top: 2, left: on ? 20 : 2,
          width: 16, height: 16, borderRadius: "50%",
          background: on ? "#0a0612" : "rgba(255,255,255,0.85)",
          transition: "left 220ms cubic-bezier(0.22, 0.61, 0.36, 1)",
          boxShadow: "0 2px 4px rgba(0,0,0,0.4)",
        }} />
      </button>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${color.border}` }}>
      <span style={{ fontFamily: "var(--kudos-font-body)", fontSize: 12.5, color: color.inkMid }}>{label}</span>
      <span style={{ fontFamily: "var(--kudos-font-body)", fontSize: 13, color: color.ink }}>{value}</span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontFamily: "var(--kudos-font-mono)", fontSize: 11, color: color.accentBright, letterSpacing: "0.16em", textTransform: "uppercase" }}>{children}</div>;
}

function eyebrow(): React.CSSProperties { return { fontFamily: "var(--kudos-font-mono)", fontSize: 11, color: color.accentBright, letterSpacing: "0.18em", textTransform: "uppercase" }; }
function h1(): React.CSSProperties { return { margin: "8px 0 0", fontFamily: "var(--kudos-font-display)", fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 600, letterSpacing: "-0.015em", color: color.ink }; }
function lead(): React.CSSProperties { return { margin: "8px 0 0", color: color.inkMid, fontFamily: "var(--kudos-font-body)", fontSize: 14, maxWidth: 580 }; }
