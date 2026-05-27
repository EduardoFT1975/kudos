"use client";

import * as React from "react";
import Link from "next/link";
import { GlassCard, Pill, SectionHeader, Icon, color } from "@/design-system/v2";
import { ECHOES, ERAS, type EraId } from "@/lib/mocks-v2/fixtures";
import { SmartImage } from "@/components/shared/SmartImage";

const ERA_ORDER: ReadonlyArray<EraId> = ["roman", "medieval", "renaissance", "modern", "today"];

export function TimelineScreen() {
  const [active, setActive] = React.useState<EraId>("roman");
  const eraMeta = ERAS[active];
  const eraEchoes = ECHOES.filter((e) => e.era === active);
  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 22px 60px" }}>
      <header style={{ marginBottom: 22 }}>
        <div style={{ fontFamily: "var(--kudos-font-mono)", fontSize: 11, color: color.accentBright, letterSpacing: "0.18em", textTransform: "uppercase" }}>Línea de tiempo</div>
        <h1 style={{ margin: "8px 0 0", fontFamily: "var(--kudos-font-display)", fontSize: "clamp(28px, 4vw, 38px)", fontWeight: 600, letterSpacing: "-0.015em", color: color.ink }}>Viaja por los siglos</h1>
        <p style={{ margin: "8px 0 0", color: color.inkMid, fontFamily: "var(--kudos-font-body)", fontSize: 14.5, maxWidth: 580 }}>
          Cada era es una capa. Desliza por el eje temporal y mira cómo el mundo se reescribe.
        </p>
      </header>

      <div role="tablist" aria-label="Selector de era" style={{
        position: "sticky",
        top: 78,
        zIndex: 5,
        background: "rgba(10,6,18,0.78)",
        backdropFilter: "blur(14px) saturate(160%)",
        WebkitBackdropFilter: "blur(14px) saturate(160%)",
        borderBottom: `1px solid ${color.border}`,
        padding: "10px 0 12px",
        marginBottom: 22,
      }}>
        <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "4px 4px" }} className="kudos-no-scrollbar">
          {ERA_ORDER.map((id) => {
            const e = ERAS[id];
            const isActive = id === active;
            return (
              <button key={id} role="tab" aria-selected={isActive}
                onClick={() => setActive(id)}
                style={{
                  padding: "10px 16px",
                  background: isActive ? `${e.tint}1a` : "transparent",
                  border: `1px solid ${isActive ? e.tint : color.borderHi}`,
                  borderRadius: 999,
                  color: isActive ? color.ink : color.inkMid,
                  fontFamily: "var(--kudos-font-body)",
                  fontSize: 12.5,
                  fontWeight: isActive ? 600 : 500,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  display: "inline-flex", alignItems: "center", gap: 8,
                }}>
                <span aria-hidden style={{ width: 8, height: 8, borderRadius: 999, background: e.tint, boxShadow: isActive ? `0 0 8px ${e.tint}` : undefined }} />
                {e.label}
                <span style={{ fontFamily: "var(--kudos-font-mono)", fontSize: 10, color: color.inkLow, letterSpacing: "0.06em" }}>{e.year}</span>
              </button>
            );
          })}
        </div>
      </div>

      <GlassCard style={{
        padding: 0,
        overflow: "hidden",
        background: `linear-gradient(135deg, ${eraMeta.from} 0%, ${eraMeta.to} 100%)`,
        border: `1px solid ${eraMeta.tint}55`,
      }}>
        <div style={{ padding: 28 }}>
          <div style={{ fontFamily: "var(--kudos-font-mono)", fontSize: 11, color: eraMeta.tint, letterSpacing: "0.18em", textTransform: "uppercase" }}>{eraMeta.year}</div>
          <h2 style={{ margin: "8px 0 6px", fontFamily: "var(--kudos-font-display)", fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 600, letterSpacing: "-0.015em", color: color.ink }}>Era {eraMeta.label}</h2>
          <p style={{ margin: 0, color: color.inkMid, fontFamily: "var(--kudos-font-body)", fontSize: 14, lineHeight: 1.6, maxWidth: 620 }}>
            {eraDescription(active)}
          </p>
        </div>
      </GlassCard>

      <section style={{ marginTop: 26 }}>
        <SectionHeader title={`${eraEchoes.length} ecos en esta era`} />
        {eraEchoes.length === 0 ? (
          <GlassCard>
            <div style={{ color: color.inkMid, fontFamily: "var(--kudos-font-body)", fontSize: 13.5, lineHeight: 1.6 }}>
              Aún no hay ecos publicados para esta era.
            </div>
            <div style={{ marginTop: 12 }}>
              <Link href="/studio" style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "8px 14px", background: `${eraMeta.tint}1a`,
                border: `1px solid ${eraMeta.tint}55`, borderRadius: 999,
                color: color.ink, fontFamily: "var(--kudos-font-body)",
                fontSize: 12.5, textDecoration: "none",
              }}>
                <Icon name="plus" size={14} /> Crear un eco
              </Link>
            </div>
          </GlassCard>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 14,
          }}>
            {eraEchoes.map((e) => (
              <Link key={e.id} href={`/echo/${e.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                <GlassCard interactive padded={false}>
                  <div style={{ position: "relative", aspectRatio: "16 / 9", overflow: "hidden" }}>
                    <SmartImage
                      src={e.heroImage}
                      alt={e.title}
                      fallbackSilhouette={e.silhouette}
                      gradientFrom={e.gradientFrom}
                      gradientTo={e.gradientTo}
                      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
                    />
                    <div aria-hidden className="kudos-decor" style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(10,6,18,0) 55%, rgba(10,6,18,0.88) 100%)" }} />
                    <div style={{ position: "absolute", top: 10, left: 10 }}><Pill tone={e.tone} size="sm">{e.tag}</Pill></div>
                    <div style={{ position: "absolute", bottom: 10, left: 12 }}>
                      <div style={{ fontFamily: "var(--kudos-font-mono)", fontSize: 11, color: eraMeta.tint, letterSpacing: "0.14em" }}>{e.year}</div>
                    </div>
                  </div>
                  <div style={{ padding: "12px 14px 14px" }}>
                    <div style={{ fontFamily: "var(--kudos-font-display)", fontSize: 15.5, fontWeight: 600, color: color.ink, letterSpacing: "-0.005em" }}>{e.title}</div>
                    <div style={{ fontFamily: "var(--kudos-font-body)", fontSize: 12, color: color.inkMid, marginTop: 4 }}>{e.place}</div>
                  </div>
                </GlassCard>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function eraDescription(id: EraId): string {
  const map: Record<EraId, string> = {
    roman:       "Imperios, anfiteatros, mámoas atlánticas. Roma escribe el manual del poder occidental durante 500 años · pero el Atlántico galaico, los íberos y los celtíberos ya estaban escribiendo el suyo siglos antes. La capa más antigua del mapa KUDOS · prehistoria + antigüedad clásica.",
    medieval:    "Catedrales, monasterios, peste. Camino de Santiago. Europa se inclina hacia adentro mientras Bizancio guarda los textos y Al-Ándalus los traduce. La Pontevedra gremial, la Compostela del Pórtico da Gloria.",
    renaissance: "El mundo se mira a sí mismo. Florencia, Salamanca, Cuzco · tres continentes redescubren simultáneamente que el ser humano es medida. Machu Picchu se construye y se abandona en este siglo.",
    modern:      "Locomotoras, naciones, guerras totales. El siglo XX acelera todo · el ruido tapa los ecos. MLK, Tokio Shōwa, Notre-Dame ardiendo y reabriendo.",
    today:       "Pantallas, satélites, capas digitales. Más memoria que nunca · menos atención que nunca · KUDOS pide la pausa.",
  };
  return map[id];
}
