"use client";
/**
 * KUDOS · ResonanceFlow · T3.2 EJEC Day 9.
 *
 * Flow completo post-Core (mejora UX del inline en CoreScreen):
 *
 *   1. "¿Te ha movido?" -> Si / Aun no se / No
 *   2. Si Si: 5 chips emocionales (asombro, aprendizaje, inspiracion, conexion, nostalgia)
 *   3. Tras pick: pregunta opcional "¿Quieres anotar por que?" (campo texto · 280 chars max)
 *   4. Boton "Saltar" siempre visible (sin presion)
 *   5. Tras envio o saltar: callback onComplete(resonance, reflection)
 *
 * Tracking:
 *   - shift_revealed cuando el flow se monta
 *   - resonance cuando el usuario elige chip
 *   - reflection_submitted cuando envia texto
 *   - core_first_signal cuando hay cualquier respuesta positiva
 *
 * Reutilizable en: CoreScreen, PoiNodeV5, futuro Mi Mundo (revisita).
 */
import * as React from "react";


const API = process.env.NEXT_PUBLIC_KUDOS_API_URL || "";


export type Resonance = "asombro" | "aprendizaje" | "inspiracion" | "conexion" | "nostalgia";


const RESONANCES: { id: Resonance; label: string; color: string; emoji: string }[] = [
  { id: "asombro",     label: "Asombro",      color: "#C9A961", emoji: "*" },
  { id: "aprendizaje", label: "Aprendizaje",  color: "#5A8BB8", emoji: "·" },
  { id: "inspiracion", label: "Inspiracion",  color: "#A85858", emoji: "·" },
  { id: "conexion",    label: "Conexion",     color: "#6BA888", emoji: "·" },
  { id: "nostalgia",   label: "Nostalgia",    color: "#7A6BA8", emoji: "·" },
];


interface Props {
  poiId: string;
  sessionId: string;
  /** Callback cuando el flow termina (acepta o saltar). */
  onComplete: (data: { moved: boolean; resonance?: Resonance; reflection?: string }) => void;
}


type Phase = "ask_moved" | "pick_resonance" | "reflect" | "done";


function emit(eventType: string, sessionId: string, poiId: string, payload?: any) {
  if (!API) return;
  void fetch(`${API}/api/telemetry/event`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session_id: sessionId,
      event_type: eventType,
      poi_id: poiId,
      payload: payload || {},
    }),
    credentials: "include",
    keepalive: true,
  }).catch(() => {});
}


