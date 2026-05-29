"use client";
/**
 * KUDOS POI Node V2 · ActionPotentialCard · T3.2 EJEC Day 4.
 *
 * Bloque final de POI Node. Conecta la narrativa con una accion cotidiana baja friccion.
 *
 * Disciplina T3.1:
 *   - Verbo concreto + objeto + contexto temporal
 *   - "Cuando hagas X, recuerda que..."
 *   - NO compra, NO suscripcion, NO viaje
 *   - SI cosas que el usuario ya hace o puede hacer manana
 *
 * Tracking: action_declared cuando el usuario pulsa "Marcalo si lo haces".
 */
import * as React from "react";


const API = process.env.NEXT_PUBLIC_KUDOS_API_URL || "";


interface Props {
  poiId: string;
  action: string;
  pillar?: string | null;
}


export function ActionPotentialCard({ poiId, action, pillar }: Props) {
  const [marked, setMarked] = React.useState(false);

  const handleMark = () => {
    if (marked) return;
    setMarked(true);
    if (typeof window !== "undefined" && API) {
      const sid = sessionStorage.getItem("kudos:session") || "anon-" + Date.now();
      void fetch(`${API}/api/telemetry/event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sid,
          event_type: "shift_acknowledged",
          poi_id: poiId,
          payload: { pillar, action_declared: true },
        }),
        credentials: "include",
        keepalive: true,
      }).catch(() => {});
    }
  };

  return (
    <section style={WRAP}>
      <div style={LABEL}>UNA ACCION POSIBLE</div>
      <p style={ACTION_TXT}>{action}</p>
      <button
        style={{ ...BTN, ...(marked ? BTN_MARKED : {}) }}
        onClick={handleMark}
        disabled={marked}
      >
        {marked ? "Anotado. Gracias por contarlo." : "Marcalo si lo haces"}
      </button>
      {marked && (
        <p style={FOOT}>
          Volveremos a preguntarte en una semana.
        </p>
      )}
    </section>
  );
}


const WRAP: React.CSSProperties = {
  margin: "24px",
  padding: "24px 22px",
  background: "rgba(201,169,97,0.06)",
  border: "1px solid rgba(201,169,97,0.25)",
  borderRadius: 16,
};

const LABEL: React.CSSProperties = {
  fontSize: 10, letterSpacing: "0.22em", color: "#C9A961",
  fontWeight: 600, marginBottom: 14,
};

const ACTION_TXT: React.CSSProperties = {
  fontFamily: 'var(--kudos-font-display, "Cormorant Garamond", Georgia, serif)',
  fontSize: 18, fontStyle: "italic", lineHeight: 1.45,
  color: "rgba(255,255,255,0.92)", margin: "0 0 18px",
};

const BTN: React.CSSProperties = {
  padding: "10px 22px",
  background: "transparent",
  color: "#C9A961",
  border: "1px solid rgba(201,169,97,0.45)",
  borderRadius: 999,
  fontSize: 13, fontWeight: 500,
  cursor: "pointer",
  fontFamily: "inherit",
  transition: "all 160ms",
};

const BTN_MARKED: React.CSSProperties = {
  background: "rgba(201,169,97,0.15)",
  color: "rgba(255,255,255,0.85)",
  cursor: "default",
  borderColor: "rgba(201,169,97,0.3)",
};

const FOOT: React.CSSProperties = {
  marginTop: 14, fontSize: 11, fontStyle: "italic",
  color: "rgba(255,255,255,0.42)",
};
