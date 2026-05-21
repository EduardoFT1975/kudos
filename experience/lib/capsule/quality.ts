/**
 * KUDOS Experience · Capsule quality guard (Phase 14.5 UX recovery).
 *
 * Frontend-side heuristic that flags a "success" capsule as actually
 * weak / generic so the session layer can transparently retry with an
 * expanded radius before showing it to the user.
 *
 * The pipeline already screens for confidence ≥ 0.75 server-side, but
 * confidence is a relative ranking signal · it can still return a
 * supermercado, a gasolinera, a "Calle de X", or other low-interest
 * POI when the surroundings are sparse. These trigger the "weak WOW"
 * disappointment that kills first-session magic.
 *
 * Strategy: cheap text heuristic on title + factual_anchor. Match
 * against Spanish + English generic POI patterns. False positive cost
 * is one extra fetch (~1s). False negative cost is a disappointed user.
 * Tilt the regex toward sensitivity.
 *
 * NOT exhaustive. NOT a content quality model. A pragmatic filter that
 * catches the obvious failures (supermarket, gas station, generic
 * street, chain stores) so the founder's first 100 sessions don't show
 * "Mercadona" as the highlight of Madrid.
 *
 * Backend Phase 15 work will replace this with a proper POI-class
 * blacklist enforced at the Wikidata enrichment stage.
 */
import type { CapsuleData } from "@/types/capsule-state";

/**
 * Patterns matched against lowercased title. Each pattern represents
 * a class of place that produces a weak first impression.
 *
 *   - Retail chains / supermarkets
 *   - Fuel / vehicle services
 *   - Generic addressed locations ("Calle de", "Avenida", "Plaza" w/o name)
 *   - Generic POI types ("Aparcamiento", "Parking", "ATM")
 *
 * Real landmarks usually have proper names that don't trip these.
 * "Plaza Mayor" is excluded because it's a specific named landmark
 * even though it starts with "Plaza" — we only match when the noun is
 * the entire string or followed by a generic continuation.
 */
const _WEAK_TITLE_PATTERNS: RegExp[] = [
  // Retail / chains
  /^(super)?mercado(na)?\b/i,
  /\b(mercadona|carrefour|lidl|aldi|dia|alcampo|eroski|walmart|tesco|sainsbury|costco)\b/i,
  /\b(starbucks|mcdonald'?s|burger king|kfc|subway|domino'?s)\b/i,
  // Fuel / vehicle
  /\b(gasolinera|estación de servicio|gas station|petrol station|repsol|cepsa|bp|shell)\b/i,
  /\b(parking|aparcamiento|car park)\b/i,
  // Generic addressed locations (no proper landmark name)
  /^(calle|avenida|avda\.?|paseo|ronda|carretera|ctra\.?|camino|travesía|callejón) /i,
  /^(street|road|avenue|highway|lane) /i,
  // Generic POI types
  /^(banco|atm|cajero|farmacia|pharmacy|bus stop|parada de autobús)\b/i,
  /^(hotel|hostal|pensión|motel) [a-z]{1,3}\b/i, // very short hotel names
  // Numeric/coordinate-style titles (Wikidata fallback bug surfaces)
  /^[\d.,\s°'"-]+$/,
  // P0.9 WOW pilot · municipal/admin division genéricos (sin nombre propio
  // fuerte). "Distrito centro", "Pueblo de X", "Municipio de Y", "Partida
  // rural Z" suelen ser fallbacks Wikidata sin densidad narrativa real.
  /^(distrito|barrio|pueblo|municipio|comarca|partida)\s+(de\s+|del\s+)?[a-záéíóúñ]+(\s|$)/i,
  // P0.9 WOW pilot · religiosos genéricos sin nombre propio (las
  // basílicas/catedrales/santuarios con nombre quedan fuera porque
  // exigen genitivo de marca clara que estos patrones no atrapan).
  /^(iglesia parroquial|capilla de|ermita de|santuario de|oratorio de)\b/i,
  // P0.9 WOW pilot · civicos genéricos (centro de salud, polideportivo,
  // colegio público, escuela primaria, instituto de educación).
  /^(centro de salud|centro cultural|centro cívico|polideportivo|pabellón|colegio público|escuela primaria|instituto de educación|biblioteca municipal)\b/i,
  // P0.9 WOW pilot · disambiguation / placeholder Wikipedia (síntoma de
  // que el winner no se resolvió a un artículo real).
  /\((desambiguación|disambiguation)\)\s*$/i,
  // P0.9 WOW pilot · títulos extremadamente cortos (≤3 chars trim) suelen
  // ser fallbacks malformados · landmarks reales tienen nombres más largos.
  /^.{1,3}$/,
];

/**
 * Patterns matched against the factual_anchor. If the only verified
 * sentence is generic ("es una calle", "es un supermercado", etc.)
 * the capsule is weak regardless of how the title looks.
 */
const _WEAK_ANCHOR_PATTERNS: RegExp[] = [
  /^[\s"']*(es|is) (una?|an?) (calle|avenida|supermercado|gasolinera|aparcamiento|parking|street|avenue|supermarket|gas station|car park)\b/i,
  /\bes una (vía|carretera|autopista)\b/i,
];

const _MIN_CONTEXT_BLOCK_CHARS = 80;

export interface WeakCapsuleSignal {
  weak: boolean;
  reason:
    | "title_pattern"
    | "anchor_pattern"
    | "context_too_short"
    | "missing_anchor"
    | "none";
}

/**
 * Inspect a capsule and decide whether it's a weak "generic place"
 * result that we should try to replace with a nearby better landmark.
 *
 * Decision order (first match wins):
 *   1. Missing factual_anchor entirely → weak (missing_anchor)
 *   2. Title matches generic POI pattern → weak (title_pattern)
 *   3. factual_anchor matches generic pattern → weak (anchor_pattern)
 *   4. context_block under 80 chars → weak (context_too_short)
 *   5. Otherwise → not weak
 *
 * Pure function. No side effects. Safe to call in render.
 */
export function inspectCapsuleQuality(
  capsule: CapsuleData,
): WeakCapsuleSignal {
  const title = (capsule.title ?? "").trim();
  const anchor = (capsule.factual_anchor ?? "").trim();
  const context = (capsule.context_block ?? "").trim();

  if (!anchor) {
    return { weak: true, reason: "missing_anchor" };
  }
  for (const pat of _WEAK_TITLE_PATTERNS) {
    if (pat.test(title)) {
      return { weak: true, reason: "title_pattern" };
    }
  }
  for (const pat of _WEAK_ANCHOR_PATTERNS) {
    if (pat.test(anchor)) {
      return { weak: true, reason: "anchor_pattern" };
    }
  }
  if (context.length < _MIN_CONTEXT_BLOCK_CHARS) {
    return { weak: true, reason: "context_too_short" };
  }
  return { weak: false, reason: "none" };
}

/** Convenience predicate. */
export function isWeakCapsule(capsule: CapsuleData): boolean {
  return inspectCapsuleQuality(capsule).weak;
}