export function ResonanceFlow({ poiId, sessionId, onComplete }: Props) {
  const [phase, setPhase] = React.useState<Phase>("ask_moved");
  const [resonance, setResonance] = React.useState<Resonance | null>(null);
  const [reflection, setReflection] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const handleYes = () => {
    emit("core_first_signal", sessionId, poiId, { source: "moved_yes" });
    setPhase("pick_resonance");
  };

  const handleNotYet = () => {
    emit("resonance_skipped", sessionId, poiId, { reason: "not_yet" });
    onComplete({ moved: false });
  };

  const handleNo = () => {
    emit("resonance_skipped", sessionId, poiId, { reason: "not_really" });
    onComplete({ moved: false });
  };

  const handleResonancePick = (r: Resonance) => {
    setResonance(r);
    emit("resonance", sessionId, poiId, { type: r });
    setTimeout(() => setPhase("reflect"), 600);
  };

  const handleReflectionSubmit = async () => {
    if (!resonance) return;
    setSubmitting(true);
    const cleanRef = reflection.trim().slice(0, 280);
    if (cleanRef.length >= 50) {
      emit("reflection_submitted", sessionId, poiId, {
        chars: cleanRef.length,
        resonance,
      });
    }
    setPhase("done");
    setTimeout(() => {
      onComplete({ moved: true, resonance, reflection: cleanRef || undefined });
    }, 400);
  };

  const handleSkipReflection = () => {
    if (!resonance) return;
    setPhase("done");
    setTimeout(() => {
      onComplete({ moved: true, resonance });
    }, 200);
  };

  // ============ render ============

  if (phase === "ask_moved") {
    return (
      <section style={WRAP}>
        <h3 style={QUESTION}>¿Te ha movido?</h3>
        <p style={SUB}>No es una nota. Es solo una pregunta.</p>
        <div style={BTNS_3}>
          <button style={BTN_YES} onClick={handleYes}>Si</button>
          <button style={BTN_MAYBE} onClick={handleNotYet}>Aun no se</button>
          <button style={BTN_NO} onClick={handleNo}>No realmente</button>
        </div>
      </section>
    );
  }

  if (phase === "pick_resonance") {
    return (
      <section style={WRAP}>
        <h4 style={SMALL_Q}>¿Que resono?</h4>
        <div style={CHIPS_ROW}>
          {RESONANCES.map((r) => (
            <button
              key={r.id}
              style={{
                ...CHIP,
                background: resonance === r.id ? r.color : "rgba(255,255,255,0.06)",
                color: resonance === r.id ? "#fff" : "rgba(255,255,255,0.85)",
                borderColor: resonance === r.id ? r.color : "rgba(255,255,255,0.12)",
                transform: resonance === r.id ? "scale(1.05)" : "scale(1)",
              }}
              onClick={() => handleResonancePick(r.id)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </section>
    );
  }

  if (phase === "reflect") {
    return (
      <section style={WRAP}>
        <h4 style={SMALL_Q}>¿Quieres anotar por que?</h4>
        <p style={SUB_SMALL}>Sin obligacion. Es solo para ti.</p>
        <textarea
          style={TEXTAREA}
          value={reflection}
          onChange={(e) => setReflection(e.target.value.slice(0, 280))}
          placeholder="Una linea, dos, las que sean."
          rows={3}
          maxLength={280}
          autoFocus
        />
        <div style={CHARCOUNT}>{reflection.length}/280</div>
        <div style={BTNS_2}>
          <button
            style={{
              ...BTN_PRIMARY,
              opacity: reflection.trim().length >= 50 ? 1 : 0.5,
              cursor: reflection.trim().length >= 50 ? "pointer" : "not-allowed",
            }}
            onClick={handleReflectionSubmit}
            disabled={submitting || reflection.trim().length < 50}
          >
            {submitting ? "Anotando..." : "Anotar"}
          </button>
          <button style={BTN_SKIP} onClick={handleSkipReflection} disabled={submitting}>
            Saltar
          </button>
        </div>
        <p style={HINT}>
          Si escribes 50 o mas caracteres, se anota como reflexion permanente.
        </p>
      </section>
    );
  }

  // phase === "done"
  return (
    <section style={WRAP}>
      <p style={DONE_TXT}>
        Anotado. Volveremos a preguntarte en una semana.
      </p>
    </section>
  );
}


// =================== styles ===================

const WRAP: React.CSSProperties = {
  margin: "32px auto",
  maxWidth: 580,
  padding: "28px 24px",
  textAlign: "center" as const,
};

const QUESTION: React.CSSProperties = {
  fontFamily: 'var(--kudos-font-display, "Cormorant Garamond", Georgia, serif)',
  fontSize: 26, fontStyle: "italic",
  fontWeight: 500,
  color: "rgba(255,255,255,0.95)",
  margin: "0 0 6px",
};

const SUB: React.CSSProperties = {
  fontSize: 12,
  color: "rgba(255,255,255,0.4)",
  fontStyle: "italic",
  margin: "0 0 24px",
};

const SUB_SMALL: React.CSSProperties = {
  fontSize: 11,
  color: "rgba(255,255,255,0.4)",
  fontStyle: "italic",
  margin: "0 0 18px",
};

const SMALL_Q: React.CSSProperties = {
  fontSize: 13,
  color: "rgba(255,255,255,0.7)",
  fontWeight: 400,
  margin: "0 0 16px",
};

const BTNS_3: React.CSSProperties = {
  display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" as const,
};

const BTNS_2: React.CSSProperties = {
  display: "flex", justifyContent: "center", gap: 10, marginTop: 4,
};

const BTN_YES: React.CSSProperties = {
  padding: "11px 28px", borderRadius: 999,
  background: "#fff", color: "#1a1333",
  border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer",
};
const BTN_MAYBE: React.CSSProperties = {
  padding: "11px 22px", borderRadius: 999,
  background: "transparent",
  color: "rgba(255,255,255,0.78)",
  border: "1px solid rgba(255,255,255,0.18)",
  fontSize: 13, cursor: "pointer",
};
const BTN_NO: React.CSSProperties = {
  padding: "11px 22px", borderRadius: 999,
  background: "transparent",
  color: "rgba(255,255,255,0.5)",
  border: "1px solid rgba(255,255,255,0.10)",
  fontSize: 13, cursor: "pointer",
};

const CHIPS_ROW: React.CSSProperties = {
  display: "flex", flexWrap: "wrap" as const, gap: 8, justifyContent: "center",
};

const CHIP: React.CSSProperties = {
  padding: "9px 16px", borderRadius: 999,
  fontSize: 13, fontWeight: 500,
  cursor: "pointer",
  borderWidth: 1, borderStyle: "solid",
  transition: "all 180ms ease",
  fontFamily: "inherit",
};

const TEXTAREA: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 12,
  fontFamily: 'Georgia, serif',
  fontSize: 14, lineHeight: 1.5,
  color: "rgba(255,255,255,0.92)",
  outline: "none",
  resize: "vertical" as const,
};

const CHARCOUNT: React.CSSProperties = {
  fontSize: 10, color: "rgba(255,255,255,0.4)",
  textAlign: "right" as const,
  marginTop: 4, marginBottom: 16,
};

const BTN_PRIMARY: React.CSSProperties = {
  padding: "10px 24px", borderRadius: 999,
  background: "#C9A961", color: "#1a1333",
  border: "none", fontSize: 13, fontWeight: 600,
};
const BTN_SKIP: React.CSSProperties = {
  padding: "10px 20px", borderRadius: 999,
  background: "transparent",
  color: "rgba(255,255,255,0.6)",
  border: "1px solid rgba(255,255,255,0.12)",
  fontSize: 12, cursor: "pointer",
};

const HINT: React.CSSProperties = {
  marginTop: 14, fontSize: 10, fontStyle: "italic",
  color: "rgba(255,255,255,0.35)",
};

const DONE_TXT: React.CSSProperties = {
  fontFamily: 'var(--kudos-font-display, "Cormorant Garamond", Georgia, serif)',
  fontSize: 15, fontStyle: "italic",
  color: "rgba(255,255,255,0.55)",
  margin: 0,
};
