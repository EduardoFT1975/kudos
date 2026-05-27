"use client";

/**
 * KUDOS . PoiScreen . Canonical POI Node replica.
 *
 * Replicates approved POI mockup (Coliseo Romano). Single concrete file.
 * No legacy reuse. No design-system abstraction.
 *
 * Structure (top to bottom):
 *   1. Contextual action band (back, fav, share, more)
 *   2. Hero block (poster + 360 pill + info card + identity overlay +
 *      featured capsule CTA + Ver en el mapa)
 *   3. Mas capsulas de este lugar (horizontal rail . tap swaps hero LOCALLY)
 *   4. Content tabs (Resumen active, others placeholder)
 *   5. Resumen panel (3-col: timeline | mini-map | KUDOS Mind chips)
 *   6. Resumen historico + Informacion rapida sidebar
 *   7. Galeria 4-thumb
 *   8. Action bar (Guardar / Compartir / Abrir mapa)
 *
 * Interactions:
 *   - Card in rail . swaps activeCapsule in local state, NO route nav
 *   - Save . real store toggle("poi", id)
 *   - Share . dispatch CustomEvent("kudos:share-capsule:open")
 *   - Open map . router.push("/mapa?focus=<id>")
 */

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/design-system/v2";
import {
  getPoiById,
  getCapsulesByPoi,
  getFeaturedCapsuleForPoi,
  getNearbyPois,
  useSaved,
  type Capsule,
  type Poi,
} from "@/lib/kudos/store";
import { ECHOES, type MockEcho } from "@/lib/mocks-v2/fixtures";

type TabId = "resumen" | "historia" | "linea" | "epocas" | "galeria" | "cerca" | "fuentes";
const TABS: ReadonlyArray<{ id: TabId; label: string }> = [
  { id: "resumen",  label: "Resumen" },
  { id: "historia", label: "Historia" },
  { id: "linea",    label: "Linea de tiempo" },
  { id: "epocas",   label: "Epocas" },
  { id: "galeria",  label: "Galeria" },
  { id: "cerca",    label: "Cerca" },
  { id: "fuentes",  label: "Fuentes" },
];

// =====================================================================
// Component
// =====================================================================

interface Props { slug: string; }

