"use client";
/**
 * KUDOS - PoiKudosMind - PROMPT 4/6.
 *
 * Bloque 7 de POI MVP.
 * Caja "KUDOS MIND - Pregúntame sobre este lugar" con 3 preguntas rápidas
 * y respuestas hardcoded basadas en la narrativa del POI.
 *
 * CERO LLM. CERO OpenAI. CERO Anthropic. CERO RAG. CERO backend nuevo.
 * Es un lookup local con respuesta pre-escrita.
 */
import * as React from "react";


interface Props {
  poiId: string;
  poiName: string;
  shortDescription?: string;
  historyTitle?: string;
  historyBody?: string;
}


interface QA {
  q: string;
  a: string;
}


/**
 * Construye 3 Q&A localmente desde los datos que ya tenemos del POI.
 * Si el POI tiene narrativa, las respuestas la usan como fuente.
 * Si no, fallback genérico con el nombre.
 */
function buildQA(props: Props): QA[] {
  const { poiName, shortDescription, historyBody } = props;
  const body = (historyBody || shortDescription || "").trim();

  const importance = body
    ? body.split(/[.!?]/)[0].trim() + "."
    : `${poiName} es un lugar que ha resistido el paso del tiempo y sigue contando algo que merece la pena escuchar.`;

  const happened = body
    ? extractMiddle(body)
    : `A lo largo de los siglos, ${poiName} ha sido escenario de momentos que cambiaron a quienes lo visitaban.`;

  const unique = body
    ? extractLast(body)
    : `Lo que hace único a ${poiName} no es solo lo que es, sino todo lo que ha sobrevivido.`;

  return [
    { q: "¿Por qué es importante?", a: importance },
    { q: "¿Qué ocurrió aquí?",      a: happened },
    { q: "¿Qué lo hace único?",     a: unique },
  ];
}

function extractMiddle(body: string): string {
  const sentences = body.split(/[.!?]+/).filter((s) => s.trim().length > 20);
  if (sentences.length === 0) return body.slice(0, 220).trim() + "…";
  const mid = sentences[Math.floor(sentences.length / 2)] || sentences[0];
  return mid.trim() + ".";
}

function extractLast(body: string): string {
  const sentences = body.split(/[.!?]+/).filter((s) => s.trim().length > 20);
  if (sentences.length === 0) return body.slice(-220).trim() + ".";
  return sentences[sentences.length - 1].trim() + ".";
}


export function PoiKudosMind(props: Props) {
  const [qas] = React.useState(() => buildQA(props));
  const [open, setOpen] = React.useState<number | null>(null);

  return (
    <section style={WRAP}>
      <header style={HEAD}>
        <span style={MIND_LABEL}>
          <span style={STAR}>✦</span> KUDOS MIND
        </span>
        <h2 style={TITLE}>Pregúntame sobre este lugar</h2>
      </header>

      <div style={QUESTIONS}>
        {qas.map((qa, i) => (
          <div key={i}>
            <button
              onClick={() => setOpen(open === i ? null : i)}
              style={{
                ...Q_BTN,
                ...(open === i ? Q_BTN_ACTIVE : null),
              }}
              aria-expanded={open === i}
            >
              <span style={Q_TEXT}>{qa.q}</span>
              <span style={Q_ARROW}>{open === i ? "▾" : "▸"}</span>
            </button>
            {open === i && (
              <div style={A_BOX}>
                <p style={A_TEXT}>{qa.a}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      <button style={TALK_BTN} aria-label="Hablar ahora">
        <span style={MIC}>🎙</span> Hablar ahora
      </button>

      <p style={NOTE}>
        Respuestas basadas en las narrativas curadas de KUDOS.
        Sin IA generativa, sin alucinaciones.
      </p>
    </section>
  );
}


// ============== styles ==============

const WRAP: React.CSSProperties = {
  margin: "26px 16px 6px",
  padding: "18px 18px 16px",
  background: "linear-gradient(160deg, rgba(139,107,255,0.08) 0%, rgba(15,10,31,0.6) 100%)",
  border: "1px solid rgba(139,107,255,0.22)",
  borderRadius: 16,
};
const HEAD: React.CSSProperties = { marginBottom: 14 };
const MIND_LABEL: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontSize: 10,
  letterSpacing: "0.25em",
  fontWeight: 700,
  color: "rgba(199,123,255,0.95)",
};
const STAR: React.CSSProperties = { color: "#8B6BFF", fontSize: 12 };
const TITLE: React.CSSProperties = {
  margin: "6px 0 0",
  fontFamily: 'var(--kudos-font-display, "Cormorant Garamond", Georgia, serif)',
  fontSize: 19,
  fontWeight: 500,
  color: "#fff",
};
const QUESTIONS: React.CSSProperties = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 8,
  marginBottom: 14,
};
const Q_BTN: React.CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  padding: "10px 14px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 10,
  cursor: "pointer",
  fontFamily: "inherit",
  textAlign: "left" as const,
};
const Q_BTN_ACTIVE: React.CSSProperties = {
  background: "rgba(139,107,255,0.12)",
  border: "1px solid rgba(139,107,255,0.4)",
};
const Q_TEXT: React.CSSProperties = {
  fontSize: 13,
  color: "rgba(255,255,255,0.92)",
};
const Q_ARROW: React.CSSProperties = {
  color: "#8B6BFF",
  fontSize: 12,
};
const A_BOX: React.CSSProperties = {
  marginTop: 8,
  padding: "12px 14px",
  background: "rgba(0,0,0,0.3)",
  borderLeft: "2px solid #8B6BFF",
  borderRadius: 8,
};
const A_TEXT: React.CSSProperties = {
  margin: 0,
  fontSize: 13,
  lineHeight: 1.55,
  color: "rgba(255,255,255,0.85)",
  fontFamily: '"Poppins", system-ui, sans-serif',
};
const TALK_BTN: React.CSSProperties = {
  width: "100%",
  padding: "11px 16px",
  background: "linear-gradient(135deg, #8B6BFF 0%, #6e4dd6 100%)",
  color: "#fff",
  border: "none",
  borderRadius: 12,
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: "0.04em",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
};
const MIC: React.CSSProperties = { fontSize: 14 };
const NOTE: React.CSSProperties = {
  margin: "12px 0 0",
  fontSize: 10,
  color: "rgba(255,255,255,0.45)",
  textAlign: "center" as const,
  fontStyle: "italic",
};
