"use client";

/**
 * KUDOS . ShareCapsuleModal . Global share system replica of mockup.
 *
 * Listens to window event "kudos:share-capsule:open" with detail
 * { poiId?: string; capsuleId?: string }. Mounts once globally via
 * <GlobalShareModal /> placed inside AppShellV4 (vigente).
 *
 * Layout (mockup-faithful):
 *   - Header: close X + "Compartir capsula" title + subtitle
 *   - Split 2-col:
 *       Left  = 9:16 preview card (KUDOS brand + chip + title +
 *               subtitle + hero + play + meta) + "Mas capsulas" rail
 *               + "+25 MERITO" badge card
 *       Right = tabs (Compartir / Personalizar)
 *               - Compartir: 8-grid socials (IG / WA / FB / TT / X /
 *                 Msg / Mail / Mas) + enlace directo + link preview
 *               - Personalizar: toggles 7 (Titulo / Descripcion /
 *                 Ubicacion / Valoracion / Clip / Comentario / Hashtags)
 *                 + comment input
 *   - Footer: gradient orange . pink . violet pill "Compartir capsula"
 *             + ghost "Guardar en mis capsulas"
 *
 * Interactions:
 *   - WhatsApp / X / FB / Msg / Mail = real outbound URLs
 *   - IG / TT = open platform homepage (no web share intent exists)
 *   - Mas = navigator.share if available, else copy
 *   - Copy link = real clipboard with legacy fallback
 *   - Any share action grants +25 merit (real store)
 *   - Guardar en mis capsulas = toggle("poi", poi.id) real store
 *   - ESC + backdrop click + close X = dismiss
 */

import * as React from "react";
import { Icon } from "@/design-system/v2";
import { VideoCapsule } from "@/components/media/VideoCapsule";
import {
  getPoiById,
  getCapsuleById,
  getFeaturedCapsuleForPoi,
  getCapsulesByPoi,
  getAllPois,
  addMeritEvent,
  useSaved,
  type Capsule,
  type Poi,
} from "@/lib/kudos/store";

// =====================================================================
// Global mount + event listener
// =====================================================================

interface OpenPayload { poiId?: string; capsuleId?: string; }

export function GlobalShareModal() {
  const [payload, setPayload] = React.useState<OpenPayload | null>(null);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const onOpen = (e: Event) => {
      const ce = e as CustomEvent<OpenPayload>;
      setPayload(ce.detail ?? {});
    };
    window.addEventListener("kudos:share-capsule:open", onOpen as EventListener);
    return () => window.removeEventListener("kudos:share-capsule:open", onOpen as EventListener);
  }, []);

  if (!payload) return null;
  return <ShareCapsuleModal payload={payload} onClose={() => setPayload(null)} />;
}

// =====================================================================
// Modal core
// =====================================================================

type TabId = "compartir" | "personalizar";

interface ToggleState {
  title: boolean;
  description: boolean;
  location: boolean;
  rating: boolean;
  clip: boolean;
  comment: boolean;
  hashtags: boolean;
}
const TOGGLE_DEFAULT: ToggleState = {
  title: true, description: true, location: true, rating: true, clip: true,
  comment: false, hashtags: false,
};

