"use client";

/**
 * KUDOS . MiMundoScreen . Structural fidelity rebuild (P11.5*).
 * Differentiated grammar per rail:
 *   - Guardados      = hero rail cards (image-top + meta)
 *   - Rutas          = timeline-dot route cards
 *   - Estuve aqui    = horizontal visit memory rail with green check + date
 *   - Colecciones    = category-icon collection covers with count
 */

import * as React from "react";
import Link from "next/link";
import { Icon, type IconName } from "@/design-system/v2";
import {
  getAllPois,
  getPoiById,
  readStreak,
  useMerit,
  useSaved,
  useVisited,
  type Poi,
  type SavedItem,
} from "@/lib/kudos/store";

// =====================================================================
// Inline fixtures (NOT in store · UI demonstration only)
// =====================================================================

interface RouteFixture {
  id: string;
  name: string;
  stops: number;
  duration: string;
  color: string;
  poiIds: string[];
}

interface CollectionFixture {
  id: string;
  name: string;
  lugares: number;
  icon: IconName;
  color: string;
  bgFromPoi: string;
}

const MIM_LEVEL_NAMES = [
  "Iniciado", "Explorador", "Curioso", "Descubridor", "Aventurero",
  "Cronista", "Explorador Experto", "Embajador", "Cartografo", "Visionario",
  "Maestro", "Leyenda", "Mitico",
];
function mimLevelBP(level: number): number {
  const bp = [0, 100, 250, 500, 800, 1200, 1700, 2300, 3000, 4000, 5500, 7500, 10000];
  return bp[Math.min(level, bp.length - 1)] ?? 0;
}

function buildRoutes(pois: ReadonlyArray<Poi>): ReadonlyArray<RouteFixture> {
  if (pois.length < 4) return [];
  const grab = (n: number, offset: number = 0) => pois.slice(offset, offset + n).map((p) => p.id);
  return [
    { id: "ruta-roma",        name: "Roma en 1 dia",        stops: 8,  duration: "6h",      color: "#8B6BFF", poiIds: grab(4, 0) },
    { id: "ruta-paris",       name: "Paris romantico",      stops: 12, duration: "2 dias",  color: "#FF3CAC", poiIds: grab(5, 0) },
    { id: "ruta-londres",     name: "Londres historico",    stops: 10, duration: "1 dia",   color: "#FF9A00", poiIds: grab(4, 0) },
    { id: "ruta-camino",      name: "Camino de Santiago",   stops: 18, duration: "12 dias", color: "#34D399", poiIds: grab(5, 1) },
    { id: "ruta-andalucia",   name: "Andalucia historica",  stops: 9,  duration: "4 dias",  color: "#FFD23F", poiIds: grab(4, 2) },
    { id: "ruta-peru",        name: "Imperio Inca",         stops: 7,  duration: "5 dias",  color: "#38BDF8", poiIds: grab(3, 3) },
  ];
}

function buildCollections(pois: ReadonlyArray<Poi>): ReadonlyArray<CollectionFixture> {
  if (pois.length < 1) return [];
  const pick = (i: number) => pois[Math.min(i, pois.length - 1)]?.heroImage ?? "";
  return [
    { id: "col-maravillas", name: "Maravillas del mundo",   lugares: 12, icon: "heart",       color: "#8B6BFF", bgFromPoi: pick(0) },
    { id: "col-ensueno",    name: "Viaje de ensueno",       lugares: 8,  icon: "moments",     color: "#FF9A00", bgFromPoi: pick(1) },
    { id: "col-historia",   name: "Historia & Cultura",     lugares: 15, icon: "culture",     color: "#38BDF8", bgFromPoi: pick(2) },
    { id: "col-aventura",   name: "Aventura & Naturaleza",  lugares: 9,  icon: "nature",      color: "#34D399", bgFromPoi: pick(3) },
    { id: "col-misterios",  name: "Misterios del mundo",    lugares: 7,  icon: "mind",        color: "#FF3CAC", bgFromPoi: pick(4) },
    { id: "col-gastro",     name: "Sabores del mundo",      lugares: 11, icon: "gift",        color: "#FFD23F", bgFromPoi: pick(5) },
    { id: "col-arquitectura", name: "Arquitectura icónica", lugares: 18, icon: "studio",      color: "#A78BFA", bgFromPoi: pick(6) },
    { id: "col-imperios",   name: "Imperios olvidados",     lugares: 6,  icon: "history",     color: "#F472B6", bgFromPoi: pick(7) },
  ];
}

// =====================================================================
// Component
// =====================================================================

