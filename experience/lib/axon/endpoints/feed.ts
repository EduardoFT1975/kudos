/**
 * KUDOS Experience · Discovery Feed loader
 *
 * Devuelve la sesión cinematográfica inicial del Feed. Estrategia:
 *
 *   1. Intenta traer cápsulas reales de AXÓN con el endpoint que YA existe
 *      (/api/capsules/5d/?modo=historico&limit=30), priorizando las que
 *      mencionen Roma en `lugar` (heurística string mientras AXÓN no
 *      filtra por place=rome).
 *   2. Las mapea a `FeedItem` con la metadata visual que el Card necesita.
 *   3. Intercala con `ROME_CURATED_CARDS` para garantizar densidad y
 *      arranque cinematográfico aunque AXÓN venga vacío.
 *   4. Dedup por título normalizado, cap a `limit` (default 12).
 *
 * Si AXÓN falla por completo, devuelve solo el curated (siempre real).
 * NO genera mocks. NO inventa datos.
 */
import { axon } from "../client";
import { isAxonError } from "../errors";
import type { Capsule5D } from "../types";
import { eraLabelForYear, formatYear } from "@/lib/utils/format";
import { ROME_CURATED_CARDS, type CuratedCard } from "@/lib/curated/rome";

export type FeedItemSource = "axon" | "curated";

export interface FeedItem {
  /** Estable para `key` de React. */
  id: string;
  source: FeedItemSource;
  title: string;
  micro_context: string;
  era_label: string;
  year: number | null;
  place_slug: string;
  /** URL imagen opcional. Si null → solo gradient. */
  image: string | null;
  /** CSS gradient garantizado (hero fallback). */
  gradient: string;
  /** Destino del CTA. */
  deep_link: string;
  /** UID de cápsula AXÓN si la hay (para Mind contextual, save, share). */
  capsule_uid?: string;
}

const DEFAULT_LIMIT = 12;

// ---------------------------------------------------------------------------
// Gradient deterministic por capsule uid (cuando no hay imagen).
// ---------------------------------------------------------------------------
const GRADIENT_POOL = [
  "linear-gradient(135deg, #1a0a2e 0%, #4b1d2f 45%, #050614 100%)",
  "linear-gradient(140deg, #1b1b40 0%, #3a2a55 50%, #060816 100%)",
  "linear-gradient(150deg, #2a1a0a 0%, #5a341b 50%, #050614 100%)",
  "linear-gradient(160deg, #0f1638 0%, #2c1a55 50%, #050816 100%)",
  "linear-gradient(135deg, #1f1525 0%, #2e1b2e 55%, #040614 100%)",
  "linear-gradient(140deg, #2a103a 0%, #4e1646 50%, #060816 100%)",
  "linear-gradient(135deg, #061633 0%, #163a55 50%, #040614 100%)",
  "linear-gradient(145deg, #1b1430 0%, #44213a 50%, #050614 100%)",
];

function pickGradient(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return GRADIENT_POOL[Math.abs(h) % GRADIENT_POOL.length];
}

// ---------------------------------------------------------------------------
// AXÓN → FeedItem
// ---------------------------------------------------------------------------
function capsule5DToFeedItem(c: Capsule5D): FeedItem {
  return {
    id: `axon-${c.uid}`,
    source: "axon",
    title: c.titulo || "Sin título",
    micro_context: buildMicroContext(c),
    era_label: c.year != null ? formatYear(c.year) : eraLabelForYear(c.year),
    year: c.year,
    place_slug: "rome", // heurística mientras AXÓN no devuelve place_slug
    image: c.image || null,
    gradient: pickGradient(c.uid),
    deep_link: `/places/rome`, // se afinará cuando exista /capsules/[uid]
    capsule_uid: c.uid,
  };
}

function buildMicroContext(c: Capsule5D): string {
  const parts: string[] = [];
  if (c.modo) parts.push(capitalizeFirst(c.modo));
  if (c.dimension) parts.push(`dimensión ${c.dimension}`);
  if (c.autor && c.autor !== "Anónimo") parts.push(`por ${c.autor}`);
  return parts.join(" · ") || "Cápsula contextual";
}

function capitalizeFirst(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}

// ---------------------------------------------------------------------------
// curated → FeedItem (1:1 conversion).
// ---------------------------------------------------------------------------
function curatedToFeedItem(c: CuratedCard): FeedItem {
  return {
    id: `curated-${c.id}`,
    source: "curated",
    title: c.title,
    micro_context: c.micro_context,
    era_label: c.era_label,
    year: c.year,
    place_slug: c.place_slug,
    image: null,
    gradient: c.gradient,
    deep_link: c.deep_link,
    capsule_uid: c.capsule_uid,
  };
}

// ---------------------------------------------------------------------------
// public API
// ---------------------------------------------------------------------------

export interface GetDiscoveryFeedOpts {
  limit?: number;
  /** Ignora AXÓN y devuelve solo curated. Útil para previews. */
  curatedOnly?: boolean;
  signal?: AbortSignal;
}

export async function getDiscoveryFeed(
  opts: GetDiscoveryFeedOpts = {}
): Promise<FeedItem[]> {
  const limit = opts.limit ?? DEFAULT_LIMIT;
  const curated = ROME_CURATED_CARDS.map(curatedToFeedItem);

  if (opts.curatedOnly) {
    return curated.slice(0, limit);
  }

  let axonItems: FeedItem[] = [];
  try {
    const resp = await axon.get<{ capsules: Capsule5D[]; total: number }>(
      "/api/capsules/5d/",
      {
        query: { modo: "historico", limit: 30 },
        signal: opts.signal,
        // Render cold start puede ser largo. Damos margen y, si pasa, caemos
        // a curated (que es contenido real, no mock).
        timeoutMs: 18_000,
        revalidate: 120,
      }
    );
    const cs = Array.isArray(resp?.capsules) ? resp.capsules : [];
    // Prioriza las que mencionen Roma en `lugar` o `titulo`.
    const romePref = cs.filter((c) => isRomeish(c));
    const others = cs.filter((c) => !isRomeish(c));
    axonItems = [...romePref, ...others].map(capsule5DToFeedItem);
  } catch (err) {
    // AXÓN no responde → devolvemos solo curated, sin crashear.
    // Logueamos solo si NO es AxonError esperable (404/500 del backend).
    if (!isAxonError(err)) {
      // eslint-disable-next-line no-console
      console.warn("[getDiscoveryFeed] fallo inesperado, fallback a curated:", err);
    }
  }

  return interleaveAndDedup(curated, axonItems, limit);
}

function isRomeish(c: Capsule5D): boolean {
  const hay = `${(c as { lugar?: string }).lugar ?? ""} ${c.titulo ?? ""}`.toLowerCase();
  return hay.includes("roma") || hay.includes("rome");
}

/**
 * Intercala curated + axon de forma natural (1:1 hasta agotar), dedupando
 * por título normalizado y truncando a `limit`. Curated va primero para
 * garantizar arranque cinematográfico en el primer viewport.
 */
function interleaveAndDedup(curated: FeedItem[], axon: FeedItem[], limit: number): FeedItem[] {
  const seen = new Set<string>();
  const out: FeedItem[] = [];
  const maxLen = Math.max(curated.length, axon.length);
  for (let i = 0; i < maxLen && out.length < limit; i++) {
    for (const item of [curated[i], axon[i]]) {
      if (!item) continue;
      const key = item.title.trim().toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(item);
      if (out.length >= limit) break;
    }
  }
  return out;
}
