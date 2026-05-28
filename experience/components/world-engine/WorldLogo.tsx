"use client";
/**
 * KUDOS · Logo oficial · "K U D O S" con anillo "O" multicolor
 * gradient morado→naranja signature KUDOS.
 */
import * as React from "react";


interface Props {
  size?: number;       // alto en px · default 28
  variant?: "dark" | "light";   // texto · default dark (sobre fondo claro)
}

export function WorldLogo({ size = 28, variant = "dark" }: Props) {
  const textColor = variant === "light" ? "#ffffff" : "#1f1b18";
  const fontPx = Math.round(size * 0.62);
  const ringPx = Math.round(size * 0.72);

  return (
    <div style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 2,
      fontFamily: '"Poppins", system-ui, sans-serif',
      fontWeight: 700,
      letterSpacing: "0.04em",
      fontSize: fontPx,
      color: textColor,
      userSelect: "none",
    }}>
      <span>K</span>
      <span>U</span>
      <span>D</span>
      <RingO size={ringPx} />
      <span>S</span>
    </div>
  );
}


function RingO({ size }: { size: number }) {
  const id = React.useId();
  const gradId = `kudos-ring-${id}`;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32"
         style={{ display: "inline-block", verticalAlign: "middle" }}>
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#C9A961" />
          <stop offset="35%" stopColor="#E0815A" />
          <stop offset="65%" stopColor="#A85C95" />
          <stop offset="100%" stopColor="#7c5fb8" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="13" fill="none"
              stroke={`url(#${gradId})`} strokeWidth="3" />
    </svg>
  );
}
