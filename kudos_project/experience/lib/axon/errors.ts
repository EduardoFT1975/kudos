/**
 * KUDOS Experience · AXÓN errors
 *
 * Modelo de error único para todo el cliente AXÓN. La idea es que cualquier
 * fallo (red, timeout, HTTP no-OK, JSON inválido) llegue al caller como
 * `AxonError` con la metadata suficiente para decidir UX:
 *
 *   - status: número HTTP, o 0 si nunca llegó respuesta (red / timeout).
 *   - code:   etiqueta semántica ("TIMEOUT", "NETWORK", "PARSE", "HTTP", "CONFIG").
 *   - url:    URL absoluta que se intentó (para mostrar en error boundary).
 *   - body:   cuerpo de la respuesta cuando hubo HTTP no-OK (string/JSON/null).
 *
 * Ningún endpoint del cliente debe lanzar Error genérico — siempre AxonError.
 */

export type AxonErrorCode =
  | "TIMEOUT"
  | "NETWORK"
  | "PARSE"
  | "HTTP"
  | "CONFIG";

export interface AxonErrorInit {
  status: number;
  code: AxonErrorCode;
  url: string;
  body?: unknown;
  cause?: unknown;
}

export class AxonError extends Error {
  readonly status: number;
  readonly code: AxonErrorCode;
  readonly url: string;
  readonly body: unknown;

  constructor(message: string, init: AxonErrorInit) {
    super(message, init.cause ? { cause: init.cause } : undefined);
    this.name = "AxonError";
    this.status = init.status;
    this.code = init.code;
    this.url = init.url;
    this.body = init.body ?? null;
  }
}

export function isAxonError(value: unknown): value is AxonError {
  return value instanceof AxonError;
}

/** ¿El error indica que el endpoint aún no existe en AXÓN? */
export function isMissingEndpoint(err: unknown): boolean {
  return isAxonError(err) && (err.status === 404 || err.status === 501);
}