function ShareCapsuleModal({ payload, onClose }: { payload: OpenPayload; onClose: () => void }) {
  const { toggle: toggleSaved, has } = useSaved();

  // Resolve POI + capsule from payload (fall back gracefully)
  const { poi, capsule, siblings } = React.useMemo(() => {
    let poi: Poi | null = null;
    let cap: Capsule | null = null;
    if (payload.capsuleId) {
      cap = getCapsuleById(payload.capsuleId) ?? null;
      if (cap) poi = getPoiById(cap.poiId) ?? null;
    }
    if (!poi && payload.poiId) {
      poi = getPoiById(payload.poiId) ?? null;
      if (poi && !cap) cap = getFeaturedCapsuleForPoi(poi.id) ?? null;
    }
    if (!poi) {
      poi = getAllPois()[0] ?? null;
      if (poi && !cap) cap = getFeaturedCapsuleForPoi(poi.id) ?? null;
    }
    const sibs = poi ? getCapsulesByPoi(poi.id).filter((c) => c.id !== cap?.id).slice(0, 5) : [];
    return { poi, capsule: cap, siblings: sibs };
  }, [payload.capsuleId, payload.poiId]);

  const [tab, setTab] = React.useState<TabId>("compartir");
  const [toggles, setToggles] = React.useState<ToggleState>(TOGGLE_DEFAULT);
  const [comment, setComment] = React.useState("");
  const [url, setUrl] = React.useState("");
  const [copyStatus, setCopyStatus] = React.useState<"idle" | "ok" | "error">("idle");

  React.useEffect(() => {
    if (typeof window === "undefined" || !poi) return;
    setUrl(`${window.location.origin}/poi/${encodeURIComponent(poi.id)}`);
  }, [poi]);

  // ESC dismiss
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!poi || !capsule) {
    return (
      <div role="dialog" aria-modal="true" style={OVERLAY} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div style={MODAL_SMALL}>
          <p style={{ margin: 0, color: "var(--kudos-ink)" }}>Sin capsula disponible para compartir.</p>
          <button type="button" onClick={onClose} style={BTN_GHOST}>Cerrar</button>
        </div>
      </div>
    );
  }

  // ── Share actions ──
  const trackShare = (channel: string) => {
    addMeritEvent({
      pillar: "inspiracion",
      points: 25,
      label: `Compartiste capsula - ${channel}`,
      poiId: poi.id,
      capsuleId: capsule.id,
    });
  };

  const buildText = () => {
    const parts: string[] = [];
    if (toggles.title) parts.push(capsule.title);
    if (toggles.description) parts.push(poi.short);
    if (toggles.location) parts.push(poi.country);
    if (toggles.rating) parts.push(`★ ${poi.rating.toFixed(1)}`);
    if (toggles.comment && comment.trim()) parts.push(comment.trim());
    if (toggles.hashtags) parts.push("#KUDOS #Descubre");
    return parts.filter(Boolean).join(" · ");
  };

  const legacyCopy = (text: string): boolean => {
    if (typeof document === "undefined") return false;
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "absolute";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch { return false; }
  };

  const doCopy = async () => {
    if (!url) return;
    let ok = false;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try { await navigator.clipboard.writeText(url); ok = true; } catch { ok = false; }
    }
    if (!ok) ok = legacyCopy(url);
    if (ok) {
      setCopyStatus("ok");
      trackShare("link");
    } else {
      setCopyStatus("error");
    }
    setTimeout(() => setCopyStatus("idle"), 2400);
  };

  const doNativeShare = async () => {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await (navigator as Navigator & { share: (d: ShareData) => Promise<void> }).share({
          title: capsule.title,
          text: buildText(),
          url,
        });
        trackShare("native");
      } catch { /* user dismissed */ }
    } else {
      doCopy();
    }
  };

  const handleMainShare = () => {
    doNativeShare();
  };

  const handleSaveCapsule = () => {
    toggleSaved("poi", poi.id);
    onClose();
  };

  const wa  = `https://wa.me/?text=${encodeURIComponent(buildText() + " " + url)}`;
  const x   = `https://twitter.com/intent/tweet?text=${encodeURIComponent(buildText())}&url=${encodeURIComponent(url)}`;
  const fb  = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  const sms = `sms:?body=${encodeURIComponent(buildText() + " " + url)}`;
  const eml = `mailto:?subject=${encodeURIComponent(capsule.title)}&body=${encodeURIComponent(buildText() + "\n\n" + url)}`;

  return (
    <div role="dialog" aria-modal="true" aria-label={`Compartir ${capsule.title}`} style={OVERLAY} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="kudos-share-modal kudos-elev-3" style={MODAL}>
        {/* Header */}
        <header style={HEADER}>
          <button type="button" onClick={onClose} aria-label="Cerrar" style={CLOSE_BTN}>
            <Icon name="close" size={20} />
          </button>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
            <h2 style={HEADER_TITLE}>Compartir capsula</h2>
            <p style={HEADER_SUB}>Comparte conocimiento. Inspira descubrimientos.</p>
          </div>
        </header>

        {/* Split body */}
        <div className="kudos-share-body" style={BODY_SPLIT}>
          {/* ── Left column: preview + siblings + merit card ──────── */}
          <div style={LEFT_COL}>
            <div className="kudos-elev-2" style={{ borderRadius: 18 }}>
              <PreviewCard poi={poi} capsule={capsule} toggles={toggles} />
            </div>

            {/* Dots indicator (visual) */}
            <div style={DOTS_ROW} aria-hidden>
              {[0,1,2,3,4,5].map((i) => (
                <span key={i} style={i === 0 ? DOT_ACTIVE : DOT} />
              ))}
            </div>

            {siblings.length > 0 ? (
              <section style={{ marginTop: 14 }}>
                <h3 style={SIBLING_EYEBROW}>MAS CAPSULAS DE ESTE LUGAR</h3>
                <div style={SIBLING_RAIL} className="kudos-no-scrollbar kudos-rail-fade">
                  {siblings.map((s) => (
                    <div key={s.id} style={SIBLING_CARD} className="kudos-tap-lift kudos-elev-1">
                      <div aria-hidden className="kudos-kenburns" style={{ ...SIBLING_BG, backgroundImage: `url("${s.poster}")` }} />
                      <div aria-hidden style={SIBLING_VEIL} />
                      <span style={SIBLING_PLAY}><Icon name="play" size={14} /></span>
                      <span style={SIBLING_LABEL}>{s.title.length > 24 ? s.title.slice(0, 22) + "…" : s.title}</span>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            <section style={MERIT_CARD}>
              <span style={MERIT_GLYPH} aria-hidden>✦</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={MERIT_TITLE}>Comparte y suma merito</div>
                <div style={MERIT_DESC}>Cada capsula que compartes puede inspirar a otros y generar merito para tu comunidad.</div>
              </div>
              <div style={MERIT_BADGE}>
                <span style={MERIT_BADGE_GLYPH} aria-hidden>✦</span>
                <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
                  <span style={{ fontFamily: "var(--kudos-font-display)", fontSize: 22, fontWeight: 700 }}>+25</span>
                  <span style={{ fontSize: 9.5, letterSpacing: "0.18em", color: "rgba(242,242,247,0.65)" }}>MERITO</span>
                </div>
              </div>
            </section>
          </div>

          {/* ── Right column: tabs + actions ──────────────────────── */}
          <div style={RIGHT_COL}>
            <div role="tablist" style={TABS_WRAP}>
              <button role="tab" aria-selected={tab === "compartir"} type="button" onClick={() => setTab("compartir")} style={tab === "compartir" ? TAB_ACTIVE : TAB_IDLE}>Compartir</button>
              <button role="tab" aria-selected={tab === "personalizar"} type="button" onClick={() => setTab("personalizar")} style={tab === "personalizar" ? TAB_ACTIVE : TAB_IDLE}>Personalizar</button>
            </div>

            {tab === "compartir" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 22, marginTop: 18 }}>
                <section>
                  <h3 style={SECTION_TITLE}>Comparte al instante</h3>
                  <div style={SOCIAL_GRID}>
                    <SocialBtn brand="instagram" label="Instagram" href="https://www.instagram.com/" onClick={() => trackShare("instagram")} />
                    <SocialBtn brand="whatsapp"  label="WhatsApp"  href={wa}  onClick={() => trackShare("whatsapp")} />
                    <SocialBtn brand="facebook"  label="Facebook"  href={fb}  onClick={() => trackShare("facebook")} />
                    <SocialBtn brand="tiktok"    label="TikTok"    href="https://www.tiktok.com/" onClick={() => trackShare("tiktok")} />
                    <SocialBtn brand="x"         label="X (Twitter)" href={x} onClick={() => trackShare("x")} />
                    <SocialBtn brand="messages"  label="Mensajes"  href={sms} onClick={() => trackShare("sms")} />
                    <SocialBtn brand="mail"      label="Correo"    href={eml} onClick={() => trackShare("email")} />
                    <SocialBtn brand="more"      label="Mas"       action={doNativeShare} />
                  </div>
                </section>

                <section>
                  <h3 style={SECTION_TITLE}>Enlace directo</h3>
                  <p style={SECTION_DESC}>Cualquiera con el enlace podra ver esta capsula.</p>
                  <div style={LINK_ROW}>
                    <div style={LINK_FIELD} title={url}>
                      {url ? url.replace(/^https?:\/\//, "") : "..."}
                    </div>
                    <button
                      type="button"
                      onClick={doCopy}
                      style={copyStatus === "ok" ? COPY_OK : copyStatus === "error" ? COPY_ERR : COPY_BTN}
                      aria-live="polite"
                    >
                      <Icon name="more" size={14} />
                    </button>
                  </div>
                  {copyStatus === "ok" ? <p style={COPY_HINT_OK}>Enlace copiado.</p> : null}
                  {copyStatus === "error" ? <p style={COPY_HINT_ERR}>No se pudo copiar. Selecciona el texto manualmente.</p> : null}
                </section>

                <section>
                  <h3 style={SECTION_TITLE}>Vista previa del enlace</h3>
                  <div style={PREVIEW_LINK_CARD}>
                    <div aria-hidden className="kudos-kenburns" style={{ ...PREVIEW_LINK_THUMB, backgroundImage: `url("${capsule.poster}")` }}>
                      <span style={PREVIEW_LINK_PLAY}><Icon name="play" size={14} /></span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                      <h4 style={PREVIEW_LINK_TITLE}>{capsule.title}</h4>
                      <p style={PREVIEW_LINK_DESC}>{poi.short.length > 80 ? poi.short.slice(0, 78) + "…" : poi.short}</p>
                      <div style={PREVIEW_LINK_META}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--kudos-accent-bright, #8B6BFF)" }}>
                          <BrandDot /> <span style={{ fontWeight: 700 }}>KUDOS</span>
                        </span>
                        <span style={{ color: "rgba(242,242,247,0.55)" }}>·</span>
                        <span style={{ color: "rgba(242,242,247,0.65)" }}>{poi.country}</span>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 18 }}>
                <h3 style={SECTION_TITLE}>Personaliza tu capsula</h3>
                <p style={SECTION_DESC}>Elige que informacion quieres mostrar en tu publicacion.</p>
                <ToggleRow icon="discover"  label="Titulo"            value={toggles.title}       onChange={(v) => setToggles({ ...toggles, title: v })} />
                <ToggleRow icon="more"      label="Descripcion"        value={toggles.description} onChange={(v) => setToggles({ ...toggles, description: v })} />
                <ToggleRow icon="place"     label="Ubicacion"          value={toggles.location}    onChange={(v) => setToggles({ ...toggles, location: v })} />
                <ToggleRow icon="founder"   label="Valoracion"         value={toggles.rating}      onChange={(v) => setToggles({ ...toggles, rating: v })} />
                <ToggleRow icon="play"      label="Clip de video"      value={toggles.clip}        onChange={(v) => setToggles({ ...toggles, clip: v })} />
                <ToggleRow icon="share"     label="Tu comentario (opcional)" value={toggles.comment} onChange={(v) => setToggles({ ...toggles, comment: v })} />
                <ToggleRow icon="moments"   label="Hashtags"           value={toggles.hashtags}    onChange={(v) => setToggles({ ...toggles, hashtags: v })} />

                <div style={COMMENT_WRAP}>
                  <input
                    type="text"
                    placeholder="Anade tu comentario..."
                    maxLength={120}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    style={COMMENT_INPUT}
                  />
                  <span style={COMMENT_COUNT}>{comment.length}/120</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer style={FOOTER}>
          <button type="button" onClick={handleMainShare} style={CTA_PRIMARY} className="kudos-tap">
            <Icon name="share" size={16} />
            <span>Compartir capsula</span>
          </button>
          <button type="button" onClick={handleSaveCapsule} style={has("poi", poi.id) ? CTA_GHOST_ACTIVE : CTA_GHOST} className="kudos-tap">
            <Icon name="saved" size={14} />
            <span>{has("poi", poi.id) ? "Guardado en mis capsulas" : "Guardar en mis capsulas"}</span>
          </button>
        </footer>

        <style>{`
          @media (max-width: 900px) {
            .kudos-share-body { grid-template-columns: 1fr !important; }
          }
          .kudos-no-scrollbar::-webkit-scrollbar { display: none; }
          .kudos-no-scrollbar { scrollbar-width: none; }
        `}</style>
      </div>
    </div>
  );
}

// =====================================================================
// Sub-pieces
// =====================================================================

function PreviewCard({ poi, capsule, toggles }: { poi: Poi; capsule: Capsule; toggles: ToggleState }) {
  return (
    <div style={PREVIEW_CARD}>
      <div style={PREVIEW_BRAND_ROW}>
        <span style={PREVIEW_BRAND}>
          <BrandDot /> <span style={{ fontWeight: 700, letterSpacing: "0.06em" }}>KUDOS</span>
        </span>
        <span style={PREVIEW_CHIP}>{(poi.categories[0] ?? "monumento").toUpperCase()}</span>
      </div>

      <div style={PREVIEW_TEXT_BLOCK}>
        {toggles.title ? (
          <h3 style={PREVIEW_TITLE}>
            Lo que casi nadie sabe del{" "}
            <span style={PREVIEW_TITLE_ACCENT}>{poi.name}</span>
          </h3>
        ) : null}
        {toggles.description ? (
          <p style={PREVIEW_DESC}>{poi.short}</p>
        ) : null}
      </div>

      <div style={{ position: "relative" }}>
        <VideoCapsule
          posterUrl={capsule.poster}
          videoSrc={toggles.clip ? capsule.clipSrc : undefined}
          duration={capsule.duration ?? "0:15"}
          aspectRatio="9/14"
          rounded={12}
          ariaLabel={capsule.title}
        />
        <div style={{ ...PREVIEW_META_ROW, position: "absolute", left: 12, right: 12, bottom: 12, zIndex: 5 }}>
          {toggles.location ? (
            <span style={PREVIEW_META_LOC}>
              <Icon name="place" size={11} />
              <span>{poi.country}</span>
            </span>
          ) : <span />}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {toggles.rating ? (
              <span style={PREVIEW_META_RATING}>
                <span style={STAR}>★</span>
                <span style={{ fontWeight: 700 }}>{poi.rating.toFixed(1)}</span>
              </span>
            ) : null}
            <span style={PREVIEW_META_DURATION}>
              <Icon name="play" size={10} />
              <span>{capsule.duration ?? "0:15"}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

type BrandKey = "instagram" | "whatsapp" | "facebook" | "tiktok" | "x" | "messages" | "mail" | "more";

function SocialBtn({ brand, label, href, action, onClick }: {
  brand: BrandKey; label: string; href?: string; action?: () => void; onClick?: () => void;
}) {
  const inner = (
    <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, width: "100%" }}>
      <BrandGlyph brand={brand} />
      <span style={SOCIAL_LABEL}>{label}</span>
    </span>
  );
  const baseStyle: React.CSSProperties = {
    background: "transparent",
    border: "none",
    padding: 6,
    cursor: "pointer",
    color: "var(--kudos-ink)",
    textDecoration: "none",
    display: "block",
  };
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" onClick={onClick} style={baseStyle} className="kudos-tap">
        {inner}
      </a>
    );
  }
  return (
    <button type="button" onClick={() => { action?.(); onClick?.(); }} style={baseStyle} className="kudos-tap">
      {inner}
    </button>
  );
}

function BrandGlyph({ brand }: { brand: BrandKey }) {
  const size = 50;
  const wrap: React.CSSProperties = {
    width: size, height: size,
    borderRadius: "50%",
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  };
  switch (brand) {
    case "instagram":
      return (
        <span style={{ ...wrap, background: "radial-gradient(circle at 30% 110%, #FED373 0%, #F15245 25%, #D92E7F 45%, #9B36B7 70%, #515ECF 100%)" }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="3" y="3" width="18" height="18" rx="5" />
            <circle cx="12" cy="12" r="4" />
            <circle cx="17.5" cy="6.5" r="1" fill="#fff" stroke="none" />
          </svg>
        </span>
      );
    case "whatsapp":
      return (
        <span style={{ ...wrap, background: "#25D366" }}>
          <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden>
            <path fill="#fff" d="M16 3C9 3 3 9 3 16c0 2.4.6 4.6 1.7 6.5L3 29l6.7-1.7C11.6 28.4 13.7 29 16 29c7 0 13-6 13-13S23 3 16 3zm7.6 18.2c-.3.9-1.8 1.7-2.5 1.8-.6.1-1.4.1-2.3-.1-.5-.2-1.2-.4-2-.8-3.6-1.6-5.9-5.2-6.1-5.4-.2-.2-1.5-2-1.5-3.8s.9-2.7 1.3-3.1c.3-.3.7-.4 1-.4h.7c.2 0 .5 0 .8.6l1.1 2.6c.1.2.1.5 0 .7-.1.2-.2.3-.4.5-.2.2-.4.4-.5.6-.2.2-.4.4-.2.8.2.4 1 1.6 2.1 2.6 1.4 1.2 2.5 1.6 2.9 1.8.4.2.6.1.8-.1.2-.2.9-1.1 1.2-1.5.2-.4.5-.3.8-.2.3.1 2.1 1 2.5 1.2.4.2.6.3.7.4.1.4.1 1.1-.2 2z"/>
          </svg>
        </span>
      );
    case "facebook":
      return (
        <span style={{ ...wrap, background: "#1877F2" }}>
          <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden>
            <path fill="#fff" d="M22 12a10 10 0 10-11.6 9.9v-7H8v-2.9h2.4V9.8c0-2.4 1.4-3.7 3.6-3.7 1 0 2.1.2 2.1.2v2.3h-1.2c-1.2 0-1.5.7-1.5 1.5v1.8h2.6l-.4 2.9h-2.2v7A10 10 0 0022 12z"/>
          </svg>
        </span>
      );
    case "tiktok":
      return (
        <span style={{ ...wrap, background: "#000" }}>
          <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden>
            <path fill="#25F4EE" d="M16.6 5.8c-.9-.6-1.5-1.6-1.6-2.8h-2.7v12c0 1.4-1.1 2.5-2.5 2.5s-2.5-1.1-2.5-2.5 1.1-2.5 2.5-2.5c.3 0 .5 0 .8.1V10c-.3 0-.5-.1-.8-.1-2.9 0-5.3 2.4-5.3 5.3S6.9 20.5 9.8 20.5 15.1 18.1 15.1 15.2V9c1.1.8 2.5 1.3 4 1.3V7.6c-1 0-1.9-.4-2.5-1.8z"/>
            <path fill="#FE2C55" d="M17.6 4.8c-.9-.6-1.5-1.6-1.6-2.8h-2.7v12c0 1.4-1.1 2.5-2.5 2.5s-2.5-1.1-2.5-2.5 1.1-2.5 2.5-2.5c.3 0 .5 0 .8.1V9c-.3 0-.5-.1-.8-.1-2.9 0-5.3 2.4-5.3 5.3s2.4 5.3 5.3 5.3 5.3-2.4 5.3-5.3V8c1.1.8 2.5 1.3 4 1.3V6.6c-1 0-1.9-.4-2.5-1.8z" opacity=".95"/>
            <path fill="#fff" d="M17.1 5.3c-.9-.6-1.5-1.6-1.6-2.8h-2.7v12c0 1.4-1.1 2.5-2.5 2.5s-2.5-1.1-2.5-2.5 1.1-2.5 2.5-2.5c.3 0 .5 0 .8.1V9.5c-.3 0-.5-.1-.8-.1-2.9 0-5.3 2.4-5.3 5.3s2.4 5.3 5.3 5.3 5.3-2.4 5.3-5.3V8.5c1.1.8 2.5 1.3 4 1.3V7.1c-1 0-1.9-.4-2.5-1.8z" opacity=".0"/>
          </svg>
        </span>
      );
    case "x":
      return (
        <span style={{ ...wrap, background: "#000" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
            <path fill="#fff" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
        </span>
      );
    case "messages":
      return (
        <span style={{ ...wrap, background: "#34C759" }}>
          <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden>
            <path fill="#fff" d="M12 3C6.5 3 2 6.8 2 11.5c0 2.3 1.1 4.4 2.9 5.9-.1 1.3-.6 3-1.5 3.6 1.7-.1 4-1.3 5-2.2 1.1.3 2.3.5 3.6.5 5.5 0 10-3.8 10-8.3S17.5 3 12 3z"/>
          </svg>
        </span>
      );
    case "mail":
      return (
        <span style={{ ...wrap, background: "#3478F6" }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="M3 7l9 6 9-6" />
          </svg>
        </span>
      );
    case "more":
      return (
        <span style={{ ...wrap, background: "#1E1E1E", border: "1px solid rgba(255,255,255,0.10)" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
            <circle cx="6" cy="12" r="2" fill="#fff" />
            <circle cx="12" cy="12" r="2" fill="#fff" />
            <circle cx="18" cy="12" r="2" fill="#fff" />
          </svg>
        </span>
      );
  }
}

function ToggleRow({ icon, label, value, onChange }: { icon: Parameters<typeof Icon>[0]["name"]; label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={TOGGLE_ROW}>
      <span style={TOGGLE_ICON}><Icon name={icon} size={14} /></span>
      <span style={{ flex: 1, fontSize: 13.5, color: "var(--kudos-ink)" }}>{label}</span>
      <button type="button" role="switch" aria-checked={value} onClick={() => onChange(!value)} style={value ? CHECK_ACTIVE : CHECK_IDLE}>
        {value ? <Icon name="discover" size={11} /> : null}
      </button>
    </div>
  );
}

function BrandDot() {
  return (
    <svg width="16" height="16" viewBox="0 0 32 32" aria-hidden>
      <defs>
        <linearGradient id="kudos-share-dot" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#FF9A00" />
          <stop offset="50%"  stopColor="#FF3CAC" />
          <stop offset="100%" stopColor="#6C3CFF" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="12" fill="none" stroke="url(#kudos-share-dot)" strokeWidth="3" />
      <path d="M 16 8 L 17.2 14.4 L 23.6 16 L 17.2 17.6 L 16 24 L 14.8 17.6 L 8.4 16 L 14.8 14.4 Z" fill="url(#kudos-share-dot)" />
    </svg>
  );
}

// =====================================================================
// Styles
// =====================================================================

const OVERLAY: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 1000,
  background: "rgba(5, 3, 10, 0.86)",
  backdropFilter: "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
};

const MODAL: React.CSSProperties = {
  width: "100%",
  maxWidth: 960,
  maxHeight: "calc(100dvh - 40px)",
  background: "rgba(13, 8, 32, 0.98)",
  borderRadius: 22,
  border: "1px solid rgba(255,255,255,0.08)",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  color: "var(--kudos-ink)",
  fontFamily: "var(--kudos-font-body)",
};

const MODAL_SMALL: React.CSSProperties = {
  background: "rgba(13, 8, 32, 0.98)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 18,
  padding: 22,
  display: "flex",
  flexDirection: "column",
  gap: 12,
  alignItems: "center",
};

const HEADER: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  padding: "18px 22px 8px",
};

const CLOSE_BTN: React.CSSProperties = {
  width: 36, height: 36,
  borderRadius: 12,
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.10)",
  color: "var(--kudos-ink)",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const HEADER_TITLE: React.CSSProperties = {
  margin: 0,
  fontFamily: "var(--kudos-font-display)",
  fontSize: 22,
  fontWeight: 700,
  letterSpacing: "-0.01em",
};

const HEADER_SUB: React.CSSProperties = {
  margin: 0,
  fontSize: 12.5,
  color: "rgba(242,242,247,0.55)",
};

const BODY_SPLIT: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 360px) minmax(0, 1fr)",
  gap: 22,
  padding: "12px 22px 0",
  overflowY: "auto",
};

const LEFT_COL: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
  minWidth: 0,
};

const RIGHT_COL: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  minWidth: 0,
};

// ── Preview card ──
const PREVIEW_CARD: React.CSSProperties = {
  position: "relative",
  borderRadius: 18,
  border: "1.5px solid rgba(255,154,0,0.40)",
  background: "rgba(255,255,255,0.02)",
  padding: 14,
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const PREVIEW_BRAND_ROW: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const PREVIEW_BRAND: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontSize: 13,
  color: "var(--kudos-ink)",
  textTransform: "uppercase",
};

const PREVIEW_CHIP: React.CSSProperties = {
  padding: "5px 12px",
  borderRadius: 999,
  background: "rgba(108,60,255,0.20)",
  border: "1px solid rgba(108,60,255,0.45)",
  color: "var(--kudos-accent-bright, #8B6BFF)",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.12em",
};

const PREVIEW_TEXT_BLOCK: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const PREVIEW_TITLE: React.CSSProperties = {
  margin: 0,
  fontFamily: "var(--kudos-font-display)",
  fontSize: 22,
  fontWeight: 700,
  lineHeight: 1.15,
  letterSpacing: "-0.015em",
  color: "var(--kudos-ink)",
};

const PREVIEW_TITLE_ACCENT: React.CSSProperties = {
  background: "var(--kudos-gradient-cta)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
};

const PREVIEW_DESC: React.CSSProperties = {
  margin: 0,
  fontSize: 12,
  lineHeight: 1.4,
  color: "rgba(242,242,247,0.78)",
};

const PREVIEW_POSTER: React.CSSProperties = {
  position: "relative",
  width: "100%",
  aspectRatio: "9/14",
  borderRadius: 12,
  overflow: "hidden",
  backgroundSize: "cover",
  backgroundPosition: "center",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  padding: 12,
};

const PREVIEW_PLAY: React.CSSProperties = {
  position: "absolute",
  top: "50%", left: "50%",
  transform: "translate(-50%, -50%)",
  width: 64, height: 64,
  borderRadius: "50%",
  background: "rgba(255,255,255,0.18)",
  border: "2px solid rgba(255,255,255,0.40)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#fff",
  backdropFilter: "blur(6px)",
};

const PREVIEW_META_ROW: React.CSSProperties = {
  marginTop: "auto",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  color: "#fff",
  fontSize: 11,
  position: "relative",
  zIndex: 2,
};

const PREVIEW_META_LOC: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "4px 9px",
  borderRadius: 999,
  background: "rgba(10,6,18,0.62)",
  border: "1px solid rgba(255,255,255,0.10)",
};

