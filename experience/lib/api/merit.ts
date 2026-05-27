/**
 * KUDOS API · cliente tipado para los endpoints de Mérito.
 *
 * Estas funciones envuelven `apiGet` / `apiPost` con los tipos del
 * backend. Si el backend no está disponible (env var ausente, red
 * caída, sesión expirada), devuelven `null`. El caller siempre debe
 * tratar `null` como "sigue con el fallback local".
 */

import { apiGet, apiPost } from "./client";
import type {
  ApiMeritSnapshot,
  ApiMeritEventsList,
  ApiMeritAddEventInput,
  ApiMeritAddEventResult,
  ApiStreakState,
} from "./types";

/** Snapshot completo · usado para hidratar /merito al montar. */
export async function fetchMeritSnapshot(): Promise<ApiMeritSnapshot | null> {
  return apiGet<ApiMeritSnapshot>("/api/merit/snapshot/");
}

/** Últimos 200 eventos · usado para reconstruir la timeline de mérito. */
export async function fetchMeritEvents(): Promise<ApiMeritEventsList | null> {
  return apiGet<ApiMeritEventsList>("/api/merit/events/");
}

/**
 * Crea un MeritEvent en el backend + avanza la racha.
 * Devuelve el ID asignado o `null` si la operación falla.
 *
 * IMPORTANTE: este es fire-and-forget en la mayoría de los flujos.
 * El store ya ha escrito en localStorage de forma optimista antes de
 * llamar aquí, por lo que un `null` no significa pérdida de datos.
 */
export async function postMeritEvent(
  input: ApiMeritAddEventInput,
): Promise<ApiMeritAddEventResult | null> {
  return apiPost<ApiMeritAddEventResult>("/api/merit/events/add/", input);
}

/** Estado de racha actual (no avanza). */
export async function fetchStreak(): Promise<ApiStreakState | null> {
  return apiGet<ApiStreakState>("/api/streak/");
}
