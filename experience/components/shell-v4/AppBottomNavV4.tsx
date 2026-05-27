"use client";

/**
 * KUDOS . AppBottomNavV4 . 5-slot tab bar with center [+] CTA.
 *
 * Layout (left to right):
 *   1 Inicio    -> /inicio
 *   2 Mapa      -> /mapa
 *   3 [+]       -> dispatches kudos:share-capsule:open (no nav)
 *   4 Mi Mundo  -> /mi-mundo
 *   5 Perfil    -> /perfil
 *
 * The [+] is a circular gradient button overflowing the top of the bar.
 * Visible on every viewport (mobile + tablet + desktop).
 * Active tab: icon + label tinted with accent color (no underline).
 */
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/design-system/v2";

interface Tab { href: string; label: string; icon: IconName; }

const TABS_LEFT: ReadonlyArray<Tab> = [
  { href: "/inicio", label: "Inicio", icon: "discover" },
  { href: "/mapa",   label: "Mapa",   icon: "map" },
];
const TABS_RIGHT: ReadonlyArray<Tab> = [
  { href: "/mi-mundo", label: "Mi Mundo", icon: "saved" },
  { href: "/perfil",   label: "Perfil",   icon: "people" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/inicio") return pathname === "/" || pathname === "/inicio";
  return pathname === href || pathname.startsWith(href + "/");
}

function dispatchShareCapsule(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("kudos:share-capsule:open"));
}

export function AppBottomNavV4() {
  const pathname = usePathname() ?? "/";
  return (
    <nav aria-label="Navegacion KUDOS" style={WRAP}>
      <div style={INNER}>
        {TABS_LEFT.map((t) => (
          <TabItem key={t.href} tab={t} active={isActive(pathname, t.href)} />
        ))}

        <div style={CENTER_SLOT}>
          <button
            type="button"
            onClick={dispatchShareCapsule}
            aria-label="Crear o compartir capsula"
            style={CTA_BTN}
          >
            <Icon name="plus" size={26} />
          </button>
        </div>

        {TABS_RIGHT.map((t) => (
          <TabItem key={t.href} tab={t} active={isActive(pathname, t.href)} />
        ))}
      </div>
    </nav>
  );
}

function TabItem({ tab, active }: { tab: Tab; active: boolean }) {
  return (
    <Link href={tab.href} aria-current={active ? "page" : undefined} style={TAB}>
      <span style={{
        color: active ? "var(--kudos-accent-bright, #8B6BFF)" : "rgba(242,242,247,0.5)",
        display: "inline-flex",
      }}>
        <Icon name={tab.icon} size={22} />
      </span>
      <span style={{
        fontFamily: "var(--kudos-font-body)",
        fontSize: 11,
        fontWeight: active ? 600 : 500,
        color: active ? "var(--kudos-accent-bright, #8B6BFF)" : "rgba(242,242,247,0.5)",
      }}>{tab.label}</span>
    </Link>
  );
}

const WRAP: React.CSSProperties = {
  position: "fixed",
  bottom: 0, left: 0, right: 0,
  zIndex: 60,
  paddingBottom: "var(--kudos-safe-bottom, 0px)",
  background: "var(--kudos-bg, #1A1333)",
  borderTop: "1px solid rgba(255,255,255,0.06)",
  overflow: "visible",
};

const INNER: React.CSSProperties = {
  position: "relative",
  display: "grid",
  gridTemplateColumns: "1fr 1fr 92px 1fr 1fr",
  alignItems: "end",
  height: "var(--app-bottomnav-h, 72px)",
  maxWidth: 720,
  margin: "0 auto",
};

const TAB: React.CSSProperties = {
  position: "relative",
  display: "inline-flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 3,
  height: "100%",
  textDecoration: "none",
  color: "var(--kudos-ink)",
  padding: "8px 4px",
};

const CENTER_SLOT: React.CSSProperties = {
  position: "relative",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  height: "100%",
};

const CTA_BTN: React.CSSProperties = {
  position: "absolute",
  top: -24,
  width: 64,
  height: 64,
  borderRadius: "50%",
  background: "var(--kudos-gradient-cta)",
  border: "4px solid var(--kudos-bg, #1A1333)",
  color: "#fff",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
  transition: "transform 160ms",
};