export function PoiScreen({ slug }: Props) {
  const router = useRouter();
  const poi = getPoiById(slug);
  const featured = poi ? getFeaturedCapsuleForPoi(poi.id) : null;
  const capsules = React.useMemo(() => poi ? getCapsulesByPoi(poi.id) : [], [poi]);
  const echo: MockEcho | undefined = React.useMemo(() => {
    if (!featured) return undefined;
    const echoId = featured.id.replace(/^cap-/, "");
    return ECHOES.find((e) => e.id === echoId);
  }, [featured]);
  const nearby = React.useMemo<ReadonlyArray<Poi>>(() => {
    if (!poi) return [];
    return getNearbyPois({ lat: poi.lat, lng: poi.lng }, 5).filter((p) => p.id !== poi.id);
  }, [poi]);

  const { has, toggle } = useSaved();
  const [activeCapId, setActiveCapId] = React.useState<string | undefined>(featured?.id);
  const [tab, setTab] = React.useState<TabId>("resumen");

  const activeCap = React.useMemo<Capsule | undefined>(() => {
    if (!activeCapId) return featured ?? undefined;
    return capsules.find((c) => c.id === activeCapId) ?? featured ?? undefined;
  }, [activeCapId, capsules, featured]);

  if (!poi || !activeCap) {
    return (
      <main style={NOT_FOUND}>
        <h1 style={{ margin: 0, fontFamily: "var(--kudos-font-display)", fontSize: 22 }}>POI no encontrado</h1>
        <p style={{ color: "var(--kudos-ink-mid)", fontSize: 13 }}>El identificador <code>{slug}</code> no existe.</p>
        <Link href="/inicio" style={LINK_RESET}>Volver al inicio</Link>
      </main>
    );
  }

  const triggerShare = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("kudos:share-capsule:open", { detail: { poiId: poi.id, capsuleId: activeCap.id } }));
    }
  };
  const triggerSave = () => toggle("poi", poi.id);
  const openMap = () => router.push(`/mapa?focus=${encodeURIComponent(poi.id)}`);
  const isSaved = has("poi", poi.id);

  return (
    <article className="kudos-poi" style={ROOT}>
      {/* ── 1 · Contextual action band ────────────────────────────── */}
      <div style={TOP_BAND}>
        <button type="button" onClick={() => router.back()} aria-label="Volver" style={ICON_BTN} className="kudos-tap">
          <Icon name="chevron" size={18} style={{ transform: "rotate(90deg)" }} />
        </button>
        <div style={{ flex: 1 }} />
        <button type="button" onClick={triggerSave} aria-label={isSaved ? "Quitar guardado" : "Guardar"} style={isSaved ? ICON_BTN_ACTIVE : ICON_BTN} className="kudos-tap">
          <Icon name="heart" size={18} />
        </button>
        <button type="button" onClick={triggerShare} aria-label="Compartir" style={ICON_BTN} className="kudos-tap">
          <Icon name="share" size={18} />
        </button>
        <button type="button" aria-label="Mas" style={ICON_BTN} className="kudos-tap">
          <Icon name="more" size={18} />
        </button>
      </div>

      {/* ── 2 · Hero block ────────────────────────────────────────── */}
      <section style={HERO_WRAP}>
        <div aria-hidden className="kudos-kenburns" style={{ ...HERO_BG, backgroundImage: `url("${activeCap.poster}")` }} />
        <div aria-hidden style={HERO_VEIL} />

        {/* 360 pill */}
        <span style={V360_PILL}>
          <Icon name="globe" size={11} />
          <span>VISTA 360</span>
        </span>

        {/* Info card top-right (desktop) */}
        <aside className="kudos-poi-info-card" style={INFO_CARD}>
          <InfoRow icon="history" label="Construido" value={infoBuilt(poi, echo)} />
          <InfoRow icon="people" label="Capacidad" value={infoCapacity(poi)} />
          <InfoRow icon="founder" label="Uso original" value={infoUse(poi)} />
          <button type="button" onClick={openMap} style={INFO_CTA}>
            <Icon name="place" size={14} />
            <span>Ver en el mapa</span>
          </button>
        </aside>

        {/* Bottom split overlay */}
        <div className="kudos-poi-hero-overlay" style={HERO_OVERLAY}>
          <div style={HERO_LEFT}>
            <h1 style={HERO_TITLE}>{poi.name}</h1>
            <div style={LOC_ROW}>
              <span style={LOC}>
                <Icon name="place" size={12} />
                <span>{poi.country}</span>
              </span>
              <span style={RATING}>
                <span style={STAR}>★</span>
                <span style={{ fontWeight: 700 }}>{poi.rating.toFixed(1)}</span>
                <span style={RATING_MUTE}>({formatCount(poi.ratingCount)})</span>
              </span>
            </div>
            <div style={CHIPS_ROW}>
              {(poi.categories.length > 0 ? poi.categories : ["lugar"]).slice(0, 3).map((c) => (
                <span key={c} style={CAT_CHIP}>{cap(String(c))}</span>
              ))}
              {echo?.culturalDna && echo.culturalDna[0] ? <span style={CAT_CHIP_GHOST}>{cap(echo.culturalDna[0])}</span> : null}
            </div>
            <p style={HERO_DESC}>{poi.short}</p>
          </div>

          <div className="kudos-poi-hero-right kudos-glass-strong kudos-elev-2" style={HERO_RIGHT}>
            <button
              type="button"
              onClick={() => {/* in-page play . visual only */}}
              aria-label="Reproducir capsula destacada"
              style={PLAY_RING}
              className="kudos-tap"
            >
              <span style={PLAY_INNER}>
                <Icon name="play" size={28} />
              </span>
            </button>
            <div style={FEATURED_META}>
              <span style={FEATURED_EYEBROW}>VER CAPSULA DESTACADA</span>
              <h3 style={FEATURED_TITLE}>{activeCap.title}</h3>
              <span style={FEATURED_DURATION}>
                <Icon name="play" size={10} />
                <span>{activeCap.duration ?? "0:15"}</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3 · Mas capsulas rail ────────────────────────────────── */}
      <section style={SECTION}>
        <h2 style={SECTION_EYEBROW}>MAS CAPSULAS DE ESTE LUGAR</h2>
        <div style={RAIL} className="kudos-no-scrollbar">
          {capsules.map((c) => {
            const isActive = c.id === activeCap.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveCapId(c.id)}
                style={isActive ? RAIL_CARD_ACTIVE : RAIL_CARD}
                className="kudos-tap-lift kudos-elev-2"
                aria-pressed={isActive}
              >
                <div aria-hidden className="kudos-kenburns" style={{ ...POSTER, backgroundImage: `url("${c.poster}")` }} />
                <div aria-hidden style={POSTER_VEIL} />
                <span style={RAIL_PLAY_BADGE}>
                  <Icon name="play" size={10} />
                  <span>{c.duration ?? "0:15"}</span>
                </span>
                <div style={RAIL_META}>
                  <h4 style={RAIL_TITLE}>{shortLine(c.title, 38)}</h4>
                  <span style={RAIL_CAT}>{cap(String(c.category))}</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── 4 · Content tabs ─────────────────────────────────────── */}
      <section style={SECTION}>
        <div role="tablist" style={TABS_WRAP} className="kudos-no-scrollbar">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              type="button"
              onClick={() => setTab(t.id)}
              style={tab === t.id ? TAB_ACTIVE : TAB_IDLE}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Real panel: Resumen . others stub */}
        {tab === "resumen" ? (
          <ResumenPanel poi={poi} echo={echo} nearby={nearby} />
        ) : (
          <div style={STUB_PANEL}>
            <span style={STUB_GLYPH}>✦</span>
            <p style={STUB_TEXT}>Contenido de <strong>{TABS.find((t) => t.id === tab)?.label}</strong> en construccion.</p>
          </div>
        )}
      </section>

      {/* ── 5 · Action bar inline (always visible at bottom of content) ─ */}
      <section style={SECTION}>
        <div style={ACTIONS_ROW}>
          <button type="button" onClick={triggerSave} style={isSaved ? ACTION_PRIMARY_ACTIVE : ACTION_PRIMARY} className="kudos-tap">
            <Icon name={isSaved ? "saved" : "plus"} size={14} />
            <span>{isSaved ? "Guardado" : "Guardar"}</span>
          </button>
          <button type="button" onClick={triggerShare} style={ACTION_GHOST} className="kudos-tap">
            <Icon name="share" size={14} />
            <span>Compartir</span>
          </button>
          <button type="button" onClick={openMap} style={ACTION_GHOST} className="kudos-tap">
            <Icon name="map" size={14} />
            <span>Abrir mapa</span>
          </button>
        </div>
      </section>

      <div style={{ height: 32 }} />

      <style>{`
        @media (max-width: 1023.98px) {
          .kudos-poi-hero-overlay { grid-template-columns: 1fr !important; gap: 18px !important; }
          .kudos-poi-info-card { display: none !important; }
        }
        @media (max-width: 640px) {
          .kudos-poi { padding-left: 16px !important; padding-right: 16px !important; }
        }
        .kudos-no-scrollbar::-webkit-scrollbar { display: none; }
        .kudos-no-scrollbar { scrollbar-width: none; }
      `}</style>
    </article>
  );
}

