"use client";
/**
 * KUDOS · onboarding minimal first-time.
 *
 * Una sola pregunta · zero friction:
 *   "¿Qué te atrae?"
 *   - Historia · Arte · Naturaleza · Misterio · Sociedad · Sin preferencia
 *
 * Solo se muestra UNA vez (flag en localStorage).
 * La elección alimenta el perfil de relevancia personal (HDG).
 */
import * as React from "react";
import { trackEvent } from "./kudosTelemetry";


const INTERESTS = [
  { id: "historia",   emoji: "🏛", label: "Historia" },
  { id: "arte",       emoji: "🎨", label: "Arte" },
  { id: "naturaleza", emoji: "🌿", label: "Naturaleza" },
  { id: "misterio",   emoji: "🔮", label: "Misterio" },
  { id: "sociedad",   emoji: "👥", label: "Sociedad" },
];


export function FirstTimeOnboarding() {
  const [show, setShow] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const done = localStorage.getItem("kudos:onboarded");
      if (!done) {
        // Espera 2s para que el usuario vea primero la app
        setTimeout(() => setShow(true), 2000);
      }
    } catch {}
  }, []);

  const handle = (interestId: string | null) => {
    try {
      localStorage.setItem("kudos:onboarded", "1");
      if (interestId) {
        localStorage.setItem("kudos:primary_interest", interestId);
        trackEvent({ event: "onboarding_interest", properties: { interest: interestId } });
      } else {
        trackEvent({ event: "onboarding_skipped" });
      }
    } catch {}
    setShow(false);
  };

  if (!show) return null;

  return (
    <div style={BACKDROP} onClick={() => handle(null)}>
      <div style={SHEET} onClick={(e) => e.stopPropagation()}>
        <div style={LOGO}>K</div>
        <h2 style={TITLE}>Bienvenido a KUDOS</h2>
        <p style={SUB}>¿Qué te atrae más del mundo?</p>

        <div style={GRID}>
          {INTERESTS.map((i) => (
            <button key={i.id} style={CHIP} onClick={() => handle(i.id)}>
              <span style={CHIP_EMOJI}>{i.emoji}</span>
              <span>{i.label}</span>
            </button>
          ))}
        </div>

        <button style={SKIP} onClick={() => handle(null)}>
          Saltar · descubriré por mí mismo
        </button>
      </div>
    </div>
  );
}


const BACKDROP: React.CSSProperties = {
  position: "fixed", inset: 0, zIndex: 8500,
  background: "rgba(0,0,0,0.85)",
  display: "flex", alignItems: "center", justifyContent: "center",
  padding: 16,
  backdropFilter: "blur(8px)",
  animation: "kudos-sheet-fade 0.4s ease both",
};

const SHEET: React.CSSProperties = {
  width: "100%", maxWidth: 400,
  background: "linear-gradient(180deg, #1a1438 0%, #0a0814 100%)",
  borderRadius: 24,
  padding: "32px 24px 24px",
  border: "1px solid rgba(139,107,255,0.32)",
  color: "#fff",
  textAlign: "center" as const,
  fontFamily: '"Poppins", system-ui, sans-serif',
  animation: "kudos-sheet-slide-up 0.4s cubic-bezier(0.22,1,0.36,1) both",
};

const LOGO: React.CSSProperties = {
  width: 56, height: 56, borderRadius: "50%",
  background: "linear-gradient(135deg, #8B6BFF, #C9A961)",
  margin: "0 auto 16px",
  display: "flex", alignItems: "center", justifyContent: "center",
  fontFamily: 'Georgia, "Times New Roman", serif',
  fontSize: 32, color: "#fff",
  boxShadow: "0 4px 20px rgba(139,107,255,0.45)",
};

const TITLE: React.CSSProperties = {
  margin: "0 0 6px",
  fontFamily: 'Georgia, "Times New Roman", serif',
  fontSize: 26, fontWeight: 400, color: "#fff",
};

const SUB: React.CSSProperties = {
  margin: "0 0 22px",
  fontSize: 13, color: "rgba(255,255,255,0.65)",
};

const GRID: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "1fr 1fr",
  gap: 10, marginBottom: 16,
};

const CHIP: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 8,
  padding: "13px 12px",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(139,107,255,0.25)",
  borderRadius: 14,
  color: "#fff",
  fontSize: 13, fontWeight: 500,
  cursor: "pointer",
  fontFamily: 'inherit',
  transition: "all 0.2s ease",
};
const CHIP_EMOJI: React.CSSProperties = { fontSize: 16 };

const SKIP: React.CSSProperties = {
  background: "transparent", border: "none",
  color: "rgba(255,255,255,0.4)",
  fontSize: 12, cursor: "pointer", padding: 6,
  fontFamily: 'inherit',
};