export function MiMundoScreen() {
  const { saved, toggle } = useSaved();
  const { items: visitedItems } = useVisited();
  const { snapshot: meritSnap } = useMerit();
  const allPois = React.useMemo(() => getAllPois(), []);

  const savedEntries = React.useMemo<ReadonlyArray<{ poi: Poi; savedAt: number }>>(() => {
    const poiSaves = saved.filter((s: SavedItem) => s.kind === "poi");
    const joined: { poi: Poi; savedAt: number }[] = [];
    for (const s of poiSaves) {
      const p = getPoiById(s.id);
      if (p) joined.push({ poi: p, savedAt: s.savedAt });
    }
    joined.sort((a, b) => b.savedAt - a.savedAt);
    return joined;
  }, [saved]);

  const visitedEntries = React.useMemo<ReadonlyArray<{ poi: Poi; ts: number }>>(() => {
    const joined: { poi: Poi; ts: number }[] = [];
    for (const v of visitedItems) {
      const p = getPoiById(v.poiId);
      if (p) joined.push({ poi: p, ts: v.ts });
    }
    joined.sort((a, b) => b.ts - a.ts);
    return joined;
  }, [visitedItems]);

  const routes = React.useMemo(() => buildRoutes(allPois), [allPois]);
  const collections = React.useMemo(() => buildCollections(allPois), [allPois]);

  const [streakDays, setStreakDays] = React.useState(0);
  React.useEffect(() => {
    setStreakDays(readStreak().days || 0);
  }, [saved]);

  const stats = {
    guardados: savedEntries.length || 48,
    rutas: routes.length || 7,
    estuveAqui: visitedEntries.length || 23,
    favoritos: savedEntries.length || 12,
  };

  // Merit progress
  const prevBP = meritSnap.level <= 1 ? 0 : mimLevelBP(meritSnap.level - 1);
  const meritSpan = Math.max(1, meritSnap.nextLevelAt - prevBP);
  const meritCur = Math.max(0, Math.min(meritSnap.total - prevBP, meritSpan));
  const meritPct = Math.round((meritCur / meritSpan) * 100);
  const levelName = MIM_LEVEL_NAMES[Math.max(0, Math.min(meritSnap.level - 1, MIM_LEVEL_NAMES.length - 1))];

  // Demo saved cards = real saves OR fallback to first 4 POIs (visual demo)
  const guardadosDisplay = savedEntries.length > 0
    ? savedEntries.slice(0, 4)
    : allPois.slice(0, 4).map((p) => ({ poi: p, savedAt: Date.now() - 3600_000 }));

  // Demo visit cards = real visits OR fallback to next 5 POIs
  const visitsDisplay = visitedEntries.length > 0
    ? visitedEntries.slice(0, 5)
    : allPois.slice(0, 5).map((p, i) => ({ poi: p, ts: Date.now() - (i + 1) * 86400_000 * 30 }));

  return (
    <div className="kudos-mimundo" style={ROOT}>
      <div className="kudos-mimundo-grid" style={GRID}>
        <aside className="kudos-mimundo-side kudos-elev-1" style={SIDEBAR}>
          <SideNavItem icon="discover" label="Descubrir" href="/inicio" />
          <SideNavItem icon="map"      label="Mapa"      href="/mapa" />

          <div style={SIDE_GROUP_HEAD}>
            <span style={SIDE_GROUP_ICON}><Icon name="heart" size={14} /></span>
            <span style={SIDE_GROUP_LABEL}>MI MUNDO</span>
          </div>

          <SideNavItem icon="saved"     label="Guardados"   anchor="#guardados" active />
          <SideNavItem icon="connections" label="Rutas"      anchor="#rutas" />
          <SideNavItem icon="here"      label="Estuve aqu&iacute;" anchor="#estuve" />
          <SideNavItem icon="play"      label="Mis c&aacute;psulas" anchor="#capsulas" />
          <SideNavItem icon="more"      label="Notas"       anchor="#notas" />
          <SideNavItem icon="culture"   label="Colecciones" anchor="#colecciones" />
          <SideNavItem icon="people"    label="Amigos"      anchor="#amigos" />

          <div style={{ flex: 1, minHeight: 14 }} />

          <Link href="/merito" style={SIDE_MERIT_LINK} className="kudos-tap-lift kudos-elev-1">
            <span style={SIDE_MERIT_ICON}><Icon name="founder" size={14} /></span>
            <span>Mi m&eacute;rito</span>
          </Link>

          <div style={PREMIUM_CARD} className="kudos-elev-1">
            <div style={PREMIUM_HEAD}>
              <span aria-hidden style={PREMIUM_CROWN}>&#9819;</span>
              <span style={PREMIUM_LABEL}>KUDOS PREMIUM</span>
            </div>
            <p style={PREMIUM_DESC}>Desbloquea &eacute;pocas, c&aacute;psulas exclusivas y m&aacute;s beneficios.</p>
            <button type="button" style={PREMIUM_CTA} className="kudos-tap" disabled>Ver Premium</button>
          </div>
        </aside>

        <div style={MAIN_COL}>
          <header style={HEADER}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
              <h1 style={H1}>Mi Mundo</h1>
              <p style={LEAD}>Tus lugares, recuerdos y descubrimientos en un solo sitio.</p>
            </div>
            <button type="button" style={NEW_COLLECTION_CTA} className="kudos-tap" disabled>
              <Icon name="plus" size={14} />
              <span>Nueva colecci&oacute;n</span>
            </button>
          </header>

          {/* Merit hero strip · identity-first reputation */}
          <Link href="/merito" style={MERIT_STRIP} className="kudos-tap-lift kudos-elev-2" aria-label="Ver mi merito">
            <div style={MERIT_STRIP_LEFT}>
              <div style={MERIT_STRIP_RING}>
                <span style={MERIT_STRIP_RING_INNER}>E</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                <span style={MERIT_STRIP_LABEL}>Tu reputaci&oacute;n en KUDOS</span>
                <span style={MERIT_STRIP_LEVEL}>Nivel {meritSnap.level} . {levelName}</span>
              </div>
            </div>
            <div style={MERIT_STRIP_RIGHT}>
              <div style={MERIT_STRIP_NUMBERS}>
                <span style={MERIT_STRIP_TOTAL}>{meritSnap.total}</span>
                <span style={MERIT_STRIP_DIV}>/{meritSnap.nextLevelAt}</span>
                <span style={MERIT_STRIP_PTS}>pts</span>
              </div>
              <div style={MERIT_STRIP_TRACK}>
                <div style={{ ...MERIT_STRIP_FILL, width: `${meritPct}%` }} />
              </div>
              <span style={MERIT_STRIP_CTA}>
                <span>Ver m&eacute;rito</span>
                <Icon name="chevron-right" size={12} />
              </span>
            </div>
          </Link>

          <section style={STATS_ROW}>
            <StatCard icon="saved"        color="#6C3CFF" label="Guardados"   value={stats.guardados} />
            <StatCard icon="connections"  color="#FF3CAC" label="Rutas"       value={stats.rutas} />
            <StatCard icon="here"         color="#34C759" label="Estuve aqu&iacute;" value={stats.estuveAqui} />
            <StatCard icon="heart"        color="#FF3CAC" label="Favoritos"   value={stats.favoritos} />
          </section>

          {streakDays > 0 ? (
            <div style={STREAK_CHIP}>
              <Icon name="moments" size={12} />
              <span>{streakDays === 1 ? "1 d&iacute;a de racha" : `${streakDays} d&iacute;as de racha`}</span>
            </div>
          ) : null}

          {/* ── GUARDADOS · hero rail (image dominant + content panel) ── */}
          <Section id="guardados" title="Guardados" href="#guardados">
            <div style={GUARDADOS_GRID}>
              {guardadosDisplay.slice(0, 4).map(({ poi, savedAt }) => (
                <GuardadoCard key={poi.id} poi={poi} savedAt={savedAt} onRemove={() => toggle("poi", poi.id)} />
              ))}
            </div>
          </Section>

          {/* ── RUTAS · timeline-dot route cards ──────────────────── */}
          <Section id="rutas" title="Rutas" mute={routes.length === 0}>
            {routes.length > 0 ? (
              <div style={RUTAS_GRID}>
                {routes.map((r) => (
                  <RouteCard key={r.id} route={r} pois={allPois} />
                ))}
              </div>
            ) : (
              <EmptyMini text="Aun no has creado rutas. Pronto podras unir lugares en itinerarios." />
            )}
          </Section>

          {/* ── ESTUVE AQUI · horizontal visit memory rail ────────── */}
          <Section id="estuve" title="Estuve aqu&iacute;">
            <div style={VISIT_RAIL} className="kudos-no-scrollbar kudos-rail-fade">
              {visitsDisplay.map(({ poi, ts }) => (
                <VisitMemoryCard key={poi.id} poi={poi} visitedAt={ts} />
              ))}
            </div>
          </Section>

          {/* ── COLECCIONES · category-icon collection covers ─────── */}
          <Section id="colecciones" title="Colecciones">
            <div style={COLECCION_GRID}>
              {collections.map((c) => (
                <CollectionCard key={c.id} c={c} />
              ))}
            </div>
          </Section>

          <div style={{ height: 32 }} />
        </div>
      </div>

      <style>{`
        @media (max-width: 1023.98px) {
          .kudos-mimundo-grid { grid-template-columns: 1fr !important; }
          .kudos-mimundo-side { display: none !important; }
        }
        @media (max-width: 640px) {
          .kudos-mimundo { padding-left: 16px !important; padding-right: 16px !important; }
        }
      `}</style>
    </div>
  );
}

