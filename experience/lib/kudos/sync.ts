/**
 * KUDOS . sincronizacion fire-and-forget store <-> backend Django.
 *
 * El store local (lib/kudos/store.ts) escribe sincronamente a
 * localStorage. Esta capa anade un envio opcional al backend en
 * background. La escritura local NUNCA espera a la red.
 *
 * Garantias:
 *   . Si NEXT_PUBLIC_API_BASE_URL no esta configurada -> no-op.
 *   . Si la red falla -> no-op (la escritura local ya esta hecha).
 *   . Nunca bloquea ni lanza.
 */

import * as api from "@/lib/api";
import type { MeritEvent, SavedItem } from "./store";

type SyncAction =
  | { kind: "meritEvent"; event: MeritEvent }
  | {
      kind: "savedToggle";
      itemKind: SavedItem["kind"];
      id: string;
      nowSaved: boolean;
      note?: string;
    }
  | { kind: "visit"; placeId: string }
  | { kind: "tickStreak" };

/**
 * Fire-and-forget . NUNCA bloquea ni lanza.
 *
 * Si el backend no esta disponible (env var ausente, red caida,
 * sesion expirada), la llamada es silenciosa y la app sigue
 * funcionando con localStorage.
 */
export function syncToBackend(action: SyncAction): void {
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.info("[KUDOS sync] dispatch:", action);
  }
  if (!api.isApiAvailable()) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn("[KUDOS sync] API no disponible . skip");
    }
    return;
  }

  // Detach del flujo principal . las escrituras locales no esperan
  // al I/O de red.
  queueMicrotask(() => {
    void executeSync(action);
  });
}

async function executeSync(action: SyncAction): Promise<void> {
  try {
    switch (action.kind) {
      case "meritEvent": {
        const result = await api.postMeritEvent({
          pillar: action.event.pillar,
          points: action.event.points,
          label: action.event.label,
          capsule_id: action.event.capsuleId,
          place_id: action.event.poiId,
        });
        if (process.env.NODE_ENV !== "production") {
          // eslint-disable-next-line no-console
          console.info("[KUDOS sync] meritEvent result:", result);
        }
        return;
      }
      case "savedToggle": {
        const apiKind: "capsule" | "poi" =
          action.itemKind === "poi" ? "poi" : "capsule";
        let result;
        if (action.nowSaved) {
          result = await api.postBookmark({
            kind: apiKind,
            target_id: action.id,
            note: action.note,
          });
        } else {
          result = await api.deleteBookmark({
            kind: apiKind,
            target_id: action.id,
          });
        }
        if (process.env.NODE_ENV !== "production") {
          // eslint-disable-next-line no-console
          console.info("[KUDOS sync] savedToggle result:", result);
        }
        return;
      }
      case "visit": {
        const result = await api.postVisit({ place_id: action.placeId });
        if (process.env.NODE_ENV !== "production") {
          // eslint-disable-next-line no-console
          console.info("[KUDOS sync] visit result:", result);
        }
        return;
      }
      case "tickStreak": {
        // Backend avanza la racha automaticamente con cada
        // postMeritEvent. No hay llamada explicita.
        return;
      }
    }
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.error("[KUDOS sync] error:", err);
    }
  }
}