// =====================================================================
// Resumen panel (the only real content panel)
// =====================================================================

function ResumenPanel({ poi, echo, nearby }: { poi: Poi; echo?: MockEcho; nearby: ReadonlyArray<Poi> }) {
  const timeline = (echo?.timeline && echo.timeline.length > 0
    ? echo.timeline
    : fallbackTimeline()
  ).slice(0, 5);
  const sources = echo?.sources ?? [];
  const narrative = echo?.narrative ?? [poi.short];
  const gallery = echo?.gallery ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Top 3-col: timeline + map + mind */}
      <div className="kudos-poi-resumen-grid" style={RESUMEN_GRID}>
        <Panel title="Linea de tiempo del lugar">
          <ol style={TIMELINE_CHAIN}>
            {timeline.map((node, i) => (
              <li key={i} style={TIMELINE_NODE}>
                <span style={i === 0 ? TIMELINE_DOT_ACTIVE : TIMELINE_DOT}>
                  <Icon name="history" size={14} />
                </span>
                <span style={TIMELINE_YEAR}>{node.year}</span>
                <span style={TIMELINE_LABEL}>{node.title}</span>
              </li>
            ))}
          </ol>
        </Panel>

        <Panel title="Ubicacion">
          <div style={MINI_MAP}>
            <div aria-hidden style={MINI_MAP_BG} />
            <div aria-hidden style={MINI_MAP_GRID} />
            <div style={MINI_MAP_PIN}>
              <span style={MINI_MAP_PIN_INNER}><Icon name="place" size={16} /></span>
            </div>
          </div>
          <p style={ADDRESS}>{poi.country}</p>
          <a
            href={`https://www.google.com/maps/?q=${encodeURIComponent(poi.lat + "," + poi.lng)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={MAP_LINK}
          >
            <span>Abrir en Google Maps</span>
            <Icon name="arrow-right" size={12} />
          </a>
        </Panel>

        <Panel title="Preguntale a KUDOS Mind" accent="mind">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <MindChip text={`Que eventos importantes ocurrieron en ${poi.name}?`} />
            <MindChip text={`Como era ${poi.name} en su epoca?`} />
            <MindChip text={`Por que es importante ${poi.name}?`} />
          </div>
          <div style={MIND_INPUT_WRAP}>
            <input type="text" placeholder="Escribe tu pregunta..." style={MIND_INPUT} aria-label="Pregunta KUDOS Mind" />
            <button type="button" aria-label="Enviar" style={MIND_SEND}>
              <Icon name="arrow-right" size={14} />
            </button>
          </div>
        </Panel>
      </div>

      {/* Resumen historico + Informacion rapida */}
      <div className="kudos-poi-summary-grid" style={SUMMARY_GRID}>
        <Panel title="Resumen historico">
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 160px", gap: 14 }}>
            <div>
              {narrative.slice(0, 2).map((p, i) => (
                <p key={i} style={NARRATIVE_PARA}>{p}</p>
              ))}
              <button type="button" style={READ_MORE}>Ver mas</button>
            </div>
            <div
              aria-hidden
              className="kudos-kenburns"
              style={{
                ...NARRATIVE_THUMB,
                backgroundImage: `url("${gallery[0]?.src ?? poi.heroImage}")`,
              }}
            />
          </div>
        </Panel>

        <Panel title="Informacion rapida">
          <ul style={FACTS_LIST}>
            <Fact icon="history"   label="Estilo arquitectonico" value={infoStyle(poi, echo)} />
            <Fact icon="founder"   label="Material principal"    value={infoMaterial(poi)} />
            <Fact icon="more"      label="Dimensiones"            value={infoDimensions(poi)} />
            <Fact icon="place"     label="Estado actual"          value={infoState(poi)} />
            <Fact icon="moments"   label="Mejor epoca para visitar" value={infoBestSeason(poi)} />
          </ul>
        </Panel>
      </div>

      {/* Galeria */}
      <Panel title="Galeria" headerRight={<a href="#" style={SEE_ALL}>Ver toda la galeria <Icon name="chevron-right" size={12} /></a>}>
        <div style={GALLERY_GRID}>
          {(gallery.length > 0 ? gallery.slice(0, 4) : Array(4).fill(null)).map((g, i) => (
            <div
              key={i}
              aria-hidden
              className="kudos-kenburns"
              style={{
                ...GALLERY_THUMB,
                backgroundImage: g ? `url("${g.src}")` : `url("${poi.heroImage}")`,
              }}
              title={g?.caption ?? poi.name}
            />
          ))}
        </div>
      </Panel>

      {/* Cerca strip (small) */}
      {nearby.length > 0 ? (
        <Panel title="Cerca">
          <div style={NEARBY_GRID}>
            {nearby.slice(0, 4).map((n) => (
              <Link key={n.id} href={`/poi/${encodeURIComponent(n.id)}`} style={NEARBY_CARD} className="kudos-tap-lift kudos-elev-1">
                <div aria-hidden className="kudos-kenburns" style={{ ...POSTER, backgroundImage: `url("${n.heroImage}")` }} />
                <div aria-hidden style={POSTER_VEIL} />
                <div style={NEARBY_META}>
                  <span style={NEARBY_TITLE}>{n.name}</span>
                  <span style={NEARBY_SUB}>{n.country}</span>
                </div>
              </Link>
            ))}
          </div>
        </Panel>
      ) : null}

      {/* Fuentes (compact) */}
      {sources.length > 0 ? (
        <Panel title="Fuentes">
          <ul style={SOURCES_LIST}>
            {sources.slice(0, 4).map((s, i) => (
              <li key={i} style={SOURCE_ITEM}>
                <div style={SOURCE_TITLE}>{s.title}</div>
                <div style={SOURCE_META}>{s.author} . {s.year}</div>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      <style>{`
        @media (max-width: 1023.98px) {
          .kudos-poi-resumen-grid { grid-template-columns: 1fr !important; }
          .kudos-poi-summary-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

// =====================================================================
// Small reusable inline pieces (concrete to this file)
// =====================================================================

function Panel({ title, children, accent, headerRight }: { title: string; children: React.ReactNode; accent?: "mind"; headerRight?: React.ReactNode }) {
  return (
    <section style={accent === "mind" ? PANEL_MIND : PANEL}>
      <header style={PANEL_HEAD}>
        <h3 style={accent === "mind" ? PANEL_TITLE_MIND : PANEL_TITLE}>
          {accent === "mind" ? <span aria-hidden style={MIND_GLYPH}>✦</span> : null}
          <span>{title.toUpperCase()}</span>
        </h3>
        {headerRight ?? null}
      </header>
      {children}
    </section>
  );
}

function InfoRow({ icon, label, value }: { icon: Parameters<typeof Icon>[0]["name"]; label: string; value: string }) {
  return (
    <div style={INFO_ROW}>
      <span style={INFO_ICON}><Icon name={icon} size={14} /></span>
      <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
        <span style={INFO_LABEL}>{label}</span>
        <span style={INFO_VALUE}>{value}</span>
      </div>
    </div>
  );
}

function Fact({ icon, label, value }: { icon: Parameters<typeof Icon>[0]["name"]; label: string; value: string }) {
  return (
    <li style={FACT_ROW}>
      <span style={FACT_ICON}><Icon name={icon} size={14} /></span>
      <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
        <span style={FACT_LABEL}>{label}</span>
        <span style={FACT_VALUE}>{value}</span>
      </div>
    </li>
  );
}

function MindChip({ text }: { text: string }) {
  return (
    <button type="button" style={MIND_CHIP}>
      <span>{text}</span>
    </button>
  );
}

// =====================================================================
// Utilities
// =====================================================================

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function shortLine(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "..." : s;
}
function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function fallbackTimeline(): ReadonlyArray<{ year: string; title: string; body?: string }> {
  return [
    { year: "Origen",    title: "Construccion" },
    { year: "Auge",      title: "Esplendor" },
    { year: "Declive",   title: "Abandono" },
    { year: "Renacer",   title: "Restauracion" },
    { year: "Hoy",       title: "Patrimonio" },
  ];
}

function infoBuilt(poi: Poi, echo?: MockEcho): string {
  const first = echo?.timeline?.[0];
  if (first?.year) return first.year;
  if (poi.era === "roman") return "Antiguedad";
  if (poi.era === "medieval") return "Edad Media";
  if (poi.era === "renaissance") return "Renacimiento";
  if (poi.era === "modern") return "Era Moderna";
  return "Contemporaneo";
}
function infoCapacity(poi: Poi): string {
  if (poi.categories.includes("monumento")) return "Visitantes anuales: muchos";
  if (poi.categories.includes("museo")) return "Aforo limitado";
  return "Variable";
}
function infoUse(poi: Poi): string {
  const c = poi.categories[0];
  switch (c) {
    case "monumento":     return "Patrimonio cultural";
    case "museo":         return "Coleccion permanente";
    case "gastronomia":   return "Experiencia culinaria";
    case "naturaleza":    return "Espacio natural protegido";
    case "evento":        return "Sede de eventos publicos";
    case "cultura":       return "Espacio cultural";
    case "historia":      return "Sitio historico";
    case "arquitectura":  return "Hito arquitectonico";
    case "misterio":      return "Lugar enigmatico";
    default:              return "Patrimonio cultural";
  }
}
function infoStyle(poi: Poi, echo?: MockEcho): string {
  if (echo?.culturalDna?.[0]) return cap(echo.culturalDna[0]);
  switch (poi.era) {
    case "roman":       return "Arquitectura romana";
    case "medieval":    return "Arquitectura medieval";
    case "renaissance": return "Renacentista";
    case "modern":      return "Moderna";
    default:            return "Contemporanea";
  }
}
function infoMaterial(_poi: Poi): string {
  return "Piedra, hormigon y ladrillo";
}
function infoDimensions(_poi: Poi): string {
  return "Dimensiones variables";
}
function infoState(_poi: Poi): string {
  return "En pie (parcialmente)";
}
function infoBestSeason(_poi: Poi): string {
  return "Todo el ano";
}

// =====================================================================
// Styles
// =====================================================================

const ROOT: React.CSSProperties = {
  width: "100%",
  maxWidth: 1280,
  margin: "0 auto",
  padding: "12px 24px 0",
  color: "var(--kudos-ink)",
  fontFamily: "var(--kudos-font-body)",
};

const NOT_FOUND: React.CSSProperties = {
  minHeight: "60vh",
  display: "grid",
  placeItems: "center",
  gap: 8,
  textAlign: "center",
  color: "var(--kudos-ink)",
  padding: 24,
};

const LINK_RESET: React.CSSProperties = {
  marginTop: 8,
  padding: "10px 18px",
  borderRadius: 999,
  background: "var(--kudos-accent, #6C3CFF)",
  color: "#fff",
  textDecoration: "none",
  fontWeight: 600,
};

// ── Top band ──────────────────────────────────────────────────────

const TOP_BAND: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginBottom: 14,
};

const ICON_BTN: React.CSSProperties = {
  width: 40, height: 40,
  borderRadius: 12,
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.10)",
  color: "var(--kudos-ink)",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const ICON_BTN_ACTIVE: React.CSSProperties = {
  ...ICON_BTN,
  background: "rgba(255,60,172,0.18)",
  border: "1px solid rgba(255,60,172,0.55)",
  color: "var(--kudos-accent-pink, #FF3CAC)",
};

// ── Hero ──────────────────────────────────────────────────────────

const HERO_WRAP: React.CSSProperties = {
  position: "relative",
  width: "100%",
  aspectRatio: "21/9",
  minHeight: 460,
  borderRadius: 24,
  overflow: "hidden",
  border: "1px solid rgba(255,255,255,0.06)",
  marginBottom: 26,
  boxShadow: "0 32px 60px -28px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.05)",
};

const HERO_BG: React.CSSProperties = {
  position: "absolute", inset: 0,
  backgroundSize: "cover", backgroundPosition: "center",
  transform: "scale(1.04)",
  transformOrigin: "center",
};

const HERO_VEIL: React.CSSProperties = {
  position: "absolute", inset: 0,
  background:
    "radial-gradient(120% 90% at 50% 25%, transparent 55%, rgba(10,6,18,0.45) 100%), " +
    "linear-gradient(180deg, rgba(0,0,0,0.20) 0%, rgba(10,6,18,0.05) 30%, rgba(10,6,18,0.96) 100%)",
};

const V360_PILL: React.CSSProperties = {
  position: "absolute",
  top: 18, left: 18,
  zIndex: 5,
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  padding: "6px 12px",
  borderRadius: 999,
  background: "rgba(10,6,18,0.78)",
  border: "1px solid rgba(255,255,255,0.10)",
  color: "var(--kudos-ink)",
  fontFamily: "var(--kudos-font-body)",
  fontSize: 10.5,
  fontWeight: 700,
  letterSpacing: "0.14em",
};

const INFO_CARD: React.CSSProperties = {
  position: "absolute",
  top: 18, right: 18,
  zIndex: 5,
  width: 260,
  padding: "14px 14px 12px",
  borderRadius: 16,
  background: "rgba(10,6,18,0.82)",
  border: "1px solid rgba(255,255,255,0.08)",
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const INFO_ROW: React.CSSProperties = {
  display: "flex",
  gap: 10,
  alignItems: "flex-start",
};

const INFO_ICON: React.CSSProperties = {
  width: 28, height: 28,
  borderRadius: 8,
  background: "rgba(108,60,255,0.18)",
  color: "var(--kudos-accent-bright, #8B6BFF)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const INFO_LABEL: React.CSSProperties = {
  fontSize: 10.5,
  fontWeight: 500,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "rgba(242,242,247,0.55)",
};

const INFO_VALUE: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "var(--kudos-ink)",
  lineHeight: 1.3,
};

const INFO_CTA: React.CSSProperties = {
  marginTop: 4,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  padding: "9px 12px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.14)",
  color: "var(--kudos-ink)",
  cursor: "pointer",
  fontFamily: "var(--kudos-font-body)",
  fontSize: 12,
  fontWeight: 600,
};

const HERO_OVERLAY: React.CSSProperties = {
  position: "absolute",
  left: 0, right: 0, bottom: 0,
  zIndex: 4,
  padding: "22px 24px 22px",
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.6fr) minmax(0, 1fr)",
  gap: 24,
  alignItems: "end",
};

