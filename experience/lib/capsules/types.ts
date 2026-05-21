/**
 * KUDOS Experience · Capsule Experience · types
 *
 * Shape de los datos de UNA cápsula cinematográfica. Estos datos son
 * curados en el MVP (en `lib/capsules/<slug>.ts`); cuando AXÓN exponga
 * el shape completo en Phase 3, el loader los hidrata desde la API.
 */

export type MediaKind =
  | "arch"
  | "column"
  | "aerial"
  | "vomitoria"
  | "section"
  | "abstract";

/** Una imagen/vignette del media strip. Sin URL: se renderiza como SVG. */
export interface CapsuleMedia {
  id: string;
  kind: MediaKind;
  caption: string;
  gradient: string;
}

/** Un evento de la timeline interna de la cápsula. */
export interface CapsuleTimelineEvent {
  id: string;
  year: number;          // negativo = a.C.
  year_label: string;    // ej. "80 d.C."
  title: string;
  micro_context: string; // una sola frase documental
}

/** Un bloque de contexto cultural (pull-quote style). */
export interface CapsuleContextBlock {
  id: string;
  eyebrow: string;       // micro-tag arriba
  body: string;          // 1-3 frases poderosas
}

/** Nodo de relación (capa contextual cercana). */
export interface CapsuleRelation {
  id: string;
  name: string;          // ej. "Gladiadores"
  kind: string;          // ej. "Cultura" / "Personaje" / "Tecnología"
  /** Si existe, navega a la cápsula relacionada. Si no, está en preparación. */
  slug?: string;
}

/** Hero data. */
export interface CapsuleHero {
  title: string;
  era_label: string;     // "80 d.C."
  location: string;      // "Roma · Italia"
  micro_context: string; // una frase poderosa
  badges: string[];      // ej. ["Patrimonio UNESCO", "Anfiteatro Flavio"]
}

/** Capsule completa. */
export interface Capsule {
  slug: string;          // url-safe, ej. "colosseum"
  /** Slug del lugar canónico (link al Time Machine). */
  place_slug: string;
  /** Era principal — para volver al Time Machine en el momento correcto. */
  primary_era_id: string;
  hero: CapsuleHero;
  timeline: CapsuleTimelineEvent[];
  context_blocks: CapsuleContextBlock[];
  media: CapsuleMedia[];
  relations: CapsuleRelation[];
}
