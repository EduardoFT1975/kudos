/**
 * KUDOS HDG · helper envío eventos · Capa 1 Discovery Event Engine.
 *
 * Funciona offline-first:
 *   - Si la API v2 está activa (NEXT_PUBLIC_KUDOS_API_URL), envía POST
 *   - Si no, mete en buffer localStorage para enviar después
 *
 * Genera anonymous_id en localStorage para tracking sin login.
 */

const API_BASE = process.env.NEXT_PUBLIC_KUDOS_API_URL || "";
const BUFFER_KEY = "kudos:telemetry:buffer";
const ANON_KEY = "kudos:anon_id";
const SESSION_KEY = "kudos:session_id";


function getAnonId(): string {
  if (typeof window === "undefined") return "anon";
  let id = localStorage.getItem(ANON_KEY);
  if (!id) {
    id = "anon-" + Math.random().toString(36).slice(2, 12);
    localStorage.setItem(ANON_KEY, id);
  }
  return id;
}

function getSessionId(): string {
  if (typeof window === "undefined") return "sess";
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = "sess-" + Date.now().toString(36);
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}


export interface TelemetryEventPayload {
  event: string;
  poi_id?: string;
  capsule_id?: string;
  scroll_depth?: number;
  duration_ms?: number;
  exploration_chain?: string[];
  motivation?: string;
  resonance?: string;
  memory_response?: string;
  properties?: Record<string, any>;
}


export async function trackEvent(payload: TelemetryEventPayload): Promise<void> {
  if (typeof window === "undefined") return;

  const full = {
    ...payload,
    user_id: getAnonId(),
    session_id: getSessionId(),
    timestamp: new Date().toISOString(),
  };

  if (!API_BASE) {
    // Sin API · bufferizar en localStorage para flush futuro
    try {
      const buf = JSON.parse(localStorage.getItem(BUFFER_KEY) || "[]");
      buf.push(full);
      // Cap buffer a 500 eventos
      if (buf.length > 500) buf.shift();
      localStorage.setItem(BUFFER_KEY, JSON.stringify(buf));
    } catch {}
    return;
  }

  // API disponible · envío fire-and-forget
  try {
    await fetch(`${API_BASE}/api/telemetry/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(full),
      keepalive: true,    // permite enviar al hacer unload
    });
  } catch {
    // Si falla, bufferizar
    try {
      const buf = JSON.parse(localStorage.getItem(BUFFER_KEY) || "[]");
      buf.push(full);
      localStorage.setItem(BUFFER_KEY, JSON.stringify(buf));
    } catch {}
  }
}


export async function flushBuffer(): Promise<number> {
  if (typeof window === "undefined" || !API_BASE) return 0;
  try {
    const buf = JSON.parse(localStorage.getItem(BUFFER_KEY) || "[]");
    if (buf.length === 0) return 0;
    const res = await fetch(`${API_BASE}/api/telemetry/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: buf }),
      keepalive: true,
    });
    if (res.ok) {
      localStorage.removeItem(BUFFER_KEY);
      return buf.length;
    }
  } catch {}
  return 0;
}


// Auto-flush al cargar página (si quedaron eventos en buffer)
if (typeof window !== "undefined") {
  setTimeout(() => { flushBuffer().catch(() => {}); }, 2000);
}


// ─── Eventos canónicos · helpers tipados ─────────────────────────────

export const Track = {
  poiView:           (poi_id: string) => trackEvent({ event: "poi_view", poi_id }),
  poiClick:          (poi_id: string) => trackEvent({ event: "poi_click", poi_id }),
  nodeOpen:          (poi_id: string) => trackEvent({ event: "node_open", poi_id }),
  scrollDepth:       (poi_id: string, depth: number) => trackEvent({ event: "scroll_depth", poi_id, scroll_depth: depth }),
  capsulePlay:       (capsule_id: string, poi_id?: string) => trackEvent({ event: "capsule_play", capsule_id, poi_id }),
  capsuleComplete:   (capsule_id: string, poi_id?: string) => trackEvent({ event: "capsule_complete", capsule_id, poi_id }),
  addedToMyWorld:    (poi_id: string, motivation?: string) => trackEvent({ event: "added_to_my_world", poi_id, motivation }),
  removedFromMyWorld:(poi_id: string) => trackEvent({ event: "removed_from_my_world", poi_id }),
  resonance:         (poi_id: string, resonance: string) => trackEvent({ event: "resonance", poi_id, resonance }),
  motivationCaptured:(poi_id: string, motivation: string) => trackEvent({ event: "motivation_captured", poi_id, motivation }),
  memoryConfirmed:   (poi_id: string) => trackEvent({ event: "memory_confirmed", poi_id, memory_response: "still_relevant" }),
  memoryReleased:    (poi_id: string) => trackEvent({ event: "memory_released", poi_id, memory_response: "released" }),
  memoryRevisited:   (poi_id: string) => trackEvent({ event: "memory_revisited", poi_id, memory_response: "revisit" }),
};

// ─── Auto-saneamiento defensivo al cargar el módulo ─────────────────
function sanitizeLocalStorage(): number {
  if (typeof window === "undefined") return 0;
  let cleaned = 0;
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith("kudos:")) continue;
      const v = localStorage.getItem(k);
      if (!v) continue;
      if (v.startsWith("[") || v.startsWith("{")) {
        try { JSON.parse(v); }
        catch { toRemove.push(k); cleaned++; }
      }
    }
    toRemove.forEach((k) => localStorage.removeItem(k));
  } catch {}
  return cleaned;
}

if (typeof window !== "undefined") {
  setTimeout(() => {
    const n = sanitizeLocalStorage();
    if (n > 0) console.warn(`[kudos] saneadas ${n} claves localStorage corruptas`);
  }, 1500);
}