const HERO_LEFT: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  minWidth: 0,
};

const HERO_TITLE: React.CSSProperties = {
  margin: 0,
  fontFamily: "var(--kudos-font-display)",
  fontSize: "clamp(28px, 4.4vw, 56px)",
  fontWeight: 700,
  lineHeight: 1.02,
  letterSpacing: "-0.02em",
  color: "var(--kudos-ink)",
};

const LOC_ROW: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  flexWrap: "wrap",
};

const LOC: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  fontSize: 12.5,
  color: "rgba(242,242,247,0.78)",
};

const RATING: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  fontSize: 12.5,
  color: "var(--kudos-ink)",
};

const RATING_MUTE: React.CSSProperties = {
  color: "rgba(242,242,247,0.55)",
  fontWeight: 400,
  marginLeft: 4,
};

const STAR: React.CSSProperties = {
  color: "var(--kudos-accent-yellow, #FFD23F)",
  fontSize: 13,
  lineHeight: 1,
};

const CHIPS_ROW: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
};

const CAT_CHIP: React.CSSProperties = {
  padding: "5px 11px",
  borderRadius: 999,
  background: "var(--kudos-accent, #6C3CFF)",
  color: "#fff",
  fontFamily: "var(--kudos-font-body)",
  fontSize: 10.5,
  fontWeight: 700,
  letterSpacing: "0.08em",
};

