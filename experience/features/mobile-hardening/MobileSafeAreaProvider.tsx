"use client";

/**
 * KUDOS Experience · mobile-hardening/MobileSafeAreaProvider
 *
 * Resolves env(safe-area-inset-*) at runtime and writes the values to
 * CSS custom properties on <html> so any component (header, drawer,
 * pill, founder panel) can use them via:
 *
 *   padding-top: calc(var(--kudos-safe-top, 0px) + 12px);
 *
 * Also exposes --kudos-shell-top (header+safe-top) and
 * --kudos-shell-bottom (safe-bottom) so existing surfaces can stay
 * pinned without reimplementing the math.
 *
 * Re-reads on:
 *   - orientationchange
 *   - resize (rare but happens on iOS rotation)
 *   - visualViewport resize (best-effort heuristic)
 *
 * Provider component · renders its children untouched. SSR-safe.
 */
import * as React from "react";
import {
  CSS_VARS,
  type SafeAreaInsets,
} from "./mobileHardeningTypes";
import {
  readSafeAreaInsets,
  subscribeToViewport,
} from "./MobileHardeningEngine";

/** Default header height · matches KudosHeader's fixed shell. */
const DEFAULT_HEADER_HEIGHT = 56;

export interface MobileSafeAreaProviderProps {
  children?: React.ReactNode;
  /** Override the assumed header height for --kudos-shell-top. */
  headerHeight?: number;
}

function writeVars(html: HTMLElement, insets: SafeAreaInsets, headerHeight: number) {
  // Respect sim values · if the html already carries data-kudos-sim-notch, don't
  // overwrite (the sim is intentionally faking insets).
  if (html.dataset.kudosSimNotch !== "1") {
    html.style.setProperty(CSS_VARS.safeTop,    `${insets.top}px`);
    html.style.setProperty(CSS_VARS.safeRight,  `${insets.right}px`);
    html.style.setProperty(CSS_VARS.safeBottom, `${insets.bottom}px`);
    html.style.setProperty(CSS_VARS.safeLeft,   `${insets.left}px`);
  }
  // Shell-top / bottom · convenience composites
  const top = insets.top + headerHeight;
  html.style.setProperty(CSS_VARS.shellTop,    `${top}px`);
  html.style.setProperty(CSS_VARS.shellBottom, `${insets.bottom}px`);
}

export function MobileSafeAreaProvider({
  children,
  headerHeight = DEFAULT_HEADER_HEIGHT,
}: MobileSafeAreaProviderProps) {
  React.useEffect(() => {
    if (typeof document === "undefined") return;
    const html = document.documentElement;
    const apply = () => {
      try {
        const insets = readSafeAreaInsets();
        writeVars(html, insets, headerHeight);
      } catch {
        /* never throw from a provider */
      }
    };
    apply();
    const unsubscribe = subscribeToViewport(apply);
    return () => unsubscribe();
  }, [headerHeight]);
  return <>{children}</>;
}
