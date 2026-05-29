"use client";
/**
 * KUDOS - PoiHistoria - PROMPT 4/6.
 *
 * Bloque 3 de la pantalla POI MVP.
 * Sección Historia: título + subtítulo + cuerpo narrativa.
 * NO mostrar NQS / DRR / Story Score / Humanity Score / métricas internas.
 */
import * as React from "react";


interface Props {
  title?: string | null;
  subtitle?: string | null;
  body?: string | null;
}


export function PoiHistoria({ title, subtitle, body }: Props) {
  if (!body && !title && !subtitle) return null;

  return (
    <section style={WRAP}>
      <header style={HEAD}>
        <span style={LABEL}>HISTORIA</span>
        {title && <h2 style={TITLE}>{title}</h2>}
        {subtitle && <p style={SUBTITLE}>{subtitle}</p>}
      </header>

      {body && (
        <div style={BODY_WRAP}>
          {body.split(/\n\n+/).map((para, i) => (
            <p key={i} style={PARA}>
              {para.trim().replace(/^\*+|\*+$/g, "")}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}


// ============== styles ==============

const WRAP: React.CSSProperties = {
  padding: "32px 16px 12px",
};
const HEAD: React.CSSProperties = { marginBottom: 16 };
const LABEL: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: "0.25em",
  fontWeight: 700,
  color: "rgba(201,169,97,0.85)",
  display: "block",
  marginBottom: 8,
};
const TITLE: React.CSSProperties = {
  fontFamily: 'var(--kudos-font-display, "Cormorant Garamond", Georgia, serif)',
  fontSize: 28,
  fontWeight: 500,
  color: "#fff",
  margin: 0,
  lineHeight: 1.15,
  letterSpacing: "-0.005em",
};
const SUBTITLE: React.CSSProperties = {
  fontFamily: 'var(--kudos-font-display, "Cormorant Garamond", Georgia, serif)',
  fontSize: 17,
  fontStyle: "italic",
  color: "rgba(255,255,255,0.78)",
  margin: "8px 0 0",
  lineHeight: 1.4,
};
const BODY_WRAP: React.CSSProperties = {
  maxWidth: 680,
};
const PARA: React.CSSProperties = {
  fontFamily: 'Georgia, "Times New Roman", serif',
  fontSize: 16,
  lineHeight: 1.7,
  color: "rgba(255,255,255,0.88)",
  margin: "0 0 14px",
};