const CAT_CHIP_GHOST: React.CSSProperties = {
  padding: "5px 11px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.16)",
  color: "rgba(242,242,247,0.85)",
  fontFamily: "var(--kudos-font-body)",
  fontSize: 10.5,
  fontWeight: 600,
  letterSpacing: "0.06em",
};

const HERO_DESC: React.CSSProperties = {
  margin: "2px 0 0",
  fontSize: 14,
  lineHeight: 1.5,
  color: "rgba(242,242,247,0.82)",
  maxWidth: 560,
};

const HERO_RIGHT: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 12,
  minWidth: 0,
  padding: "18px 18px 16px",
  borderRadius: 20,
};

const PLAY_RING: React.CSSProperties = {
  width: 96, height: 96,
  borderRadius: "50%",
  padding: 4,
  background: "var(--kudos-gradient-ring)",
  border: "none",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const PLAY_INNER: React.CSSProperties = {
  width: "100%", height: "100%",
  borderRadius: "50%",
  background: "rgba(10,6,18,0.82)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#fff",
};

const FEATURED_META: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 4,
  maxWidth: 280,
  textAlign: "center",
};

const FEATURED_EYEBROW: React.CSSProperties = {
  fontFamily: "var(--kudos-font-body)",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.18em",
  color: "rgba(242,242,247,0.65)",
  textTransform: "uppercase",
};

