/**
 * KUDOS Experience · <KudosLogo />
 *
 * Brand mark con dos variantes:
 *   - "wordmark" (default) · "KUDOS" tipográfico + dot accent (usado en
 *     header desktop, footer, hero copy).
 *   - "mark" · solo icono circular con K estilizada (usado en mobile
 *     compact, favicons, loading states, embeds). Coincide con el
 *     logomark del north-star deck (mock 3).
 *
 * Tres tamaños: sm (header inline), md (default), lg (hero).
 *
 * Sin dependencias externas (no usa lucide ni next/image). Render-safe
 * en server + client. Hereda color via currentColor para tematización.
 */
import * as React from "react";

export interface KudosLogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Solo afecta a variant="wordmark". Cuando false, oculta el dot
   *  accent del wordmark. La variante "mark" siempre lleva su propio
   *  dot interno · ignora este prop. */
  withDot?: boolean;
  /** "wordmark" · KUDOS texto · default · usado en chrome global.
   *  "mark"     · solo logomark circular K · usado en mobile compact,
   *               loaders, brand stamps. */
  variant?: "wordmark" | "mark";
}

const _SIZES: Record<NonNullable<KudosLogoProps["size"]>, { font: string; gap: string; dot: string; mark: string }> = {
  sm: { font: "text-[14px]", gap: "gap-1.5", dot: "size-1",   mark: "size-6"  },
  md: { font: "text-[18px]", gap: "gap-2",   dot: "size-1.5", mark: "size-8"  },
  lg: { font: "text-[28px]", gap: "gap-3",   dot: "size-2",   mark: "size-12" },
};

export function KudosLogo({
  size = "md",
  className = "",
  withDot = true,
  variant = "wordmark",
}: KudosLogoProps) {
  const s = _SIZES[size];

  if (variant === "mark") {
    return (
      <span
        aria-label="KUDOS"
        role="img"
        className={`inline-flex items-center justify-center ${s.mark} text-white/95 ${className}`}
      >
        <MarkSVG />
      </span>
    );
  }

  return (
    <span
      aria-label="KUDOS"
      className={`inline-flex items-center ${s.gap} font-display font-light tracking-[0.32em] uppercase text-white/95 ${s.font} ${className}`}
    >
      {withDot ? (
        <span
          aria-hidden
          className={`${s.dot} rounded-full bg-[var(--kudos-accent)]`}
          style={{ boxShadow: "0 0 12px var(--kudos-accent-glow)" }}
        />
      ) : null}
      KUDOS
    </span>
  );
}

// ---------------------------------------------------------------------------
// MarkSVG · logomark circular con K estilizada + dot accent
// ---------------------------------------------------------------------------
function MarkSVG() {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      aria-hidden
      className="size-full"
      style={{ filter: "drop-shadow(0 0 6px var(--kudos-accent-glow))" }}
    >
      {/* Círculo exterior · hairline minimal */}
      <circle
        cx="16"
        cy="16"
        r="14"
        strokeWidth="1.2"
        opacity="0.45"
      />
      {/* K estilizada · trazos lineales */}
      <path
        d="M11.5 9 L11.5 23 M11.5 16 L19 9 M11.5 16 L19 23"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Dot accent · ubicado en el cruce superior · sello del producto */}
      <circle
        cx="22"
        cy="11"
        r="1.6"
        fill="var(--kudos-accent)"
        stroke="none"
      />
    </svg>
  );
}
