"use client";

/**
 * KUDOS Experience · mobile-hardening/KeyboardViewportGuard
 *
 * Effect-only component. Writes three custom properties to <html>:
 *
 *   --kudos-vh         · 1% of layout viewport height (stable)
 *   --kudos-dvh        · 1% of visual viewport height (shrinks with kb)
 *   --kudos-vh-100     · full visual viewport height in px
 *   --kudos-keyboard-h · estimated keyboard height (visualViewport delta)
 *
 * Also flips body[data-kudos-keyboard-open="1"] when a soft keyboard
 * is detected, and on focus of an input/textarea/contenteditable
 * scrolls the element into view (best-effort, avoids layout thrash).
 *
 * Why we need this:
 *   - iOS Safari pre-2021 mis-reports 100vh (uses URL bar expanded)
 *   - Android Chrome shrinks the viewport when the keyboard opens
 *   - Both leak unless we compute the right number on every change
 *
 * Renders null.
 */
import * as React from "react";
import {
  CSS_VARS,
  BODY_ATTR,
  KEYBOARD_OPEN_THRESHOLD_PX,
} from "./mobileHardeningTypes";
import {
  readViewportState,
  readKeyboardState,
  subscribeToViewport,
} from "./MobileHardeningEngine";

function writeViewportVars(): { keyboardOpen: boolean; keyboardHeight: number } {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return { keyboardOpen: false, keyboardHeight: 0 };
  }
  const html = document.documentElement;
  const v = readViewportState();
  // Layout vh · stable for anchors that don't shrink with kb
  html.style.setProperty(CSS_VARS.vh, `${(v.height / 100).toFixed(2)}px`);
  // Dynamic vh · visualViewport · shrinks when kb opens
  html.style.setProperty(CSS_VARS.dvh, `${(v.visualHeight / 100).toFixed(2)}px`);
  html.style.setProperty(CSS_VARS.vh100, `${Math.round(v.visualHeight)}px`);

  // Respect sim · founder may have forced --kudos-keyboard-h manually
  if (html.dataset.kudosSimKeyboard === "1") {
    return { keyboardOpen: true, keyboardHeight: parseFloat(html.style.getPropertyValue(CSS_VARS.keyboard) || "0") };
  }

  const k = readKeyboardState(v);
  html.style.setProperty(CSS_VARS.keyboard, `${k.height}px`);
  const body = document.body;
  if (k.open) {
    body.setAttribute(BODY_ATTR.keyboardOpen, "1");
    body.dataset.kudosKeyboardOpen = "1";
  } else {
    body.removeAttribute(BODY_ATTR.keyboardOpen);
    delete body.dataset.kudosKeyboardOpen;
  }
  return { keyboardOpen: k.open, keyboardHeight: k.height };
}

function scrollFocusIntoView(): void {
  if (typeof document === "undefined") return;
  const el = document.activeElement as HTMLElement | null;
  if (!el) return;
  const tag = el.tagName?.toLowerCase();
  if (tag !== "input" && tag !== "textarea" && tag !== "select" && !el.isContentEditable) return;
  try {
    const r = el.getBoundingClientRect();
    const viewportH = window.visualViewport?.height ?? window.innerHeight;
    // Only scroll if the focused element is below the bottom of the visual viewport
    if (r.bottom > viewportH - 8) {
      el.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  } catch {
    /* ignore */
  }
}

export function KeyboardViewportGuard() {
  const prevKb = React.useRef<boolean>(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const apply = () => {
      const { keyboardOpen } = writeViewportVars();
      if (keyboardOpen && !prevKb.current) {
        // Transition closed → open · ensure focused element visible
        // Wait a frame so visualViewport has settled
        requestAnimationFrame(() => requestAnimationFrame(scrollFocusIntoView));
      }
      prevKb.current = keyboardOpen;
    };

    apply();
    const unsubscribe = subscribeToViewport(apply);
    // focusin · catches input focus before kb event arrives
    const onFocusIn = () => {
      // Delay · wait for visualViewport to settle (iOS slow)
      window.setTimeout(apply, 80);
      window.setTimeout(apply, 280);
    };
    window.addEventListener("focusin", onFocusIn);
    return () => {
      unsubscribe();
      window.removeEventListener("focusin", onFocusIn);
    };
  }, []);

  return null;
}

export { KEYBOARD_OPEN_THRESHOLD_PX };
