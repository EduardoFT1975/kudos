import type { CapsuleData } from "@/types/capsule-state";

const _WEAK_TITLE_PATTERNS: RegExp[] = [
  /^(super)?mercado(na)?\b/i,
  /\b(mercadona|carrefour|lidl|aldi|dia|alcampo|eroski|walmart|tesco|sainsbury|costco)\b/i,
  /\b(starbucks|mcdonald'?s|burger king|kfc|subway|domino'?s)\b/i,
  /\b(gasolinera|estación de servicio|gas station|petrol station|repsol|cepsa|bp|shell)\b/i,
  /\b(parking|aparcamiento|car park)\b/i,
  /^(calle|avenida|avda\.?|paseo|ronda|carretera|ctra\.?|camino|travesía|callejón) /i,
  /^(street|road|avenue|highway|lane) /i,
  /^(banco|atm|cajero|farmacia|pharmacy|bus stop|parada de autobús)\b/i,
  /^(hotel|hostal|pensión|motel) [a-z]{1,3}\b/i,
  /^[\d.,\s°'"-]+$/,
  /^(distrito|barrio|pueblo|municipio|comarca|partida)\s+(de\s+|del\s+)?[a-záéíóúñ]+(\s|$)/i,
  /^(iglesia parroquial|capilla de|ermita de|santuario de|oratorio de)\b/i,
  /^(centro de salud|centro cultural|centro cívico|polideportivo|pabellón|colegio público|escuela primaria|instituto de educación|biblioteca municipal)\b/i,
  /\((desambiguación|disambiguation)\)\s*$/i,
  /^.{1,3}$/,
];

const _WEAK_ANCHOR_PATTERNS: RegExp[] = [
  /^[\s"']*(es|is) (una?|an?) (calle|avenida|supermercado|gasolinera|aparcamiento|parking|street|avenue|supermarket|gas station|car park)\b/i,
  /\bes una (vía|carretera|autopista)\b/i,
];

const _MIN_CONTEXT_BLOCK_CHARS = 80;

const _ERA_DETECT_PATTERN = /\b(\d{1,4})\s*[ad]\.?\s*c\.?\b|\bsiglo\s+[IVX]+\b|\b1[0-9]{3}\b|\b20[0-2][0-9]\b|\b(edad media|renacimiento|barroco|moderna|antig[üu]edad|prehistoria|ilustraci[óo]n|romanticismo)\b/i;

function _hasEraSignal(capsule: CapsuleData): boolean {
  const parts: string[] = [];
  if (capsule.title) parts.push(capsule.title);
  if (capsule.factual_anchor) parts.push(capsule.factual_anchor);
  if (capsule.context_block) parts.push(capsule.context_block);
  return _ERA_DETECT_PATTERN.test(parts.join(" · "));
}

export interface WeakCapsuleSignal {
  weak: boolean;
  reason:
    | "title_pattern"
    | "anchor_pattern"
    | "context_too_short"
    | "missing_anchor"
    | "none";
}

export function inspectCapsuleQuality(capsule: CapsuleData): WeakCapsuleSignal {
  const title = (capsule.title ?? "").trim();
  const anchor = (capsule.factual_anchor ?? "").trim();
  const context = (capsule.context_block ?? "").trim();
  if (!anchor) return { weak: true, reason: "missing_anchor" };
  for (const pat of _WEAK_TITLE_PATTERNS) {
    if (pat.test(title)) return { weak: true, reason: "title_pattern" };
  }
  for (const pat of _WEAK_ANCHOR_PATTERNS) {
    if (pat.test(anchor)) return { weak: true, reason: "anchor_pattern" };
  }
  if (context.length < _MIN_CONTEXT_BLOCK_CHARS) {
    return { weak: true, reason: "context_too_short" };
  }
  return { weak: false, reason: "none" };
}

export function isWeakCapsule(capsule: CapsuleData): boolean {
  return inspectCapsuleQuality(capsule).weak;
}

export type CapsuleTier = "A" | "B" | "C";

export interface TierSignals {
  tier: CapsuleTier;
  reason: string;
  signals: {
    has_anchor: boolean;
    anchor_long: boolean;
    has_era: boolean;
    context_rich: boolean;
    refs_rich: boolean;
    weak_pattern: boolean;
  };
}

export function classifyCapsuleTier(capsule: CapsuleData): TierSignals {
  const weak = inspectCapsuleQuality(capsule);
  const anchor = (capsule.factual_anchor ?? "").trim();
  const context = (capsule.context_block ?? "").trim();
  const refs = capsule.source_refs ?? [];
  const signals = {
    has_anchor: anchor.length > 0,
    anchor_long: anchor.length >= 60,
    has_era: _hasEraSignal(capsule),
    context_rich: context.length >= 160,
    refs_rich: refs.length >= 2,
    weak_pattern: weak.weak,
  };
  if (signals.weak_pattern || !signals.has_anchor) {
    return { tier: "C", reason: weak.reason, signals };
  }
  let score = 0;
  if (signals.anchor_long) score++;
  if (signals.has_era) score++;
  if (signals.context_rich) score++;
  if (signals.refs_rich) score++;
  if (score >= 3) return { tier: "A", reason: "strong_score_" + score, signals };
  return { tier: "B", reason: "medium_score_" + score, signals };
}