const FEATURED_TITLE: React.CSSProperties = {
  margin: 0,
  fontFamily: "var(--kudos-font-display)",
  fontSize: 15,
  fontWeight: 700,
  lineHeight: 1.2,
  letterSpacing: "-0.01em",
  color: "var(--kudos-ink)",
};

const FEATURED_DURATION: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "3px 9px",
  borderRadius: 999,
  background: "rgba(10,6,18,0.82)",
  border: "1px solid rgba(255,255,255,0.10)",
  color: "rgba(242,242,247,0.85)",
  fontSize: 10.5,
};

// ── Section ───────────────────────────────────────────────────────

const SECTION: React.CSSProperties = {
  marginBottom: 22,
};

const SECTION_EYEBROW: React.CSSProperties = {
  margin: "0 0 12px",
  fontFamily: "var(--kudos-font-body)",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.18em",
  color: "rgba(242,242,247,0.55)",
  textTransform: "uppercase",
};

// ── Capsule rail ──────────────────────────────────────────────────

const RAIL: React.CSSProperties = {
  display: "flex",
  gap: 12,
  overflowX: "auto",
  paddingBottom: 6,
  scrollSnapType: "x mandatory",
  WebkitOverflowScrolling: "touch",
};

const RAIL_CARD: React.CSSProperties = {
  position: "relative",
  flex: "0 0 200px",
  aspectRatio: "5/6",
  borderRadius: 16,
  overflow: "hidden",
  border: "1px solid rgba(255,255,255,0.06)",
  background: "#221945",
  cursor: "pointer",
  color: "var(--kudos-ink)",
  padding: 0,
  scrollSnapAlign: "start",
  textAlign: "left",
};

const RAIL_CARD_ACTIVE: React.CSSProperties = {
  ...RAIL_CARD,
  border: "2px solid transparent",
  backgroundImage: "linear-gradient(#221945, #221945), var(--kudos-gradient-ring)",
  backgroundOrigin: "border-box",
  backgroundClip: "padding-box, border-box",
};

const POSTER: React.CSSProperties = {
  position: "absolute", inset: 0,
  backgroundSize: "cover",
  backgroundPosition: "center",
};

const POSTER_VEIL: React.CSSProperties = {
  position: "absolute", inset: 0,
  background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(10,6,18,0.92) 100%)",
};

const RAIL_PLAY_BADGE: React.CSSProperties = {
  position: "absolute",
  top: 10, left: 10,
  zIndex: 2,
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "3px 8px",
  borderRadius: 999,
  background: "rgba(10,6,18,0.82)",
  border: "1px solid rgba(255,255,255,0.10)",
  color: "var(--kudos-ink)",
  fontSize: 10,
  fontWeight: 500,
};

const RAIL_META: React.CSSProperties = {
  position: "absolute",
  left: 12, right: 12, bottom: 12,
  zIndex: 2,
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

const RAIL_TITLE: React.CSSProperties = {
  margin: 0,
  fontFamily: "var(--kudos-font-display)",
  fontSize: 13,
  fontWeight: 700,
  lineHeight: 1.2,
  letterSpacing: "-0.005em",
  color: "var(--kudos-ink)",
};

const RAIL_CAT: React.CSSProperties = {
  fontSize: 10.5,
  fontWeight: 500,
  color: "rgba(242,242,247,0.55)",
};

// ── Tabs ──────────────────────────────────────────────────────────

const TABS_WRAP: React.CSSProperties = {
  display: "flex",
  gap: 4,
  overflowX: "auto",
  padding: "4px 0 0",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
  marginBottom: 18,
};

const TAB_BASE: React.CSSProperties = {
  flexShrink: 0,
  padding: "10px 14px",
  background: "transparent",
  border: "none",
  borderBottom: "2px solid transparent",
  color: "rgba(242,242,247,0.55)",
  cursor: "pointer",
  fontFamily: "var(--kudos-font-body)",
  fontSize: 13,
  fontWeight: 500,
  letterSpacing: "-0.005em",
  whiteSpace: "nowrap",
};

const TAB_IDLE: React.CSSProperties = TAB_BASE;

const TAB_ACTIVE: React.CSSProperties = {
  ...TAB_BASE,
  color: "var(--kudos-ink)",
  fontWeight: 700,
  borderBottom: "2px solid",
  borderImage: "var(--kudos-gradient-cta) 1",
};

const STUB_PANEL: React.CSSProperties = {
  padding: "32px 18px",
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.06)",
  background: "rgba(255,255,255,0.02)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 8,
  textAlign: "center",
};

