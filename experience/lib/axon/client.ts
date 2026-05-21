/**
 * KUDOS Experience · AXÓN client
 *
 * Wrapper unificado sobre `fetch` para hablar con el backend Django
 * (AXÓN Core API Layer). Funciona tanto en Server Components / route
 * handlers (Node runtime) como en Client Components (browser).
 *
 * Reglas:
 *   - Una sola base URL (ver lib/axon/config.ts).
 *   - URL absoluta siempre — no dependemos de rewrites de Next.
 *   - Errores tipados (AxonError) con status, code y URL.
 *   - Timeout por defecto vía AbortController; combinable con AbortSignal del caller.
 *   - JSON-first: serializa body objeto, deserializa respuesta.
 *   - Cero mocks. Endpoint que no existe = AxonError(404). El UI decide.
 */

import { AXON_DEFAULTS, requireAxonBaseUrl } from "./config";
import { AxonError, type AxonErrorCode } from "./errors";

type Json =
  | null
  | boolean
  | number
  | string
  | Json[]
  | { [k: string]: Json };

export interface AxonRequestInit extends Omit<RequestInit, "body"> {
  /** Cuerpo de la request. Si es objeto plano se serializa como JSON. */
  body?: BodyInit | Json;
  /** Timeout en ms para esta llamada (override de AXON_DEFAULTS.timeoutMs). */
  timeoutMs?: number;
  /** Revalidación Next (segundos). Si se pasa, prevalece sobre `cache`. */
  revalidate?: number;
  /**
   * Query string a serializar. Se omiten claves undefined / null / "".
   * Arrays se serializan repitiendo la clave.
   */
  query?: Record<string, string | number | boolean | null | undefined | (string | number)[]>;
}

/** ¿El valor parece un objeto plano serializable a JSON? */
function isPlainJsonBody(v: unknown): v is Json {
  if (v === null) return true;
  const t = typeof v;
  if (t === "string" || t === "number" || t === "boolean") return true;
  if (t !== "object") return false;
  if (
    v instanceof FormData ||
    v instanceof Blob ||
    v instanceof ArrayBuffer ||
    v instanceof URLSearchParams ||
    (typeof ReadableStream !== "undefined" && v instanceof ReadableStream)
  ) {
    return false;
  }
  return true;
}

function serializeQuery(query: AxonRequestInit["query"]): string {
  if (!query) return "";
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      for (const v of value) {
        if (v === undefined || v === null || v === "") continue;
        sp.append(key, String(v));
      }
    } else {
      sp.set(key, String(value));
    }
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

