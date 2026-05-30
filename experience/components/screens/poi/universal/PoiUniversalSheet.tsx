"use client";
/**
 * KUDOS · PoiUniversalSheet · T7.3
 *
 * Ficha mínima que sirve para CUALQUIER POI:
 *   - Coliseo (con cápsula principal + eras)
 *   - Restaurante Casa Pepe (sin nada salvo nombre y coords)
 *   - Banca del parque (POI personal del usuario)
 *
 * Render condicional: solo muestra lo que el POI tiene.
 * Cero campos obligatorios salvo name + lat + lng.
 */

import * as React from "react";
import {
  type UniversalPOI,
  type Capsule,
  loadCapsulesForPoi,
  isCapsuleUnlocked,
  markCapsuleOpened,
} from "@/lib/poi/universalPoi";


interface Props {
  poi: UniversalPOI;
  onClose: () => void;
  onCreateCapsule: () => void;
}


export function PoiUniversalSheet({ poi, onClose, onCreateCapsule }: Props) {
  const [capsules, setCapsules] = React.useState<Capsule[]>([]);
  const [openCapsuleId, setOpenCapsuleId] = React.useState<string | null>(null);

  // Cargar cápsulas de este POI
  const refreshCapsules = React.useCallback(() => {
    setCapsules(loadCapsulesForPoi(poi.id));
  }, [poi.id]);

  React.useEffect(() => {
    refreshCapsules();
  }, [refreshCapsules]);

  const handleOpenCapsule = (cap: Capsule) => {
    if (!isCapsuleUnlocked(cap)) return;
    if (!cap.opened_at) {
      markCapsuleOpened(cap.id);
      refreshCapsules();
    }
    setOpenCapsuleId(cap.id);
  };

  const isUserPoi = poi.source === "user";
  const hasCapsuleMain = !!poi.capsule_main;
  const hasEras = !!poi.eras && poi.eras.length > 0;
  const openCapsule = capsules.find((c) => c.id === openCapsuleId);

  return (
    <>
      <div style={BACKDROP} onClick={onClose} aria-hidden />
      <section style={SHEET} role="dialog" aria-labelledby="poi-sheet-title">
        <button onClick={onClose} style={CLOSE_BTN} aria-label="Cerrar">
          ×
        </button>

        {isUserPoi && (
          <div style={USER_BADGE}>
            <span style={USER_DOT} /> Solo tuyo
          </div>
        )}

        <header style={HEAD}>
          <h1 id="poi-sheet-title" style={TITLE}>{poi.name}</h1>
        </header>

        {/* Si tiene cápsula principal editorial KUDOS, la muestra */}
        {hasCapsuleMain && (
          <div style={MAIN_CAPSULE_BOX}>
            <span style={MAIN_CAPSULE_LABEL}>CÁPSULA KUDOS</span>
            <p style={MAIN_CAPSULE_BODY}>{poi.capsule_main!.content}</p>
          </div>
        )}

        {/* Si tiene épocas, las muestra como chips (sin contenido por ahora) */}
        {hasEras && (
          <div style={ERAS_ROW}>
            {poi.eras!.map((e) => (
              <span key={e.id} style={ERA_CHIP}>{e.label}</span>
            ))}
          </div>
        )}

        {/* Lista de cápsulas asociadas al POI */}
        <div style={CAPSULES_SECTION}>
          {capsules.length > 0 && (
            <header style={CAPSULES_HEAD}>
              <h2 style={CAPSULES_TITLE}>
                Lo que se ha dejado aquí <span style={COUNT}>{capsules.length}</span>
              </h2>
              <button onClick={onCreateCapsule} style={CREATE_BTN}>
                + Dejar otra
              </button>
            </header>
          )}

          {capsules.length === 0 && (
            <div style={EMPTY}>
              <p style={EMPTY_LINE}>Este lugar todavía no guarda nada.</p>
              <p style={EMPTY_SUB}>Lo que dejes aquí esperará a quien vuelva.</p>
              <button onClick={onCreateCapsule} style={EMPTY_CTA}>
                Dejar la primera cápsula
              </button>
            </div>
          )}

          {capsules.length > 0 && (
            <ul style={CAPSULE_LIST}>
              {capsules.map((c) => {
                const unlocked = isCapsuleUnlocked(c);
                return (
                  <li key={c.id}>
                    <button
                      onClick={() => handleOpenCapsule(c)}
                      style={{
                        ...CAPSULE_ITEM,
                        opacity: unlocked ? 1 : 0.55,
                        cursor: unlocked ? "pointer" : "default",
                      }}
                      disabled={!unlocked}
                    >
                      <span style={CAPSULE_AUD_DOT(c.audience)} />
                      <div style={CAPSULE_BODY}>
                        <span style={CAPSULE_PREVIEW}>
                          {unlocked
                            ? truncate(c.content, 60)
                            : "🔒 Esperando..."}
                        </span>
                        <span style={CAPSULE_META}>
                          {audienceLabel(c.audience)}
                          {!unlocked && c.unlock_at && (
                            <> · se abre {formatDate(c.unlock_at)}</>
                          )}
                          {unlocked && !c.opened_at && (
                            <> · nueva</>
                          )}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {/* Visor de cápsula abierta */}
      {openCapsule && (
        <CapsuleViewer
          capsule={openCapsule}
          poi={poi}
          onClose={() => setOpenCapsuleId(null)}
        />
      )}
    </>
  );
}


// ─── VISOR DE CÁPSULA (sub-modal) ─────────────────────────────────────────

function CapsuleViewer({
  capsule, poi, onClose,
}: { capsule: Capsule; poi: UniversalPOI; onClose: () => void }) {
  return (
    <>
      <div style={{ ...BACKDROP, zIndex: 9999 }} onClick={onClose} aria-hidden />
      <section style={VIEWER} role="dialog">
        <button onClick={onClose} style={CLOSE_BTN} aria-label="Cerrar">×</button>
        <div style={VIEWER_LOC}>{poi.name}</div>
        <div style={VIEWER_AUD}>
          <span style={CAPSULE_AUD_DOT(capsule.audience)} />
          {audienceLabel(capsule.audience)}
        </div>
        <p style={VIEWER_BODY}>{capsule.content}</p>
        <div style={VIEWER_META}>
          La dejaste el {formatDate(capsule.created_at)}
        </div>
      </section>
    </>
  );
}


// ─── HELPERS ──────────────────────────────────────────────────────────────

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n).trimEnd() + "…";
}

function audienceLabel(a: Capsule["audience"]): string {
  switch (a) {
    case "private": return "Para mí";
    case "friends": return "Amigos";
    case "family":  return "Familia";
    case "public":  return "Pública";
    case "legacy":  return "Legado";
  }
}

function audienceColor(a: Capsule["audience"]): string {
  switch (a) {
    case "private": return "#8B6BFF";
    case "friends": return "#5fcb7a";
    case "family":  return "#E0B86F";
    case "public":  return "#6da8e8";
    case "legacy":  return "#c99dff";
  }
}

function CAPSULE_AUD_DOT(a: Capsule["audience"]): React.CSSProperties {
  return {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: audienceColor(a),
    flexShrink: 0,
    boxShadow: `0 0 8px ${audienceColor(a)}66`,
  };
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
  } catch { return iso; }
}


// ─── ESTILOS ──────────────────────────────────────────────────────────────

const BACKDROP: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.55)",
  zIndex: 9990,
  backdropFilter: "blur(2px)",
};

const SHEET: React.CSSProperties = {
  position: "fixed",
  bottom: 0,
  left: 0,
  right: 0,
  maxHeight: "85vh",
  overflowY: "auto",
  zIndex: 9991,
  background: "linear-gradient(180deg, #1a1430 0%, #0a0814 100%)",
  borderTopLeftRadius: 22,
  borderTopRightRadius: 22,
  padding: "22px 22px 32px",
  color: "#f5f0e8",
  fontFamily: '"Poppins", system-ui, sans-serif',
  borderTop: "1px solid rgba(224,184,111,0.18)",
  boxShadow: "0 -16px 48px rgba(0,0,0,0.65)",
};

const CLOSE_BTN: React.CSSProperties = {
  position: "absolute",
  top: 14,
  right: 18,
  width: 32,
  height: 32,
  borderRadius: "50%",
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "#fff",
  fontSize: 22,
  lineHeight: 1,
  cursor: "pointer",
  zIndex: 10,
};

const USER_BADGE: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "4px 10px",
  background: "rgba(139,107,255,0.18)",
  border: "1px solid rgba(139,107,255,0.35)",
  borderRadius: 999,
  fontSize: 10,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "rgba(199,157,255,0.95)",
  marginBottom: 12,
};

