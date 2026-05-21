/**
 * KUDOS Experience · Time Machine · types
 *
 * Las eras y hotspots son datos curados (no AXÓN-driven) en el MVP.
 * Cuando AXÓN exponga timelines en Phase 3, este módulo migra a un
 * loader; los tipos se mantienen compatibles.
 */

export type EraId = "founding" | "republic" | "empire" | "renaissance" | "modern";

/** Una época histórica curada. */
export interface Era {
  /** Identificador estable. */
  id: EraId;
  /** Año canónico (negativo = a.C.). */
  year: number;
  /** Label corto para el slider (ej. "80 d.C."). */
  label: string;
  /** Nombre evocador de la era. */
  name: string;
  /** Una sola línea narrativa, documental-grade. */
  micro_context: string;
  /** Mood textual (para futuras analíticas o filtros). */
  mood: string;

  // ── Atmósfera visual ────────────────────────────────────────────────
  /** Gradient principal del cielo (top → bottom). */
  sky_gradient: string;
  /** Color radial del haze atmosférico (multiply blend). */
  haze: string;
  /** Color de glow accent activo durante la era (hotspots, halos). */
  glow_color: string;
}

/** Hotspot urbano dentro de Roma. */
export interface Hotspot {
  /** Identificador estable. */
  id: string;
  /** Nombre display. */
  name: string;
  /** Año principal (cuando "nace" en su forma reconocible). */
  primary_year: number;
  /** CTA corta sobre identidad (ej. "Anfiteatro Flavio"). */
  cta_label: string;
  /** Posición en el canvas SVG 0..100. */
  position: { x: number; y: number };
  /** Eras en las que el hotspot es visible / vivo. */
  appears_in: EraId[];
  /** Una sola línea de contexto documental. */
  micro_context: string;
  /** UID de cápsula AXÓN si la hay (futuro). */
  capsule_uid?: string;
  /** Slug de la Capsule Experience interna (ruta /capsules/<slug>). */
  capsule_slug?: string;
}