const PREVIEW_META_RATING: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 3,
  color: "var(--kudos-accent-yellow, #FFD23F)",
};

const PREVIEW_META_DURATION: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 3,
  padding: "3px 8px",
  borderRadius: 999,
  background: "rgba(10,6,18,0.62)",
  border: "1px solid rgba(255,255,255,0.10)",
  fontSize: 10.5,
};

// ── Dots ──
const DOTS_ROW: React.CSSProperties = {
  display: "flex", justifyContent: "center", gap: 6, padding: "8px 0",
};
const DOT: React.CSSProperties = {
  width: 6, height: 6, borderRadius: 999, background: "rgba(255,255,255,0.18)",
};
const DOT_ACTIVE: React.CSSProperties = {
  width: 8, height: 8, borderRadius: 999, background: "var(--kudos-ink)",
};

// ── Siblings rail ──
const SIBLING_EYEBROW: React.CSSProperties = {
  margin: "0 0 8px",
  fontSize: 10.5,
  fontWeight: 700,
  letterSpacing: "0.16em",
  color: "rgba(242,242,247,0.55)",
  textTransform: "uppercase",
};
const SIBLING_RAIL: React.CSSProperties = {
  display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4,
};
const SIBLING_CARD: React.CSSProperties = {
  position: "relative",
  flex: "0 0 88px",
  aspectRatio: "1/1.25",
  borderRadius: 10,
  overflow: "hidden",
  border: "1px solid rgba(255,255,255,0.08)",
};
const SIBLING_BG: React.CSSProperties = {
  position: "absolute", inset: 0,
  backgroundSize: "cover", backgroundPosition: "center",
};
const SIBLING_VEIL: React.CSSProperties = {
  position: "absolute", inset: 0,
  background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(10,6,18,0.85) 100%)",
};
const SIBLING_PLAY: React.CSSProperties = {
  position: "absolute",
  top: "40%", left: "50%",
  transform: "translate(-50%, -50%)",
  width: 28, height: 28,
  borderRadius: "50%",
  background: "rgba(255,255,255,0.18)",
  border: "1px solid rgba(255,255,255,0.32)",
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  color: "#fff",
};
const SIBLING_LABEL: React.CSSProperties = {
  position: "absolute",
  left: 6, right: 6, bottom: 6,
  fontSize: 9, fontWeight: 600,
  color: "var(--kudos-ink)",
  lineHeight: 1.2,
};

