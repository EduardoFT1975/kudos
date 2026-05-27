"use client";

/**
 * KUDOS . AppTopBarV4 . Fixed top chrome per mockup.
 *
 * Layout (left to right):
 *   - KUDOS brand mark
 *   - Search input (centered, flex)
 *   - Bell button (with notification dot)
 *   - Avatar pill (circular, link to /perfil)
 *
 * Background: deep navy --kudos-bg.
 * Border bottom: subtle hairline.
 * Height: var(--app-topbar-h) + safe-area-top.
 */
import * as React from "react";
import Link from "next/link";
import { Icon } from "@/design-system/v2";
import { AppBrandV4 } from "./AppBrandV4";

export function AppTopBarV4() {
  return (
    <header role="banner" style={WRAP}>
      <Link href="/inicio" aria-label="KUDOS Inicio" style={BRAND_LINK}>
        <AppBrandV4 size={24} />
      </Link>

      <label style={SEARCH_WRAP}>
        <span aria-hidden style={SEARCH_ICON}>
          <Icon name="search" size={16} />
        </span>
        <input
          type="search"
          placeholder="Buscar lugares, ciudades..."
          aria-label="Buscar"
          style={SEARCH_INPUT}
        />
      </label>

      <Link href="/notificaciones" aria-label="Notificaciones" style={BELL}>
        <Icon name="bell" size={18} />
        <span aria-hidden style={BELL_DOT} />
      </Link>

      <Link href="/perfil" aria-label="Perfil" style={AVATAR}>
        <span aria-hidden style={AVATAR_INNER}>E</span>
      </Link>
    </header>
  );
}

const WRAP: React.CSSProperties = {
  position: "fixed",
  top: 0, left: 0, right: 0,
  zIndex: 60,
  height: "calc(var(--app-topbar-h, 56px) + var(--kudos-safe-top, 0px))",
  paddingTop: "var(--kudos-safe-top, 0px)",
  paddingLeft: "var(--app-pad-x, 20px)",
  paddingRight: "var(--app-pad-x, 20px)",
  display: "flex",
  alignItems: "center",
  gap: 12,
  background: "var(--kudos-bg, #1A1333)",
  borderBottom: "1px solid rgba(255,255,255,0.06)",
};

const BRAND_LINK: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  textDecoration: "none",
  color: "var(--kudos-ink)",
  flexShrink: 0,
};

const SEARCH_WRAP: React.CSSProperties = {
  position: "relative",
  flex: 1,
  minWidth: 0,
  display: "inline-flex",
  alignItems: "center",
  height: 40,
  borderRadius: 999,
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.08)",
  padding: "0 14px 0 40px",
  maxWidth: 560,
  margin: "0 auto",
};

const SEARCH_ICON: React.CSSProperties = {
  position: "absolute",
  left: 14,
  top: "50%",
  transform: "translateY(-50%)",
  color: "rgba(242,242,247,0.55)",
  display: "inline-flex",
  pointerEvents: "none",
};

const SEARCH_INPUT: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  background: "transparent",
  border: "none",
  outline: "none",
  color: "var(--kudos-ink)",
  fontFamily: "var(--kudos-font-body)",
  fontSize: 14,
  fontWeight: 400,
  height: "100%",
};

const BELL: React.CSSProperties = {
  position: "relative",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 40,
  height: 40,
  borderRadius: "50%",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "var(--kudos-ink)",
  textDecoration: "none",
  flexShrink: 0,
};

const BELL_DOT: React.CSSProperties = {
  position: "absolute",
  top: 9,
  right: 11,
  width: 8,
  height: 8,
  borderRadius: 999,
  background: "var(--kudos-accent-pink, #FF3CAC)",
};

const AVATAR: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 40,
  height: 40,
  borderRadius: "50%",
  background: "var(--kudos-gradient-cta)",
  color: "var(--kudos-ink)",
  textDecoration: "none",
  flexShrink: 0,
  padding: 2,
};

const AVATAR_INNER: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  height: "100%",
  borderRadius: "50%",
  background: "#1A1333",
  color: "var(--kudos-ink)",
  fontWeight: 700,
  fontSize: 13,
  border: "2px solid transparent",
};
