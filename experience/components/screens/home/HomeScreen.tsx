"use client";

/**
 * KUDOS . HomeScreen . Mockup-faithful visual reconstruction (P10.5).
 *
 * Layout matches the approved consumer mockup 1:1:
 *   . pill switcher (DESCUBRIR active / MAPA)
 *   . hero card = image (top ~55%) + dark content panel (title, desc, meta,
 *     action pills) BELOW the image. Chip overlay sits at the bottom edge
 *     of the image.
 *   . 2-up medium cards same image-top / content-bottom structure.
 *   . Cerca de ti rail = square thumb + distance pill overlay + content
 *     panel below (name + subtitle).
 *   . Sticky map panel (desktop) with photo bubbles, gradient ring on
 *     active POI, rating chip, controls stack and "Explorar esta area" CTA.
 *
 * NOTHING in store / routing / share-merit dispatch is changed.
 */
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/design-system/v2";
import { VideoCapsule } from "@/components/media/VideoCapsule";
import { HomeMapPanel } from "@/components/media/HomeMapPanel";
import {
  getAllPois,
  getFeaturedCapsuleForPoi,
  getNearbyPois,
  useSaved,
  type Capsule,
  type Poi,
} from "@/lib/kudos/store";
import { useGeolocation } from "@/lib/geo/useGeolocation";

// =====================================================================
// Component
// =====================================================================

