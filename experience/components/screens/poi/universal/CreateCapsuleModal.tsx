"use client";
/**
 * KUDOS · CreateCapsuleModal · T7.3
 *
 * Modal para crear una cápsula asociada a un POI.
 *
 * Fase 1: solo audiencia "private" totalmente funcional.
 * Las otras audiencias aparecen disabled con "pronto" para que el usuario
 * vea la promesa de la plataforma sin que se rompan expectativas.
 *
 * Unlock_at opcional (cápsula del tiempo).
 */

import * as React from "react";
import { saveCapsule, type CapsuleAudience, type UniversalPOI, type Capsule } from "@/lib/poi/universalPoi";


interface Props {
  poi: UniversalPOI;
  onClose: () => void;
  onCreated: (capsule: Capsule) => void;
}


type UnlockPreset = "now" | "1m" | "6m" | "1y" | "5y" | "custom";


export function CreateCapsuleModal({ poi, onClose, onCreated }: Props) {
  const [content, setContent] = React.useState("");
  const [audience] = React.useState<CapsuleAudience>("private");
  const [unlockPreset, setUnlockPreset] = React.useState<UnlockPreset>("now");
  const [customDate, setCustomDate] = React.useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;

    const unlock_at = computeUnlockAt(unlockPreset, customDate);

    const cap = saveCapsule({
      poi_id: poi.id,
      audience,
      content: trimmed,
      unlock_at,
    });
    onCreated(cap);
  };

  return (
    <>
      <div style={BACKDROP} onClick={onClose} aria-hidden />
      <section style={MODAL} role="dialog" aria-labelledby="create-cap-title">
        <button onClick={onClose} style={CLOSE_BTN} aria-label="Cerrar">×</button>

        <div style={POI_CHIP}>
          <span style={POI_DOT} />
          {poi.name}
        </div>

        <h2 id="create-cap-title" style={TITLE}>Deja algo aquí</h2>
        <p style={SUB}>
          Para ti. Para tu yo futuro. Para quien vuelva a este lugar.
        </p>

        <form onSubmit={handleSubmit}>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Lo que no quieres olvidar de este momento..."
            style={TEXTAREA}
            autoFocus
            rows={5}
            maxLength={500}
          />
          <div style={CHAR_COUNT}>{content.length} / 500</div>

          <div style={SECTION_LABEL}>¿Cuándo se abre?</div>
          <div style={PRESETS_ROW}>
            {[
              { id: "now",    label: "Ahora" },
              { id: "1m",     label: "En 1 mes" },
              { id: "6m",     label: "En 6 meses" },
              { id: "1y",     label: "En 1 año" },
              { id: "5y",     label: "En 5 años" },
              { id: "custom", label: "Fecha exacta" },
            ].map((p) => (
              <button
                type="button"
                key={p.id}
                onClick={() => setUnlockPreset(p.id as UnlockPreset)}
                style={{
                  ...PRESET,
                  ...(unlockPreset === p.id ? PRESET_ACTIVE : null),
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {unlockPreset === "custom" && (
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              style={DATE_INPUT}
              min={new Date().toISOString().slice(0, 10)}
            />
          )}

          <div style={SECTION_LABEL}>¿Para quién?</div>
          <div style={AUDIENCE_ROW}>
            <button type="button" style={{ ...AUD_CHIP, ...AUD_CHIP_ACTIVE }}>
              <span style={AUD_DOT_PRIVATE} />
              Para mí
            </button>
            <button type="button" disabled style={AUD_CHIP_DISABLED} title="Próximamente">
              Amigos · pronto
            </button>
            <button type="button" disabled style={AUD_CHIP_DISABLED} title="Próximamente">
              Familia · pronto
            </button>
          </div>

          <div style={ACTIONS}>
            <button type="button" onClick={onClose} style={CANCEL_BTN}>
              Cancelar
            </button>
            <button type="submit" disabled={!content.trim()} style={{
              ...PRIMARY_BTN,
              opacity: content.trim() ? 1 : 0.4,
              cursor: content.trim() ? "pointer" : "default",
            }}>
              Dejarla aquí
            </button>
          </div>
        </form>
      </section>
    </>
  );
}


// ─── HELPERS ──────────────────────────────────────────────────────────────

function computeUnlockAt(preset: UnlockPreset, customDate: string): string | undefined {
  if (preset === "now") return undefined;
  if (preset === "custom") {
    if (!customDate) return undefined;
    const d = new Date(customDate);
    if (Number.isNaN(d.getTime())) return undefined;
    return d.toISOString();
  }
  const now = new Date();
  const future = new Date(now);
  if (preset === "1m") future.setMonth(future.getMonth() + 1);
  if (preset === "6m") future.setMonth(future.getMonth() + 6);
  if (preset === "1y") future.setFullYear(future.getFullYear() + 1);
  if (preset === "5y") future.setFullYear(future.getFullYear() + 5);
  return future.toISOString();
}


// ─── ESTILOS ──────────────────────────────────────────────────────────────

const BACKDROP: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.6)",
  zIndex: 9997,
  backdropFilter: "blur(3px)",
};

const MODAL: React.CSSProperties = {
  position: "fixed",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "min(460px, calc(100vw - 32px))",
  maxHeight: "90vh",
  overflowY: "auto",
  zIndex: 9998,
  background: "linear-gradient(180deg, #1f1840 0%, #14102a 100%)",
  borderRadius: 18,
  padding: "28px 26px 26px",
  color: "#f5f0e8",
  fontFamily: '"Poppins", system-ui, sans-serif',
  border: "1px solid rgba(224,184,111,0.32)",
  boxShadow: "0 24px 60px rgba(0,0,0,0.72)",
};

const CLOSE_BTN: React.CSSProperties = {
  position: "absolute",
  top: 14,
  right: 16,
  width: 30,
  height: 30,
  borderRadius: "50%",
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "#fff",
  fontSize: 20,
  lineHeight: 1,
  cursor: "pointer",
};

const POI_CHIP: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "5px 12px",
  background: "rgba(224,184,111,0.12)",
  border: "1px solid rgba(224,184,111,0.3)",
  borderRadius: 999,
  fontSize: 11,
  color: "rgba(224,184,111,0.95)",
  marginBottom: 12,
};

const POI_DOT: React.CSSProperties = {
  width: 6,
  height: 6,
  borderRadius: "50%",
  background: "#E0B86F",
  boxShadow: "0 0 6px #E0B86F",
};

const TITLE: React.CSSProperties = {
  fontFamily: 'var(--kudos-font-display, "Cormorant Garamond", Georgia, serif)',
  fontSize: 28,
  fontWeight: 500,
  margin: "0 0 6px",
  color: "#fff",
  lineHeight: 1.1,
};

const SUB: React.CSSProperties = {
  margin: "0 0 18px",
  fontSize: 13,
  color: "rgba(245,240,232,0.7)",
  lineHeight: 1.45,
};

const TEXTAREA: React.CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.14)",
  borderRadius: 12,
  color: "#fff",
  fontSize: 15,
  lineHeight: 1.5,
  fontFamily: "Georgia, serif",
  resize: "vertical" as const,
  outline: "none",
  boxSizing: "border-box",
  minHeight: 110,
};

