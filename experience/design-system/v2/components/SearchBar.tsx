"use client";

import * as React from "react";
import { color, radius, font } from "../tokens";

export interface SearchBarProps {
  placeholder?: string;
  fullWidth?: boolean;
  /** When true · shows ⌘K shortcut on desktop, hidden on mobile (<640px). */
  shortcut?: boolean;
}

export function SearchBar({
  placeholder = "Buscar lugares, historias, personas...",
  fullWidth = true,
  shortcut = true,
}: SearchBarProps) {
  return (
    <form
      role="search"
      onSubmit={(e) => e.preventDefault()}
      style={{
        position: "relative",
        width: fullWidth ? "100%" : undefined,
        maxWidth: 560,
      }}
    >
      <style>{`
        @media (max-width: 640px) {
          .kudos-search-shortcut { display: none !important; }
          .kudos-search-input { padding-right: 14px !important; }
        }
      `}</style>
      <span
        aria-hidden
        style={{
          position: "absolute",
          top: "50%",
          left: 14,
          transform: "translateY(-50%)",
          color: color.inkLow,
          pointerEvents: "none",
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </span>
      <input
        type="search"
        className="kudos-search-input"
        placeholder={placeholder}
        style={{
          width: "100%",
          height: 44,
          padding: shortcut ? "0 56px 0 40px" : "0 14px 0 40px",
          background: color.glass,
          border: `1px solid ${color.border}`,
          borderRadius: radius.pill,
          color: color.ink,
          fontFamily: font.body,
          fontSize: 14,
          outline: "none",
          transition: "border-color 160ms, background 160ms",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "rgba(139,92,246,0.45)";
          e.currentTarget.style.background = color.glassHi;
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = color.border;
          e.currentTarget.style.background = color.glass;
        }}
      />
      {shortcut ? (
        <span
          aria-hidden
          className="kudos-search-shortcut"
          style={{
            position: "absolute",
            top: "50%",
            right: 12,
            transform: "translateY(-50%)",
            padding: "3px 8px",
            background: "rgba(255,255,255,0.05)",
            border: `1px solid ${color.border}`,
            borderRadius: 6,
            color: color.inkMid,
            fontFamily: font.mono,
            fontSize: 10.5,
            letterSpacing: "0.04em",
            pointerEvents: "none",
          }}
        >
          ⌘ K
        </span>
      ) : null}
    </form>
  );
}
