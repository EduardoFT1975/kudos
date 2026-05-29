"use client";
/**
 * KUDOS - FirstTimeOnboarding - T3.2 EJEC Day 23.
 *
 * 3 slides MAX antes de soltar al usuario en la app:
 *   1. Bienvenida   - "Lugares que importan. Sin scroll infinito."
 *   2. 7 pilares    - explica Discovery DNA en 1 parrafo
 *   3. Interes      - 5 chips (Historia/Arte/Naturaleza/Misterio/Sociedad) + skip
 *
 * Se muestra UNA vez (flag kudos:onboarded en localStorage).
 */
import * as React from "react";
import { trackEvent } from "./kudosTelemetry";


const INTERESTS = [
  { id: "historia",   label: "Historia" },
  { id: "arte",       label: "Arte" },
  { id: "naturaleza", label: "Naturaleza" },
  { id: "misterio",   label: "Misterio" },
  { id: "sociedad",   label: "Sociedad" },
];


export function FirstTimeOnboarding() {
  const [step, setStep] = React.useState(0);
  const [picked, setPicked] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const done = localStorage.getItem("kudos:onboarded");
      if (!done) {
        setTimeout(() => setStep(1), 1200);
      }
    } catch {}
  }, []);

  const finish = (interestId: string | null) => {
    try {
      localStorage.setItem("kudos:onboarded", "1");
      if (interestId) {
        localStorage.setItem("kudos:primary_interest", interestId);
        trackEvent({ event: "onboarding_interest", properties: { interest: interestId } });
      }
      trackEvent({ event: "onboarding_completed", properties: { slides_seen: 3, interest: interestId } });
    } catch {}
    setStep(0);
  };

  const skip = () => {
    try {
      localStorage.setItem("kudos:onboarded", "1");
      trackEvent({ event: "onboarding_skipped" });
    } catch {}
    setStep(0);
  };

  if (step === 0) return null;

  return (
    <div style={BACKDROP} onClick={skip}>
      <div style={SHEET} onClick={(e) => e.stopPropagation()}>
        <header style={STEP_HEAD}>
          <div style={DOTS}>
            {[1, 2, 3].map((n) => (
              <span key={n} style={{ ...DOT, background: n === step ? "#C9A961" : "rgba(255,255,255,0.18)" }} />
            ))}
          </div>
          <button onClick={skip} style={SKIP_BTN}>Saltar</button>
        </header>

        {step === 1 && <SlideIntro onNext={() => setStep(2)} />}
        {step === 2 && <SlidePillars onNext={() => setStep(3)} />}
        {step === 3 && (
          <SlideInterest
            picked={picked}
            onPick={setPicked}
            onFinish={() => finish(picked)}
          />
        )}
      </div>
    </div>
  );
}


function SlideIntro({ onNext }: { onNext: () => void }) {
  return (
    <div style={SLIDE}>
      <div style={LOGO}>KUDOS</div>
      <h2 style={H2}>Lugares que importan.</h2>
      <p style={LEAD}>
        No es una guia de viajes. No hay scroll infinito ni recomendados.
        Es una capa que te ayuda a entender por que ciertos lugares cambiaron el mundo,
        y por que pueden cambiar como lo ves.
      </p>
      <button style={PRIMARY} onClick={onNext}>Cuentame mas</button>
    </div>
  );
}


function SlidePillars({ onNext }: { onNext: () => void }) {
  return (
    <div style={SLIDE}>
      <div style={LABEL}>TU DISCOVERY DNA</div>
      <h2 style={H2}>Siete pilares humanos.</h2>
      <p style={LEAD}>
        Cada descubrimiento toca uno de los 7 pilares:
        <br />
        <em style={{ color: "rgba(201,169,97,0.9)" }}>
          origen, significado, belleza, creencia, conocimiento, exploracion, memoria
        </em>
        <br /><br />
        Tu mapa cognitivo se ilumina solo cuando tocas un pilar de verdad.
        No por click. No por tiempo. Por reflexion.
      </p>
      <button style={PRIMARY} onClick={onNext}>Casi listo</button>
    </div>
  );
}


