"use client";
/**
 * KUDOS · DiscoveryShiftCard standalone · T3.2 EJEC Day 8.
 *
 * Componente canónico del Discovery Shift Model (T2.8 + T3.1).
 *
 * Estructura visual:
 *   ANTES (creencia previa)
 *      |  (linea vertical sutil)
 *      v
 *   DESCUBRIMIENTO (lo revelado)
 *      |
 *      v
 *   AHORA PUEDES PENSAR (nueva perspectiva)
 *
 *   [opcional] action_potential dorado
 *   [opcional] pregunta "¿Te ha pasado esto?"
 *   "Anotado. Volvemos a preguntarte en 7 dias."
 *
 * Tracking automatico: shift_revealed al mostrar, shift_acknowledged al responder.
 *
 * Reutilizado en: CoreScreen, PoiNodeV5, futuro MiMundo (revisita shifts).
 *
 * NO gamificacion. NO confeti. NO "logro". Solo registro silencioso.
 */
import * as React from "react";


const API = process.env.NEXT_PUBLIC_KUDOS_API_URL || "";


export interface ShiftData {
  before: string;
  discovery: string;
  after: string;
  identity_from?: string | null;
  identity_to?: string | null;
  action_potential?: string | null;
  action_friction?: string;
}


interface Props {
  shift: ShiftData;
  poiId?: string;
  /** Si false, no muestra la pregunta interactiva al final. Util para revisitar. */
  interactive?: boolean;
  /** Callback tras respuesta usuario (yes | not_yet | not_really). */
  onAcknowledge?: (response: "yes" | "not_yet" | "not_really") => void;
  /** Si false, no dispara animacion fade escalonada. Util para revisitas. */
  animated?: boolean;
}


export function DiscoveryShiftCard({
  shift,
  poiId,
  interactive = true,
  onAcknowledge,
  animated = true,
}: Props) {
  const [step, setStep] = React.useState(animated ? 0 : 3);
  const [answered, setAnswered] = React.useState<string | null>(null);

  // Animacion fade escalonada (T3.1 Bloque 5)
  React.useEffect(() => {
    if (!animated) return;
    const t1 = setTimeout(() => setStep(1), 250);
    const t2 = setTimeout(() => setStep(2), 1500);
    const t3 = setTimeout(() => setStep(3), 2750);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [animated]);

  // Dispatch shift_revealed cuando se completa la animacion
  React.useEffect(() => {
    if (step !== 3 || !API || !poiId) return;
    const sid = (typeof window !== "undefined"
      ? sessionStorage.getItem("kudos:session")
      : null) || "anon";
    void fetch(`${API}/api/telemetry/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sid,
        event_type: "shift_revealed",
        poi_id: poiId,
      }),
      credentials: "include",
      keepalive: true,
    }).catch(() => {});
  }, [step, poiId]);

  const handleAnswer = (response: "yes" | "not_yet" | "not_really") => {
    setAnswered(response);
    if (API && poiId) {
      const sid = (typeof window !== "undefined"
        ? sessionStorage.getItem("kudos:session")
        : null) || "anon";
      void fetch(`${API}/api/telemetry/event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sid,
          event_type: "shift_acknowledged",
          poi_id: poiId,
          payload: { response },
        }),
        credentials: "include",
        keepalive: true,
      }).catch(() => {});
    }
    onAcknowledge?.(response);
  };

  return (
    <section style={WRAP} aria-label="Discovery Shift">
      <div style={{ ...BLOCK, opacity: step >= 1 ? 1 : 0, transition: "opacity 600ms" }}>
        <div style={LABEL}>ANTES</div>
        <p style={TEXT}>{shift.before}</p>
      </div>

      <div style={{ ...LINE, opacity: step >= 1 ? 0.45 : 0, transition: "opacity 600ms" }} />

      <div style={{ ...BLOCK, opacity: step >= 2 ? 1 : 0, transition: "opacity 600ms" }}>
        <div style={LABEL}>DESCUBRIMIENTO</div>
        <p style={TEXT}>{shift.discovery}</p>
      </div>

      <div style={{ ...LINE, opacity: step >= 2 ? 0.45 : 0, transition: "opacity 600ms" }} />

      <div style={{ ...BLOCK, opacity: step >= 3 ? 1 : 0, transition: "opacity 600ms" }}>
        <div style={LABEL}>AHORA PUEDES PENSAR</div>
        <p style={TEXT}>{shift.after}</p>
      </div>

      {shift.action_potential && step >= 3 && (
        <div style={{ ...ACTION, opacity: step >= 3 ? 1 : 0, transition: "opacity 800ms 200ms" }}>
          <div style={ACTION_LABEL}>UNA ACCION POSIBLE</div>
          <p style={ACTION_TXT}>{shift.action_potential}</p>
        </div>
      )}

      {interactive && step >= 3 && !answered && (
        <div style={QUESTION_ROW}>
          <p style={QUESTION_TXT}>¿Te ha pasado esto?</p>
          <div style={BUTTONS_ROW}>
            <button style={BTN_YES} onClick={() => handleAnswer("yes")}>Si</button>
            <button style={BTN_MAYBE} onClick={() => handleAnswer("not_yet")}>Aun no se</button>
            <button style={BTN_NO} onClick={() => handleAnswer("not_really")}>No realmente</button>
          </div>
        </div>
      )}

      {answered && (
        <p style={FOOT}>
          Anotado. Volvemos a preguntarte en una semana.
        </p>
      )}
    </section>
  );
}


