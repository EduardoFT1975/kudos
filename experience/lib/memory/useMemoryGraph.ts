"use client";

/**
 * KUDOS Experience · useMemoryGraph (P0.9)
 *
 * React hook reactivo sobre el memory store de localStorage. Garantiza:
 *   1. SSR-safe · `entries` empieza como [] · se hidrata client-side.
 *   2. Reactivo a writes en cualquier pestaña (StorageEvent) + writes
 *      en la misma pestaña (CustomEvent emitido por el store).
 *   3. Identidad estable de callbacks · `toggle/save/remove` se pueden
 *      usar en deps de useEffect sin churn.
 *
 * API:
 *   entries   · MemoryEntry[] recent-first · estable entre renders salvo
 *               que el store cambie
 *   count     · entries.length · útil para badge en chrome
 *   hydrated  · false en SSR + primer render client · true tras useEffect
 *               de hidratación · permite skip render hasta que sea correcto
 *   isSaved   · (id) → boolean
 *   toggle    · (entry) → boolean (true=saved, false=removed)
 *   save      · (entry) → void
 *   remove    · (id) → void
 *
 * El hook NO acepta filtros · si necesitas filtros derívalos del array.
 * Mantenerlo simple maximiza reuso y reduce sorpresas.
 */
import * as React from "react";
import {
  readMemories,
  hasMemory,
  saveMemory,
  removeMemory,
  toggleMemory,
  subscribeMemoryChanges,
  type MemoryEntry,
} from "./store";

export interface UseMemoryGraphHandle {
  entries: MemoryEntry[];
  count: number;
  hydrated: boolean;
  isSaved: (id: string) => boolean;
  toggle: (entry: MemoryEntry) => boolean;
  save: (entry: MemoryEntry) => void;
  remove: (id: string) => void;
}

export function useMemoryGraph(): UseMemoryGraphHandle {
  const [entries, setEntries] = React.useState<MemoryEntry[]>([]);
  const [hydrated, setHydrated] = React.useState(false);

  // Hidratación inicial · evita SSR mismatch · SSR siempre devuelve [].
  React.useEffect(() => {
    setEntries(readMemories());
    setHydrated(true);
  }, []);

  // Suscripción a cambios · cross-tab (storage) + same-tab (custom).
  React.useEffect(() => {
    const unsub = subscribeMemoryChanges(() => {
      setEntries(readMemories());
    });
    return unsub;
  }, []);

  // Callbacks estables · refs internas para que la identidad no cambie
  // entre renders salvo que algo realmente cambie. Hooks importantes que
  // las APIs `toggle/save/remove` no causen re-renders en consumidores
  // que las usan como deps.
  const isSaved = React.useCallback(
    (id: string) => entries.some((e) => e.id === id),
    [entries],
  );

  const toggle = React.useCallback((entry: MemoryEntry): boolean => {
    return toggleMemory(entry);
    // El subscribeMemoryChanges → setEntries actualiza el state. No
    // necesitamos optimistic update porque el evento es síncrono y la
    // re-render llega en el mismo tick.
  }, []);

  const save = React.useCallback((entry: MemoryEntry): void => {
    saveMemory(entry);
  }, []);

  const remove = React.useCallback((id: string): void => {
    removeMemory(id);
  }, []);

  return {
    entries,
    count: entries.length,
    hydrated,
    isSaved,
    toggle,
    save,
    remove,
  };
}

/**
 * Helper · re-export del tipo para que los call-sites no necesiten
 * importar también desde ./store directamente. El hook + el tipo viven
 * en el mismo módulo desde la perspectiva de un consumer.
 */
export type { MemoryEntry } from "./store";
