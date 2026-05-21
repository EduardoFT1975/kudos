/**
 * KUDOS Experience · endpoint: health
 * GET /api/health/
 *
 * Sirve para verificar que el frontend habla con AXÓN. NO cae a fallbacks
 * silenciosos: si el endpoint no existe en AXÓN, la llamada propaga
 * AxonError(404) y el UI decide cómo mostrarlo.
 */
import { axon } from "../client";
import type { HealthStatus } from "../types";

const PATH = "/api/health/";

export interface GetHealthOpts {
  signal?: AbortSignal;
  timeoutMs?: number;
}

export function getHealth(opts: GetHealthOpts = {}): Promise<HealthStatus> {
  return axon.get<HealthStatus>(PATH, {
    signal: opts.signal,
    timeoutMs: opts.timeoutMs,
    cache: "no-store", // health siempre fresco
  });
}

/** Path expuesto para que el UI pueda mostrarlo en errores / debug. */
export const HEALTH_PATH = PATH;