// =================== styles ===================

const WRAP: React.CSSProperties = {
  margin: "24px auto",
  maxWidth: 620,
  padding: "28px 24px 24px",
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(201,169,97,0.18)",
  borderRadius: 16,
};

const BLOCK: React.CSSProperties = {
  padding: "8px 0",
};

const LABEL: React.CSSProperties = {
  fontSize: 10, letterSpacing: "0.22em", color: "#C9A961",
  fontWeight: 600, marginBottom: 8,
};

const TEXT: React.CSSProperties = {
  fontFamily: 'Georgia, serif',
  fontSize: 17, lineHeight: 1.5,
  color: "rgba(255,255,255,0.92)", margin: 0,
};

const LINE: React.CSSProperties = {
  width: 1, height: 28, margin: "8px auto",
  background: "rgba(201,169,97,0.5)",
};

const ACTION: React.CSSProperties = {
  marginTop: 22, padding: "14px 16px",
  background: "rgba(201,169,97,0.08)",
  border: "1px solid rgba(201,169,97,0.25)",
  borderRadius: 12,
};
const ACTION_LABEL: React.CSSProperties = {
  fontSize: 9, letterSpacing: "0.22em", color: "#C9A961",
  fontWeight: 600, marginBottom: 8,
};
const ACTION_TXT: React.CSSProperties = {
  fontStyle: "italic", fontSize: 14, lineHeight: 1.5,
  color: "rgba(255,255,255,0.85)", margin: 0,
};

const QUESTION_ROW: React.CSSProperties = {
  marginTop: 22,
  paddingTop: 18,
  borderTop: "1px solid rgba(255,255,255,0.06)",
  textAlign: "center" as const,
};

const QUESTION_TXT: React.CSSProperties = {
  fontFamily: 'var(--kudos-font-display, "Cormorant Garamond", Georgia, serif)',
  fontSize: 17, fontStyle: "italic",
  color: "rgba(255,255,255,0.85)", margin: "0 0 14px",
};

const BUTTONS_ROW: React.CSSProperties = {
  display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" as const,
};

const BTN_YES: React.CSSProperties = {
  padding: "9px 22px", borderRadius: 999,
  background: "#fff", color: "#1a1333",
  border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer",
};
const BTN_MAYBE: React.CSSProperties = {
  padding: "9px 18px", borderRadius: 999,
  background: "transparent",
  color: "rgba(255,255,255,0.8)",
  border: "1px solid rgba(255,255,255,0.18)",
  fontSize: 12, cursor: "pointer",
};
const BTN_NO: React.CSSProperties = {
  padding: "9px 18px", borderRadius: 999,
  background: "transparent",
  color: "rgba(255,255,255,0.55)",
  border: "1px solid rgba(255,255,255,0.10)",
  fontSize: 12, cursor: "pointer",
};

const FOOT: React.CSSProperties = {
  marginTop: 22,
  fontSize: 11, fontStyle: "italic",
  color: "rgba(255,255,255,0.42)",
  textAlign: "center" as const,
};
