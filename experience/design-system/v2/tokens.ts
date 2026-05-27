/**
 * KUDOS Design System v2 · tokens
 *
 * Single source · paleta + tipografía + radius + glow + spacing alineados
 * con el mockup oficial. Cualquier color KUDOS sale de aquí.
 */

export const color = {
  /** Fondo base · negro profundo con tinte violeta apenas perceptible */
  bg:            "#0a0612",
  /** Superficie de panel · sidebar, right rail */
  surface:       "#0d0820",
  /** Glass elevado · cards normales */
  glass:         "rgba(255, 255, 255, 0.025)",
  /** Glass intenso · hover, active */
  glassHi:       "rgba(255, 255, 255, 0.05)",
  /** Border sutil */
  border:        "rgba(255, 255, 255, 0.08)",
  /** Border destacado */
  borderHi:      "rgba(255, 255, 255, 0.14)",

  /** Acento primario · violeta KUDOS */
  accent:        "#8b5cf6",
  /** Acento brillante · titulares con énfasis */
  accentBright:  "#a78bfa",
  /** Acento intenso · gradient bottom */
  accentDeep:    "#6d28d9",
  /** Glow del acento */
  accentGlow:    "rgba(139, 92, 246, 0.45)",
  accentGlowSoft:"rgba(139, 92, 246, 0.18)",

  /** Tipo principal */
  ink:           "#f7f6fb",
  /** Tipo medio · subtítulos */
  inkMid:        "rgba(247, 246, 251, 0.62)",
  /** Tipo bajo · meta */
  inkLow:        "rgba(247, 246, 251, 0.42)",
  /** Tipo muy bajo · placeholder */
  inkMute:       "rgba(247, 246, 251, 0.28)",

  /** Estados */
  danger:        "#f87171",
  warn:          "#fbbf24",
  ok:            "#4ade80",
  info:          "#60a5fa",
} as const;

export const radius = {
  xs:   "8px",
  sm:   "12px",
  md:   "16px",
  lg:   "20px",
  xl:   "24px",
  pill: "9999px",
} as const;

export const shadow = {
  /** Card lift suave */
  card:     "0 16px 32px -16px rgba(0, 0, 0, 0.55)",
  /** Card lift fuerte (hero) */
  cardHi:   "0 32px 64px -24px rgba(0, 0, 0, 0.65)",
  /** Drawer / modal */
  drawer:   "0 -24px 48px -16px rgba(0, 0, 0, 0.6)",
  /** Glow violeta del acento */
  glow:     `0 0 24px ${color.accentGlow}`,
  glowSoft: `0 0 16px ${color.accentGlowSoft}`,
} as const;

export const motion = {
  fast:     "160ms cubic-bezier(0.22, 0.61, 0.36, 1)",
  base:     "240ms cubic-bezier(0.22, 0.61, 0.36, 1)",
  slow:     "420ms cubic-bezier(0.22, 0.61, 0.36, 1)",
  cinema:   "720ms cubic-bezier(0.22, 0.61, 0.36, 1)",
} as const;

export const font = {
  /** Display · headlines · serif editorial */
  display:  '"Fraunces", "New York", Georgia, ui-serif, serif',
  /** Body · sans neutra */
  body:     '"Inter", ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  /** Mono · counters, timestamps, code */
  mono:     '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace',
} as const;

/** Composición común · pill premium */
export const pillStyle = {
  background: "rgba(255, 255, 255, 0.04)",
  border: `1px solid ${color.border}`,
  borderRadius: radius.pill,
  color: color.ink,
  fontFamily: font.body,
} as const;

/** Composición común · glass card */
export const glassCardStyle = {
  background: color.glass,
  border: `1px solid ${color.border}`,
  borderRadius: radius.lg,
  boxShadow: shadow.card,
} as const;
