"use client";
/**
 * NotificationService - KUDOS T3.2 EJEC Day 18 (+Day 22 Web Push).
 *
 * Notificaciones MINIMAS:
 *   1. CORE DEL DIA - 09:00 local, 1/dia max
 *   2. SHIFT REVISIT - T+7d tras completar Core
 *
 * Day 22: + Service Worker register + Web Push opt-in si VAPID configurado.
 */
import * as React from "react";


const STORAGE_KEY = "kudos:notifs:enabled";
const LAST_DAILY_KEY = "kudos:notifs:lastDailyShown";
const PUSH_SUB_KEY = "kudos:push:subscribedEndpoint";
const SW_PATH = "/kudos-sw.js";
const API = process.env.NEXT_PUBLIC_KUDOS_API_URL || "";


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


async function registerSW(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined") return null;
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register(SW_PATH, { scope: "/" });
  } catch {
    return null;
  }
}


function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}


async function subscribeToPushIfConfigured(reg: ServiceWorkerRegistration | null) {
  if (!reg || !API) return;
  if (typeof window === "undefined") return;
  if (!("PushManager" in window)) return;

  let publicKey = "";
  try {
    const r = await fetch(`${API}/api/push/vapid-public`);
    if (!r.ok) return;
    const j = await r.json();
    if (!j.configured || !j.public_key) return;
    publicKey = j.public_key;
  } catch { return; }

  try {
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });
    }
    const json = sub.toJSON() as any;
    if (!json.endpoint || !json.keys) return;
    const sid = sessionStorage.getItem("kudos:session") || "";
    await fetch(`${API}/api/push/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Session-Id": sid },
      credentials: "include",
      body: JSON.stringify({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
        locale: navigator.language || "es",
      }),
    });
    localStorage.setItem(PUSH_SUB_KEY, json.endpoint);
  } catch { /* tolerante */ }
}


async function unsubscribePush() {
  if (typeof window === "undefined") return;
  const ep = localStorage.getItem(PUSH_SUB_KEY);
  if (!ep || !API) return;
  try {
    await fetch(`${API}/api/push/unsubscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: ep }),
    });
  } catch { /* tolerante */ }
  localStorage.removeItem(PUSH_SUB_KEY);
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    const sub = await reg?.pushManager?.getSubscription();
    await sub?.unsubscribe();
  } catch { /* tolerante */ }
}


export async function requestNotifPermission(): Promise<NotifStatus> {
  if (!isSupported()) return "unsupported";
  if (Notification.permission === "granted") {
    localStorage.setItem(STORAGE_KEY, "1");
    const reg = await registerSW();
    void subscribeToPushIfConfigured(reg);
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
      const reg = await registerSW();
      void subscribeToPushIfConfigured(reg);
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
  void unsubscribePush();
}


function scheduleDailyCore() {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(STORAGE_KEY) !== "1") return;

  const todayKey = new Date().toISOString().slice(0, 10);
  const lastShown = localStorage.getItem(LAST_DAILY_KEY);

  const now = new Date();
  const target = new Date(now);
  target.setHours(9, 0, 0, 0);

  if (target.getTime() <= now.getTime()) {
    if (lastShown !== todayKey) {
      showDailyCore();
    }
    target.setDate(target.getDate() + 1);
  }

  const delay = target.getTime() - Date.now();
  if (delay > 0 && delay < 2_147_483_647) {
    setTimeout(() => {
      showDailyCore();
      scheduleDailyCore();
    }, delay);
  }
}


function showDailyCore() {
  if (!isSupported()) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification("KUDOS - Tu Core de hoy", {
      body: "Hoy hay un descubrimiento esperando. 5 minutos.",
      icon: "/icons/kudos-flower-192.png",
      tag: "kudos-core-daily",
    });
    localStorage.setItem(LAST_DAILY_KEY, new Date().toISOString().slice(0, 10));
  } catch { /* tolerante */ }
}


export function scheduleShiftRevisit(poiId: string, poiTitle: string) {
  if (!isSupported() || typeof window === "undefined") return;
  if (localStorage.getItem(STORAGE_KEY) !== "1") return;
  if (Notification.permission !== "granted") return;

  const key = `kudos:notifs:revisit:${poiId}`;
  const existing = localStorage.getItem(key);
  if (existing) return;

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
  if (delay > 2_147_483_647) return;
  setTimeout(() => {
    showRevisit(poiId, poiTitle);
    localStorage.removeItem(`kudos:notifs:revisit:${poiId}`);
  }, delay);
}


function showRevisit(poiId: string, poiTitle: string) {
  if (!isSupported()) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(`KUDOS - Vuelve a ${poiTitle}`, {
      body: "Han pasado 7 dias. Sigue cambiandote igual?",
      icon: "/icons/kudos-flower-192.png",
      tag: `kudos-revisit-${poiId}`,
      data: { poiId },
    });
  } catch { /* tolerante */ }
}


export function NotificationServiceBootstrap() {
  React.useEffect(() => {
    if (!isSupported()) return;
    if (localStorage.getItem(STORAGE_KEY) !== "1") return;
    if (Notification.permission !== "granted") return;

    scheduleDailyCore();

    Object.keys(localStorage).forEach((k) => {
      if (k.startsWith("kudos:notifs:revisit:")) {
        const poiId = k.replace("kudos:notifs:revisit:", "");
        const fireAt = parseInt(localStorage.getItem(k) || "0", 10);
        if (fireAt > 0) {
          scheduleRevisitTimer(poiId, poiId, fireAt);
        }
      }
    });

    (async () => {
      const reg = await registerSW();
      void subscribeToPushIfConfigured(reg);
    })();
  }, []);
  return null;
}
