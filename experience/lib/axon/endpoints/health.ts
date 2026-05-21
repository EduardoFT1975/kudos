/**
 * KUDOS Experience · endpoint: health (Phase P0.7 · rewire)
 *
 * Backend AXÓN solo expone:
 *   POST /api/place-capsule    (canonical)
 *   POST /api/capsule/nearby   (back-compat alias)
 *
 * NO existe GET /api/health/. La versión anterior de este módulo lo
 * llamaba y mostraba "AXÓN no responde" como falso negativo aunque el
 * backend estaba vivo.
 *
 * Estrategia de probe nueva · cheap liveness check:
 *   POST /api/place-capsule con coords intencionalmente inválidas.
 *   Backend valida shape y devuelve 400 + X-Kudos-Pipeline-Health:
 *   bad_request SIN ejecutar el pipeline LLM/Wikipedia. Demuestra:
 *     - red al backend (no es ERR_CONNECTION_REFUSED)
 *     - parser JSON activo
 *     - rate limit middleware operativo
 *     - response header pipeline-health enchufado
 *
 * Cualquier status 2xx/4xx ⇒ backend vivo. 5xx o network throw ⇒ down.
 */
import { requireAxonBaseUrl } from "../config";

/** Path canonical contra el que probamos · trailing slash (Django
 *  convention). Backend acepta también la variante sin slash via alias. */
export const HEALTH_PATH = "/api/place-capsule/";

export interface HealthProbeResult {
  /** true si el backend respondió (cualquier 2xx o 4xx). */
  ok: boolean;
  /** HTTP status recibido. 0 si network failure. */
  status: number;
  /** X-Kudos-Pipeline-Health header value. "unknown" si ausente o failure. */
  pipelineHealth: string;
  /** Latencia en ms desde el inicio del fetch hasta la respuesta o error. */
  latencyMs: number;
  /** Mensaje legible (nombre del error si network failure). */
  detail: string;
}

export interface GetHealthOpts {
  signal?: AbortSignal;
  timeoutMs?: number;
}

/**
 * Probe de liveness. Devuelve siempre · nunca tira excepción. UI puede
 * leer `ok` directamente sin try/catch.
 */
export async function getHealth(opts: GetHealthOpts = {}): Promise<HealthProbeResult> {
  const t0 = Date.now();
  let base: string;
  try {
    base = requireAxonBaseUrl();
  } catch (err) {
    return {
      ok: false,
      status: 0,
      pipelineHealth: "config_missing",
      latencyMs: Date.now() - t0,
      detail: err instanceof Error ? err.message : String(err),
    };
  }

  const url = `${base}${HEALTH_PATH}`;
  const controller = new AbortController();
  const timeoutMs = opts.timeoutMs ?? 15_000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  // Compose external signal con timeout signal si el caller pasa uno.
  const externalSignal = opts.signal;
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort();
    else externalSignal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Coords intencionalmente fuera de rango · backend devuelve 400
      // "coordinates_out_of_range" SIN ejecutar pipeline (no LLM call,
      // no Wikipedia fetch). Cheap probe.
      body: JSON.stringify({ lat: 9999, lng: 9999 }),
      cache: "no-store",
      signal: controller.signal,
    });
    let pipelineHealth = "unknown";
    try {
      pipelineHealth = res.headers.get("X-Kudos-Pipeline-Health") ?? "unknown";
    } catch {
      // Algunos polyfills de fetch tiran al leer headers · defensivo.
    }
    // 2xx o 4xx ⇒ backend vivo (4xx esperable porque enviamos bad input).
    // 5xx ⇒ backend caído o degraded internal error.
    const isAlive = res.status >= 200 && res.status < 500;
    return {
      ok: isAlive,
      status: res.status,
      pipelineHealth,
      latencyMs: Date.now() - t0,
      detail: isAlive
        ? `Backend responde (status ${res.status} · pipeline-health=${pipelineHealth})`
        : `Backend devolvió ${res.status}`,
    };
  } catch (err) {
    // Network error, abort, DNS, TLS, CORS, etc. Backend NO alcanzable.
    const name = err instanceof Error ? err.name : "unknown";
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      status: 0,
      pipelineHealth: name,
      latencyMs: Date.now() - t0,
      detail: msg,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