// ── Merit card ──
const MERIT_CARD: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: 14,
  marginTop: 4,
  borderRadius: 14,
  border: "1px solid rgba(108,60,255,0.32)",
  background: "linear-gradient(135deg, rgba(108,60,255,0.18) 0%, rgba(255,60,172,0.06) 100%)",
};
const MERIT_GLYPH: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 8,
  background: "rgba(108,60,255,0.20)",
  color: "var(--kudos-accent-bright, #8B6BFF)",
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  fontSize: 16,
  flexShrink: 0,
};
const MERIT_TITLE: React.CSSProperties = {
  fontSize: 12.5, fontWeight: 700,
  color: "var(--kudos-accent-bright, #8B6BFF)",
};
const MERIT_DESC: React.CSSProperties = {
  fontSize: 11, color: "rgba(242,242,247,0.62)",
  lineHeight: 1.35, marginTop: 2,
};
const MERIT_BADGE: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 12px",
  borderRadius: 12,
  border: "1.5px solid rgba(255,154,0,0.55)",
  background: "rgba(10,6,18,0.62)",
  flexShrink: 0,
};
const MERIT_BADGE_GLYPH: React.CSSProperties = {
  fontSize: 14,
  background: "var(--kudos-gradient-cta)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
};

// ── Tabs ──
const TABS_WRAP: React.CSSProperties = {
  display: "flex",
  gap: 4,
  borderBottom: "1px solid rgba(255,255,255,0.08)",
};
const TAB_BASE: React.CSSProperties = {
  padding: "12px 18px",
  background: "transparent",
  border: "none",
  borderBottom: "2px solid transparent",
  color: "rgba(242,242,247,0.55)",
  cursor: "pointer",
  fontFamily: "var(--kudos-font-body)",
  fontSize: 14,
  fontWeight: 500,
};
const TAB_IDLE: React.CSSProperties = TAB_BASE;
const TAB_ACTIVE: React.CSSProperties = {
  ...TAB_BASE,
  color: "var(--kudos-accent-bright, #8B6BFF)",
  fontWeight: 700,
  borderBottom: "2px solid var(--kudos-accent, #6C3CFF)",
};

