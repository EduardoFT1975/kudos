/**
 * KUDOS · Capsule Engine · retry + backoff utilities.
 *
 * Production rules:
 *   - exponential backoff with jitter
 *   - HTTP 429 → respect Retry-After if present
 *   - HTTP 5xx → retry up to N times
 *   - HTTP 4xx (except 408/429) → do NOT retry (caller bug)
 *   - network/timeout → retry
 */

export interface RetryOpts {
  retries:        number;   // total attempts = retries + 1
  base_ms:        number;
  cap_ms:         number;
  on_attempt?:    (attempt: number, err: unknown) => void;
}

export const DEFAULT_RETRY: RetryOpts = {
  retries: 4,
  base_ms: 500,
  cap_ms:  20_000,
};

export class HttpError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body: string,
    public retryAfterMs?: number,
  ) {
    super(`HTTP ${status} ${statusText} · ${body.slice(0, 300)}`);
    this.name = "HttpError";
  }
  isRetriable(): boolean {
    if (this.status === 408 || this.status === 429) return true;
    if (this.status >= 500 && this.status < 600) return true;
    return false;
  }
}

export async function withRetry<T>(
  fn:  (attempt: number) => Promise<T>,
  opt: RetryOpts = DEFAULT_RETRY,
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= opt.retries; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastErr = err;
      const retriable = err instanceof HttpError ? err.isRetriable() : isNetworkLike(err);
      if (!retriable || attempt === opt.retries) throw err;
      const explicit = err instanceof HttpError && err.retryAfterMs ? err.retryAfterMs : undefined;
      const backoff  = explicit ?? jitteredBackoff(attempt, opt.base_ms, opt.cap_ms);
      opt.on_attempt?.(attempt, err);
      await sleep(backoff);
    }
  }
  throw lastErr;
}

export function jitteredBackoff(attempt: number, base_ms: number, cap_ms: number): number {
  const exp = Math.min(cap_ms, base_ms * 2 ** attempt);
  // Full jitter (AWS recommendation)
  return Math.floor(Math.random() * exp);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function isNetworkLike(err: unknown): boolean {
  if (!err) return false;
  const msg = String((err as any).message ?? err).toLowerCase();
  return /econnreset|enotfound|etimedout|fetch failed|network|socket|aborted|enobufs|epipe/.test(msg);
}

/** Fetch wrapper that throws HttpError with parsed Retry-After. */
export async function http(
  url:  string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<Response> {
  const { timeoutMs = 60_000, ...rest } = init;
  const ctl = new AbortController();
  const tid = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...rest, signal: ctl.signal });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      const ra   = res.headers.get("Retry-After");
      const ms   = ra ? parseRetryAfter(ra) : undefined;
      throw new HttpError(res.status, res.statusText, body, ms);
    }
    return res;
  } finally {
    clearTimeout(tid);
  }
}

function parseRetryAfter(value: string): number | undefined {
  const sec = Number(value);
  if (!isNaN(sec)) return sec * 1000;
  const date = Date.parse(value);
  if (!isNaN(date)) return Math.max(0, date - Date.now());
  return undefined;
}

/**
 * Poll a status URL until predicate is satisfied or timeout.
 * Used for async-job providers (Replicate, PiAPI Kling).
 */
export async function poll<T>(
  fetchStatus: () => Promise<T>,
  isDone:      (state: T) => boolean,
  isFailed:    (state: T) => boolean,
  opt:         { interval_ms: number; max_wait_ms: number; backoff_factor?: number } = { interval_ms: 3000, max_wait_ms: 300_000 },
): Promise<T> {
  const t0 = Date.now();
  let interval = opt.interval_ms;
  let state = await fetchStatus();
  while (!isDone(state) && !isFailed(state)) {
    if (Date.now() - t0 > opt.max_wait_ms) throw new Error(`Poll timeout after ${opt.max_wait_ms}ms`);
    await sleep(interval);
    interval = Math.min(interval * (opt.backoff_factor ?? 1.4), 15_000);
    state = await fetchStatus();
  }
  if (isFailed(state)) throw new Error("Polled job reported failure: " + JSON.stringify(state).slice(0, 500));
  return state;
}
