"use client";

import * as React from "react";
import { color, radius, shadow } from "../tokens";

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Cuando true · borde violeta + glow sutil */
  accent?: boolean;
  /** Cuando true · padding interno (16px). False · sin padding (para hero). */
  padded?: boolean;
  /** Cuando true · hover lift */
  interactive?: boolean;
}

export function GlassCard({
  accent = false,
  padded = true,
  interactive = false,
  className,
  style,
  children,
  ...rest
}: GlassCardProps) {
  return (
    <div
      {...rest}
      className={className}
      style={{
        background: color.glass,
        border: `1px solid ${accent ? "rgba(139,92,246,0.32)" : color.border}`,
        borderRadius: radius.lg,
        padding: padded ? 20 : 0,
        boxShadow: accent ? `${shadow.card}, ${shadow.glowSoft}` : shadow.card,
        backdropFilter: "blur(16px) saturate(140%)",
        WebkitBackdropFilter: "blur(16px) saturate(140%)",
        transition: interactive ? "transform 240ms, border-color 240ms, box-shadow 240ms" : undefined,
        cursor: interactive ? "pointer" : undefined,
        ...style,
      }}
      onMouseEnter={interactive ? (e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.borderColor = "rgba(139,92,246,0.36)";
      } : undefined}
      onMouseLeave={interactive ? (e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.borderColor = accent ? "rgba(139,92,246,0.32)" : color.border;
      } : undefined}
    >
      {children}
    </div>
  );
}