const SECTION_TITLE: React.CSSProperties = {
  margin: "0 0 10px",
  fontFamily: "var(--kudos-font-display)",
  fontSize: 15,
  fontWeight: 700,
  color: "var(--kudos-ink)",
};
const SECTION_DESC: React.CSSProperties = {
  margin: "0 0 10px",
  fontSize: 11.5,
  color: "rgba(242,242,247,0.55)",
};

// ── Social grid ──
const SOCIAL_GRID: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: 12,
};
const SOCIAL_GLYPH: React.CSSProperties = {
  width: 50, height: 50,
  borderRadius: 14,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#fff",
  fontFamily: "var(--kudos-font-display)",
  fontWeight: 700,
  fontSize: 14,
};
const SOCIAL_LABEL: React.CSSProperties = {
  fontSize: 10.5,
  color: "var(--kudos-ink)",
  textAlign: "center",
};

// ── Link row ──
const LINK_ROW: React.CSSProperties = {
  display: "flex", gap: 8,
};
const LINK_FIELD: React.CSSProperties = {
  flex: 1, minWidth: 0,
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(5,3,10,0.55)",
  color: "var(--kudos-ink-mid)",
  fontFamily: "var(--kudos-font-mono)",
  fontSize: 12,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  display: "flex",
  alignItems: "center",
};
const COPY_BTN: React.CSSProperties = {
  width: 40, height: 40,
  borderRadius: 10,
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.10)",
  color: "var(--kudos-ink)",
  cursor: "pointer",
  display: "inline-flex", alignItems: "center", justifyContent: "center",
};
const COPY_OK: React.CSSProperties = {
  ...COPY_BTN,
  background: "rgba(108,60,255,0.22)",
  border: "1px solid rgba(108,60,255,0.55)",
  color: "var(--kudos-accent-bright, #8B6BFF)",
};

