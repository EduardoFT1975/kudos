"use client";

/**
 * KUDOS Experience · useSavedCapsules
 *
 * Persistencia mínima de cápsulas guardadas en localStorage. Sin backend.
 * Sincroniza entre pestañas vía storage event. Migra a AXÓN en el futuro
 * (POST /api/users/me/bookmarks/) sin tocar los call-sites.
 */
import * as React from "react";

const STORAGE_KEY = "kudos:saved:capsules";

function readSaved(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

function writeSaved(set: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // localStorage lleno o bloqueado · no es crítico.
  }
}

export function useSavedCapsules() {
  const [saved, setSaved] = React.useState<Set<string>>(() => new Set());
  const [hydrated, setHydrated] = React.useState(false);

  // Hidratación cliente-side (evita mismatch SSR).
  React.useEffect(() => {
    setSaved(readSaved());
    setHydrated(true);
  }, []);

  // Sync entre pestañas.
  React.useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setSaved(readSaved());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const isSaved = React.useCallback(
    (slug: string) => saved.has(slug),
    [saved]
  );

  const toggleSaved = React.useCallback((slug: string): boolean => {
    let nowSaved = false;
    setSaved((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
        nowSaved = false;
      } else {
        next.add(slug);
        nowSaved = true;
      }
      writeSaved(next);
      return next;
    });
    return nowSaved;
  }, []);

  return { isSaved, toggleSaved, hydrated, count: saved.size };
}
