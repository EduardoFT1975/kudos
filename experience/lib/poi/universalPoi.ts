/**
 * KUDOS · UniversalPOI · T7.3
 *
 * Modelo único de POI. Regla absoluta: todo en KUDOS ocurre sobre un POI.
 * Coliseo, restaurante, biblioteca, mirador, "la banca del parque del abuelo".
 * Mismo modelo, distinto contenido.
 *
 * Persistencia Fase 1: localStorage. Sin backend. Sin cuentas.
 * Migración futura a Postgres cuando el feature flag lo permita.
 *
 * NO incluye: legacy, familia verificada, geofence push, herencia.
 * Solo: capacidad de crear POI + asociar cápsulas privadas/futuras.
 */


// ─── TIPOS ────────────────────────────────────────────────────────────────

export type PoiSource = "wikidata" | "osm" | "system" | "user";

export type CapsuleAudience =
  | "private"   // solo el creador
  | "friends"   // amigos verificados (futuro, ahora placeholder)
  | "family"    // familia verificada (futuro)
  | "public"    // visible para cualquiera (futuro, requiere moderación)
  | "legacy";   // herencia digital (futuro)

export interface Era {
  id: string;
  label: string;        // "80 d.C." | "1500" | "Hoy"
  year?: number;
  image_url?: string;
  description?: string;
}

export interface Capsule {
  id: string;
  poi_id: string;
  creator_id: string;        // anon-id local en Fase 1
  audience: CapsuleAudience;
  content: string;           // texto del mensaje
  media_url?: string;        // opcional, futuro
  created_at: string;        // ISO
  unlock_at?: string;        // ISO · null = abierta ya
  opened_at?: string;        // ISO · null = no abierta aún
}

export interface UniversalPOI {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category?: string;
  source: PoiSource;

  // Contenido editorial opcional
  capsule_main?: Capsule;
  eras?: Era[];

  // Metadatos del POI personal (si source === "user")
  created_by?: string;       // anon-id local
  created_at?: string;       // ISO
  notes?: string;            // nota privada del usuario sobre el lugar
}


// ─── localStorage KEYS ────────────────────────────────────────────────────

const LS_USER_POIS = "kudos:upoi:user_pois:v1";
const LS_CAPSULES  = "kudos:upoi:capsules:v1";
const LS_ANON_ID   = "kudos:upoi:anon_id:v1";


// ─── Anon ID (Fase 1: sin cuentas reales) ─────────────────────────────────

export function getAnonId(): string {
  if (typeof window === "undefined") return "anon-ssr";
  let id = window.localStorage.getItem(LS_ANON_ID);
  if (!id) {
    id = "anon-" + Math.random().toString(36).slice(2, 10) + "-" + Date.now().toString(36);
    try { window.localStorage.setItem(LS_ANON_ID, id); } catch { /* ignore */ }
  }
  return id;
}


// ─── POIs PERSONALES (source: "user") ─────────────────────────────────────

export function loadUserPois(): UniversalPOI[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LS_USER_POIS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidPoi);
  } catch {
    return [];
  }
}

export function saveUserPoi(poi: Omit<UniversalPOI, "id" | "source" | "created_by" | "created_at"> & { id?: string }): UniversalPOI {
  const existing = loadUserPois();
  const id = poi.id || "upoi-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6);
  const full: UniversalPOI = {
    id,
    name: poi.name,
    lat: poi.lat,
    lng: poi.lng,
    category: poi.category,
    source: "user",
    created_by: getAnonId(),
    created_at: new Date().toISOString(),
    notes: poi.notes,
  };
  const idx = existing.findIndex((p) => p.id === id);
  if (idx >= 0) existing[idx] = full;
  else existing.push(full);
  try {
    window.localStorage.setItem(LS_USER_POIS, JSON.stringify(existing));
  } catch { /* ignore quota */ }
  return full;
}

export function deleteUserPoi(poi_id: string): void {
  if (typeof window === "undefined") return;
  const remaining = loadUserPois().filter((p) => p.id !== poi_id);
  try {
    window.localStorage.setItem(LS_USER_POIS, JSON.stringify(remaining));
  } catch { /* ignore */ }
}

function isValidPoi(p: any): p is UniversalPOI {
  return (
    p &&
    typeof p.id === "string" &&
    typeof p.name === "string" &&
    typeof p.lat === "number" &&
    typeof p.lng === "number"
  );
}


// ─── CÁPSULAS ─────────────────────────────────────────────────────────────

export function loadAllCapsules(): Capsule[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LS_CAPSULES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isValidCapsule) : [];
  } catch {
    return [];
  }
}

export function loadCapsulesForPoi(poi_id: string): Capsule[] {
  return loadAllCapsules().filter((c) => c.poi_id === poi_id);
}

export function saveCapsule(input: Omit<Capsule, "id" | "creator_id" | "created_at"> & { id?: string }): Capsule {
  const all = loadAllCapsules();
  const id = input.id || "cap-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6);
  const full: Capsule = {
    id,
    poi_id: input.poi_id,
    creator_id: getAnonId(),
    audience: input.audience,
    content: input.content,
    media_url: input.media_url,
    created_at: new Date().toISOString(),
    unlock_at: input.unlock_at,
    opened_at: input.opened_at,
  };
  const idx = all.findIndex((c) => c.id === id);
  if (idx >= 0) all[idx] = full;
  else all.push(full);
  try {
    window.localStorage.setItem(LS_CAPSULES, JSON.stringify(all));
  } catch { /* ignore */ }
  return full;
}

export function deleteCapsule(capsule_id: string): void {
  if (typeof window === "undefined") return;
  const remaining = loadAllCapsules().filter((c) => c.id !== capsule_id);
  try {
    window.localStorage.setItem(LS_CAPSULES, JSON.stringify(remaining));
  } catch { /* ignore */ }
}

export function markCapsuleOpened(capsule_id: string): void {
  if (typeof window === "undefined") return;
  const all = loadAllCapsules();
  const cap = all.find((c) => c.id === capsule_id);
  if (!cap) return;
  cap.opened_at = new Date().toISOString();
  try {
    window.localStorage.setItem(LS_CAPSULES, JSON.stringify(all));
  } catch { /* ignore */ }
}

function isValidCapsule(c: any): c is Capsule {
  return (
    c &&
    typeof c.id === "string" &&
    typeof c.poi_id === "string" &&
    typeof c.content === "string"
  );
}


// ─── HELPERS DE ESTADO DE CÁPSULA ─────────────────────────────────────────

export function isCapsuleUnlocked(c: Capsule): boolean {
  if (!c.unlock_at) return true;
  return new Date(c.unlock_at).getTime() <= Date.now();
}

export function unlockedCapsules(caps: Capsule[]): Capsule[] {
  return caps.filter(isCapsuleUnlocked);
}

export function pendingCapsules(caps: Capsule[]): Capsule[] {
  return caps.filter((c) => !isCapsuleUnlocked(c));
}
