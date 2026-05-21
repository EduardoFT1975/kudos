/**
 * KUDOS Experience · endpoint: places
 * GET /api/places/:slug/
 *
 * Endpoint propuesto del vertical slice Roma → Timeline → Coliseo → Capsule
 * → Mind. Si AXÓN aún no lo expone, getPlace() lanzará AxonError(404) y la
 * página /places/[slug] mostrará un panel "endpoint pendiente en AXÓN"
 * — sin mocks disfrazados.
 */
import { axon } from "../client";
import type { Place } from "../types";

export interface GetPlaceOpts {
  signal?: AbortSignal;
  timeoutMs?: number;
  revalidate?: number;
}

export function getPlace(slug: string, opts: GetPlaceOpts = {}): Promise<Place> {
  const safe = encodeURIComponent(slug);
  return axon.get<Place>(`/api/places/${safe}/`, {
    signal: opts.signal,
    timeoutMs: opts.timeoutMs,
    revalidate: opts.revalidate ?? 300, // 5 min — los lugares cambian poco
  });
}

/** Path para mostrar en debug / mensajes de error. */
export const placePath = (slug: string) => `/api/places/${slug}/`;