const CHAR_COUNT: React.CSSProperties = {
  textAlign: "right" as const,
  fontSize: 10,
  color: "rgba(245,240,232,0.4)",
  marginTop: 4,
  marginBottom: 18,
};

const SECTION_LABEL: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  fontWeight: 600,
  color: "rgba(245,240,232,0.65)",
  marginBottom: 8,
};

const PRESETS_ROW: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap" as const,
  gap: 6,
  marginBottom: 14,
};

const PRESET: React.CSSProperties = {
  padding: "6px 12px",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 999,
  color: "rgba(245,240,232,0.75)",
  fontSize: 12,
  fontFamily: "inherit",
  cursor: "pointer",
};

const PRESET_ACTIVE: React.CSSProperties = {
  background: "rgba(224,184,111,0.85)",
  border: "1px solid #E0B86F",
  color: "#1a1430",
  fontWeight: 600,
};

const DATE_INPUT: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.14)",
  borderRadius: 10,
  color: "#fff",
  fontSize: 14,
  fontFamily: "inherit",
  outline: "none",
  boxSizing: "border-box",
  marginBottom: 14,
};

const AUDIENCE_ROW: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap" as const,
  gap: 6,
  marginBottom: 22,
};

const AUD_CHIP: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 12px",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 999,
  color: "rgba(245,240,232,0.75)",
  fontSize: 12,
  fontFamily: "inherit",
  cursor: "pointer",
};

const AUD_CHIP_ACTIVE: React.CSSProperties = {
  background: "rgba(139,107,255,0.85)",
  border: "1px solid #8B6BFF",
  color: "#fff",
};

const AUD_CHIP_DISABLED: React.CSSProperties = {
  padding: "6px 12px",
  background: "rgba(255,255,255,0.02)",
  border: "1px dashed rgba(255,255,255,0.1)",
  borderRadius: 999,
  color: "rgba(245,240,232,0.35)",
  fontSize: 11,
  fontFamily: "inherit",
  cursor: "not-allowed",
};

const AUD_DOT_PRIVATE: React.CSSProperties = {
  width: 6,
  height: 6,
  borderRadius: "50%",
  background: "#fff",
};

const ACTIONS: React.CSSProperties = {
  display: "flex",
  gap: 10,
  justifyContent: "flex-end",
};

const CANCEL_BTN: React.CSSProperties = {
  padding: "10px 18px",
  background: "transparent",
  border: "1px solid rgba(255,255,255,0.18)",
  color: "rgba(245,240,232,0.8)",
  borderRadius: 999,
  fontSize: 13,
  fontFamily: "inherit",
  cursor: "pointer",
};

const PRIMARY_BTN: React.CSSProperties = {
  padding: "10px 22px",
  background: "linear-gradient(135deg, #E0B86F 0%, #C9A961 100%)",
  border: "none",
  color: "#1a1430",
  borderRadius: 999,
  fontSize: 13,
  fontWeight: 700,
  fontFamily: "inherit",
  boxShadow: "0 4px 16px rgba(224,184,111,0.45)",
};