export function HomeScreen() {
  const router = useRouter();
  const allPois = React.useMemo(() => getAllPois(), []);
  const { has, toggle } = useSaved();
  const geo = useGeolocation();

  const heroPoi = allPois[0] ?? null;
  const heroCap = heroPoi ? getFeaturedCapsuleForPoi(heroPoi.id) ?? null : null;
  // P13.2 · prove what the hero is at every render
  console.info(
    "[KUDOS] HOME_RENDER ·",
    "heroPoi.id =", heroPoi?.id,
    "· heroPoi.name =", heroPoi?.name,
    "· heroCap.id =", heroCap?.id,
    "· heroCap.title =", heroCap?.title,
    "· heroCap.clipSrc =", heroCap?.clipSrc,
    "· heroCap.poster =", heroCap?.poster,
  );

  const mediumPairs = React.useMemo<ReadonlyArray<{ poi: Poi; cap: Capsule }>>(() => {
    return allPois.slice(1, 3).flatMap((p) => {
      const c = getFeaturedCapsuleForPoi(p.id);
      return c ? [{ poi: p, cap: c }] : [];
    });
  }, [allPois]);

  const nearby = React.useMemo<ReadonlyArray<{ poi: Poi; distanceKm: number | null }>>(() => {
    if (geo.status === "granted" && geo.coords) {
      const list = getNearbyPois({ lat: geo.coords.lat, lng: geo.coords.lng }, 4);
      return list.map((p) => ({ poi: p, distanceKm: haversineKm(geo.coords!, p) }));
    }
    return allPois.slice(3, 7).map((p) => ({ poi: p, distanceKm: null }));
  }, [geo.status, geo.coords, allPois]);

  // Trending hoy · 6 cards sorted by rating desc (skips hero + mediums to avoid duplicates)
  const trending = React.useMemo<ReadonlyArray<{ poi: Poi; cap: Capsule | null; views: string }>>(() => {
    const exclude = new Set([heroPoi?.id, ...mediumPairs.map((m) => m.poi.id)].filter(Boolean) as string[]);
    const pool = allPois
      .filter((p) => !exclude.has(p.id))
      .slice()
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 6);
    const labels = ["12.4k vistas", "8.7k vistas", "6.2k vistas", "4.8k vistas", "3.5k vistas", "2.1k vistas"];
    return pool.map((p, i) => ({
      poi: p,
      cap: getFeaturedCapsuleForPoi(p.id) ?? null,
      views: labels[i] ?? "1k vistas",
    }));
  }, [allPois, heroPoi, mediumPairs]);

  const mapBubbles = React.useMemo(() => allPois.slice(0, 5), [allPois]);

  if (!heroPoi || !heroCap) {
    return <main style={EMPTY}>Sin capsulas todavia.</main>;
  }

  const onSave = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggle("poi", id);
  };
  const onShare = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("kudos:share-capsule:open", { detail: { poiId: id } }));
    }
  };
  const onMapJump = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/mapa?focus=${encodeURIComponent(id)}`);
  };

  return (
    <div className="kudos-home" style={ROOT}>
      {/* === Context pill switcher ============================== */}
      <div style={SWITCHER_WRAP}>
        <div style={SWITCHER}>
          <button type="button" style={PILL_ACTIVE} aria-pressed="true">
            <Icon name="discover" size={14} />
            <span>DESCUBRIR</span>
            <span aria-hidden style={PILL_UNDERLINE} />
          </button>
          <button type="button" style={PILL_IDLE} onClick={() => router.push("/world")}>
            <Icon name="map" size={14} />
            <span>MAPA</span>
          </button>
        </div>
      </div>

      {/* === Split: feed (left) + map panel (right) ============= */}
      <div className="kudos-home-split" style={SPLIT}>
        <div style={FEED_COL}>
          {/* SECTION 1 . Para ti header + Hero card -------------- */}
          <section style={SECTION}>
            <header style={SECTION_HEAD}>
              <div style={SECTION_TITLE_WRAP}>
                <span aria-hidden style={EYEBROW_STAR} className="kudos-gradient-text">✦</span>
                <h2 className="kudos-h-med" style={SECTION_TITLE}>Para ti</h2>
              </div>
              <Link href="/world" style={SEE_ALL}>
                <span>Ver todo</span>
                <Icon name="chevron-right" size={14} />
              </Link>
            </header>
            <p style={SECTION_SUB}>Capsulas que merecen ser descubiertas</p>

            <div
              role="link"
              tabIndex={0}
              onPointerDownCapture={(e) => console.info("[KUDOS] HERO_WRAPPER_POINTERDOWN_CAPTURE · target =", (e.target as HTMLElement)?.tagName, "· class =", (e.target as HTMLElement)?.className)}
              onPointerDown={(e) => console.info("[KUDOS] HERO_WRAPPER_POINTERDOWN_BUBBLE · target =", (e.target as HTMLElement)?.tagName)}
              onClickCapture={(e) => console.info("[KUDOS] HERO_WRAPPER_CLICK_CAPTURE · target =", (e.target as HTMLElement)?.tagName, "· defaultPrevented =", e.defaultPrevented)}
              onClick={(e) => {
                console.info("[KUDOS] HERO_WRAPPER_CLICK_BUBBLE · target =", (e.target as HTMLElement)?.tagName, "· defaultPrevented =", e.defaultPrevented, "· isPropagationStopped =", e.isPropagationStopped());
                console.info("[KUDOS] BEFORE_NAV · heroPoi.id =", heroPoi.id, "· heroCap.id =", heroCap?.id, "· heroCap.clipSrc =", heroCap?.clipSrc);
                console.info("[KUDOS] HERO_WRAPPER calling router.push to /poi/" + encodeURIComponent(heroPoi.id));
                router.push(`/poi/${encodeURIComponent(heroPoi.id)}`);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  router.push(`/poi/${encodeURIComponent(heroPoi.id)}`);
                }
              }}
              style={{ ...HERO_CARD, cursor: "pointer" }}
              className="kudos-tap-lift kudos-elev-2"
              aria-label={`Abrir ${heroPoi.name}`}
            >
              {/* Image zone (top) · VideoCapsule renders <video> when heroCap.clipSrc is set, else poster + ken-burns */}
              <VideoCapsule
                posterUrl={heroCap.poster}
                videoSrc={heroCap.clipSrc}
                duration={heroCap.duration ?? "0:15"}
                aspectRatio="16/10"
                autoPlayOnView
                className="kudos-vignette"
                ariaLabel={heroCap.title}
              >
                <div aria-hidden style={IMG_BOTTOM_FADE} />
                <button
                  type="button"
                  aria-label={has("poi", heroPoi.id) ? "Quitar guardado" : "Guardar"}
                  onClick={onSave(heroPoi.id)}
                  style={{ ...BOOKMARK_BTN, position: "absolute", top: 14, right: 14, zIndex: 5 }}
                  className="kudos-tap"
                >
                  <Icon name="saved" size={16} />
                </button>
                <span style={HERO_CHIP}>
                  {(heroPoi.categories[0] ?? "historia").toUpperCase()}
                </span>
              </VideoCapsule>

              {/* Content zone (bottom, dark) */}
              <div style={HERO_BODY}>
                <h3 className="kudos-h-hero" style={HERO_TITLE}>{heroCap.title}</h3>
                <p style={HERO_DESC}>{heroCap.hook ?? heroCap.tagline}</p>
                <div style={META_ROW}>
                  <span style={META_LOC}>
                    <Icon name="place" size={12} />
                    <span>{heroPoi.country}</span>
                  </span>
                  <span style={META_RATING}>
                    <span style={STAR}>★</span>
                    <span>{heroPoi.rating.toFixed(1)}</span>
                  </span>
                </div>

                <div style={ACTIONS_ROW}>
                  <button
                    type="button"
                    onClick={onSave(heroPoi.id)}
                    style={has("poi", heroPoi.id) ? ACTION_PILL_ACTIVE : ACTION_PILL}
                    className="kudos-tap"
                  >
                    <Icon name="saved" size={14} />
                    <span>{has("poi", heroPoi.id) ? "Guardado" : "Guardar"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={onShare(heroPoi.id)}
                    style={ACTION_PILL}
                    className="kudos-tap"
                  >
                    <Icon name="share" size={14} />
                    <span>Compartir</span>
                  </button>
                  <button
                    type="button"
                    onClick={onMapJump(heroPoi.id)}
                    style={ACTION_PILL}
                    className="kudos-tap"
                  >
                    <Icon name="map" size={14} />
                    <span>Mapa</span>
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 2 . Two medium cards ------------------------- */}
          <section style={MED_GRID}>
            {mediumPairs.map(({ poi, cap }) => (
              <Link
                key={poi.id}
                href={`/poi/${encodeURIComponent(poi.id)}`}
                style={MED_CARD}
                className="kudos-tap-lift kudos-elev-1"
                aria-label={`Abrir ${poi.name}`}
              >
                <div style={MED_IMG_WRAP} className="kudos-media kudos-vignette">
                  <div aria-hidden className="kudos-media-cover kudos-kenburns" style={{ backgroundImage: `url("${cap.poster}")` }} />
                  <div aria-hidden style={IMG_BOTTOM_FADE} />
                  <div style={MED_IMG_TOP}>
                    <span style={PLAY_BADGE_SM}>
                      <Icon name="play" size={10} />
                      <span>{cap.duration ?? "0:15"}</span>
                    </span>
                    <button
                      type="button"
                      aria-label={has("poi", poi.id) ? "Quitar guardado" : "Guardar"}
                      onClick={onSave(poi.id)}
                      style={BOOKMARK_BTN_SM}
                      className="kudos-tap"
                    >
                      <Icon name="saved" size={13} />
                    </button>
                  </div>
                  <span style={MED_CHIP}>
                    {(poi.categories[0] ?? "lugar").toUpperCase()}
                  </span>
                </div>

                <div style={MED_BODY}>
                  <h3 className="kudos-h-card" style={MED_TITLE}>{cap.title}</h3>
                  <div style={META_ROW_SM}>
                    <span style={META_LOC_SM}>
                      <Icon name="place" size={10} />
                      <span>{poi.country}</span>
                    </span>
                    <span style={META_RATING_SM}>
                      <span style={STAR}>★</span>
                      <span>{poi.rating.toFixed(1)}</span>
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </section>

          {/* SECTION 3 . Cerca de ti ------------------------------ */}
          <section style={SECTION}>
            <header style={SECTION_HEAD}>
              <div style={SECTION_TITLE_WRAP}>
                <span aria-hidden style={EYEBROW_LOC}>
                  <Icon name="here" size={14} />
                </span>
                <h2 className="kudos-h-med" style={SECTION_TITLE}>Cerca de ti</h2>
              </div>
              <Link href="/world" style={SEE_ALL}>
                <span>Ver todo</span>
                <Icon name="chevron-right" size={14} />
              </Link>
            </header>
            <p style={SECTION_SUB}>Lugares increibles a tu alrededor</p>

            <div style={NEAR_RAIL} className="kudos-no-scrollbar kudos-rail-fade">
              {nearby.map(({ poi, distanceKm }) => (
                <Link
                  key={poi.id}
                  href={`/poi/${encodeURIComponent(poi.id)}`}
                  style={NEAR_CARD}
                  className="kudos-tap-lift kudos-elev-1"
                  aria-label={`Abrir ${poi.name}`}
                >
                  <div style={NEAR_IMG_WRAP} className="kudos-media">
                    <div aria-hidden className="kudos-media-cover kudos-kenburns" style={{ backgroundImage: `url("${poi.heroImage}")` }} />
                    <span style={DIST_PILL}>
                      <Icon name="here" size={10} />
                      <span>{formatDistance(distanceKm, poi.country)}</span>
                    </span>
                  </div>
                  <div style={NEAR_BODY}>
                    <h4 style={NEAR_TITLE}>{poi.name}</h4>
                    <p style={NEAR_SUB}>{poi.categories[0] ?? "lugar"}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* SECTION 4 . Trending hoy ------------------------------ */}
          {trending.length > 0 ? (
            <section style={SECTION}>
              <header style={SECTION_HEAD}>
                <div style={SECTION_TITLE_WRAP}>
                  <span aria-hidden style={EYEBROW_STAR} className="kudos-gradient-text">✦</span>
                  <h2 className="kudos-h-med" style={SECTION_TITLE}>Trending hoy</h2>
                </div>
                <Link href="/world" style={SEE_ALL}>
                  <span>Ver todo</span>
                  <Icon name="chevron-right" size={14} />
                </Link>
              </header>
              <p style={SECTION_SUB}>Lo m&aacute;s descubierto en las &uacute;ltimas 24 horas</p>

              <div style={TRENDING_RAIL} className="kudos-no-scrollbar kudos-rail-fade">
                {trending.map(({ poi, cap, views }, i) => (
                  <Link
                    key={poi.id}
                    href={`/poi/${encodeURIComponent(poi.id)}`}
                    style={TRENDING_CARD}
                    className="kudos-tap-lift kudos-elev-2"
                    aria-label={`Abrir ${poi.name}`}
                  >
                    <div style={TRENDING_IMG_WRAP} className="kudos-media kudos-vignette">
                      <div aria-hidden className="kudos-media-cover kudos-kenburns" style={{ backgroundImage: `url("${cap?.poster ?? poi.heroImage}")` }} />
                      <div aria-hidden style={IMG_BOTTOM_FADE} />
                      <span style={TRENDING_RANK}>#{i + 1}</span>
                      <span style={TRENDING_VIEWS}>
                        <Icon name="play" size={9} />
                        <span>{views}</span>
                      </span>
                    </div>
                    <div style={TRENDING_BODY}>
                      <h4 style={TRENDING_TITLE}>{cap?.title ?? poi.name}</h4>
                      <div style={TRENDING_META}>
                        <span style={TRENDING_LOC}>
                          <Icon name="place" size={10} />
                          <span>{poi.country}</span>
                        </span>
                        <span style={TRENDING_RATING}>
                          <span style={STAR}>&#9733;</span>
                          <span>{poi.rating.toFixed(1)}</span>
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        {/* === RIGHT MAP PANEL (real Leaflet, sticky desktop · P12.5) === */}
        <aside className="kudos-home-map kudos-elev-3" style={MAP_PANEL}>
          <HomeMapPanel pois={mapBubbles} activeId={heroPoi.id} locationLabel={heroPoi.country} />
        </aside>
      </div>

      {/* Responsive: collapse on tablet/mobile */}
      <style>{`
        @media (max-width: 1023.98px) {
          .kudos-home-split {
            grid-template-columns: 1fr !important;
          }
          .kudos-home-map {
            position: relative !important;
            top: auto !important;
            height: 480px !important;
            margin-top: 18px;
          }
        }
        @media (max-width: 640px) {
          .kudos-home {
            padding-left: 16px !important;
            padding-right: 16px !important;
          }
        }
      `}</style>
    </div>
  );
}

// =====================================================================
// Utilities
// =====================================================================

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function formatDistance(km: number | null, fallback: string): string {
  if (km == null) return fallback;
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

const BUBBLE_POSITIONS = [
  { top: "50%", left: "55%" },
  { top: "22%", left: "70%" },
  { top: "28%", left: "32%" },
  { top: "70%", left: "32%" },
  { top: "72%", left: "68%" },
];

// =====================================================================
// Styles
// =====================================================================

const ROOT: React.CSSProperties = {
  width: "100%",
  maxWidth: 1280,
  margin: "0 auto",
  padding: "16px 24px 0",
  color: "var(--kudos-ink)",
  fontFamily: "var(--kudos-font-body)",
};

// ── Switcher ──────────────────────────────────────────────────────

const SWITCHER_WRAP: React.CSSProperties = {
  display: "flex",
  justifyContent: "stretch",
  marginBottom: 18,
};

const SWITCHER: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  width: "100%",
  background: "rgba(10,6,18,0.55)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 14,
  padding: 4,
  gap: 4,
};

const PILL_BASE: React.CSSProperties = {
  position: "relative",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  padding: "12px 18px",
  borderRadius: 10,
  border: "none",
  fontFamily: "var(--kudos-font-body)",
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  cursor: "pointer",
  background: "transparent",
};

const PILL_ACTIVE: React.CSSProperties = {
  ...PILL_BASE,
  background: "rgba(255,255,255,0.04)",
  color: "var(--kudos-ink)",
};

const PILL_IDLE: React.CSSProperties = {
  ...PILL_BASE,
  color: "rgba(242,242,247,0.5)",
};

const PILL_UNDERLINE: React.CSSProperties = {
  position: "absolute",
  bottom: 4,
  left: "18%",
  right: "18%",
  height: 2,
  borderRadius: 2,
  background: "var(--kudos-gradient-cta)",
};

// ── Split ─────────────────────────────────────────────────────────

const SPLIT: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.7fr) minmax(0, 1fr)",
  gap: 20,
};

const FEED_COL: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 28,
  minWidth: 0,
};

// ── Section heads ─────────────────────────────────────────────────

const SECTION: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const SECTION_HEAD: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
};

const SECTION_TITLE_WRAP: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
};

const EYEBROW_STAR: React.CSSProperties = {
  fontSize: 18,
  lineHeight: 1,
};

const EYEBROW_LOC: React.CSSProperties = {
  color: "var(--kudos-accent-bright, #8B6BFF)",
  display: "inline-flex",
};

const SECTION_TITLE: React.CSSProperties = {
  margin: 0,
  fontSize: 22,
  color: "var(--kudos-ink)",
};

const SECTION_SUB: React.CSSProperties = {
  margin: "0 0 6px 26px",
  fontSize: 12.5,
  color: "rgba(242,242,247,0.55)",
};

const SEE_ALL: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  color: "var(--kudos-accent-bright, #8B6BFF)",
  fontFamily: "var(--kudos-font-body)",
  fontSize: 12.5,
  fontWeight: 600,
  textDecoration: "none",
  flexShrink: 0,
};

// ── Hero card (image-top + content-bottom) ────────────────────────

const HERO_CARD: React.CSSProperties = {
  position: "relative",
  display: "flex",
  flexDirection: "column",
  width: "100%",
  borderRadius: 22,
  overflow: "hidden",
  background: "transparent",
  border: "1px solid rgba(255,255,255,0.07)",
  textDecoration: "none",
  color: "var(--kudos-ink)",
};

const HERO_IMG_WRAP: React.CSSProperties = {
  position: "relative",
  width: "100%",
  aspectRatio: "16/10",
};

const IMG_BOTTOM_FADE: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  background:
    "linear-gradient(180deg, rgba(10,6,18,0) 55%, rgba(10,6,18,0.55) 100%)",
  pointerEvents: "none",
};

const HERO_IMG_TOP: React.CSSProperties = {
  position: "absolute",
  top: 14,
  left: 14,
  right: 14,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  zIndex: 2,
};

const PLAY_BADGE: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  padding: "5px 11px",
  borderRadius: 999,
  background: "rgba(10,6,18,0.78)",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "var(--kudos-ink)",
  fontSize: 11.5,
  fontWeight: 500,
  fontFamily: "var(--kudos-font-body)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
};

const PLAY_BADGE_SM: React.CSSProperties = {
  ...PLAY_BADGE,
  fontSize: 10,
  padding: "3px 9px",
};

const BOOKMARK_BTN: React.CSSProperties = {
  width: 38,
  height: 38,
  borderRadius: 12,
  background: "rgba(10,6,18,0.78)",
  border: "1px solid rgba(255,255,255,0.14)",
  color: "var(--kudos-ink)",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
};

const BOOKMARK_BTN_SM: React.CSSProperties = {
  ...BOOKMARK_BTN,
  width: 32,
  height: 32,
  borderRadius: 10,
};

const HERO_CHIP: React.CSSProperties = {
  position: "absolute",
  left: 18,
  bottom: 16,
  padding: "5px 13px",
  borderRadius: 999,
  background: "var(--kudos-accent, #6C3CFF)",
  color: "#fff",
  fontFamily: "var(--kudos-font-body)",
  fontSize: 10.5,
  fontWeight: 700,
  letterSpacing: "0.14em",
  boxShadow: "0 6px 16px -6px rgba(108,60,255,0.65)",
  zIndex: 3,
};

const HERO_BODY: React.CSSProperties = {
  padding: "18px 22px 20px",
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const HERO_TITLE: React.CSSProperties = {
  margin: 0,
  fontSize: "clamp(20px, 2.4vw, 26px)",
  color: "var(--kudos-ink)",
};

const HERO_DESC: React.CSSProperties = {
  margin: 0,
  fontSize: 13.5,
  lineHeight: 1.5,
  color: "rgba(242,242,247,0.7)",
  maxWidth: 560,
};

const META_ROW: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  flexWrap: "wrap",
};

const META_ROW_SM: React.CSSProperties = {
  ...META_ROW,
  gap: 10,
  fontSize: 11,
};

const META_LOC: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  color: "rgba(242,242,247,0.72)",
  fontSize: 12.5,
};

const META_LOC_SM: React.CSSProperties = {
  ...META_LOC,
  fontSize: 11,
};

const META_RATING: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  color: "var(--kudos-accent-yellow, #FFD23F)",
  fontSize: 12.5,
  fontWeight: 700,
  marginLeft: "auto",
};

const META_RATING_SM: React.CSSProperties = {
  ...META_RATING,
  fontSize: 11,
  marginLeft: "auto",
};

const STAR: React.CSSProperties = {
  color: "var(--kudos-accent-yellow, #FFD23F)",
  lineHeight: 1,
};

const ACTIONS_ROW: React.CSSProperties = {
  display: "flex",
  gap: 10,
  marginTop: 4,
  flexWrap: "wrap",
};

const ACTION_PILL: React.CSSProperties = {
  flex: "1 1 0",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  padding: "10px 14px",
  borderRadius: 12,
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.10)",
  color: "var(--kudos-ink)",
  fontFamily: "var(--kudos-font-body)",
  fontSize: 12.5,
  fontWeight: 500,
  cursor: "pointer",
  minWidth: 0,
};

const ACTION_PILL_ACTIVE: React.CSSProperties = {
  ...ACTION_PILL,
  background: "rgba(108,60,255,0.22)",
  border: "1px solid rgba(108,60,255,0.55)",
  color: "var(--kudos-accent-bright, #8B6BFF)",
  fontWeight: 600,
};

// ── Medium grid ───────────────────────────────────────────────────

const MED_GRID: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 14,
};

const MED_CARD: React.CSSProperties = {
  position: "relative",
  display: "flex",
  flexDirection: "column",
  borderRadius: 20,
  overflow: "hidden",
  background: "transparent",
  border: "1px solid rgba(255,255,255,0.06)",
  textDecoration: "none",
  color: "var(--kudos-ink)",
};

const MED_IMG_WRAP: React.CSSProperties = {
  position: "relative",
  width: "100%",
  aspectRatio: "4/3",
};

const MED_IMG_TOP: React.CSSProperties = {
  position: "absolute",
  top: 12,
  left: 12,
  right: 12,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  zIndex: 2,
};

const MED_CHIP: React.CSSProperties = {
  position: "absolute",
  left: 14,
  bottom: 12,
  padding: "4px 11px",
  borderRadius: 999,
  background: "var(--kudos-accent, #6C3CFF)",
  color: "#fff",
  fontFamily: "var(--kudos-font-body)",
  fontSize: 9.5,
  fontWeight: 700,
  letterSpacing: "0.14em",
  boxShadow: "0 6px 14px -6px rgba(108,60,255,0.65)",
  zIndex: 3,
};

const MED_BODY: React.CSSProperties = {
  padding: "14px 16px 16px",
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const MED_TITLE: React.CSSProperties = {
  margin: 0,
  fontSize: 16,
  color: "var(--kudos-ink)",
};

// ── Near rail (square thumb + content below) ──────────────────────

const NEAR_RAIL: React.CSSProperties = {
  display: "flex",
  gap: 12,
  overflowX: "auto",
  paddingBottom: 6,
  scrollSnapType: "x mandatory",
  WebkitOverflowScrolling: "touch",
};

const NEAR_CARD: React.CSSProperties = {
  position: "relative",
  flex: "0 0 152px",
  display: "flex",
  flexDirection: "column",
  borderRadius: 16,
  overflow: "hidden",
  border: "1px solid rgba(255,255,255,0.06)",
  background: "transparent",
  textDecoration: "none",
  color: "var(--kudos-ink)",
  scrollSnapAlign: "start",
};

const NEAR_IMG_WRAP: React.CSSProperties = {
  position: "relative",
  width: "100%",
  aspectRatio: "1/1",
};

const DIST_PILL: React.CSSProperties = {
  position: "absolute",
  top: 10,
  left: 10,
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "4px 10px",
  borderRadius: 999,
  background: "rgba(10,6,18,0.82)",
  border: "1px solid rgba(255,255,255,0.10)",
  color: "rgba(242,242,247,0.92)",
  fontFamily: "var(--kudos-font-body)",
  fontSize: 10.5,
  fontWeight: 600,
  zIndex: 2,
  backdropFilter: "blur(6px)",
  WebkitBackdropFilter: "blur(6px)",
};

const NEAR_BODY: React.CSSProperties = {
  padding: "10px 12px 12px",
  display: "flex",
  flexDirection: "column",
  gap: 2,
};

const NEAR_TITLE: React.CSSProperties = {
  margin: 0,
  fontFamily: "var(--kudos-font-display)",
  fontSize: 13.5,
  fontWeight: 700,
  lineHeight: 1.2,
  letterSpacing: "-0.01em",
  color: "var(--kudos-ink)",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const NEAR_SUB: React.CSSProperties = {
  margin: 0,
  fontSize: 10.5,
  color: "rgba(242,242,247,0.55)",
  textTransform: "capitalize",
};

// ── Right map panel (sticky) ─────────────────────────────────────

const MAP_PANEL: React.CSSProperties = {
  position: "sticky",
  top: "calc(var(--app-topbar-h, 56px) + var(--kudos-safe-top, 0px) + 16px)",
  alignSelf: "start",
  height:
    "calc(var(--kudos-dvh, 1vh) * 100 - var(--app-topbar-h, 56px) - var(--app-bottomnav-h, 72px) - var(--kudos-safe-top, 0px) - var(--kudos-safe-bottom, 0px) - 40px)",
  minHeight: 560,
  borderRadius: 22,
  overflow: "hidden",
  border: "1px solid rgba(108,60,255,0.18)",
  background: "#0E0828",
};

const MAP_BG: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  background:
    "radial-gradient(70% 50% at 50% 50%, #221A4E 0%, #0E0828 75%), " +
    "linear-gradient(135deg, #1A1333 0%, #0A0612 100%)",
};

const MAP_GRID: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  backgroundImage:
    "repeating-linear-gradient(35deg, rgba(108,60,255,0.06) 0 1px, transparent 1px 28px), " +
    "repeating-linear-gradient(-25deg, rgba(255,60,172,0.04) 0 1px, transparent 1px 38px), " +
    "repeating-linear-gradient(115deg, rgba(255,255,255,0.025) 0 1px, transparent 1px 48px)",
  opacity: 0.85,
};

const MAP_VIGNETTE: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  background:
    "radial-gradient(110% 80% at 50% 50%, transparent 45%, rgba(10,6,18,0.6) 100%)",
  pointerEvents: "none",
};

const LOC_CHIP: React.CSSProperties = {
  position: "absolute",
  top: 14,
  left: 14,
  zIndex: 10,
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 14px",
  borderRadius: 999,
  background: "rgba(10,6,18,0.82)",
  border: "1px solid rgba(255,255,255,0.10)",
  color: "var(--kudos-ink)",
  fontSize: 12.5,
  fontWeight: 600,
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
};

const MAP_CTRLS: React.CSSProperties = {
  position: "absolute",
  top: 14,
  right: 14,
  zIndex: 10,
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const MAP_CTRL_BTN: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 10,
  background: "rgba(10,6,18,0.82)",
  border: "1px solid rgba(255,255,255,0.10)",
  color: "var(--kudos-ink)",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
};

const BUBBLE_IDLE: React.CSSProperties = {
  width: 60,
  height: 60,
  borderRadius: "50%",
  padding: 2,
  background: "rgba(255,255,255,0.10)",
  border: "1px solid rgba(255,255,255,0.16)",
};

const BUBBLE_ACTIVE: React.CSSProperties = {
  width: 100,
  height: 100,
  borderRadius: "50%",
  padding: 3,
  background: "var(--kudos-gradient-ring)",
  boxShadow: "0 0 0 1px rgba(255,255,255,0.04), 0 12px 30px -10px rgba(255,60,172,0.55)",
};

const BUBBLE_PHOTO: React.CSSProperties = {
  width: "100%",
  height: "100%",
  borderRadius: "50%",
  backgroundSize: "cover",
  backgroundPosition: "center",
  border: "2px solid #0E0828",
};

const BUBBLE_LABEL: React.CSSProperties = {
  marginTop: 6,
  padding: "3px 9px",
  background: "rgba(10,6,18,0.82)",
  borderRadius: 999,
  fontSize: 10.5,
  fontWeight: 600,
  color: "var(--kudos-ink)",
  whiteSpace: "nowrap",
  width: "fit-content",
};

const BUBBLE_RATING: React.CSSProperties = {
  marginTop: 4,
  display: "inline-flex",
  alignItems: "center",
  gap: 3,
  padding: "2px 8px",
  borderRadius: 999,
  background: "rgba(10,6,18,0.82)",
  color: "var(--kudos-accent-yellow, #FFD23F)",
  fontSize: 10,
  fontWeight: 700,
  width: "fit-content",
};

const MAP_CTA: React.CSSProperties = {
  position: "absolute",
  bottom: 18,
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: 10,
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "12px 24px",
  borderRadius: 999,
  background: "var(--kudos-accent, #6C3CFF)",
  color: "#fff",
  textDecoration: "none",
  fontFamily: "var(--kudos-font-body)",
  fontSize: 13.5,
  fontWeight: 600,
  boxShadow: "0 14px 30px -10px rgba(108,60,255,0.7)",
};

// ── Trending hoy rail (P12) ─────────────────────────────────────
const TRENDING_RAIL: React.CSSProperties = {
  display: "flex",
  gap: 12,
  overflowX: "auto",
  paddingBottom: 6,
  scrollSnapType: "x mandatory",
  WebkitOverflowScrolling: "touch",
};
const TRENDING_CARD: React.CSSProperties = {
  position: "relative",
  flex: "0 0 220px",
  display: "flex",
  flexDirection: "column",
  borderRadius: 18,
  overflow: "hidden",
  border: "1px solid rgba(255,255,255,0.06)",
  background: "transparent",
  textDecoration: "none",
  color: "var(--kudos-ink)",
  scrollSnapAlign: "start",
};
const TRENDING_IMG_WRAP: React.CSSProperties = {
  position: "relative",
  width: "100%",
  aspectRatio: "4/3",
};
const TRENDING_RANK: React.CSSProperties = {
  position: "absolute",
  top: 10, left: 10, zIndex: 3,
  padding: "4px 10px",
  borderRadius: 999,
  background: "var(--kudos-gradient-cta)",
  color: "#fff",
  fontFamily: "var(--kudos-font-display)",
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: "0.04em",
  boxShadow: "0 6px 16px -6px rgba(255,60,172,0.55)",
};
const TRENDING_VIEWS: React.CSSProperties = {
  position: "absolute",
  top: 10, right: 10, zIndex: 3,
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "3px 9px",
  borderRadius: 999,
  background: "rgba(10,6,18,0.82)",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "var(--kudos-ink)",
  fontFamily: "var(--kudos-font-body)",
  fontSize: 10,
  fontWeight: 600,
  backdropFilter: "blur(6px)",
  WebkitBackdropFilter: "blur(6px)",
};
const TRENDING_BODY: React.CSSProperties = {
  padding: "12px 14px 14px",
  display: "flex",
  flexDirection: "column",
  gap: 6,
};
const TRENDING_TITLE: React.CSSProperties = {
  margin: 0,
  fontFamily: "var(--kudos-font-display)",
  fontSize: 14,
  fontWeight: 700,
  letterSpacing: "-0.01em",
  lineHeight: 1.22,
  color: "var(--kudos-ink)",
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};
const TRENDING_META: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  fontSize: 11,
};
const TRENDING_LOC: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  color: "rgba(242,242,247,0.68)",
};
const TRENDING_RATING: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 3,
  color: "var(--kudos-accent-yellow, #FFD23F)",
  fontWeight: 700,
};

const EMPTY: React.CSSProperties = {
  minHeight: "60vh",
  display: "grid",
  placeItems: "center",
  color: "rgba(242,242,247,0.55)",
  fontFamily: "var(--kudos-font-body)",
};
