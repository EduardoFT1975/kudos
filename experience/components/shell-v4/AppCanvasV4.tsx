"use client";

/**
 * KUDOS . AppCanvasV4 . Content slot (single scroll owner).
 *
 * <main> owns vertical scroll. TopBar + BottomNav are position:fixed and
 * sit on top of <main> · we pad-top/bottom to clear them.
 *
 *   height:         100dvh   (occupy the visual viewport exactly)
 *   overflow-y:     auto     (THIS element scrolls · not html/body)
 *   overflow-x:     hidden   (no horizontal jank)
 *   padding-top:    --app-topbar-h + safe-top
 *   padding-bottom: --app-bottomnav-h + safe-bottom + 16
 */
import * as React from "react";

interface Props { children: React.ReactNode; }

export function AppCanvasV4({ children }: Props) {
  return (
    <main
      style={{
        height: "100dvh",
        overflowY: "auto",
        overflowX: "hidden",
        WebkitOverflowScrolling: "touch",
        paddingTop: "calc(var(--app-topbar-h, 56px) + var(--kudos-safe-top, 0px))",
        paddingBottom: "calc(var(--app-bottomnav-h, 72px) + var(--kudos-safe-bottom, 0px) + 16px)",
        color: "var(--kudos-ink)",
        fontFamily: "var(--kudos-font-body)",
      }}
    >
      {children}
    </main>
  );
}
