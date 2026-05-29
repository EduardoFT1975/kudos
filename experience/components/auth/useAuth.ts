"use client";
/**
 * useAuth · KUDOS T1.3.
 *
 * Hook que combina:
 *  - sesion Auth.js (NextAuth) -> identidad
 *  - access_token KUDOS (en memoria) -> Bearer para llamadas al backend
 *  - refresh automatico contra /api/auth/refresh (cookie httpOnly se manda sola)
 *
 * Diseno H1.T1.0:
 *  - access_token NUNCA en localStorage (XSS defense)
 *  - refresh_token en cookie httpOnly del backend KUDOS
 *  - Si access expira (401), reintenta refresh transparente
 */
import * as React from "react";


const API = process.env.NEXT_PUBLIC_KUDOS_API_URL || "";


export interface KudosUser {
  id: string;
  email: string;
  display_name?: string | null;
  avatar_url?: string | null;
  locale?: string;
  primary_interest?: string | null;
}


interface AuthState {
  user: KudosUser | null;
  accessToken: string | null;
  loading: boolean;
}


// Singleton en memoria · UN solo access token compartido por toda la app
let _memoryToken: string | null = null;
let _memoryUser: KudosUser | null = null;
const _subscribers = new Set<() => void>();


function notifyAll() {
  _subscribers.forEach((cb) => cb());
}


async function tryRefresh(): Promise<boolean> {
  if (!API) return false;
  try {
    const r = await fetch(`${API}/api/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (!r.ok) return false;
    const data = await r.json();
    _memoryToken = data.access_token || null;
    _memoryUser = data.user || null;
    notifyAll();
    return true;
  } catch {
    return false;
  }
}


async function fetchMe(): Promise<KudosUser | null> {
  if (!API || !_memoryToken) return null;
  try {
    const r = await fetch(`${API}/api/auth/me`, {
      headers: { Authorization: `Bearer ${_memoryToken}` },
    });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}


export function useAuth(): AuthState & {
  signOut: () => Promise<void>;
  refresh: () => Promise<boolean>;
  authedFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
} {
  const [, force] = React.useReducer((x: number) => x + 1, 0);

  React.useEffect(() => {
    _subscribers.add(force);
    return () => { _subscribers.delete(force); };
  }, []);

  // Cold start: intentar refresh + me
  React.useEffect(() => {
    let alive = true;
    (async () => {
      if (_memoryToken) {
        if (!_memoryUser) {
          const u = await fetchMe();
          if (alive && u) { _memoryUser = u; notifyAll(); }
        }
        return;
      }
      const ok = await tryRefresh();
      if (!alive) return;
      if (!ok) {
        _memoryUser = null;
        notifyAll();
      }
    })();
    return () => { alive = false; };
  }, []);

  const signOut = React.useCallback(async () => {
    if (API) {
      try { await fetch(`${API}/api/auth/logout`, { method: "POST", credentials: "include" }); } catch {}
    }
    _memoryToken = null;
    _memoryUser = null;
    notifyAll();
    // Tambien limpia sesion NextAuth
    try {
      const r = await fetch("/api/auth/signout", { method: "POST", credentials: "include" });
      void r;
    } catch {}
    if (typeof window !== "undefined") window.location.href = "/inicio";
  }, []);

  const refresh = React.useCallback(tryRefresh, []);

  /** Wrapper que anade Bearer + reintenta una vez tras 401. */
  const authedFetch = React.useCallback(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const headers = new Headers(init.headers || {});
    if (_memoryToken) headers.set("Authorization", `Bearer ${_memoryToken}`);
    const merged: RequestInit = { ...init, headers, credentials: init.credentials || "include" };
    let r = await fetch(input, merged);
    if (r.status === 401 && _memoryToken) {
      const ok = await tryRefresh();
      if (ok && _memoryToken) {
        headers.set("Authorization", `Bearer ${_memoryToken}`);
        r = await fetch(input, { ...merged, headers });
      }
    }
    return r;
  }, []);

  return {
    user: _memoryUser,
    accessToken: _memoryToken,
    loading: false,
    signOut,
    refresh,
    authedFetch,
  };
}
