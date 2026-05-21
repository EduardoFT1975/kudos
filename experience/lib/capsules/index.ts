/**
 * KUDOS Experience · Capsule loader
 *
 * MVP: registry estático de cápsulas curadas. Cuando AXÓN exponga
 * /api/capsules/<slug>/ con shape completo (Phase 3), aquí se sustituye
 * por un fetch tipado sin cambiar el resto de la app.
 */
import type { Capsule } from "./types";
import { COLOSSEUM } from "./colosseum";

const REGISTRY: Record<string, Capsule> = {
  [COLOSSEUM.slug]: COLOSSEUM,
};

/** Devuelve la cápsula o null si no existe en el registry. */
export function getCapsuleBySlug(slug: string): Capsule | null {
  return REGISTRY[slug] ?? null;
}

/** Lista de slugs disponibles (para generateStaticParams futuro). */
export function getAllCapsuleSlugs(): string[] {
  return Object.keys(REGISTRY);
}

export type { Capsule } from "./types";
export type {
  CapsuleHero,
  CapsuleTimelineEvent,
  CapsuleContextBlock,
  CapsuleMedia,
  CapsuleRelation,
  MediaKind,
} from "./types";
