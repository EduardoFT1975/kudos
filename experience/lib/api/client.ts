/**
 * KUDOS Experience · cliente HTTP base.
 *
 * Resuelve URLs contra `NEXT_PUBLIC_API_BASE_URL`. Si esa env var no
 * está, todas las llamadas API resuelven a `null` y el frontend opera
 * en modo offline (sólo `localStorage`). Esto es deliberado · el MVP
 * debe funcionar sin backend para desarrollo + demos.
 *
 * Estrategia:
 *   · `credentials: 'include'`  · enviar cookie de sesión Django.
 *   · Errores HTTP → devuelven `null`, NUNCA throw.
 *   · Errores de red → devuelven `null`, NUNCA throw.
 *
 * El caller siempre debe tratar `null` como "no hay respuesta del
 * backend, usa el fallback local". Esto mantiene la app a prueba
 * de red caída.
 */

export interface ApiOptions {
  /** Headers extra a fusionar con los predeterminados. */
  headers?: Record<string, string>;
  /** Para POST/PUT/DELETE. */
  body?: unknown;
  /** Timeout en ms. Default 8000. */
  timeoutMs?: number;
  /** AbortSignal opcional para cancelación. */
  signal?: AbortSignal;
}

/**
 * Devuelve la URL base que prefija los paths "/api/...".
 *
 *   · En navegador (typeof window !== "undefined") → siempre cadena
 *     vacía. Las llamadas son URL-relativas y van por el proxy
 *     `rewrites` de next.config.ts (en dev) o al mismo origen
 *     (en prod). Esto evita CORS + cookies cross-origin.
 *
 *   · En SSR (server-side) → process.env.NEXT_PUBLIC_API_BASE_URL
 *     o null si no está configurada · sólo se usa para fetch durante
 *     render server-side, que en MVP no ocurre (hidratación va por
 *     cliente).
 */
function getApiBaseUrl(): string | null {
  if (typeof window !== "undefined") return "";
  const url = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!url || url.length === 0) return null;
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

/**
 * Indica si el frontend puede hablar con el backend.
 * En navegador siempre `true` (vía proxy). En SSR depende de env.
 */
export function isApiAvailable(): boolean {
  return getApiBaseUrl() !== null;
}

/**
 * GET tipado. Devuelve `T | null`.
 */
export async function apiGet<T>(
  path: string,
  opts: ApiOptions = {},
): Promise<T | null> {
  return apiRequest<T>("GET", path, opts);
}

/**
 * POST con body JSON. Devuelve `T | null`.
 */
export async function apiPost<T>(
  path: string,
  body: unknown,
  opts: ApiOptions = {},
): Promise<T | null> {
  return apiRequest<T>("POST", path, { ...opts, body });
}

/**
 * DELETE con body opcional. Devuelve `T | null`.
 */
export async function apiDelete<T>(
  path: string,
  body?: unknown,
  opts: ApiOptions = {},
): Promise<T | null> {
  return apiRequest<T>("DELETE", path, { ...opts, body });
}

async function apiRequest<T>(
  method: "GET" | "POST" | "DELETE" | "PUT",
  path: string,
  opts: ApiOptions,
): Promise<T | null> {
  const base = getApiBaseUrl();
  if (base === null) return null;

  const url = path.startsWith("/") ? `${base}${path}` : `${base}/${path}`;
  const timeoutMs = opts.timeoutMs ?? 8000;

  // AbortController para timeout · permite cancelar fetches lentos
  // sin bloquear el hilo de UI eternamente.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  // Si el caller pasó su propio signal, propagamos sus cancelaciones.
  if (opts.signal) {
    if (opts.signal.aborted) ctrl.abort();
    else opts.signal.addEventListener("abort", () => ctrl.abort(), { once: true });
  }

  try {
    const res = await fetch(url, {
      method,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        ...(opts.headers ?? {}),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: ctrl.signal,
    });

    if (!res.ok) {
      // Errores HTTP no son excepción · simplemente "sin datos".
      // Log silencioso para diagnóstico en dev (sin Sentry todavía).
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.warn(`[KUDOS API] ${method} ${path} → ${res.status}`);
      }
      return null;
    }

    // No-content responses (204).
    if (res.status === 204) return null;

    const data = (await res.json()) as T;
    return data;
  } catch (err) {
    // Network error / timeout / abort. Sin throw, sin ruido en prod.
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn(`[KUDOS API] ${method} ${path} · fallo de red`, err);
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}