function buildUrl(path: string, query?: AxonRequestInit["query"]): string {
  if (/^https?:\/\//i.test(path)) {
    // path ya absoluto — respetar (útil para endpoints fuera del namespace /api).
    return `${path}${serializeQuery(query)}`;
  }
  const base = requireAxonBaseUrl();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}${serializeQuery(query)}`;
}

/** Combina la señal del caller con la del timeout interno. */
function mergeSignals(
  caller: AbortSignal | null | undefined,
  internal: AbortSignal
): AbortSignal {
  if (!caller) return internal;
  // AbortSignal.any() es estándar y existe en Node 20+ y navegadores modernos.
  // Fallback manual por si el runtime no lo trae.
  type AbortSignalWithAny = typeof AbortSignal & {
    any?: (signals: AbortSignal[]) => AbortSignal;
  };
  const Ctor = AbortSignal as AbortSignalWithAny;
  if (typeof Ctor.any === "function") {
    return Ctor.any([caller, internal]);
  }
  const ctrl = new AbortController();
  const onAbort = (reason: unknown) => ctrl.abort(reason);
  if (caller.aborted) ctrl.abort(caller.reason);
  else caller.addEventListener("abort", () => onAbort(caller.reason), { once: true });
  if (internal.aborted) ctrl.abort(internal.reason);
  else internal.addEventListener("abort", () => onAbort(internal.reason), { once: true });
  return ctrl.signal;
}

async function parseBody(res: Response): Promise<unknown> {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    try {
      return await res.json();
    } catch {
      // Cuerpo declarado JSON pero malformado.
      return null;
    }
  }
  if (ct.startsWith("text/")) {
    return await res.text();
  }
  // Otros tipos: devolver null (los binarios deberían pasar por un helper específico).
  return null;
}

/**
 * Primitiva principal. Lanza AxonError ante cualquier fallo, devuelve
 * la respuesta parseada (T) en éxito.
 */
export async function axonFetch<T = unknown>(
  path: string,
  init: AxonRequestInit = {}
): Promise<T> {
  let url: string;
  try {
    url = buildUrl(path, init.query);
  } catch (cause) {
    throw new AxonError(
      cause instanceof Error ? cause.message : "AXÓN no configurado",
      { status: 0, code: "CONFIG", url: path, cause }
    );
  }

  const {
    body,
    timeoutMs = AXON_DEFAULTS.timeoutMs,
    revalidate,
    query: _query,
    headers: callerHeaders,
    signal: callerSignal,
    cache: callerCache,
    ...rest
  } = init;

  // --- headers ---
  const headers = new Headers(callerHeaders);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");

  // --- body ---
  let finalBody: BodyInit | undefined;
  if (body === undefined || body === null) {
    finalBody = undefined;
  } else if (isPlainJsonBody(body) && typeof body === "object") {
    finalBody = JSON.stringify(body);
    if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  } else {
    finalBody = body as BodyInit;
  }

  // --- caching ---
  // Si el caller pidió revalidate, Next ignora `cache`. Si no, usamos el cache del caller
  // o el default del cliente.
  const nextOpts = revalidate !== undefined ? { revalidate } : undefined;
  const cacheOpt = revalidate !== undefined ? undefined : (callerCache ?? AXON_DEFAULTS.cache);

  // --- timeout ---
  const timeoutCtrl = new AbortController();
  const timeoutId =
    timeoutMs > 0
      ? setTimeout(() => timeoutCtrl.abort(new Error("AXÓN timeout")), timeoutMs)
      : null;
  const signal = mergeSignals(callerSignal, timeoutCtrl.signal);

  let res: Response;
  try {
    res = await fetch(url, {
      ...rest,
      headers,
      body: finalBody,
      signal,
      ...(cacheOpt !== undefined ? { cache: cacheOpt } : {}),
      ...(nextOpts ? { next: nextOpts } : {}),
    });
  } catch (cause) {
    const aborted = (cause as { name?: string })?.name === "AbortError" || timeoutCtrl.signal.aborted;
    const code: AxonErrorCode = aborted ? "TIMEOUT" : "NETWORK";
    const msg = aborted
      ? `AXÓN timeout tras ${timeoutMs}ms (${url})`
      : `AXÓN no alcanzable: ${(cause as Error)?.message ?? "error de red"}`;
    if (timeoutId) clearTimeout(timeoutId);
    throw new AxonError(msg, { status: 0, code, url, cause });
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }

  if (!res.ok) {
    const parsed = await parseBody(res);
    throw new AxonError(`AXÓN HTTP ${res.status} ${res.statusText} (${url})`, {
      status: res.status,
      code: "HTTP",
      url,
      body: parsed,
    });
  }

  // 204 No Content
  if (res.status === 204) {
    return undefined as T;
  }

  const data = await parseBody(res);
  return data as T;
}

/** Helpers semánticos sobre axonFetch. */
export const axon = {
  get<T>(path: string, init?: Omit<AxonRequestInit, "method" | "body">) {
    return axonFetch<T>(path, { ...init, method: "GET" });
  },
  post<T>(path: string, body?: AxonRequestInit["body"], init?: Omit<AxonRequestInit, "method">) {
    return axonFetch<T>(path, { ...init, method: "POST", body });
  },
  patch<T>(path: string, body?: AxonRequestInit["body"], init?: Omit<AxonRequestInit, "method">) {
    return axonFetch<T>(path, { ...init, method: "PATCH", body });
  },
  put<T>(path: string, body?: AxonRequestInit["body"], init?: Omit<AxonRequestInit, "method">) {
    return axonFetch<T>(path, { ...init, method: "PUT", body });
  },
  delete<T>(path: string, init?: Omit<AxonRequestInit, "method" | "body">) {
    return axonFetch<T>(path, { ...init, method: "DELETE" });
  },
};