// =====================================================================
// Subcomponents
// =====================================================================

function SideNavItem({ icon, label, href, anchor, active }: { icon: IconName; label: string; href?: string; anchor?: string; active?: boolean }) {
  const style = active ? SIDE_ITEM_ACTIVE : SIDE_ITEM;
  const content = (
    <>
      <span style={active ? SIDE_ITEM_ICON_ACTIVE : SIDE_ITEM_ICON}><Icon name={icon} size={14} /></span>
      <span dangerouslySetInnerHTML={{ __html: label }} />
    </>
  );
  if (href) return <Link href={href} style={style} className="kudos-tap">{content}</Link>;
  if (anchor) return <a href={anchor} style={style} className="kudos-tap">{content}</a>;
  return <span style={style}>{content}</span>;
}

function StatCard({ icon, color, label, value }: { icon: IconName; color: string; label: string; value: number }) {
  return (
    <div style={STAT_CARD} className="kudos-elev-1">
      <span style={{ ...STAT_ICON, background: `${color}33`, color, boxShadow: `0 8px 18px -6px ${color}55` }}>
        <Icon name={icon} size={18} />
      </span>
      <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
        <span style={STAT_NUMBER}>{value}</span>
        <span style={STAT_LABEL} dangerouslySetInnerHTML={{ __html: label }} />
      </div>
    </div>
  );
}

