"use client";
/**
 * KUDOS HDG hook useMyWorld - T1.4 refactor.
 *
 * Modos:
 *   - Auth + API: lee/escribe Postgres via /api/save/* con JWT Bearer.
 *   - Anon + API: lee localStorage. Las escrituras NO van al server (require auth).
 *   - Sin API: localStorage puro.
 *
 * Trigger migracion anon -> auth tras login:
 *   Cuando user pasa de null a no-null, llama POST /api/save/migrate-anon
 *   con localStorage:kudos:my_world y vacia localStorage tras OK.
 *
 * Devuelve: { saves, isInMyWorld, add, remove, count, loading, userId }
 */
import * as React from "react";
import { useAuth } from "@/components/auth/useAuth";


const API = process.env.NEXT_PUBLIC_KUDOS_API_URL || "";


function readLocal(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("kudos:my_world") || "[]";
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch { return []; }
}

function writeLocal(saves: string[]) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem("kudos:my_world", JSON.stringify(saves)); } catch {}
}


export function useMyWorld() {
  const { user, authedFetch } = useAuth();
  const [saves, setSaves] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);
  const lastUserIdRef = React.useRef<string | null>(null);

  const userId = user?.id || (typeof window !== "undefined" ?
    (localStorage.getItem("kudos:anon_id") || (() => {
      const id = "anon-" + Math.random().toString(36).slice(2, 12);
      localStorage.setItem("kudos:anon_id", id);
      return id;
    })()) : "anon");

  // Cargar saves (auth -> API, anon -> local)
  const loadSaves = React.useCallback(async () => {
    setLoading(true);
    if (user && API) {
      try {
        const r = await authedFetch(`${API}/api/save/user/me?limit=200`);
        if (r.ok) {
          const items = await r.json();
          const ids = Array.isArray(items) ? items.map((it: any) => it.poi_id).filter(Boolean) : [];
          setSaves(ids);
          writeLocal(ids);     // espejo local para offline
          setLoading(false);
          return;
        }
      } catch { /* fall through */ }
    }
    setSaves(readLocal());
    setLoading(false);
  }, [user, authedFetch]);

  React.useEffect(() => { void loadSaves(); }, [loadSaves]);

  // ===== Migracion anon -> auth tras login =====
  React.useEffect(() => {
    if (!user || !API) return;
    if (lastUserIdRef.current === user.id) return;
    lastUserIdRef.current = user.id;

    const localItems = readLocal();
    if (localItems.length === 0) return;

    const payload = {
      saves: localItems.map((poi_id) => ({ poi_id, collection_type: "personal" })),
    };
    void (async () => {
      try {
        const r = await authedFetch(`${API}/api/save/migrate-anon`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (r.ok) {
          // No vaciamos localStorage por seguridad: queda como cache offline.
          await loadSaves();
        }
      } catch { /* silent */ }
    })();
  }, [user, authedFetch, loadSaves]);

  const isInMyWorld = React.useCallback((poiId: string) => saves.includes(poiId), [saves]);

  const add = React.useCallback(async (poiId: string, motivation?: string) => {
    setSaves((prev) => prev.includes(poiId) ? prev : [...prev, poiId]);
    writeLocal([...saves.filter((s) => s !== poiId), poiId]);

    if (!user || !API) return;     // anon: solo local
    try {
      await authedFetch(`${API}/api/save/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ poi_id: poiId, motivation }),
        keepalive: true,
      });
    } catch {}
  }, [user, saves, authedFetch]);

  const remove = React.useCallback(async (poiId: string) => {
    setSaves((prev) => prev.filter((s) => s !== poiId));
    writeLocal(saves.filter((s) => s !== poiId));

    if (!user || !API) return;
    try {
      // Buscar el save por poi_id y borrar (endpoint /user/me devuelve id)
      const list = await authedFetch(`${API}/api/save/user/me?limit=200`).then((r) => r.ok ? r.json() : []);
      const target = Array.isArray(list) && list.find((it: any) => it.poi_id === poiId);
      if (target?.id) {
        await authedFetch(`${API}/api/save/${target.id}`, { method: "DELETE", keepalive: true });
      }
    } catch {}
  }, [user, saves, authedFetch]);

  return { saves, isInMyWorld, add, remove, count: saves.length, loading, userId };
}
