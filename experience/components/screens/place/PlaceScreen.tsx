"use client";

import * as React from "react";
import Link from "next/link";
import { GlassCard, PrimaryButton, SecondaryButton, Pill, Icon, color } from "@/design-system/v2";
import { PLACES, ECHOES, ERAS, type MockPlace } from "@/lib/mocks-v2/fixtures";
import { SmartImage } from "@/components/shared/SmartImage";

export interface PlaceScreenProps { slug: string; }

export function PlaceScreen({ slug }: PlaceScreenProps) {
  const place: MockPlace = PLACES.find((p) => p.id === slug) ?? PLACES[0];
  const placeEchoes = ECHOES.filter((e) => e.placeId === place.id);
  const eraMeta = ERAS[place.era];
  const heroEcho = placeEchoes[0] ?? ECHOES[0];

  return (
    <div style={{ paddingBottom: 80 }}>
      <section style={{
        position: "relative",
        minHeight: 400,
        background: `linear-gradient(180deg, ${eraMeta.from} 0%, ${eraMeta.to} 100%)`,
        overflow: "hidden",
      }}>
        <SmartImage
          src={heroEcho.heroImage}
          alt={heroEcho.title}
          fallbackSilhouette={heroEcho.silhouette}
          gradientFrom={eraMeta.from}
          gradientTo={eraMeta.to}
          loading="eager"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.6 }}
        />
        <div aria-hidden className="kudos-decor" style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(10,6,18,0.4) 0%, rgba(10,6,18,0.7) 60%, rgba(10,6,18,0.92) 100%)" }} />
        <div style={{ position: "relative", maxWidth: 900, margin: "0 auto", padding: "48px 22px 28px" }}>
          <Pill tone="accent" size="sm">{eraMeta.label}</Pill>
          <h1 style={{ margin: "12px 0 0", fontFamily: "var(--kudos-font-display)", fontSize: "clamp(30px, 5vw, 48px)", fontWeight: 600, letterSpacing: "-0.02em", color: color.ink, lineHeight: 1.05 }}>{place.name}</h1>
          <div style={{ marginTop: 10, fontFamily: "var(--kudos-font-mono)", fontSize: 12, color: color.inkMid, letterSpacing: "0.06em" }}>{place.country} · {place.lat.toFixed(2)}° N · {place.lng.toFixed(2)}° E</div>
        </div>
      </section>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 22px 0" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 22, flexWrap: "wrap" }}>
          <PrimaryButton as="link" href="/mapa" iconLeft={<Icon name="map" size={14} />}>Ver en mapa</PrimaryButton>
          <SecondaryButton iconLeft={<Icon name="saved" size={14} />}>Guardar lugar</SecondaryButton>
          <SecondaryButton iconLeft={<Icon name="share" size={14} />}>Compartir</SecondaryButton>
        </div>

        <h2 style={{
          margin: "0 0 14px",
          fontFamily: "var(--kudos-font-display)",
          fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em",
          color: color.ink,
        }}>{placeEchoes.length} ecos en este lugar</h2>

        {placeEchoes.length === 0 ? (
          <GlassCard>
            <div style={{ color: color.inkMid, fontFamily: "var(--kudos-font-body)", fontSize: 13 }}>Sé el primero en dejar un eco aquí.</div>
            <div style={{ marginTop: 12 }}>
              <PrimaryButton as="link" href="/studio" size="sm" iconLeft={<Icon name="plus" size={14} />}>Crear cápsula</PrimaryButton>
            </div>
          </GlassCard>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 12,
          }}>
            {placeEchoes.map((e) => (
              <Link key={e.id} href={`/echo/${e.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                <GlassCard interactive padded={false}>
                  <div style={{ position: "relative", aspectRatio: "16 / 10", overflow: "hidden" }}>
                    <SmartImage
                      src={e.heroImage}
                      alt={e.title}
                      fallbackSilhouette={e.silhouette}
                      gradientFrom={e.gradientFrom}
                      gradientTo={e.gradientTo}
                      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
                    />
                    <div aria-hidden className="kudos-decor" style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(10,6,18,0) 50%, rgba(10,6,18,0.85) 100%)" }} />
                    <div style={{ position: "absolute", top: 10, left: 10 }}><Pill tone={e.tone} size="sm">{e.tag}</Pill></div>
                  </div>
                  <div style={{ padding: "12px 14px 14px" }}>
                    <div style={{ fontFamily: "var(--kudos-font-display)", fontSize: 15, fontWeight: 600, color: color.ink, letterSpacing: "-0.005em" }}>{e.title}</div>
                    <div style={{ fontFamily: "var(--kudos-font-body)", fontSize: 11.5, color: color.inkMid, marginTop: 4 }}>{e.year}</div>
                  </div>
                </GlassCard>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
