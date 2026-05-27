/**
 * KUDOS API · cliente tipado para Visits ("Estuve aquí").
 */

import { apiGet, apiPost } from "./client";
import type {
  ApiVisitsList,
  ApiVisitInput,
  ApiVisitResult,
} from "./types";

/** Todas las visitas del usuario autenticado. */
export async function fetchVisits(): Promise<ApiVisitsList | null> {
  return apiGet<ApiVisitsList>("/api/visits/");
}

/**
 * Registra una visita a un lugar canónico. Idempotente · si ya estaba
 * marcada, `created` viene `false` pero el endpoint responde OK.
 * El backend además crea automáticamente un MeritEvent +15 si es nueva.
 */
export async function postVisit(input: ApiVisitInput): Promise<ApiVisitResult | null> {
  return apiPost<ApiVisitResult>("/api/visits/", input);
}
