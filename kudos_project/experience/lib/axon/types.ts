/**
 * KUDOS Experience · tipos del dominio AXÓN
 *
 * Estos tipos son la *vista del frontend* sobre los contratos de AXÓN. Si
 * AXÓN devuelve campos adicionales, no rompemos (solo no los tipamos). Si
 * AXÓN no devuelve un campo declarado opcional aquí, tampoco rompemos.
 *
 * Cuando AXÓN cambie un campo (rename / cambio de tipo), actualizamos aquí
 * y TypeScript señalará todos los consumidores.
 */

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

/**
 * GET /api/health/ (AXÓN Phase 0).
 * Shape estable:
 *   { status: "ok", service: "axon", version: "v0.9-axon-core", uptime: <int seconds> }
 * Si Phase 1+ añade campos (db_status, redis_status, etc.) pasan transparente
 * por el catch-all.
 */
export interface HealthStatus {
  status: "ok" | "degraded" | "down" | string;
  service: string;
  version: string;
  uptime: number;
  [k: string]: unknown;
}

// ---------------------------------------------------------------------------
// Capsules
// ---------------------------------------------------------------------------

/** Capa de contexto (Phase 0 · ortogonal a dimension_layer). */
export type ContextLayer =
  | "OFFICIAL"
  | "COMMUNITY"
  | "PERSONAL"
  | "TEMPORAL"
  | "EMOTIONAL";

/**
 * Cápsula en formato lista (GET /api/capsules/) o detalle (Phase 3).
 * Phase 0 añade: place (slug del Place vinculado), parent_capsule (uid),
 * root_capsule (uid), context_layer, importance_score, verified.
 */
export interface Capsule {
  uid: string;
  titulo: string;
  lat?: number;
  lon?: number;
  modo?: string;
  dimension?: string;
  year?: number | null;
  autor?: string;
  image?: string;

  /** Slug del Place canónico vinculado (Phase 0). String libre legacy: `lugar`. */
  place?: string | null;
  /** UID de la cápsula padre directa (Phase 0). */
  parent_capsule?: string | null;
  /** UID de la cápsula raíz del árbol (Phase 0, denormalizado). */
  root_capsule?: string | null;
  /** Capa de contexto (Phase 0). */
  context_layer?: ContextLayer;
  /** 0..1 · semilla del CIE (Phase 0). */
  importance_score?: number;
  /** Verificación binaria mínima (Phase 0). */
  verified?: boolean;

  /** Campos extra del backend pasan sin tipar. */
  [k: string]: unknown;
}

/** Forma 5D paginada por bbox (GET /api/capsules/5d/). */
export interface Capsule5D {
  uid: string;
  titulo: string;
  lat: number;
  lon: number;
  modo: string;
  dimension: string;
  year: number | null;
  autor: string;
  image: string;
}

export interface Capsules5DResponse {
  capsules: Capsule5D[];
  total: number;
}

/** Metadata extendida de una cápsula (GET /api/capsules/<uid>/light/). */
export interface CapsuleLight {
  uid: string;
  era: string;
  altitud: number;
  ai_enriched: boolean;
  sentiment: number;
  quality: number;
}

// ---------------------------------------------------------------------------
// Places
// ---------------------------------------------------------------------------

/**
 * Lugar canónico (GET /api/places/:slug/ · AXÓN Phase 0).
 * Shape estable:
 *   {
 *     slug, name,
 *     country: string | null,
 *     lat: number | null, lon: number | null,
 *     summary: string, description: string, image: string,
 *     era_range: { from: number | null, to: number | null },
 *     capsule_count: number,
 *   }
 */
export interface Place {
  slug: string;
  name: string;
  country: string | null;
  lat: number | null;
  lon: number | null;
  summary: string;
  description: string;
  image: string;
  era_range: { from: number | null; to: number | null };
  capsule_count: number;
  /** Campos extra (futuros) pasan sin tipar. */
  [k: string]: unknown;
}

// ---------------------------------------------------------------------------
// Mind Lite (POST /mind/ask/)
// ---------------------------------------------------------------------------

export type MindMode = "what" | "summary" | "near";

export interface MindAskResponse {
  reply: string;
  mode: MindMode;
  source: string;
  context: {
    capsule: string | null;
    lat: number | null;
    lon: number | null;
    year: number | null;
  };
  related: Array<{
    uid: string;
    titulo: string;
    year: number | null;
    modo: string;
  }>;
}