const USER_DOT: React.CSSProperties = {
  width: 6,
  height: 6,
  borderRadius: "50%",
  background: "#8B6BFF",
  boxShadow: "0 0 6px #8B6BFF",
};

const HEAD: React.CSSProperties = {
  marginBottom: 16,
};

const EYEBROW: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: "0.22em",
  fontWeight: 700,
  color: "rgba(224,184,111,0.85)",
  display: "block",
  marginBottom: 8,
};

const TITLE: React.CSSProperties = {
  fontFamily: 'var(--kudos-font-display, "Cormorant Garamond", Georgia, serif)',
  fontSize: 32,
  fontWeight: 500,
  lineHeight: 1.05,
  margin: 0,
  color: "#fff",
};

const COORDS: React.CSSProperties = {
  marginTop: 6,
  fontSize: 11,
  color: "rgba(245,240,232,0.45)",
  fontFamily: "monospace",
};

const MAIN_CAPSULE_BOX: React.CSSProperties = {
  background: "rgba(224,184,111,0.08)",
  border: "1px solid rgba(224,184,111,0.22)",
  borderRadius: 14,
  padding: "14px 16px",
  marginBottom: 18,
};

const MAIN_CAPSULE_LABEL: React.CSSProperties = {
  fontSize: 9,
  letterSpacing: "0.22em",
  fontWeight: 700,
  color: "rgba(224,184,111,0.95)",
  display: "block",
  marginBottom: 6,
};

