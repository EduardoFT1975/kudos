/**
 * KUDOS Experience · PlausibleProvider (Phase 14 telemetry).
 *
 * Mounts the Plausible JS snippet via next/script. Conditional rendering:
 *   - SSR-safe (next/script handles client mount)
 *   - Renders null when NEXT_PUBLIC_PLAUSIBLE_DOMAIN missing
 *   - Renders null in non-production builds (avoids dev/preview noise
 *     polluting the prod dashboard)
 *
 * Loads `script.js` · the basic Plausible script that auto-tracks
 * pageviews AND exposes window.plausible() for custom events (used by
 * lib/analytics/plausible.ts:track).
 *
 * Also installs window.kudosTestEvent() · the founder verification
 * harness (see plausible.ts:_installFounderTestEvent).
 *
 * Mount once in root layout. Do not duplicate.
 */
"use client";
import * as React from "react";
import Script from "next/script";
import { _installFounderTestEvent } from "@/lib/analytics/plausible";

const _DOMAIN: string | undefined = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
const _IS_PROD: boolean = process.env.NODE_ENV === "production";
const _ENABLED: boolean =
  typeof _DOMAIN === "string" && _DOMAIN.length > 0 && _IS_PROD;

const PLAUSIBLE_SCRIPT_SRC: string = "https://plausible.io/js/script.js";

export function PlausibleProvider() {
  // Install founder verification harness on every mount when enabled.
  // Runs client-side only (effect). No-op when env missing.
  React.useEffect(() => {
    if (!_ENABLED) return;
    _installFounderTestEvent();
  }, []);

  if (!_ENABLED) return null;
  return (
    <Script
      defer
      strategy="afterInteractive"
      data-domain={_DOMAIN}
      src={PLAUSIBLE_SCRIPT_SRC}
    />
  );
}