const STUB_GLYPH: React.CSSProperties = {
  fontSize: 22,
  color: "var(--kudos-accent-bright, #8B6BFF)",
};

const STUB_TEXT: React.CSSProperties = {
  margin: 0,
  color: "rgba(242,242,247,0.65)",
  fontSize: 13,
};

// ── Panels ────────────────────────────────────────────────────────

const PANEL: React.CSSProperties = {
  padding: 18,
  borderRadius: 18,
  background: "rgba(255,255,255,0.025)",
  border: "1px solid rgba(255,255,255,0.06)",
  minWidth: 0,
};

const PANEL_MIND: React.CSSProperties = {
  ...PANEL,
  background: "linear-gradient(180deg, rgba(108,60,255,0.10) 0%, rgba(255,60,172,0.04) 100%)",
  border: "1px solid rgba(108,60,255,0.30)",
};

const PANEL_HEAD: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 14,
};

const PANEL_TITLE: React.CSSProperties = {
  margin: 0,
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontFamily: "var(--kudos-font-body)",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.16em",
  color: "rgba(242,242,247,0.55)",
};

const PANEL_TITLE_MIND: React.CSSProperties = {
  ...PANEL_TITLE,
  color: "var(--kudos-accent-bright, #8B6BFF)",
};

const MIND_GLYPH: React.CSSProperties = {
  color: "var(--kudos-accent-bright, #8B6BFF)",
  fontSize: 14,
  lineHeight: 1,
};

// ── Resumen panel ─────────────────────────────────────────────────

const RESUMEN_GRID: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)",
  gap: 14,
};

const SUMMARY_GRID: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)",
  gap: 14,
};

const TIMELINE_CHAIN: React.CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: 0,
  display: "grid",
  gridTemplateColumns: "repeat(5, 1fr)",
  gap: 6,
  position: "relative",
};

const TIMELINE_NODE: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 6,
  position: "relative",
};

const TIMELINE_DOT: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 38, height: 38,
  borderRadius: "50%",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.10)",
  color: "rgba(242,242,247,0.55)",
};

const TIMELINE_DOT_ACTIVE: React.CSSProperties = {
  ...TIMELINE_DOT,
  background: "var(--kudos-gradient-ring)",
  color: "#fff",
  border: "none",
};

const TIMELINE_YEAR: React.CSSProperties = {
  fontSize: 10.5,
  fontWeight: 700,
  color: "var(--kudos-ink)",
  textAlign: "center",
};

const TIMELINE_LABEL: React.CSSProperties = {
  fontSize: 10,
  color: "rgba(242,242,247,0.55)",
  textAlign: "center",
  lineHeight: 1.25,
};

// Mini map
const MINI_MAP: React.CSSProperties = {
  position: "relative",
  width: "100%",
  aspectRatio: "16/10",
  borderRadius: 12,
  overflow: "hidden",
  marginBottom: 10,
};
const MINI_MAP_BG: React.CSSProperties = {
  position: "absolute", inset: 0,
  background: "radial-gradient(80% 60% at 50% 50%, #2A1659 0%, #0E0828 80%)",
};
const MINI_MAP_GRID: React.CSSProperties = {
  position: "absolute", inset: 0,
  backgroundImage:
    "repeating-linear-gradient(35deg, rgba(108,60,255,0.06) 0 1px, transparent 1px 24px), " +
    "repeating-linear-gradient(-25deg, rgba(255,60,172,0.04) 0 1px, transparent 1px 34px)",
};
const MINI_MAP_PIN: React.CSSProperties = {
  position: "absolute",
  top: "50%", left: "50%",
  transform: "translate(-50%, -50%)",
  width: 42, height: 42,
  borderRadius: "50%",
  padding: 3,
  background: "var(--kudos-gradient-ring)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};
const MINI_MAP_PIN_INNER: React.CSSProperties = {
  width: "100%", height: "100%",
  borderRadius: "50%",
  background: "rgba(10,6,18,0.85)",
  color: "var(--kudos-accent-bright, #8B6BFF)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const ADDRESS: React.CSSProperties = {
  margin: "0 0 10px",
  fontSize: 12.5,
  color: "var(--kudos-ink-mid)",
  lineHeight: 1.4,
};

const MAP_LINK: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  padding: "8px 12px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.10)",
  color: "var(--kudos-ink)",
  textDecoration: "none",
  fontSize: 12,
  fontWeight: 600,
};

// Mind
const MIND_CHIP: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 12px",
  borderRadius: 12,
  background: "rgba(10,6,18,0.55)",
  border: "1px solid rgba(255,255,255,0.10)",
  color: "var(--kudos-ink)",
  fontFamily: "var(--kudos-font-body)",
  fontSize: 12.5,
  cursor: "pointer",
};

