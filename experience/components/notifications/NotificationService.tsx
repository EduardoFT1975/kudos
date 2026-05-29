"use client";
/**
 * NotificationService · KUDOS T3.2 EJEC Day 18.
 *
 * Notificaciones MINIMAS, alineadas con disciplina KUDOS:
 *   1. CORE DEL DIA · una vez al dia, 09:00 local
 *   2. SHIFT REVISIT · T+7 dias del shift original (recordatorio para revisitar)
 *
 * Implementacion 100% client-side con Notification API + setTimeout.
 * No usa servidor de push (queda congelado 90 dias).
 *
 * Reglas:
 *   - NUNCA pedimos permiso al cargar; solo cuando el usuario lo solicita.
 *   - Persistimos en localStorage `kudos:notifs:enabled` = "1" | "0" | "unknown"
 *   - Si el usuario acepta, programamos las 2 notifs.
 *   - El usuario puede desactivar en cualquier momento.
 *
 * SIN gamificacion. SIN engagement bait. Una notif al dia maximo.
 */
import * as React from "react";


const STORAGE_KEY = "kudos:notifs:enabled";
const LAST_DAILY_KEY = "kudos:notifs:lastDailyShown";  // yyyy-mm-dd local


// =========================================================================
// API publica
// =========================================================================

export type NotifStatus = "unsupported" | "denied" | "granted" | "prompt";


function isSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}


export function getNotifStatus(): NotifStatus {
  if (!isSupported()) return "unsupported";
  const p = Notification.permission;
  if (p === "granted") return "granted";
  if (p === "denied") return "denied";
  return "prompt";
}


export async function requestNotifPermission(): Promise<NotifStatus> {
  if (!isSupported()) return "unsupported";
  if (Notification.permission === "granted") {
    localStorage.setItem(STORAGE_KEY, "1");
    return "granted";
  }
  if (Notification.permission === "denied") {
    localStorage.setItem(STORAGE_KEY, "0");
    return "denied";
  }
  try {
    const r = await Notification.requestPermission();
    if (r === "granted") {
      localStorage.setItem(STORAGE_KEY, "1");
      scheduleDailyCore();
      return "granted";
    }
    localStorage.setItem(STORAGE_KEY, "0");
    return "denied";
  } catch {
    return "denied";
  }
}


export function disableNotifs() {
  localStorage.setItem(STORAGE_KEY, "0");
}


// =========================================================================
// Schedulers
// =========================================================================

/**
 * Programa el daily Core notification para las 09:00 LOCAL.
 * Si ya pasaron las 09:00 de hoy y hoy no se mostro, mostrar AHORA con delay 0.
 * Si ya se mostro hoy, programar para manana.
 */
function scheduleDailyCore() {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(STORAGE_KEY) !== "1") return;

  const todayKey = new Date().toISOString().slice(0, 10);
  const lastShown = localStorage.getItem(LAST_DAILY_KEY);

  const now = new Date();
  const target = new Date(now);
  target.setHours(9, 0, 0, 0);

  if (target.getTime() <= now.getTime()) {
    // Ya son >= 9:00
    if (lastShown !== todayKey) {
      // Mostrar ya
      showDailyCore();
      // Programar manana
      target.setDate(target.getDate() + 1);
    } else {
      // Programar manana
      target.setDate(target.getDate() + 1);
    }
  }
  // Sino, hoy todavia no son las 9:00 -> programar para hoy

  const delay = target.getTime() - Date.now();
  if (delay > 0 && delay < 2_147_483_647) {
    setTimeout(() => {
      showDailyCore();
      // re-programar manana
      scheduleDailyCore();
    }, delay);
  }
}


function showDailyCore() {
  if (!isSupported()) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification("KUDOS · Tu Core de hoy", {
      body: "Hoy hay un descubrimiento esperando. 5 minutos.",
      icon: "/icons/kudos-flower-192.png",
      tag: "kudos-core-daily",
      requireInteraction: false,
    });
    localStorage.setItem(LAST_DAILY_KEY, new Date().toISOString().slice(0, 10));
  } catch { /* tolerante */ }
}


/**
 * Programa un recordatorio T+7d para revisitar un shift especifico.
 * Llamar al completar un Core.
 */
export function scheduleShiftRevisit(poiId: string, poiTitle: string) {
  if (!isSupported() || typeof window === "undefined") return;
  if (localStorage.getItem(STORAGE_KEY) !== "1") return;
  if (Notification.permission !== "granted") return;

  // Persistimos el cuando para que sobreviva reload
  const key = `kudos:notifs:revisit:${poiId}`;
  const existing = localStorage.getItem(key);
  if (existing) return;  // ya tenemos uno programado

  const fireAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
  localStorage.setItem(key, String(fireAt));
  scheduleRevisitTimer(poiId, poiTitle, fireAt);
}


function scheduleRevisitTimer(poiId: string, poiTitle: string, fireAt: number) {
  const delay = fireAt - Date.now();
  if (delay <= 0) {
    showRevisit(poiId, poiTitle);
    localStorage.removeItem(`kudos:notifs:revisit:${poiId}`);
    return;
  }
  if (delay > 2_147_483_647) return;  // setTimeout cap, ya se reprogramara al volver
  setTimeout(() => {
    showRevisit(poiId, poiTitle);
    localStorage.removeItem(`kudos:notifs:revisit:${poiId}`);
  }, delay);
}


function showRevisit(poiId: string, poiTitle: string) {
  if (!isSupported()) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(`KUDOS · Vuelve a ${poiTitle}`, {
      body: "Han pasado 7 dias. ¿Sigue cambiandote igual?",
      icon: "/icons/kudos-flower-192.png",
      tag: `kudos-revisit-${poiId}`,
      data: { poiId },
    });
  } catch { /* tolerante */ }
}


// =========================================================================
// Bootstrap silencioso (al montar el provider)
// =========================================================================

export function NotificationServiceBootstrap() {
  React.useEffect(() => {
    if (!isSupported()) return;
    if (localStorage.getItem(STORAGE_KEY) !== "1") return;
    if (Notification.permission !== "granted") return;

    // Reprogramar daily
    scheduleDailyCore();

    // Reprogramar revisits pendientes
    Object.keys(localStorage).forEach((k) => {
      if (k.startsWith("kudos:notifs:revisit:")) {
        const poiId = k.replace("kudos:notifs:revisit:", "");
        const fireAt = parseInt(localStorage.getItem(k) || "0", 10);
        if (fireAt > 0) {
          scheduleRevisitTimer(poiId, poiId, fireAt);
        }
      }
    });
  }, []);

  return null;
}
