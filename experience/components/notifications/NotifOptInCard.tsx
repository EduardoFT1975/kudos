"use client";
/**
 * NotifOptInCard · KUDOS T3.2 EJEC Day 18.
 *
 * Tarjeta sutil que permite al usuario activar/desactivar las notifs
 * minimas (CORE DEL DIA + SHIFT REVISIT).
 *
 * Es deliberadamente discreta. NO se promociona en home.
 * Vive en /perfil o /mi-mundo como opcion opcional.
 */
import * as React from "react";
import {
  getNotifStatus,
  requestNotifPermission,
  disableNotifs,
  NotifStatus,
} from "./NotificationService";


export function NotifOptInCard() {
  const [status, setStatus] = React.useState<NotifStatus>("prompt");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    setStatus(getNotifStatus());
  }, []);

  if (status === "unsupported") return null;

  const enabled = status === "granted" && (typeof window !== "undefined" && localStorage.getItem("kudos:notifs:enabled") === "1");

  const handleToggle = async () => {
    if (busy) return;
    setBusy(true);
    if (enabled) {
      disableNotifs();
      setStatus("granted"); // permission sigue granted pero flag = 0
    } else {
      const next = await requestNotifPermission();
      setStatus(next);
    }
    setBusy(false);
  };

  return (
    <aside style={CARD}>
      <div style={ROW}>
        <div style={{ flex: 1 }}>
          <h3 style={TITLE}>Notificaciones</h3>
          <p style={SUB}>
            Una al dia (Core de hoy) y un recordatorio a la semana
            cuando un shift te haya tocado. Nada mas.
          </p>
        </div>
        <button
          onClick={handleToggle}
          disabled={busy || status === "denied"}
          style={{
            ...TOGGLE,
            background: enabled ? "#C9A961" : "rgba(255,255,255,0.08)",
            color: enabled ? "#0a0814" : "rgba(255,255,255,0.85)",
          }}
        >
          {status === "denied" ? "Bloqueadas" : enabled ? "Activadas" : "Activar"}
        </button>
      </div>
      {status === "denied" && (
        <p style={DENIED}>
          Tu navegador las bloqueo. Ajustalo desde la configuracion del sitio.
        </p>
      )}
    </aside>
  );
}


const CARD: React.CSSProperties = {
  padding: "14px 16px",
  background: "rgba(15,10,31,0.45)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 14,
  margin: "14px 0",
};
const ROW: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 14,
};
const TITLE: React.CSSProperties = {
  margin: 0, fontSize: 14, fontWeight: 600,
  color: "#fff",
};
const SUB: React.CSSProperties = {
  margin: "4px 0 0", fontSize: 12, lineHeight: 1.5,
  color: "rgba(255,255,255,0.55)",
};
const TOGGLE: React.CSSProperties = {
  padding: "8px 14px",
  border: "none", borderRadius: 999,
  fontSize: 11, fontWeight: 700,
  letterSpacing: "0.04em",
  cursor: "pointer",
  whiteSpace: "nowrap" as const,
};
const DENIED: React.CSSProperties = {
  margin: "10px 0 0",
  fontSize: 11, color: "rgba(255,255,255,0.45)",
  fontStyle: "italic",
};
