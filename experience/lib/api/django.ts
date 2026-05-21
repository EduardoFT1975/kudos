/**
 * KUDOS Experience · cliente del backend Django v0.9-axon-core.
 *
 * Centraliza todas las llamadas a las APIs heredadas. Las rutas reales:
 *
 *   GET  /api/capsules/5d/                      bbox-paginated, slim (D5)
 *   GET  /api/capsules/<uid>/light/             lazy metadata (D5)
 *   GET  /api/capsules/nearby/                  por bbox
 *   GET  /api/capsules/                         simple list
 *   GET  /api/stats/                            site stats
 *   POST /mind/ask/                             Mind Lite (D12, requiere CSRF si auth)
 *
 * El `next.config.ts` reescribe `/api/django/*` y `/api/mind/*` al backend
 * configurado en `NEXT_PUBLIC_DJANGO_BACKEND`.
 */

export const API_ROUTES = {
  capsules5d: "/api/django/capsules/5d/",
  capsuleLight: (uid: string) =>
    `/api/django/capsules/${encodeURIComponent(uid)}/light/`,
  capsulesNearby: "/api/django/capsules/nearby/",
  capsules: "/api/django/capsules/",
  stats: "/api/django/stats/",
  mindAsk: "/api/mind/ask/",
} as const;

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

export interface CapsuleLight {
  uid: string;
  era: string;
  altitud: number;
  ai_enriched: boolean;
  sentiment: number;
  quality: number;
}

export interface MindAskResponse {
  reply: string;
  mode: "what" | "summary" | "near";
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

interface BBox {
  north: number;
  south: number;
  east: number;
  west: number;
  zoom: number;
}

/** Construye query string desde un objeto plano, omitiendo undefined/null. */
function qs(params: Record<string, string | number | undefined | null>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

/** Fetch bbox-paginated de cápsulas (D4). */
export async function fetchCapsules5D(opts: {
  bbox?: BBox;
  yearFrom?: number;
  yearTo?: number;
  dimension?: string;
  modo?: string;
  limit?: number;
  signal?: AbortSignal;
}): Promise<{ capsules: Capsule5D[]; total: number }> {
  const { bbox, signal, ...rest } = opts;
  const query = qs({
    ...rest,
    north: bbox?.north,
    south: bbox?.south,
    east: bbox?.east,
    west: bbox?.west,
    zoom: bbox?.zoom,
  });
  const r = await fetch(`${API_ROUTES.capsules5d}${query}`, {
    signal,
    headers: { Accept: "application/json" },
    next: { revalidate: 60 }, // alinea con Cache-Control: max-age=60 del backend
  });
  if (!r.ok) throw new Error(`capsules5d: HTTP ${r.status}`);
  return r.json();
}

/** Fetch metadata extendida de una cápsula (D5). */
export async function fetchCapsuleLight(
  uid: string,
  signal?: AbortSignal
): Promise<CapsuleLight> {
  const r = await fetch(API_ROUTES.capsuleLight(uid), {
    signal,
    headers: { Accept: "application/json" },
    next: { revalidate: 60 },
  });
  if (!r.ok) throw new Error(`capsuleLight: HTTP ${r.status}`);
  return r.json();
}

/** Mind Lite ask (D12). 3 modes oficiales. */
export async function askMind(opts: {
  mode: "what" | "summary" | "near";
  capsule?: string;
  lat?: number;
  lon?: number;
  year?: number;
  csrfToken?: string;
  signal?: AbortSignal;
}): Promise<MindAskResponse> {
  // Destructure `signal` from opts so the shorthand fetch option resolves.
  // Matches the pattern used by fetchCapsules5D + fetchCapsuleLight above.
  const { signal, csrfToken } = opts;
  const fd = new FormData();
  fd.append("mode", opts.mode);
  if (opts.capsule) fd.append("capsule", opts.capsule);
  if (opts.lat !== undefined) fd.append("lat", String(opts.lat));
  if (opts.lon !== undefined) fd.append("lon", String(opts.lon));
  if (opts.year !== undefined) fd.append("year", String(opts.year));

  const headers: HeadersInit = {};
  if (csrfToken) headers["X-CSRFToken"] = csrfToken;

  const r = await fetch(API_ROUTES.mindAsk, {
    method: "POST",
    body: fd,
    credentials: "include",
    signal,
    headers,
  });
  if (!r.ok) throw new Error(`mind/ask: HTTP ${r.status}`);
  return r.json();
}