function Section({ id, title, href, mute, children }: { id: string; title: string; href?: string; mute?: boolean; children: React.ReactNode }) {
  return (
    <section id={id} style={SECTION}>
      <header style={SECTION_HEAD}>
        <h2 style={SECTION_TITLE} dangerouslySetInnerHTML={{ __html: title }} />
        <a href={href ?? "#"} style={mute ? SEE_ALL_MUTE : SEE_ALL}>
          <span>Ver todos</span>
          <Icon name="chevron-right" size={14} />
        </a>
      </header>
      {children}
    </section>
  );
}

// ── Guardados card (hero image top + content below) ──────────────
function GuardadoCard({ poi, savedAt: _savedAt, onRemove }: { poi: Poi; savedAt: number; onRemove: () => void }) {
  const stop = (e: React.SyntheticEvent) => { e.preventDefault(); e.stopPropagation(); };
  return (
    <Link href={`/poi/${encodeURIComponent(poi.id)}`} style={GUARDADO_CARD} className="kudos-tap-lift kudos-elev-2" aria-label={`Abrir ${poi.name}`}>
      <div style={GUARDADO_IMG} className="kudos-media kudos-vignette">
        <div aria-hidden className="kudos-media-cover kudos-kenburns" style={{ backgroundImage: `url("${poi.heroImage}")` }} />
        <button type="button" aria-label="Quitar guardado" onClick={(e) => { stop(e); onRemove(); }} style={GUARDADO_BOOKMARK} className="kudos-tap">
          <Icon name="saved" size={15} />
        </button>
      </div>
      <div style={GUARDADO_BODY}>
        <h3 style={GUARDADO_TITLE}>{poi.name}</h3>
        <div style={GUARDADO_META}>
          <span style={GUARDADO_LOC}><Icon name="place" size={11} /><span>{poi.country}</span></span>
          <span style={GUARDADO_RATING}><span style={STAR}>&#9733;</span><span>{poi.rating.toFixed(1)}</span></span>
        </div>
      </div>
    </Link>
  );
}

// ── Route card · multi-stop avatar strip + line (P12.5) ──────────
function RouteCard({ route, pois }: { route: RouteFixture; pois: ReadonlyArray<Poi> }) {
  const stops = route.poiIds
    .map((id) => pois.find((p) => p.id === id))
    .filter((p): p is Poi => !!p);
  const visibleStops = stops.slice(0, 5);
  const overflow = Math.max(0, route.stops - visibleStops.length);
  return (
    <article style={ROUTE_CARD} className="kudos-tap-lift kudos-elev-1">
      <h3 style={ROUTE_TITLE}>{route.name}</h3>

      {/* Multi-stop avatar strip with connector line */}
      <div style={ROUTE_STRIP}>
        <span aria-hidden style={{ ...ROUTE_STRIP_LINE, background: `linear-gradient(90deg, ${route.color}88, ${route.color}22)` }} />
        {visibleStops.map((p, i) => (
          <div
            key={p.id}
            style={{
              ...ROUTE_STOP,
              padding: i === 0 ? 2 : 1,
              background: i === 0
                ? `linear-gradient(135deg, ${route.color}, rgba(255,154,0,0.6))`
                : `${route.color}55`,
              zIndex: visibleStops.length - i,
              marginLeft: i === 0 ? 0 : -10,
            }}
            title={p.name}
          >
            <div aria-hidden style={{ ...ROUTE_STOP_IMG, backgroundImage: `url("${p.heroImage}")` }} />
          </div>
        ))}
        {overflow > 0 ? (
          <div style={{ ...ROUTE_STOP_MORE, marginLeft: -10, zIndex: 0, borderColor: `${route.color}66` }}>
            <span>+{overflow}</span>
          </div>
        ) : null}
      </div>

      <div style={ROUTE_META}>
        <span style={ROUTE_META_ITEM}>
          <Icon name="here" size={11} />
          <span>{route.stops} paradas</span>
        </span>
        <span style={ROUTE_DIVIDER} aria-hidden>·</span>
        <span style={ROUTE_META_ITEM}>
          <Icon name="history" size={11} />
          <span>{route.duration}</span>
        </span>
      </div>
    </article>
  );
}

// ── Visit memory card (horizontal rail thumb + check + date) ────
function VisitMemoryCard({ poi, visitedAt }: { poi: Poi; visitedAt: number }) {
  return (
    <Link href={`/poi/${encodeURIComponent(poi.id)}`} style={VISIT_CARD} className="kudos-tap-lift kudos-elev-1" aria-label={`Abrir ${poi.name}`}>
      <div style={VISIT_IMG} className="kudos-media">
        <div aria-hidden className="kudos-media-cover kudos-kenburns" style={{ backgroundImage: `url("${poi.heroImage}")` }} />
        <span style={VISIT_CHECK} aria-hidden><Icon name="discover" size={14} /></span>
      </div>
      <div style={VISIT_BODY}>
        <h4 style={VISIT_CITY}>{visitCityShort(poi)}</h4>
        <p style={VISIT_PLACE}>{poi.name}</p>
        <p style={VISIT_DATE}>{formatDate(visitedAt)}</p>
      </div>
    </Link>
  );
}

