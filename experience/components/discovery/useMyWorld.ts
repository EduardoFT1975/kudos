"use client";
/**
 * KUDOS HDG · hook useMyWorld.
 *
 * Abstrae lectura/escritura de "Añadir a Mi Mundo":
 *   - Si NEXT_PUBLIC_KUDOS_API_URL está · API real (POST /api/save · GET /api/save/user/{uid})
 *   - Si no · localStorage como fallback (kudos:my_world)
 *
 * Devuelve: { saves, isInMyWorld, add, remove, count, loading }
 */
import * as React from "react";


const API = process.env.NEXT_PUBLIC_KUDOS_API_URL || "";


function getUserId(): string {
  if (typeof window === "undefined") return "anon";
  let id = localStorage.getItem("kudos:anon_id");
  if (!id) {
    id = "anon-" + Math.random().toString(36).slice(2, 12);
    localStorage.setItem("kudos:anon_id", id);
  }
  return id;
}


function readLocal(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("kudos:my_world") || "[]";
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}


function writeLocal(saves: string[]) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem("kudos:my_world", JSON.stringify(saves)); } catch {}
}


export function useMyWorld() {
  const [saves, setSaves] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);
  const userId = getUserId();

  // Cargar al mount · prefer API, fallback local
  React.useEffect(() => {
    if (!API) {
      setSaves(readLocal());
      setLoading(false);
      return;
    }
    fetch(`${API}/api/save/user/${userId}`)
      .then((r) => r.ok ? r.json() : [])
      .then((items: any[]) => {
        if (!Array.isArray(items)) return setSaves(readLocal());
        const ids = items.map((it) => it.poi_id).filter(Boolean);
        // Sync local con backend (offline-first)
        writeLocal(ids);
        setSaves(ids);
      })
      .catch(() => setSaves(readLocal()))
      .finally(() => setLoading(false));
  }, [userId]);

  const isInMyWorld = React.useCallback(
    (poiId: string) => saves.includes(poiId),
    [saves]
  );

  const add = React.useCallback(async (poiId: string, motivation?: string) => {
    setSaves((prev) => prev.includes(poiId) ? prev : [...prev, poiId]);
    writeLocal([...saves.filter((s) => s !== poiId), poiId]);

    if (!API) return;
    try {
      await fetch(`${API}/api/save/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, poi_id: poiId, motivation }),
        keepalive: true,
      });
    } catch { /* offline · local ya guardado */ }
  }, [saves, userId]);

  const remove = React.useCallback(async (poiId: string) => {
    setSaves((prev) => prev.filter((s) => s !== poiId));
    writeLocal(saves.filter((s) => s !== poiId));

    if (!API) return;
    try {
      // Necesitamos saveId real para DELETE · MVP: buscar y borrar
      const list = await fetch(`${API}/api/save/user/${userId}`).then((r) => r.json());
      const target = Array.isArray(list) && list.find((it: any) => it.poi_id === poiId);
      if (target?.id) {
        await fetch(`${API}/api/save/${target.id}`, { method: "DELETE", keepalive: true });
      }
    } catch {}
  }, [saves, userId]);

  return { saves, isInMyWorld, add, remove, count: saves.length, loading, userId };
}
