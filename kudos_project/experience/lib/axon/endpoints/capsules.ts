/**
 * KUDOS Experience · endpoint: capsules
 *
 * Rutas oficiales de AXÓN v0.9-axon-core:
 *   GET /api/capsules/                      lista simple
 *   GET /api/capsules/5d/                   bbox-paginated, slim (D5)
 *   GET /api/capsules/<uid>/light/          metadata extendida (D5)
 *   GET /api/capsules/nearby/               por bbox
 *
 * Todo lo que aquí no esté tipado es porque aún no es prioridad del slice.
 */
import { axon } from "../client";
import type { Capsule, Capsule5D, Capsules5DResponse, CapsuleLight } from "../types";

// ---------------------------------------------------------------------------
// GET /api/capsules/
// ---------------------------------------------------------------------------

export interface ListCapsulesParams {
  /** Filtra por place slug (cuando AXÓN lo soporte). */
  place?: string;
  /** Filtra por modo (testimonio, evento, etc.). */
  modo?: string;
  /** Filtra por dimensión espacial. */
  dimension?: string;
  /** Rango temporal. */
  yearFrom?: number;
  yearTo?: number;
  /** Paginación cruda — depende del backend. */
  limit?: number;
  offset?: number;
}

export interface ListCapsulesOpts {
  signal?: AbortSignal;
  timeoutMs?: number;
  /** Cache TTL en segundos. Default: 60. */
  revalidate?: number;
}

/**
 * AXÓN puede devolver:
 *   - un array plano: Capsule[]
 *   - un envelope: { results: Capsule[], count: number }
 * Normalizamos a { capsules, total } para que el UI no se entere.
 */
export interface ListCapsulesResult {
  capsules: Capsule[];
  total: number;
}

export async function listCapsules(
  params: ListCapsulesParams = {},
  opts: ListCapsulesOpts = {}
): Promise<ListCapsulesResult> {
  const raw = await axon.get<unknown>("/api/capsules/", {
    query: {
      place: params.place,
      modo: params.modo,
      dimension: params.dimension,
      year_from: params.yearFrom,
      year_to: params.yearTo,
      limit: params.limit,
      offset: params.offset,
    },
    signal: opts.signal,
    timeoutMs: opts.timeoutMs,
    revalidate: opts.revalidate ?? 60,
  });
  return normalizeCapsuleList(raw);
}

function normalizeCapsuleList(raw: unknown): ListCapsulesResult {
  if (Array.isArray(raw)) {
    return { capsules: raw as Capsule[], total: raw.length };
  }
  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    const list =
      (Array.isArray(r.results) && (r.results as Capsule[])) ||
      (Array.isArray(r.capsules) && (r.capsules as Capsule[])) ||
      (Array.isArray(r.data) && (r.data as Capsule[])) ||
      [];
    const total =
      typeof r.count === "number" ? r.count :
      typeof r.total === "number" ? r.total :
      list.length;
    return { capsules: list, total };
  }
  return { capsules: [], total: 0 };
}

// ---------------------------------------------------------------------------
// GET /api/capsules/5d/
// ---------------------------------------------------------------------------

export interface BBox {
  north: number;
  south: number;
  east: number;
  west: number;
  zoom: number;
}

export interface FetchCapsules5DOpts {
  bbox?: BBox;
  yearFrom?: number;
  yearTo?: number;
  dimension?: string;
  modo?: string;
  limit?: number;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export function fetchCapsules5D(opts: FetchCapsules5DOpts = {}): Promise<Capsules5DResponse> {
  const { bbox, signal, timeoutMs, ...rest } = opts;
  return axon.get<Capsules5DResponse>("/api/capsules/5d/", {
    query: {
      ...rest,
      north: bbox?.north,
      south: bbox?.south,
      east: bbox?.east,
      west: bbox?.west,
      zoom: bbox?.zoom,
    },
    signal,
    timeoutMs,
    revalidate: 60, // alinea con Cache-Control: max-age=60 del backend
  });
}

// ---------------------------------------------------------------------------
// GET /api/capsules/<uid>/light/
// ---------------------------------------------------------------------------

export function fetchCapsuleLight(
  uid: string,
  opts: { signal?: AbortSignal; timeoutMs?: number } = {}
): Promise<CapsuleLight> {
  const safeUid = encodeURIComponent(uid);
  return axon.get<CapsuleLight>(`/api/capsules/${safeUid}/light/`, {
    signal: opts.signal,
    timeoutMs: opts.timeoutMs,
    revalidate: 60,
  });
}

// re-export tipo para conveniencia
export type { Capsule, Capsule5D, CapsuleLight };
