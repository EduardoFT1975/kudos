"use client";

/**
 * KUDOS . AppBrandV4 . Logo mark per brand book.
 *
 * Wordmark "KUDOS" in Poppins 700, slightly wider tracking.
 * The "O" position is replaced by a circle ring (stroke gradient
 * orange . pink . violet) containing a centered 4-pointed star
 * (same gradient fill).
 *
 * Brand book absolute rules:
 *   - never deform
 *   - never add shadows
 *   - never use alternate fonts
 *   - colors locked to gradient (no monochrome variants)
 */
import * as React from "react";

interface Props {
  /** Cap-height of the wordmark in px (controls overall scale). */
  size?: number;
  /** "wordmark" = full KUDOS . "symbol" = ring+star only. */
  variant?: "wordmark" | "symbol";
}

export function AppBrandV4({ size = 28, variant = "wordmark" }: Props) {
  if (variant === "symbol") {
    return (
      <span
        aria-label="KUDOS"
        style={{ display: "inline-flex", alignItems: "center", width: size, height: size }}
      >
        <RingStar size={size} />
      </span>
    );
  }

  // Symbol scales slightly larger than cap-height to read as the letter O.
  const symbolSize = Math.round(size * 1.06);

  return (
    <span
      aria-label="KUDOS"
      style={{
        display: "inline-flex",
        alignItems: "center",
        fontFamily: "var(--kudos-font-display)",
        fontWeight: 700,
        fontSize: size,
        letterSpacing: "0.05em",
        color: "var(--kudos-ink)",
        lineHeight: 1,
        userSelect: "none",
      }}
    >
      <span aria-hidden>KUD</span>
      <span aria-hidden style={{
        display: "inline-flex",
        alignItems: "center",
        margin: `0 ${Math.round(size * 0.03)}px`,
        height: size,
      }}>
        <RingStar size={symbolSize} />
      </span>
      <span aria-hidden>S</span>
    </span>
  );
}

function RingStar({ size }: { size: number }) {
  const id = React.useId();
  const gid = `kudos-brand-grad-${id}`;
  // Ring stroke width proportional . scales with cap-height.
  const stroke = Math.max(2.2, size * 0.085);
  const r = (32 - stroke) / 2; // viewBox 32x32 . inset by half-stroke
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      style={{ display: "block" }}
    >
      <defs>
        <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#FF9A00" />
          <stop offset="50%"  stopColor="#FF3CAC" />
          <stop offset="100%" stopColor="#6C3CFF" />
        </linearGradient>
      </defs>
      <circle
        cx="16"
        cy="16"
        r={r}
        fill="none"
        stroke={`url(#${gid})`}
        strokeWidth={stroke}
      />
      {/* 4-pointed star . crisp diamond with thin spikes */}
      <path
        d="M 16 7.2 L 17.5 14.5 L 24.8 16 L 17.5 17.5 L 16 24.8 L 14.5 17.5 L 7.2 16 L 14.5 14.5 Z"
        fill={`url(#${gid})`}
      />
    </svg>
  );
}