const BTN_GHOST: React.CSSProperties = {
  padding: "8px 18px",
  borderRadius: 10,
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.10)",
  color: "var(--kudos-ink)",
  cursor: "pointer",
};

const STAR: React.CSSProperties = {
  color: "var(--kudos-accent-yellow, #FFD23F)",
  lineHeight: 1,
};

const COPY_ERR: React.CSSProperties = {
  width: 40, height: 40,
  borderRadius: 10,
  background: "rgba(120,30,60,0.30)",
  border: "1px solid rgba(244,114,182,0.55)",
  color: "#fbcfe8",
  cursor: "pointer",
  display: "inline-flex", alignItems: "center", justifyContent: "center",
};
const COPY_HINT_OK: React.CSSProperties = {
  margin: "6px 0 0",
  fontSize: 11,
  color: "var(--kudos-accent-bright, #8B6BFF)",
};
const COPY_HINT_ERR: React.CSSProperties = {
  margin: "6px 0 0",
  fontSize: 11,
  color: "#fbcfe8",
};

const PREVIEW_LINK_CARD: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "120px minmax(0, 1fr)",
  gap: 12,
  padding: 12,
  borderRadius: 14,
  background: "rgba(5,3,10,0.55)",
  border: "1px solid rgba(255,255,255,0.08)",
};
const PREVIEW_LINK_THUMB: React.CSSProperties = {
  position: "relative",
  width: 120,
  aspectRatio: "1/1",
  borderRadius: 10,
  backgroundSize: "cover",
  backgroundPosition: "center",
  overflow: "hidden",
};
const PREVIEW_LINK_PLAY: React.CSSProperties = {
  position: "absolute",
  top: "50%", left: "50%",
  transform: "translate(-50%, -50%)",
  width: 32, height: 32,
  borderRadius: "50%",
  background: "rgba(255,255,255,0.20)",
  border: "1px solid rgba(255,255,255,0.32)",
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  color: "#fff",
};
const PREVIEW_LINK_TITLE: React.CSSProperties = {
  margin: 0,
  fontSize: 13.5, fontWeight: 700,
  color: "var(--kudos-ink)",
  lineHeight: 1.25,
};
const PREVIEW_LINK_DESC: React.CSSProperties = {
  margin: 0,
  fontSize: 11.5,
  color: "rgba(242,242,247,0.62)",
  lineHeight: 1.4,
};
const PREVIEW_LINK_META: React.CSSProperties = {
  marginTop: "auto",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontSize: 11,
};

