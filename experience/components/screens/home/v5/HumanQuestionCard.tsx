"use client";
/**
 * KUDOS Home V2 · HumanQuestionCard.
 *
 * La pregunta del dia alineada al Core del dia.
 * Serif gigante. Fondo plano. Sin imagen. Sin botones.
 *
 * Funcion psicologica: introducir interrogacion. No respuesta.
 */
import * as React from "react";


const QUESTION_BY_DAY: { poi_id: string; question: string }[] = [
  { poi_id: "wd-Q174045",  question: "¿Compartiste planeta con otra especie humana?" },
  { poi_id: "wd-Q1090052", question: "¿Te has reunido con extranos por algo mas grande que la supervivencia?" },
  { poi_id: "wd-Q189780",  question: "¿Por que pintamos antes de saber escribir?" },
  { poi_id: "wd-Q1218",    question: "¿Puedes respetar lo que no entiendes?" },
  { poi_id: "wd-Q42797",   question: "¿Las cosas que son tienen que ser como son?" },
  { poi_id: "wd-Q1737",    question: "¿Que dejarias que dure un millon de anos?" },
  { poi_id: "wd-Q176330",  question: "¿Que decidimos no repetir nunca?" },
];


function getQuestionForToday(): string {
  const d = new Date().getDay();
  const idx = d === 0 ? 6 : d - 1;
  return QUESTION_BY_DAY[idx].question;
}


export function HumanQuestionCard() {
  const question = React.useMemo(getQuestionForToday, []);
  return (
    <section style={WRAP}>
      <div style={LABEL}>UNA PREGUNTA PARA TI</div>
      <h2 style={QUESTION}>{question}</h2>
    </section>
  );
}


const WRAP: React.CSSProperties = {
  padding: "32px 24px 24px",
};

const LABEL: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: "0.22em",
  color: "rgba(201,169,97,0.85)",
  fontWeight: 600,
  marginBottom: 16,
};

const QUESTION: React.CSSProperties = {
  fontFamily: 'var(--kudos-font-display, "Cormorant Garamond", Georgia, serif)',
  fontSize: 28,
  fontWeight: 500,
  fontStyle: "italic",
  lineHeight: 1.25,
  color: "#fff",
  margin: 0,
  letterSpacing: "-0.005em",
  maxWidth: 580,
};
