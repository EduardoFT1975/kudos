"use client";

/**
 * KUDOS Experience · <RecoveryPill /> (Phase 14.6 loop affordance).
 *
 * Glass-style action pill shared by every recovery/loop CTA across
 * the capsule state surfaces:
 *
 *   - CapsuleEmptyZone     · Buscar cerca / Reintentar / Elegir lugar
 *   - CapsuleGeolocationDenied · Reintentar permiso / Elegir ubicación
 *   - CapsuleBuildingContext · Reintentar / Buscar cerca (6s stall CTA)
 *   - CapsuleSuccess       · Descubrir cerca / Otra cápsula
 *   - CapsuleSparseDiscovery · Buscar algo cerca / Probar otro punto
 *
 * Visual idiom must stay identical across all five surfaces so the
 * recovery / loop language reads as one continuous KUDOS gesture and
 * not as five different button styles. Two variants only:
 *
 *   primary · accent-tinted glass · the "do the obvious good thing"
 *   default · soft white glass     · the alternative
 *
 * No icons. No labels-with-icons. The microcopy carries the meaning.
 */
import * as React from "react";

export interface RecoveryPillProps {
  children: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
  ariaLabel?: string;
}

export function RecoveryPill({
  children,
  onClick,
  primary = false,
  ariaLabel,
}: RecoveryPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={
        "inline-flex items-center justify-center rounded-full border " +
        "px-5 py-2.5 text-[13px] font-medium backdrop-blur-md " +
        "transition-all duration-300 ease-out focus-visible:outline-none " +
        "focus-visible:ring-2 focus-visible:ring-[var(--kudos-accent)] " +
        (primary
          ? "border-[var(--kudos-accent)]/55 bg-[var(--kudos-accent)]/10 text-[var(--kudos-accent-bright)] hover:bg-[var(--kudos-accent)]/20"
          : "border-white/15 bg-white/[0.05] text-white/85 hover:border-white/30 hover:bg-white/[0.10] hover:text-white")
      }
    >
      {children}
    </button>
  );
}
