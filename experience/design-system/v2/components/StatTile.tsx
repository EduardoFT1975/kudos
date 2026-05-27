"use client";

import * as React from "react";
import { color, font } from "../tokens";

export interface StatTileProps {
  /** Valor grande · "24.5K" */
  value: string;
  /** Label inferior · "Ecos creados" */
  label: string;
  /** SVG inline opcional */
  icon?: React.ReactNode;
  /** Cuando true · sin background (uso inline en hero) */
  ghost?: boolean;
}

export function StatTile({ value, label, icon, ghost = false }: StatTileProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      {icon ? (
        <div
          aria-hidden
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: ghost ? "rgba(139,92,246,0.10)" : color.glass,
            border: `1px solid ${color.border}`,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            color: color.accentBright,
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
      ) : null}
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontFamily: font.body,
            fontSize: 18,
            fontWeight: 600,
            color: color.ink,
            lineHeight: 1.1,
            letterSpacing: "-0.005em",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {value}
        </div>
        <div
          style={{
            fontFamily: font.body,
            fontSize: 11.5,
            color: color.inkMid,
            marginTop: 2,
          }}
        >
          {label}
        </div>
      </div>
    </div>
  );
}
