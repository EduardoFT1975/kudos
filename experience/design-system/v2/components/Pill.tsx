"use client";

import * as React from "react";
import { color, radius, font } from "../tokens";

export interface PillProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: "default" | "accent" | "warn" | "danger" | "ok";
  size?: "sm" | "md";
}

export function Pill({ tone = "default", size = "md", style, children, ...rest }: PillProps) {
  const palette = {
    default: { bg: color.glass, border: color.borderHi, fg: color.ink },
    accent:  { bg: "rgba(139,92,246,0.16)", border: "rgba(139,92,246,0.45)", fg: color.accentBright },
    warn:    { bg: "rgba(251,191,36,0.14)", border: "rgba(251,191,36,0.42)", fg: "#fbbf24" },
    danger:  { bg: "rgba(248,113,113,0.14)", border: "rgba(248,113,113,0.42)", fg: "#f87171" },
    ok:      { bg: "rgba(74,222,128,0.14)",  border: "rgba(74,222,128,0.42)",  fg: "#4ade80" },
  }[tone];
  return (
    <span
      {...rest}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: size === "sm" ? "2px 8px" : "4px 10px",
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        borderRadius: radius.pill,
        color: palette.fg,
        fontFamily: font.body,
        fontSize: size === "sm" ? 10 : 11.5,
        fontWeight: 500,
        letterSpacing: "0.02em",
        ...style,
      }}
    >
      {children}
    </span>
  );
}
