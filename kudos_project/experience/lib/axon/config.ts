/**
 * KUDOS Experience · AXÓN config
 *
 * Resuelve la base URL del backend Django (AXÓN Core API Layer) desde el
 * entorno. Una sola fuente de verdad para todo `lib/axon/*`.
 *
 * Variable principal:   NEXT_PUBLIC_API_BASE_URL  (p.ej. https://kudos-40cq.onrender.com)
 * Fallback (legacy):    NEXT_PUBLIC_DJANGO_BACKEND
 *
 * No se inyectan defaults silenciosos: si no hay URL configurada, el cliente
 * lanza un AxonError claro en el primer request. Esto evita que el frontend
 * acabe pegando contra un origen incorrecto sin avisar.
 */

/** Lee la base URL cruda del entorno, sin normalizar. */
function readRawBaseUrl(): string | undefined {
  // process.env.NEXT_PUBLIC_* se inyecta en tiempo de build tanto en server
  // como en client. No hace falta runtime config.
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_DJANGO_BACKEND ||
    undefined
  );
}

/**
 * Devuelve la base URL ya normalizada (sin `/` final).
 * Devuelve `null` si no está configurada — el caller decide cómo fallar.
 */
export function getAxonBaseUrl(): string | null {
  const raw = readRawBaseUrl();
  if (!raw) return null;
  return raw.replace(/\/+$/, "");
}

/** Devuelve la base URL o lanza si falta — útil cuando ya estamos haciendo fetch. */
export function requireAxonBaseUrl(): string {
  const base = getAxonBaseUrl();
  if (!base) {
    throw new Error(
      "[AXÓN] NEXT_PUBLIC_API_BASE_URL no está configurada. " +
        "Define la URL del backend Django en experience/.env.local " +
        "(p.ej. NEXT_PUBLIC_API_BASE_URL=https://kudos-40cq.onrender.com)."
    );
  }
  return base;
}

/** Defaults del cliente. Modificables por llamada. */
export const AXON_DEFAULTS = {
  /** Timeout por request en ms. Render tarda en frío; 15s es generoso. */
  timeoutMs: 15_000,
  /**
   * Estrategia de cache por defecto. `no-store` evita que Next sirva datos
   * obsoletos en RSC; cada endpoint puede subir el TTL vía `revalidate`.
   */
  cache: "no-store" as RequestCache,
} as const;
