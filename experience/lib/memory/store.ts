/**
 * KUDOS Experience · Personal Memory Graph store (P0.9)
 *
 * Almacenamiento local-first de "memorias" del usuario · cápsulas que el
 * usuario marca explícitamente con "Recordar". A diferencia de
 * useSavedCapsules (que solo guarda IDs sueltos), este store persiste el
 * snapshot necesario para renderizar la memoria SIN volver al backend:
 *
 *   id              · capsule.id (UUID)
 *   title           · capsule.title
 *   factual_anchor  · la frase verificada
 *   lat / lng       · coords donde el usuario estaba al guardar
 *   savedAt         · epoch ms · drives ordering recent-first
 *
 * Diseño:
 *   - localStorage-only · cero backend · cero auth · cero coste.
 *   - SSR-safe · todos los reads/writes guardan typeof window === "undefined".
 *   - Failure-silent · localStorage lleno o bloqueado degrada a no-op.
 *   - Cross-tab sync vía StorageEvent (consumidores via useMemoryGraph).
 *   - Same-tab notification vía CustomEvent("kudos:memory:changed") · el
 *     StorageEvent NO dispara en la pestaña que escribió, por eso emitimos
 *     un evento custom adicional que el hook escucha.
 *
 * Migración futura a backend (cuando exista /api/users/me/memories/):
 *   - Wrapper sobre este store · upload pendientes al login.
 *   - Source of truth pasa a servidor · localStorage queda como cache.
 *   - Schema compatible · solo añadir `synced_at?: number`.
 *
 * NO usar para tracking de visitas implícitas · esto es para memorias
 * EXPLÍCITAS marcadas por el usuario. El equivalente "places visited"
 * automático sería otro store independiente.
 */
const _STORAGE_KEY = "kudos:memories:v1";
const _CHANGE_EVENT = "kudos:memory:changed";

export interface MemoryEntry {
  /** capsule.id (UUID) · clave primaria · unique. */
  id: string;
  /** Snapshot del nombre del lugar al momento de guardar. */
  title: string;
  /** Snapshot de la frase verificada · puede estar vacía si el backend no
   *  la devolvió. Se conserva para mostrar contexto en la lista. */
  factual_anchor: string;
  /** Coords donde el usuario estaba al guardar la memoria. Pueden ser
   *  null si la cápsula vino de un /capsules/<slug> directo sin geo. */
  lat: number | null;
  lng: number | null;
  /** epoch ms · Date.now() al momento de guardar. Orden recent-first. */
  savedAt: number;
}

/**
 * Lee TODAS las memorias del store · ordenadas recent-first.
 * SSR-safe · devuelve [] en server.
 */
export function readMemories(): MemoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Defensive · filtra entries malformadas · puede pasar si el usuario
    // edita localStorage manualmente o si migramos schema en el futuro.
    const valid: MemoryEntry[] = parsed
      .filter(_isValidEntry)
      .map((e) => e as MemoryEntry);
    // Orden estable recent-first.
    valid.sort((a, b) => b.savedAt - a.savedAt);
    return valid;
  } catch {
    return [];
  }
}

/**
 * Escribe el array entero · sobreescribe el storage. Caller es responsable
 * de pasar el array completo en el orden que quiera persistir.
 */
function _writeMemories(entries: MemoryEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(_STORAGE_KEY, JSON.stringify(entries));
    // Same-tab notification · StorageEvent no se dispara en la pestaña
    // que escribió, así que emitimos un CustomEvent adicional. El hook
    // escucha ambos (storage para cross-tab, custom para same-tab).
    window.dispatchEvent(new CustomEvent(_CHANGE_EVENT));
  } catch {
    // localStorage lleno / bloqueado / quota exceeded · degrade silently.
    // No queremos romper el flow del usuario por algo no crítico.
  }
}

/** ¿Está la memoria con este id guardada? */
export function hasMemory(id: string): boolean {
  return readMemories().some((m) => m.id === id);
}

/**
 * Guarda una memoria · si ya existe (mismo id), refresca savedAt para
 * que reaparezca arriba. Idempotente.
 */
export function saveMemory(entry: MemoryEntry): void {
  const all = readMemories();
  const filtered = all.filter((m) => m.id !== entry.id);
  _writeMemories([entry, ...filtered]);
}

/** Elimina una memoria por id. No-op si no existe. */
export function removeMemory(id: string): void {
  const all = readMemories();
  const next = all.filter((m) => m.id !== id);
  if (next.length === all.length) return; // No-op · evita escritura inútil.
  _writeMemories(next);
}

/**
 * Toggle: si existe la borra, si no la crea. Devuelve true si quedó
 * guardada, false si quedó eliminada. Pensado para el botón "Recordar".
 */
export function toggleMemory(entry: MemoryEntry): boolean {
  if (hasMemory(entry.id)) {
    removeMemory(entry.id);
    return false;
  }
  saveMemory(entry);
  return true;
}

/** Cuenta total · útil para badge en chrome global. */
export function countMemories(): number {
  return readMemories().length;
}

/**
 * Suscribe a cambios · devuelve función de unsubscribe. Llama al
 * listener tras cualquier change (storage event cross-tab OR custom
 * event same-tab). El listener NO recibe el snapshot · debe llamar a
 * readMemories() si lo necesita.
 *
 * Importante para el hook reactivo · sin esto, el usuario que guarda
 * en /aqui no vería el nuevo count actualizarse en chrome global sin
 * refrescar.
 */
export function subscribeMemoryChanges(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  const onStorage = (e: StorageEvent) => {
    if (e.key === _STORAGE_KEY) listener();
  };
  const onCustom = () => listener();

  window.addEventListener("storage", onStorage);
  window.addEventListener(_CHANGE_EVENT, onCustom);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(_CHANGE_EVENT, onCustom);
  };
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function _isValidEntry(x: unknown): x is MemoryEntry {
  if (x === null || typeof x !== "object") return false;
  const e = x as Record<string, unknown>;
  if (typeof e.id !== "string" || e.id.length === 0) return false;
  if (typeof e.title !== "string") return false;
  if (typeof e.factual_anchor !== "string") return false;
  if (typeof e.savedAt !== "number" || !isFinite(e.savedAt)) return false;
  // lat/lng pueden ser null (capsule sin geo) o number
  if (e.lat !== null && typeof e.lat !== "number") return false;
  if (e.lng !== null && typeof e.lng !== "number") return false;
  return true;
}
