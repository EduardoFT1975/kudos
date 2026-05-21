import type { Config } from "tailwindcss";
import { tokens } from "./design-system/tokens";

/**
 * KUDOS Experience · tailwind.config.ts
 *
 * Theme extendido desde `design-system/tokens.ts` (single source of truth).
 * No hardcodear valores aquí — todo viene de tokens.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx,mdx}",
    "./components/**/*.{ts,tsx}",
    "./features/**/*.{ts,tsx}",
    "./design-system/**/*.{ts,tsx}",
    "./motion/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        kudos: {
          bg: tokens.bg.base,
          surface: tokens.bg.surface,
          glass: tokens.bg.raised,
          "glass-hi": tokens.bg.raisedHi,
          accent: tokens.accent.primary,
          "accent-bright": tokens.accent.bright,
          "accent-deep": tokens.accent.deep,
          ai: tokens.ai.primary,
          "ai-bright": tokens.ai.bright,
          ink: tokens.ink.high,
          "ink-mid": tokens.ink.mid,
          "ink-low": tokens.ink.low,
          "ink-invert": tokens.ink.invert,
          positive: tokens.state.positive,
          warning: tokens.state.warning,
          danger: tokens.state.danger,
          border: tokens.border.soft,
        },
      },
      fontFamily: {
        display: [...tokens.fontFamily.display],
        sans: [...tokens.fontFamily.sans],
        mono: [...tokens.fontFamily.mono],
      },
      fontSize: tokens.fontSize as unknown as Record<string, [string, { lineHeight?: string; letterSpacing?: string }]>,
      borderRadius: {
        pill: tokens.radius.pill,
        lg: tokens.radius.lg,
        md: tokens.radius.md,
        sm: tokens.radius.sm,
      },
      boxShadow: {
        glass: tokens.shadow.glass,
        raised: tokens.shadow.raised,
        glow: tokens.shadow.glow,
        "glow-hi": tokens.shadow.glowHi,
        "glow-ai": tokens.shadow.glowAi,
      },
      transitionTimingFunction: {
        cinematic: `cubic-bezier(${tokens.easing.cinematic.join(",")})`,
        reveal: `cubic-bezier(${tokens.easing.reveal.join(",")})`,
        depth: `cubic-bezier(${tokens.easing.depth.join(",")})`,
      },
      transitionDuration: {
        micro: `${tokens.duration.micro * 1000}`,
        short: `${tokens.duration.short * 1000}`,
        medium: `${tokens.duration.medium * 1000}`,
        long: `${tokens.duration.long * 1000}`,
        ambient: `${tokens.duration.ambient * 1000}`,
      },
      backdropBlur: {
        xs: "4px",
        glass: "14px",
      },
    },
  },
  plugins: [],
};

export default config;
