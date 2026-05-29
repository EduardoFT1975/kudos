/**
 * KUDOS Service Worker · T3.2 EJEC Day 22.
 *
 * Funciones:
 *   1. push handler · recibe Web Push payloads y muestra notif
 *   2. notificationclick · al pulsar, abre la URL relevante (Core/Poi)
 *   3. install/activate · minimalista, no cachea assets (queda para Día 27+)
 *
 * NO precachea nada. NO cachea API. Solo handlers de notifs.
 * Esto es deliberado: launch sin offline = launch posible y simple.
 */

const SW_VERSION = "kudos-sw-v1";


self.addEventListener("install", (event) => {
  self.skipWaiting();
});


self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});


self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = { title: "KUDOS", body: "Hay algo nuevo." };
  }

  const title = payload.title || "KUDOS";
  const options = {
    body: payload.body || "",
    icon: payload.icon || "/icons/kudos-flower-192.png",
    badge: payload.badge || "/icons/kudos-flower-96.png",
    tag: payload.tag || "kudos",
    data: payload.data || {},
    requireInteraction: false,
    silent: payload.silent === true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});


self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};

  let url = "/inicio";
  if (data.poiId) {
    // Si trae poiId, asumimos que es shift revisit -> /core/{id}
    url = `/core/${encodeURIComponent(data.poiId)}?via=push`;
  } else if (data.url) {
    url = data.url;
  } else if (event.notification.tag && event.notification.tag.startsWith("kudos-core-daily")) {
    url = "/inicio?via=push";
  }

  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of clients) {
      if (client.url.includes(url) && "focus" in client) {
        return client.focus();
      }
    }
    if (self.clients.openWindow) {
      return self.clients.openWindow(url);
    }
  })());
});


// pushsubscriptionchange (raro pero necesario para tokens rotados)
self.addEventListener("pushsubscriptionchange", (event) => {
  // Aqui idealmente re-suscribir y enviar al backend.
  // MVP: dejamos que el cliente lo detecte al abrir y vuelva a llamar /api/push/subscribe.
});
