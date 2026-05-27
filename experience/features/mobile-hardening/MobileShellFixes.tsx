"use client";

/**
 * KUDOS Experience · mobile-hardening/MobileShellFixes
 *
 * Hard kill-switch · global scroll lock is DISABLED app-wide.
 * Only explicit emergency modal layers may opt-in via inline style.
 */
import * as React from "react";
import {
  BODY_ATTR,
} from "./mobileHardeningTypes";
import {
  MOBILE_EVENT,
  auditOverflow,
  readViewportState,
  subscribeToViewport,
} from "./MobileHardeningEngine";

const STYLE_ID = "kudos-mobile-shell-fixes";

const STYLE = `
/* Scroll ownership · <main> (AppCanvasV4) is the single scroll owner.
   html/body only block horizontal jank · NO overflow-y rule here so we
   don't fight main's scroll. */
html, body {
  overflow-x: hidden !important;
  touch-action: auto !important;
  pointer-events: auto !important;
}
/* Scroll-lock attribute is a NO-OP · cannot freeze the page. */
body[data-kudos-scroll-locked="1"],
body[data-kudos-scroll-locked="true"] {
  touch-action: auto !important;
  position: static !important;
  top: auto !important;
}
.kudos-pill, [data-kudos-pill] {
  -webkit-user-select: none;
  user-select: none;
}
a, button, [role="button"] {
  -webkit-tap-highlight-color: rgba(167,139,250,0.18);
}
input, textarea, select {
  font-size: 16px;
}
[aria-label="Abrir founder launch panel"],
[aria-label="Abrir founder break mode"] {
  margin-bottom: var(--kudos-safe-bottom, 0px);
}
@media (orientation: landscape) and (max-height: 500px) {
  aside[role="dialog"] {
    max-width: min(480px, 92vw) !important;
  }
}
`;

function ensureStyleTag(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = STYLE_ID;
  el.appendChild(document.createTextNode(STYLE));
  document.head.appendChild(el);
}

function applyBodyAttrs(): void {
  if (typeof document === "undefined") return;
  const v = readViewportState();
  document.body.setAttribute(BODY_ATTR.deviceClass, v.deviceClass);
  document.body.setAttribute(BODY_ATTR.orientation, v.orientation);
}

function killSwitch(): void {
  if (typeof document === "undefined") return;
  try {
    const body = document.body;
    const html = document.documentElement;
    body.removeAttribute("data-kudos-scroll-locked");
    delete body.dataset.kudosScrollLocked;
    body.style.position = "";
    body.style.top = "";
    body.style.left = "";
    body.style.right = "";
    body.style.width = "";
    body.style.overflow = "";
    body.style.overflowY = "";
    body.style.overflowX = "";
    body.style.touchAction = "";
    body.style.pointerEvents = "";
    html.style.overflow = "";
    html.style.overflowY = "";
    html.style.touchAction = "";
  } catch {
    /* ignore */
  }
}

export function MobileShellFixes() {
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    ensureStyleTag();
    applyBodyAttrs();
    killSwitch();
    auditOverflow();

    const apply = () => {
      applyBodyAttrs();
      auditOverflow();
    };
    const unsubscribe = subscribeToViewport(apply);

    // Periodic kill-switch · catches any rogue JS that re-sets overflow.
    const killId = window.setInterval(() => { killSwitch(); }, 2000);
    const auditId = window.setInterval(() => { auditOverflow(); }, 6000);

    return () => {
      unsubscribe();
      window.clearInterval(killId);
      window.clearInterval(auditId);
    };
  }, []);

  return null;
}

export { MOBILE_EVENT };