const MIND_INPUT_WRAP: React.CSSProperties = {
  marginTop: 10,
  position: "relative",
  display: "flex",
  alignItems: "center",
  height: 40,
  borderRadius: 999,
  background: "rgba(10,6,18,0.55)",
  border: "1px solid rgba(255,255,255,0.10)",
  padding: "0 6px 0 14px",
};

const MIND_INPUT: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  background: "transparent",
  border: "none",
  outline: "none",
  color: "var(--kudos-ink)",
  fontFamily: "var(--kudos-font-body)",
  fontSize: 12.5,
  height: "100%",
};

const MIND_SEND: React.CSSProperties = {
  width: 32, height: 32,
  borderRadius: "50%",
  background: "var(--kudos-gradient-cta)",
  border: "none",
  color: "#fff",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

// Narrative
const NARRATIVE_PARA: React.CSSProperties = {
  margin: "0 0 10px",
  fontSize: 13.5,
  lineHeight: 1.55,
  color: "var(--kudos-ink)",
};

const READ_MORE: React.CSSProperties = {
  padding: 0,
  background: "transparent",
  border: "none",
  color: "var(--kudos-accent-bright, #8B6BFF)",
  fontFamily: "var(--kudos-font-body)",
  fontSize: 12.5,
  fontWeight: 600,
  cursor: "pointer",
};

const NARRATIVE_THUMB: React.CSSProperties = {
  borderRadius: 12,
  aspectRatio: "4/5",
  backgroundSize: "cover",
  backgroundPosition: "center",
};

// Facts
const FACTS_LIST: React.CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: 0,
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const FACT_ROW: React.CSSProperties = {
  display: "flex",
  gap: 10,
  alignItems: "flex-start",
};

const FACT_ICON: React.CSSProperties = {
  width: 30, height: 30,
  borderRadius: 8,
  background: "rgba(108,60,255,0.16)",
  color: "var(--kudos-accent-bright, #8B6BFF)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const FACT_LABEL: React.CSSProperties = {
  fontSize: 10.5,
  fontWeight: 600,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "rgba(242,242,247,0.55)",
};

const FACT_VALUE: React.CSSProperties = {
  fontSize: 13,
  color: "var(--kudos-ink)",
  fontWeight: 500,
  lineHeight: 1.35,
};

// Gallery
const GALLERY_GRID: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: 10,
};

const GALLERY_THUMB: React.CSSProperties = {
  aspectRatio: "1/1",
  borderRadius: 12,
  backgroundSize: "cover",
  backgroundPosition: "center",
  border: "1px solid rgba(255,255,255,0.06)",
};

const SEE_ALL: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  color: "var(--kudos-accent-bright, #8B6BFF)",
  textDecoration: "none",
  fontSize: 12,
  fontWeight: 600,
};

// Nearby
const NEARBY_GRID: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
  gap: 10,
};

const NEARBY_CARD: React.CSSProperties = {
  position: "relative",
  aspectRatio: "4/3",
  borderRadius: 14,
  overflow: "hidden",
  textDecoration: "none",
  color: "var(--kudos-ink)",
  border: "1px solid rgba(255,255,255,0.06)",
  display: "block",
};

const NEARBY_META: React.CSSProperties = {
  position: "absolute",
  left: 10, right: 10, bottom: 10,
  zIndex: 2,
  display: "flex",
  flexDirection: "column",
  gap: 2,
};

const NEARBY_TITLE: React.CSSProperties = {
  fontFamily: "var(--kudos-font-display)",
  fontSize: 13.5,
  fontWeight: 700,
  letterSpacing: "-0.005em",
  lineHeight: 1.2,
};

const NEARBY_SUB: React.CSSProperties = {
  fontSize: 10.5,
  color: "rgba(242,242,247,0.65)",
};

// Sources
const SOURCES_LIST: React.CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: 0,
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const SOURCE_ITEM: React.CSSProperties = {
  padding: 10,
  borderRadius: 10,
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.06)",
};

const SOURCE_TITLE: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: "var(--kudos-ink)",
};

const SOURCE_META: React.CSSProperties = {
  marginTop: 2,
  fontSize: 11,
  color: "var(--kudos-ink-mid)",
};

// ── Action bar inline ────────────────────────────────────────────

const ACTIONS_ROW: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const ACTION_BASE: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "11px 18px",
  borderRadius: 999,
  fontFamily: "var(--kudos-font-body)",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  border: "1px solid transparent",
  textDecoration: "none",
};

const ACTION_PRIMARY: React.CSSProperties = {
  ...ACTION_BASE,
  background: "var(--kudos-accent, #6C3CFF)",
  color: "#fff",
  border: "1px solid var(--kudos-accent, #6C3CFF)",
  boxShadow: "0 14px 28px -10px rgba(108,60,255,0.65)",
};

const ACTION_PRIMARY_ACTIVE: React.CSSProperties = {
  ...ACTION_BASE,
  background: "rgba(108,60,255,0.22)",
  color: "var(--kudos-accent-bright, #8B6BFF)",
  border: "1px solid rgba(108,60,255,0.55)",
};

const ACTION_GHOST: React.CSSProperties = {
  ...ACTION_BASE,
  background: "transparent",
  color: "var(--kudos-ink)",
  border: "1px solid rgba(255,255,255,0.18)",
};
