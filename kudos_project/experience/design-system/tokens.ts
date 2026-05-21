/**
 * KUDOS Experience · Design Tokens v0
 *
 * Fuente única de verdad para color, tipografía, motion y espaciado.
 * Importado tanto por `tailwind.config.ts` como por componentes que
 * necesiten valores en runtime (variants Framer, inline gradients).
 *
 * Filosofía: cinematic · spatial · silencioso · premium.
 * Referencias: Apple Vision Pro · Apple keynote · Interstellar UI.
 */

// ---------------------------------------------------------------------------
// COLOR
// ---------------------------------------------------------------------------

/** Backgrounds (atmósfera profunda, casi negro con tinte azul/púrpura). */
export const bg = {
  /** Fondo base · noche profunda. */
  base:     "#040614",
  /** Capa atmosférica superior (gradient origin). */
  surface:  "#080d24",
  /** Glass elevado (overlays, sheets). */
  raised:   "rgba(255, 255, 255, 0.04)",
  /** Glass intenso (hover, focus). */
  raisedHi: "rgba(255, 255, 255, 0.08)",
} as const;

/** Acentos. */
export const accent = {
  /** Púrpura energético · acción primaria, focus, brand. */
  primary:   "#a78bfa",
  /** Púrpura brillante · gradient endpoint, glow. */
  bright:    "#c4b5fd",
  /** Púrpura profundo · sombras suaves. */
  deep:      "#6d28d9",
  /** Glow color (sombra del primary con alpha). */
  glow:      "rgba(167, 139, 250, 0.45)",
  /** Glow tenue (efectos lejanos). */
  glowSoft:  "rgba(167, 139, 250, 0.18)",
} as const;

/** Azul IA · secundario, narración, indicadores Mind. */
export const ai = {
  primary: "#38bdf8",
  bright:  "#7dd3fc",
  glow:    "rgba(56, 189, 248, 0.35)",
} as const;

/** Texto. */
export const ink = {
  /** Texto principal sobre fondo oscuro. */
  high:   "#f5f5fa",
  /** Texto secundario. */
  mid:    "#a4a8c4",
  /** Texto débil (micro context, captions). */
  low:    "#6b7193",
  /** Texto sobre acento brillante. */
  invert: "#0a0118",
} as const;

/** Estados. */
export const state = {
  positive: "#34d399",
  warning:  "#fbbf24",
  danger:   "#f472b6",
} as const;

/** Borders (líneas de glass, separadores). */
export const border = {
  faint:  "rgba(255, 255, 255, 0.06)",
  soft:   "rgba(255, 255, 255, 0.10)",
  strong: "rgba(255, 255, 255, 0.18)",
} as const;

// ---------------------------------------------------------------------------
// TIPOGRAFÍA
// ---------------------------------------------------------------------------

export const fontFamily = {
  display: ['"InterDisplay"', '"Inter"', 'ui-sans-serif', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
  sans:    ['"Inter"', 'ui-sans-serif', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
  mono:    ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
} as const;

/** Escala tipográfica (rem). Cinematic = grande y respirado. */
export const fontSize = {
  micro:   ["0.6875rem", { lineHeight: "1", letterSpacing: "0.18em" }],   // 11px · uppercase labels
  caption: ["0.75rem",   { lineHeight: "1.4" }],                            // 12px
  body:    ["0.9375rem", { lineHeight: "1.55" }],                            // 15px
  lead:    ["1.125rem",  { lineHeight: "1.55" }],                            // 18px
  h3:      ["1.5rem",    { lineHeight: "1.2", letterSpacing: "-0.01em" }],   // 24px
  h2:      ["2rem",      { lineHeight: "1.1", letterSpacing: "-0.02em" }],   // 32px
  h1:      ["clamp(2.25rem, 5vw, 3.5rem)", { lineHeight: "1.02", letterSpacing: "-0.025em" }],
  hero:    ["clamp(2.75rem, 7vw, 5rem)",   { lineHeight: "0.98", letterSpacing: "-0.03em" }],
} as const;

// ---------------------------------------------------------------------------
// MOTION
// ---------------------------------------------------------------------------

/** Curvas (cubic-bezier). Todas cinemáticas, ninguna spring-y. */
export const easing = {
  /** Standard cinematic · entradas/salidas naturales. */
  cinematic: [0.22, 0.61, 0.36, 1] as const,
  /** Salida (ease-in fuerte) · cuando algo se va. */
  exit:      [0.4, 0, 0.6, 1] as const,
  /** Entrada lenta (ease-out muy suave) · revelaciones grandes. */
  reveal:    [0.16, 1, 0.3, 1] as const,
  /** Profundidad (depth) · capas que aparecen desde lejos. */
  depth:     [0.65, 0, 0.35, 1] as const,
} as const;

/** Duraciones (segundos). NO usar otras. */
export const duration = {
  micro:  0.18,
  short:  0.32,
  medium: 0.52,
  long:   0.84,
  ambient: 1.4,
} as const;

// ---------------------------------------------------------------------------
// SOMBRAS (depth)
// ---------------------------------------------------------------------------

export const shadow = {
  /** Glass plano. */
  glass:    "0 8px 28px -12px rgba(0, 0, 0, 0.55)",
  /** Capa elevada cinematográfica. */
  raised:   "0 18px 48px -16px rgba(0, 0, 0, 0.65)",
  /** Glow púrpura medio (CTA primaria). */
  glow:     `0 0 28px -6px ${accent.glow}`,
  /** Glow púrpura intenso (hover CTA). */
  glowHi:   `0 0 44px -4px ${accent.glow}`,
  /** Glow IA. */
  glowAi:   `0 0 28px -6px ${ai.glow}`,
} as const;

// ---------------------------------------------------------------------------
// RADIUS
// ---------------------------------------------------------------------------

export const radius = {
  pill: "9999px",
  lg:   "20px",
  md:   "12px",
  sm:   "8px",
} as const;

// ---------------------------------------------------------------------------
// EXPORT AGREGADO (consumido por Tailwind config)
// ---------------------------------------------------------------------------

export const tokens = {
  bg, accent, ai, ink, state, border,
  fontFamily, fontSize,
  easing, duration,
  shadow, radius,
} as const;

export type Tokens = typeof tokens;
