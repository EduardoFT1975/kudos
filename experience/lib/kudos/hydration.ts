/**
 * KUDOS · hidratación del store local desde backend Django.
 *
 * Estrategia conservadora "localStorage wins":
 *   · Si localStorage tiene datos para una colección → no se toca.
 *   · Si localStorage está vacío para una colección → se hidrata
 *     con lo que devuelva el backend.
 *
 * Esto evita el problema clásico de hidratación destructiva (un
 * borrado local se sobrescribe por un fetch). El día que tengamos
 * auth real + tombstones se puede pasar a last-write-wins por
 * timestamp.
 *
 * Caso típico:
 *   · Usuario abre por primera vez en navegador nuevo (sin localStorage)
 *     → backend rellena saved, mérito, visitas.
 *   · Usuario ya tiene localStorage de sesiones anteriores
 *     → no se toca · sync.ts seguirá empujando deltas al backend.
 *
 * No-op silencioso si:
 *   · `NEXT_PUBLIC_API_BASE_URL` no está configurada.
 *   · El backend no responde / sesión sin autenticar.
 *   · Cualquier fetch devuelve `null` (errores HTTP/red ya silenciados
 *     en `lib/api/client.ts`).
 */

import {
  fetchBookmarks,
  fetchMeritEvents,
  fetchMeritSnapshot,
  fetchVisits,
  isApiAvailable,
} from "@/lib/api";
import type {
  ApiBookmark,
  ApiMeritEvent,
  ApiVisit,
} from "@/lib/api";
import {
  hydrateLocalStore,
  type HydrationPayload,
  type MeritEvent,
  type SavedItem,
} from "./store";

/**
 * Resultado de la hidratación · útil para logs/telemetry en dev.
 * En prod no se usa.
 */
export interface HydrationResult {
  ranBackend: boolean;
  applied: { saved: boolean; merit: boolean; visited: boolean };
}

/**
 * Ejecuta la hidratación. Llamar UNA SOLA VEZ por carga de app
 * (idempotente en cualquier caso porque sólo escribe si la
 * colección local está vacía).
 *
 * NO bloquea. Devuelve la promesa para que el caller pueda esperar
 * si quiere mostrar un spinner, pero no es obligatorio.
 */
export async function hydrateFromBackend(): Promise<HydrationResult> {
  if (!isApiAvailable()) {
    return { ranBackend: false, applied: { saved: false, merit: false, visited: false } };
  }

  // Paralelo · el cliente fetch ya tiene timeout de 8s. Si alguno
  // falla devuelve null y simplemente no se hidrata esa colección.
  const [bookmarksRes, meritRes, visitsRes] = await Promise.all([
    fetchBookmarks(),
    fetchMeritEvents(),
    fetchVisits(),
  ]);

  const payload: HydrationPayload = {};

  if (bookmarksRes?.bookmarks) {
    payload.saved = bookmarksRes.bookmarks.map(toSavedItem);
  }
  if (meritRes?.events) {
    payload.meritEvents = meritRes.events.map(toMeritEvent);
  }
  if (visitsRes?.visits) {
    payload.visited = visitsRes.visits.map(toVisited);
  }

  const applied = hydrateLocalStore(payload);
  return { ranBackend: true, applied };
}

// Útil exponer también el snapshot para pantallas que quieran refresco
// "forzado" (post-MVP). El componente provider de hoy NO lo usa.
export async function refreshMeritFromBackend() {
  if (!isApiAvailable()) return null;
  return fetchMeritSnapshot();
}

// ─── Adapters API → store local ───────────────────────────────────────────

function toSavedItem(b: ApiBookmark): SavedItem {
  return {
    kind: b.kind === "poi" ? "poi" : "capsule",
    id: b.target_id,
    savedAt: Date.parse(b.created) || Date.now(),
  };
}

function toMeritEvent(e: ApiMeritEvent): MeritEvent {
  return {
    id: `srv-${e.id}`,
    ts: Date.parse(e.ts) || Date.now(),
    pillar: e.pillar,
    points: e.points,
    label: e.label,
    poiId: e.place_id != null ? String(e.place_id) : undefined,
    capsuleId: e.capsule_id != null ? String(e.capsule_id) : undefined,
  };
}

function toVisited(v: ApiVisit): { poiId: string; ts: number } {
  return {
    poiId: v.place_id,
    ts: Date.parse(v.ts) || Date.now(),
  };
}