// ── Collection card (category-icon cover) ───────────────────────
function CollectionCard({ c }: { c: CollectionFixture }) {
  return (
    <article style={COLECCION_CARD} className="kudos-tap-lift kudos-elev-2">
      <div style={COLECCION_IMG} className="kudos-media kudos-vignette">
        <div aria-hidden className="kudos-media-cover kudos-kenburns" style={{ backgroundImage: `url("${c.bgFromPoi}")` }} />
        <span style={{ ...COLECCION_ICON, background: c.color, boxShadow: `0 8px 20px -6px ${c.color}88` }}>
          <Icon name={c.icon} size={16} />
        </span>
      </div>
      <div style={COLECCION_BODY}>
        <h3 style={COLECCION_TITLE}>{c.name}</h3>
        <p style={COLECCION_COUNT}>{c.lugares} lugares</p>
      </div>
    </article>
  );
}

function EmptyMini({ text }: { text: string }) {
  return (
    <div style={EMPTY_MINI}>
      <span aria-hidden style={EMPTY_MINI_GLYPH}>&#10039;</span>
      <p style={EMPTY_MINI_TEXT}>{text}</p>
    </div>
  );
}

// =====================================================================
// Utils
// =====================================================================

function visitCityShort(poi: Poi): string {
  const c = poi.country.split(",")[0]?.trim() ?? poi.country;
  return c;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${d.getDate()} ${months[d.getMonth()] ?? "ene"} ${d.getFullYear()}`;
}

// =====================================================================
// Styles
// =====================================================================

const ROOT: React.CSSProperties = {
  width: "100%", maxWidth: 1280, margin: "0 auto",
  padding: "16px 24px 0",
  color: "var(--kudos-ink)",
  fontFamily: "var(--kudos-font-body)",
};

const GRID: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "232px minmax(0, 1fr)",
  gap: 28,
};

const SIDEBAR: React.CSSProperties = {
  position: "sticky",
  top: "calc(var(--app-topbar-h, 56px) + var(--kudos-safe-top, 0px) + 14px)",
  alignSelf: "start",
  display: "flex", flexDirection: "column", gap: 4,
  padding: "12px 10px",
  borderRadius: 18,
  background: "rgba(255,255,255,0.025)",
  border: "1px solid rgba(255,255,255,0.06)",
  maxHeight: "calc(var(--kudos-dvh, 1vh) * 100 - var(--app-topbar-h, 56px) - var(--app-bottomnav-h, 72px) - 40px)",
  overflowY: "auto",
};

const SIDE_ITEM_BASE: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 12,
  padding: "10px 12px", borderRadius: 12,
  textDecoration: "none",
  color: "rgba(242,242,247,0.82)",
  fontFamily: "var(--kudos-font-body)",
  fontSize: 13.5, fontWeight: 500,
};
const SIDE_ITEM: React.CSSProperties = SIDE_ITEM_BASE;
const SIDE_ITEM_ACTIVE: React.CSSProperties = {
  ...SIDE_ITEM_BASE,
  background: "linear-gradient(90deg, rgba(108,60,255,0.22) 0%, rgba(108,60,255,0.08) 100%)",
  color: "var(--kudos-accent-bright, #8B6BFF)",
  fontWeight: 700,
  borderLeft: "3px solid var(--kudos-accent-bright, #8B6BFF)",
  paddingLeft: 9,
};
const SIDE_ITEM_ICON: React.CSSProperties = {
  width: 26, height: 26, borderRadius: 8,
  background: "rgba(255,255,255,0.04)",
  color: "rgba(242,242,247,0.62)",
  display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
};
const SIDE_ITEM_ICON_ACTIVE: React.CSSProperties = {
  ...SIDE_ITEM_ICON,
  background: "rgba(108,60,255,0.30)",
  color: "var(--kudos-accent-bright, #8B6BFF)",
};
const SIDE_GROUP_HEAD: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 8,
  padding: "14px 12px 6px",
  fontSize: 10.5, fontWeight: 700, letterSpacing: "0.18em",
  color: "var(--kudos-accent-bright, #8B6BFF)",
  textTransform: "uppercase",
};
const SIDE_GROUP_ICON: React.CSSProperties = { display: "inline-flex", color: "var(--kudos-accent-bright, #8B6BFF)" };
const SIDE_GROUP_LABEL: React.CSSProperties = { letterSpacing: "0.16em" };

const SIDE_MERIT_LINK: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 10,
  padding: "12px 12px", borderRadius: 12,
  background: "linear-gradient(135deg, rgba(255,154,0,0.10) 0%, rgba(108,60,255,0.20) 100%)",
  border: "1px solid rgba(108,60,255,0.32)",
  color: "var(--kudos-ink)",
  textDecoration: "none",
  fontSize: 13, fontWeight: 600,
  marginBottom: 10,
};
const SIDE_MERIT_ICON: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 8,
  background: "var(--kudos-gradient-cta)",
  color: "#1A1333",
  display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
};

const PREMIUM_CARD: React.CSSProperties = {
  padding: 16, borderRadius: 14,
  background: "linear-gradient(135deg, rgba(108,60,255,0.18) 0%, rgba(255,154,0,0.12) 100%)",
  border: "1px solid rgba(108,60,255,0.32)",
  display: "flex", flexDirection: "column", gap: 10,
};
const PREMIUM_HEAD: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6 };
const PREMIUM_CROWN: React.CSSProperties = { color: "var(--kudos-accent-yellow, #FFD23F)", fontSize: 16, lineHeight: 1 };
const PREMIUM_LABEL: React.CSSProperties = {
  fontSize: 10.5, fontWeight: 700, letterSpacing: "0.18em",
  color: "var(--kudos-accent-bright, #8B6BFF)", textTransform: "uppercase",
};
const PREMIUM_DESC: React.CSSProperties = { margin: 0, fontSize: 12, color: "rgba(242,242,247,0.72)", lineHeight: 1.4 };
const PREMIUM_CTA: React.CSSProperties = {
  padding: "10px 14px", borderRadius: 999,
  background: "transparent",
  border: "1px solid rgba(108,60,255,0.55)",
  color: "var(--kudos-accent-bright, #8B6BFF)",
  fontSize: 12.5, fontWeight: 600,
  cursor: "default", opacity: 0.9,
};

const MAIN_COL: React.CSSProperties = {
  display: "flex", flexDirection: "column", gap: 26, minWidth: 0,
};

const HEADER: React.CSSProperties = {
  display: "flex", alignItems: "flex-start", justifyContent: "space-between",
  gap: 16, flexWrap: "wrap",
};
const H1: React.CSSProperties = {
  margin: 0,
  fontFamily: "var(--kudos-font-display)",
  fontSize: "clamp(28px, 3.4vw, 36px)",
  fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.05,
  color: "var(--kudos-ink)",
};
const LEAD: React.CSSProperties = {
  margin: 0, fontSize: 13.5,
  color: "rgba(242,242,247,0.62)", maxWidth: 560,
};
const NEW_COLLECTION_CTA: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "11px 20px", borderRadius: 999,
  background: "transparent",
  border: "1px solid rgba(108,60,255,0.55)",
  color: "var(--kudos-accent-bright, #8B6BFF)",
  cursor: "default", fontSize: 13, fontWeight: 600,
  opacity: 0.88, flexShrink: 0,
};

// Merit strip
const MERIT_STRIP: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, auto) minmax(0, 1fr)",
  gap: 18, alignItems: "center",
  padding: "16px 18px",
  borderRadius: 16,
  background: "linear-gradient(135deg, rgba(255,154,0,0.08) 0%, rgba(108,60,255,0.16) 100%)",
  border: "1px solid rgba(108,60,255,0.32)",
  textDecoration: "none",
  color: "var(--kudos-ink)",
};
const MERIT_STRIP_LEFT: React.CSSProperties = { display: "flex", alignItems: "center", gap: 12 };
const MERIT_STRIP_RING: React.CSSProperties = {
  width: 50, height: 50, borderRadius: "50%",
  padding: 2, background: "var(--kudos-gradient-cta)",
  flexShrink: 0,
};
const MERIT_STRIP_RING_INNER: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  width: "100%", height: "100%", borderRadius: "50%",
  background: "var(--kudos-bg, #1A1333)",
  color: "var(--kudos-ink)",
  fontFamily: "var(--kudos-font-display)",
  fontWeight: 700, fontSize: 18,
};
const MERIT_STRIP_LABEL: React.CSSProperties = { fontSize: 11, color: "rgba(242,242,247,0.62)" };
const MERIT_STRIP_LEVEL: React.CSSProperties = {
  fontSize: 14, fontWeight: 700,
  color: "var(--kudos-accent-bright, #8B6BFF)",
};
const MERIT_STRIP_RIGHT: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6, minWidth: 0 };
const MERIT_STRIP_NUMBERS: React.CSSProperties = { display: "inline-flex", alignItems: "baseline", gap: 4 };
const MERIT_STRIP_TOTAL: React.CSSProperties = {
  fontFamily: "var(--kudos-font-display)",
  fontSize: 22, fontWeight: 700, letterSpacing: "-0.01em",
  color: "var(--kudos-ink)", lineHeight: 1,
};
const MERIT_STRIP_DIV: React.CSSProperties = { fontSize: 12, fontWeight: 500, color: "rgba(242,242,247,0.45)" };
const MERIT_STRIP_PTS: React.CSSProperties = { fontSize: 11, color: "rgba(242,242,247,0.45)", marginLeft: 3 };
const MERIT_STRIP_TRACK: React.CSSProperties = {
  height: 6, borderRadius: 999,
  background: "rgba(255,255,255,0.06)", overflow: "hidden",
};
const MERIT_STRIP_FILL: React.CSSProperties = {
  height: "100%", borderRadius: 999,
  background: "var(--kudos-gradient-cta)",
  boxShadow: "0 0 8px rgba(108,60,255,0.35)",
  transition: "width 320ms",
};
const MERIT_STRIP_CTA: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 4,
  color: "var(--kudos-accent-bright, #8B6BFF)",
  fontSize: 11.5, fontWeight: 600,
  alignSelf: "flex-end",
};

const STREAK_CHIP: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "6px 12px", borderRadius: 999,
  background: "rgba(255,154,0,0.10)",
  border: "1px solid rgba(255,154,0,0.30)",
  color: "var(--kudos-accent-orange, #FF9A00)",
  fontFamily: "var(--kudos-font-mono)",
  fontSize: 11, letterSpacing: "0.06em",
  width: "fit-content",
};

const STATS_ROW: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12,
};
const STAT_CARD: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 14,
  padding: 16, borderRadius: 16,
  background: "rgba(255,255,255,0.025)",
  border: "1px solid rgba(255,255,255,0.06)",
};
const STAT_ICON: React.CSSProperties = {
  width: 44, height: 44, borderRadius: 12,
  display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
};
const STAT_NUMBER: React.CSSProperties = {
  fontFamily: "var(--kudos-font-display)",
  fontSize: 24, fontWeight: 800, letterSpacing: "-0.015em",
  color: "var(--kudos-ink)", lineHeight: 1,
};
const STAT_LABEL: React.CSSProperties = {
  fontSize: 12, color: "rgba(242,242,247,0.68)",
};

const SECTION: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 14 };
const SECTION_HEAD: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
};
const SECTION_TITLE: React.CSSProperties = {
  margin: 0,
  fontFamily: "var(--kudos-font-display)",
  fontSize: 22, fontWeight: 700, letterSpacing: "-0.015em",
  color: "var(--kudos-ink)",
};
const SEE_ALL: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 4,
  color: "var(--kudos-accent-bright, #8B6BFF)",
  fontSize: 12.5, fontWeight: 600, textDecoration: "none",
};
const SEE_ALL_MUTE: React.CSSProperties = { ...SEE_ALL, color: "rgba(242,242,247,0.35)" };

// ── GUARDADOS · grammar ──────────────────────────────────────────
const GUARDADOS_GRID: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
  gap: 14,
};
const GUARDADO_CARD: React.CSSProperties = {
  display: "flex", flexDirection: "column",
  borderRadius: 18, overflow: "hidden",
  background: "transparent",
  border: "1px solid rgba(255,255,255,0.06)",
  textDecoration: "none", color: "var(--kudos-ink)",
};
const GUARDADO_IMG: React.CSSProperties = {
  position: "relative",
  width: "100%",
  aspectRatio: "4/3",
};
const GUARDADO_BOOKMARK: React.CSSProperties = {
  position: "absolute", top: 10, right: 10, zIndex: 2,
  width: 34, height: 34, borderRadius: 10,
  background: "rgba(10,6,18,0.78)",
  border: "1px solid rgba(255,255,255,0.14)",
  color: "var(--kudos-accent-bright, #8B6BFF)",
  cursor: "pointer",
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  backdropFilter: "blur(6px)",
  WebkitBackdropFilter: "blur(6px)",
};
const GUARDADO_BODY: React.CSSProperties = {
  padding: "14px 14px 16px",
  display: "flex", flexDirection: "column", gap: 6,
};
const GUARDADO_TITLE: React.CSSProperties = {
  margin: 0,
  fontFamily: "var(--kudos-font-display)",
  fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em",
  color: "var(--kudos-ink)",
};
const GUARDADO_META: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "space-between",
  fontSize: 11.5,
};
const GUARDADO_LOC: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 4,
  color: "rgba(242,242,247,0.72)",
};
const GUARDADO_RATING: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 4,
  color: "var(--kudos-accent-yellow, #FFD23F)",
  fontWeight: 700,
};

// ── RUTAS · grammar ──────────────────────────────────────────────
const RUTAS_GRID: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
  gap: 12,
};
const ROUTE_CARD: React.CSSProperties = {
  display: "flex", flexDirection: "column", gap: 14,
  padding: 16, borderRadius: 16,
  background: "rgba(255,255,255,0.025)",
  border: "1px solid rgba(255,255,255,0.06)",
};
const ROUTE_TOP: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 14,
};
const ROUTE_AVATAR: React.CSSProperties = {
  width: 56, height: 56, borderRadius: "50%",
  flexShrink: 0,
};
const ROUTE_AVATAR_IMG: React.CSSProperties = {
  width: "100%", height: "100%", borderRadius: "50%",
  backgroundSize: "cover", backgroundPosition: "center",
  border: "2px solid #1A1333",
};
const ROUTE_TITLE: React.CSSProperties = {
  margin: 0,
  fontFamily: "var(--kudos-font-display)",
  fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em",
  color: "var(--kudos-ink)",
};
const ROUTE_TIMELINE: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 0, marginTop: 6,
};
const ROUTE_DOT: React.CSSProperties = {
  width: 12, height: 12, borderRadius: "50%",
  border: "2px solid",
  flexShrink: 0,
};
const ROUTE_LINK_LINE: React.CSSProperties = {
  flex: 1, height: 2,
  margin: "0 2px",
  borderRadius: 2,
};
const ROUTE_META: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 18,
  paddingTop: 4,
  borderTop: "1px dashed rgba(255,255,255,0.08)",
  paddingLeft: 0,
};
const ROUTE_META_ITEM: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 5,
  fontSize: 11.5, color: "rgba(242,242,247,0.72)",
  paddingTop: 10,
};

// ── ESTUVE AQUI · grammar ───────────────────────────────────────
const VISIT_RAIL: React.CSSProperties = {
  display: "flex", gap: 12,
  overflowX: "auto",
  paddingBottom: 4,
  scrollSnapType: "x mandatory",
  WebkitOverflowScrolling: "touch",
};
const VISIT_CARD: React.CSSProperties = {
  position: "relative",
  flex: "0 0 160px",
  display: "flex", flexDirection: "column",
  borderRadius: 14, overflow: "hidden",
  border: "1px solid rgba(255,255,255,0.06)",
  background: "transparent",
  textDecoration: "none", color: "var(--kudos-ink)",
  scrollSnapAlign: "start",
};
const VISIT_IMG: React.CSSProperties = {
  position: "relative", width: "100%",
  aspectRatio: "1/1",
};
const VISIT_CHECK: React.CSSProperties = {
  position: "absolute", top: 8, left: 8, zIndex: 2,
  width: 26, height: 26, borderRadius: "50%",
  background: "#34C759", color: "#0A0612",
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  boxShadow: "0 6px 14px -4px rgba(52,199,89,0.6)",
};
const VISIT_BODY: React.CSSProperties = {
  padding: "10px 12px 12px",
  display: "flex", flexDirection: "column", gap: 1,
};
const VISIT_CITY: React.CSSProperties = {
  margin: 0,
  fontFamily: "var(--kudos-font-display)",
  fontSize: 14, fontWeight: 700, letterSpacing: "-0.01em",
  color: "var(--kudos-ink)",
  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
};
const VISIT_PLACE: React.CSSProperties = {
  margin: 0, fontSize: 11,
  color: "rgba(242,242,247,0.72)",
  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
};
const VISIT_DATE: React.CSSProperties = {
  margin: "2px 0 0", fontSize: 10.5,
  fontFamily: "var(--kudos-font-mono)",
  color: "rgba(242,242,247,0.5)",
};

// ── COLECCIONES · grammar ───────────────────────────────────────
const COLECCION_GRID: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
  gap: 14,
};
const COLECCION_CARD: React.CSSProperties = {
  position: "relative",
  display: "flex", flexDirection: "column",
  borderRadius: 18, overflow: "hidden",
  background: "transparent",
  border: "1px solid rgba(255,255,255,0.06)",
  color: "var(--kudos-ink)",
};
const COLECCION_IMG: React.CSSProperties = {
  position: "relative", width: "100%",
  aspectRatio: "4/3",
};
const COLECCION_ICON: React.CSSProperties = {
  position: "absolute", top: 14, left: 14, zIndex: 3,
  width: 38, height: 38, borderRadius: "50%",
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  color: "#fff",
};
const COLECCION_BODY: React.CSSProperties = {
  padding: "14px 14px 16px",
  display: "flex", flexDirection: "column", gap: 3,
};
const COLECCION_TITLE: React.CSSProperties = {
  margin: 0,
  fontFamily: "var(--kudos-font-display)",
  fontSize: 15.5, fontWeight: 700, letterSpacing: "-0.01em",
  color: "var(--kudos-ink)",
};
const COLECCION_COUNT: React.CSSProperties = {
  margin: 0, fontSize: 11.5,
  color: "rgba(242,242,247,0.62)",
};

// ── EMPTY ──────────────────────────────────────────────────────
const EMPTY_MINI: React.CSSProperties = {
  padding: "20px 18px", borderRadius: 14,
  background: "rgba(255,255,255,0.02)",
  border: "1px dashed rgba(255,255,255,0.10)",
  display: "flex", alignItems: "center", gap: 12,
};
const EMPTY_MINI_GLYPH: React.CSSProperties = {
  width: 36, height: 36, borderRadius: 10,
  background: "rgba(108,60,255,0.14)",
  color: "var(--kudos-accent-bright, #8B6BFF)",
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  fontSize: 16, flexShrink: 0,
};
const EMPTY_MINI_TEXT: React.CSSProperties = {
  margin: 0, fontSize: 13,
  color: "rgba(242,242,247,0.65)", lineHeight: 1.5,
};

const STAR: React.CSSProperties = {
  color: "var(--kudos-accent-yellow, #FFD23F)", lineHeight: 1,
};

// ── Route card · multi-stop strip styles (P12.5) ─────────────────
const ROUTE_STRIP: React.CSSProperties = {
  position: "relative",
  display: "flex",
  alignItems: "center",
  padding: "4px 0 6px",
  marginTop: 8,
  minHeight: 44,
};
const ROUTE_STRIP_LINE: React.CSSProperties = {
  position: "absolute",
  top: "50%",
  left: 16,
  right: 16,
  height: 2,
  borderRadius: 2,
  transform: "translateY(-50%)",
  zIndex: 0,
};
const ROUTE_STOP: React.CSSProperties = {
  width: 36, height: 36, borderRadius: "50%",
  flexShrink: 0,
  boxShadow: "0 4px 10px -4px rgba(0,0,0,0.55)",
};
const ROUTE_STOP_IMG: React.CSSProperties = {
  width: "100%", height: "100%", borderRadius: "50%",
  backgroundSize: "cover", backgroundPosition: "center",
  border: "2px solid #1A1333",
};
const ROUTE_STOP_MORE: React.CSSProperties = {
  width: 34, height: 34, borderRadius: "50%",
  background: "rgba(10,6,18,0.85)",
  border: "1.5px solid rgba(108,60,255,0.55)",
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  fontFamily: "var(--kudos-font-body)",
  fontSize: 11, fontWeight: 700,
  color: "rgba(242,242,247,0.85)",
};
const ROUTE_DIVIDER: React.CSSProperties = {
  color: "rgba(255,255,255,0.22)",
  fontWeight: 300,
};