const MAIN_CAPSULE_BODY: React.CSSProperties = {
  margin: 0,
  fontSize: 14,
  lineHeight: 1.55,
  color: "rgba(245,240,232,0.92)",
  fontFamily: "Georgia, serif",
  fontStyle: "italic",
};

const ERAS_ROW: React.CSSProperties = {
  display: "flex",
  gap: 6,
  flexWrap: "wrap" as const,
  marginBottom: 18,
};

const ERA_CHIP: React.CSSProperties = {
  padding: "4px 11px",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 999,
  fontSize: 10,
  color: "rgba(245,240,232,0.78)",
};

const CAPSULES_SECTION: React.CSSProperties = {
  marginTop: 6,
};

const CAPSULES_HEAD: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 12,
};

const CAPSULES_TITLE: React.CSSProperties = {
  margin: 0,
  fontSize: 13,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  fontWeight: 700,
  color: "rgba(245,240,232,0.78)",
};

const COUNT: React.CSSProperties = {
  marginLeft: 6,
  color: "rgba(224,184,111,0.85)",
};

const CREATE_BTN: React.CSSProperties = {
  padding: "8px 14px",
  background: "linear-gradient(135deg, #8B6BFF 0%, #6e4dd6 100%)",
  color: "#fff",
  border: "none",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  boxShadow: "0 4px 14px rgba(139,107,255,0.4)",
};

const EMPTY: React.CSSProperties = {
  padding: "28px 18px 24px",
  textAlign: "center" as const,
  background: "rgba(139,107,255,0.06)",
  border: "1px solid rgba(139,107,255,0.18)",
  borderRadius: 16,
};

const EMPTY_LINE: React.CSSProperties = {
  margin: "0 0 6px",
  fontFamily: 'var(--kudos-font-display, "Cormorant Garamond", Georgia, serif)',
  fontSize: 19,
  fontWeight: 500,
  color: "rgba(245,240,232,0.92)",
  lineHeight: 1.25,
};

const EMPTY_SUB: React.CSSProperties = {
  margin: "0 0 18px",
  fontSize: 12.5,
  color: "rgba(245,240,232,0.55)",
  fontStyle: "italic",
  fontFamily: "Georgia, serif",
};

const EMPTY_CTA: React.CSSProperties = {
  padding: "12px 22px",
  background: "linear-gradient(135deg, #8B6BFF 0%, #6e4dd6 100%)",
  color: "#fff",
  border: "none",
  borderRadius: 999,
  fontSize: 13,
  fontWeight: 600,
  fontFamily: "inherit",
  cursor: "pointer",
  boxShadow: "0 6px 22px rgba(139,107,255,0.5)",
};

const CAPSULE_LIST: React.CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column" as const,
  gap: 8,
};

const CAPSULE_ITEM: React.CSSProperties = {
  width: "100%",
  textAlign: "left" as const,
  display: "flex",
  alignItems: "flex-start",
  gap: 10,
  padding: "12px 14px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 12,
  color: "#fff",
  fontFamily: "inherit",
  transition: "background 180ms ease",
};

const CAPSULE_BODY: React.CSSProperties = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 4,
  flex: 1,
  minWidth: 0,
};

const CAPSULE_PREVIEW: React.CSSProperties = {
  fontSize: 13,
  lineHeight: 1.4,
  color: "rgba(245,240,232,0.92)",
};

const CAPSULE_META: React.CSSProperties = {
  fontSize: 10,
  color: "rgba(245,240,232,0.5)",
};

const VIEWER: React.CSSProperties = {
  position: "fixed",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "min(440px, calc(100vw - 32px))",
  maxHeight: "70vh",
  overflowY: "auto",
  zIndex: 10000,
  background: "linear-gradient(180deg, #1f1840 0%, #14102a 100%)",
  borderRadius: 18,
  padding: "32px 26px 26px",
  color: "#f5f0e8",
  fontFamily: "Georgia, serif",
  border: "1px solid rgba(224,184,111,0.25)",
  boxShadow: "0 24px 60px rgba(0,0,0,0.72)",
};

const VIEWER_LOC: React.CSSProperties = {
  fontFamily: 'var(--kudos-font-display, "Cormorant Garamond", Georgia, serif)',
  fontSize: 18,
  color: "rgba(224,184,111,0.95)",
  marginBottom: 4,
};

const VIEWER_AUD: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontSize: 10,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "rgba(245,240,232,0.65)",
  marginBottom: 18,
  fontFamily: '"Poppins", system-ui, sans-serif',
};

const VIEWER_BODY: React.CSSProperties = {
  fontSize: 17,
  lineHeight: 1.7,
  color: "#fff",
  margin: "0 0 22px",
  fontStyle: "italic",
};

const VIEWER_META: React.CSSProperties = {
  fontSize: 11,
  color: "rgba(245,240,232,0.45)",
  fontFamily: '"Poppins", system-ui, sans-serif',
};