const TOGGLE_ROW: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "10px 14px",
  borderRadius: 12,
  background: "rgba(5,3,10,0.45)",
  border: "1px solid rgba(255,255,255,0.05)",
};
const TOGGLE_ICON: React.CSSProperties = {
  width: 26, height: 26,
  borderRadius: 8,
  background: "rgba(255,255,255,0.05)",
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  color: "rgba(242,242,247,0.62)",
  flexShrink: 0,
};
const CHECK_BASE: React.CSSProperties = {
  width: 22, height: 22,
  borderRadius: 6,
  border: "1.5px solid rgba(255,255,255,0.20)",
  background: "transparent",
  color: "#fff",
  cursor: "pointer",
  display: "inline-flex", alignItems: "center", justifyContent: "center",
};
const CHECK_IDLE: React.CSSProperties = CHECK_BASE;
const CHECK_ACTIVE: React.CSSProperties = {
  ...CHECK_BASE,
  background: "var(--kudos-accent, #6C3CFF)",
  border: "1.5px solid var(--kudos-accent, #6C3CFF)",
};

const COMMENT_WRAP: React.CSSProperties = {
  position: "relative",
  display: "flex", alignItems: "center",
  marginTop: 4,
  height: 44,
  padding: "0 70px 0 14px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(5,3,10,0.55)",
};
const COMMENT_INPUT: React.CSSProperties = {
  flex: 1, minWidth: 0,
  background: "transparent",
  border: "none",
  outline: "none",
  color: "var(--kudos-ink)",
  fontFamily: "var(--kudos-font-body)",
  fontSize: 13.5,
  height: "100%",
};
const COMMENT_COUNT: React.CSSProperties = {
  position: "absolute",
  right: 14,
  fontSize: 10.5,
  color: "rgba(242,242,247,0.55)",
  fontFamily: "var(--kudos-font-mono)",
};

const FOOTER: React.CSSProperties = {
  padding: "14px 22px 18px",
  display: "flex",
  flexDirection: "column",
  gap: 8,
  borderTop: "1px solid rgba(255,255,255,0.06)",
};
const CTA_PRIMARY: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  padding: "16px 22px",
  borderRadius: 16,
  background: "var(--kudos-gradient-cta)",
  border: "none",
  color: "#fff",
  fontFamily: "var(--kudos-font-body)",
  fontSize: 15,
  fontWeight: 700,
  cursor: "pointer",
  letterSpacing: "0.01em",
  boxShadow: "0 18px 36px -10px rgba(255,60,172,0.55), 0 8px 20px -10px rgba(108,60,255,0.55)",
};
const CTA_GHOST: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  padding: "12px 22px",
  borderRadius: 14,
  background: "transparent",
  border: "1px solid rgba(255,255,255,0.18)",
  color: "var(--kudos-ink)",
  fontFamily: "var(--kudos-font-body)",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};
const CTA_GHOST_ACTIVE: React.CSSProperties = {
  ...CTA_GHOST,
  background: "rgba(108,60,255,0.22)",
  border: "1px solid rgba(108,60,255,0.55)",
  color: "var(--kudos-accent-bright, #8B6BFF)",
};
