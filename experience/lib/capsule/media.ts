/**
 * KUDOS Experience · capsule media adapter (P1.1 · real-media first)
 *
 * Pure resolver from CapsuleData → media block. NO external API calls.
 * Solo parsea lo que ya viene en el payload del backend.
 *
 * Priority order para hero:
 *   1. image_url / hero_image / pageimage / thumbnail_url (campos directos)
 *   2. thumbnail.source (objeto thumbnail típico Wikipedia)
 *   3. media[0].url / images[0].url / gallery[0].url / gallery[0]
 *   4. URL de imagen extraída del snippet de cualquier source_ref
 *
 * Gallery: hasta 4 imágenes únicas agregadas de TODAS las fuentes
 * anteriores. Dedupe por URL exacta.
 *
 * hasRealMedia = true cuando heroImage está resuelto. Frontend usa este
 * flag para decidir entre render real vs fallback aurora.
 */
import type { CapsuleData, CapsuleSourceRef } from "@/types/capsule-state";

export interface ResolvedMedia {
  heroImage?: string;
  gallery?: string[];
  attribution?: string;
  hasRealMedia: boolean;
}

const _IMAGE_URL_PATTERN =
  /(https?:\/\/[^\s)<>"']+\.(?:jpg|jpeg|png|webp|gif))/gi;

const _MAX_GALLERY = 4;

function _isValidUrl(s: unknown): s is string {
  return typeof s === "string" && /^https?:\/\//i.test(s);
}

function _readStringField(obj: Record<string, unknown>, key: string): string | undefined {
  const v = obj[key];
  return _isValidUrl(v) ? v : undefined;
}

function _collectFromArrayField(obj: Record<string, unknown>, key: string): string[] {
  const arr = obj[key];
  if (!Array.isArray(arr)) return [];
  const out: string[] = [];
  for (const item of arr) {
    if (_isValidUrl(item)) {
      out.push(item as string);
    } else if (item && typeof item === "object") {
      const rec = item as Record<string, unknown>;
      if (_isValidUrl(rec.url)) out.push(rec.url as string);
      else if (_isValidUrl(rec.source)) out.push(rec.source as string);
      else if (_isValidUrl(rec.thumbnail)) out.push(rec.thumbnail as string);
    }
  }
  return out;
}

function _extractFromSnippet(snippet: string | undefined | null): string[] {
  if (!snippet || typeof snippet !== "string") return [];
  const matches = snippet.matchAll(_IMAGE_URL_PATTERN);
  const out: string[] = [];
  for (const m of matches) {
    if (m[1]) out.push(m[1]);
  }
  return out;
}

function _dedupe(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of urls) {
    if (!seen.has(u)) {
      seen.add(u);
      out.push(u);
    }
  }
  return out;
}

function _attributionFor(capsule: CapsuleData, primaryUrl: string | undefined): string | undefined {
  const any = capsule as unknown as Record<string, unknown>;
  if (typeof any.image_source === "string") return any.image_source;
  if (typeof any.attribution === "string") return any.attribution;
  if (!primaryUrl) return undefined;
  if (/wikimedia|wikipedia/i.test(primaryUrl)) return "Wikimedia Commons";
  return undefined;
}

export function resolveCapsuleMedia(capsule: CapsuleData): ResolvedMedia {
  const any = capsule as unknown as Record<string, unknown>;
  const candidates: string[] = [];

  // 1. Direct string fields · prioritized first
  for (const key of [
    "image_url",
    "hero_image",
    "pageimage",
    "thumbnail_url",
    "commons_url",
    "image",
  ]) {
    const v = _readStringField(any, key);
    if (v) candidates.push(v);
  }

  // 2. Common nested thumbnail object: { thumbnail: { source: "..." } }
  if (any.thumbnail && typeof any.thumbnail === "object") {
    const t = any.thumbnail as Record<string, unknown>;
    if (_isValidUrl(t.source)) candidates.push(t.source as string);
    else if (_isValidUrl(t.url)) candidates.push(t.url as string);
  }

  // 3. Arrays of media
  for (const key of ["media", "images", "gallery", "photos", "pictures"]) {
    candidates.push(..._collectFromArrayField(any, key));
  }

  // 4. Scan ALL source_refs snippets for image URLs
  const refs: CapsuleSourceRef[] = Array.isArray(capsule.source_refs)
    ? capsule.source_refs
    : [];
  for (const ref of refs) {
    candidates.push(..._extractFromSnippet(ref.snippet));
  }

  const unique = _dedupe(candidates);

  if (unique.length === 0) {
    return { hasRealMedia: false };
  }

  const heroImage = unique[0];
  const gallery = unique.slice(0, _MAX_GALLERY);
  const attribution = _attributionFor(capsule, heroImage);

  return {
    heroImage,
    gallery,
    attribution,
    hasRealMedia: true,
  };
}

/** Hash determinístico para fallback gradient hue. */
export function mediaHashHue(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) | 0;
  }
  const palette = [260, 280, 300, 340, 10, 30, 200, 220];
  return palette[Math.abs(h) % palette.length];
}