function SlideInterest({ picked, onPick, onFinish }: {
  picked: string | null;
  onPick: (id: string) => void;
  onFinish: () => void;
}) {
  return (
    <div style={SLIDE}>
      <div style={LABEL}>UNA ULTIMA COSA</div>
      <h2 style={H2}>Que te atrae mas?</h2>
      <p style={LEAD}>
        Solo para empezar. Tu DNA se construye con lo que descubres,
        no con lo que dices al principio.
      </p>
      <div style={CHIPS}>
        {INTERESTS.map((i) => (
          <button
            key={i.id}
            onClick={() => onPick(i.id)}
            style={{
              ...CHIP,
              background: picked === i.id ? "#C9A961" : "rgba(255,255,255,0.05)",
              color: picked === i.id ? "#0a0814" : "rgba(255,255,255,0.85)",
              borderColor: picked === i.id ? "#C9A961" : "rgba(255,255,255,0.15)",
            }}
          >
            {i.label}
          </button>
        ))}
      </div>
      <button style={{ ...PRIMARY, marginTop: 24 }} onClick={onFinish}>
        Empezar
      </button>
      <p style={PRIVACY_NOTE}>
        Privado por defecto. Tu mapa no se publica.
        <br />
        Puedes entrar con Google despues si quieres sync entre dispositivos.
      </p>
    </div>
  );
}


const BACKDROP: React.CSSProperties = {
  position: "fixed", inset: 0, zIndex: 9998,
  background: "rgba(5,3,15,0.92)",
  display: "flex", alignItems: "center", justifyContent: "center",
  padding: "16px",
  fontFamily: '"Poppins", system-ui, sans-serif',
};
const SHEET: React.CSSProperties = {
  width: "100%", maxWidth: 480,
  background: "linear-gradient(180deg, #15102b 0%, #0a0814 100%)",
  border: "1px solid rgba(201,169,97,0.18)",
  borderRadius: 22,
  padding: "20px 24px 28px",
  color: "#fff",
};
const STEP_HEAD: React.CSSProperties = {
  display: "flex", justifyContent: "space-between", alignItems: "center",
  marginBottom: 18,
};
const DOTS: React.CSSProperties = {
  display: "flex", gap: 8,
};
const DOT: React.CSSProperties = {
  width: 24, height: 4, borderRadius: 2,
  transition: "background 200ms",
};
const SKIP_BTN: React.CSSProperties = {
  background: "transparent", border: "none",
  color: "rgba(255,255,255,0.5)",
  fontSize: 12, cursor: "pointer",
  letterSpacing: "0.04em",
};
const SLIDE: React.CSSProperties = {
  textAlign: "center" as const,
};
const LOGO: React.CSSProperties = {
  fontSize: 14, letterSpacing: "0.32em", fontWeight: 700,
  color: "#C9A961",
  marginBottom: 24,
};
const LABEL: React.CSSProperties = {
  fontSize: 10, letterSpacing: "0.25em", fontWeight: 700,
  color: "rgba(201,169,97,0.85)",
  marginBottom: 14,
};
const H2: React.CSSProperties = {
  margin: 0,
  fontFamily: 'var(--kudos-font-display, "Cormorant Garamond", Georgia, serif)',
  fontSize: 30, fontWeight: 500,
  letterSpacing: "-0.01em",
  marginBottom: 14,
};
const LEAD: React.CSSProperties = {
  margin: "0 0 26px",
  fontSize: 14, lineHeight: 1.65,
  color: "rgba(255,255,255,0.72)",
};
const PRIMARY: React.CSSProperties = {
  padding: "12px 30px",
  background: "#C9A961", color: "#0a0814",
  border: "none", borderRadius: 999,
  fontSize: 14, fontWeight: 700,
  letterSpacing: "0.04em", cursor: "pointer",
};
const CHIPS: React.CSSProperties = {
  display: "flex", flexWrap: "wrap" as const,
  justifyContent: "center", gap: 8,
  marginTop: 8,
};
const CHIP: React.CSSProperties = {
  padding: "8px 16px", borderRadius: 999,
  fontSize: 12, fontWeight: 500,
  borderWidth: 1, borderStyle: "solid",
  cursor: "pointer",
  transition: "all 160ms",
};
const PRIVACY_NOTE: React.CSSProperties = {
  margin: "22px 0 0",
  fontSize: 11, lineHeight: 1.55,
  color: "rgba(255,255,255,0.4)",
  fontStyle: "italic",
};
