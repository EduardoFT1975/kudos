/**
 * KUDOS Experience · <KudosLogo />
 *
 * Brand mark loaded from /public/brand/ SVG assets. Founder puede
 * reemplazar los archivos en `experience/public/brand/` por exports
 * oficiales del designer sin tocar este componente.
 *
 * Variantes:
 *   - "wordmark" (default) · KUDOS + mark a la izquierda (horizontal lockup)
 *   - "mark"               · solo el símbolo K-pin circular
 *   - "vertical"           · símbolo arriba + KUDOS + tagline debajo
 *
 * Tres tamaños · sm / md / lg.
 *
 * Asset paths (servidos desde /):
 *   /brand/kudos-symbol.svg
 *   /brand/kudos-logo.svg
 *   /brand/kudos-logo-vertical.svg
 *
 * Render-safe en server + client. Uses native <img> para evitar
 * configurar remotePatterns de next/image.
 */
import * as React from "react";

export interface KudosLogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Solo afecta variant="wordmark". Cuando false oculta el dot accent
   *  decorativo (aplicable a layouts compactos legacy). Default true. */
  withDot?: boolean;
  /** "wordmark" · símbolo + KUDOS horizontal (default · chrome global)
   *  "mark"     · solo K-pin circular (mobile compact, favicon, brand stamps)
   *  "vertical" · símbolo + KUDOS + tagline (splash, hero, share previews) */
  variant?: "wordmark" | "mark" | "vertical";
}

const _SIZES = {
  sm: { mark: 24, wordmark: { h: 28, w: 105 }, vertical: { h: 96, w: 104 } },
  md: { mark: 36, wordmark: { h: 40, w: 150 }, vertical: { h: 140, w: 152 } },
  lg: { mark: 56, wordmark: { h: 60, w: 225 }, vertical: { h: 220, w: 238 } },
} as const;

export function KudosLogo({
  size = "md",
  className = "",
  withDot: _withDot = true,
  variant = "wordmark",
}: KudosLogoProps) {
  // withDot kept in props signature for back-compat · ignored in the
  // SVG-asset rendering path (asset itself is the canonical brand).
  void _withDot;

  const s = _SIZES[size];

  if (variant === "mark") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/brand/kudos-symbol.svg"
        alt="KUDOS"
        width={s.mark}
        height={s.mark}
        className={`inline-block ${className}`}
        style={{ width: s.mark, height: s.mark }}
      />
    );
  }

  if (variant === "vertical") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/brand/kudos-logo-vertical.svg"
        alt="KUDOS · The Meaning Layer of Reality"
        width={s.vertical.w}
        height={s.vertical.h}
        className={`inline-block ${className}`}
        style={{ width: s.vertical.w, height: s.vertical.h }}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/kudos-logo.svg"
      alt="KUDOS"
      width={s.wordmark.w}
      height={s.wordmark.h}
      className={`inline-block ${className}`}
      style={{ width: s.wordmark.w, height: s.wordmark.h }}
    />
  );
}
