/* ============================================================
 * KUDOS · Mapa 5D · mobile.js
 * Geolocalización + marcador de usuario.
 * Depende de core.js (map).
 * ============================================================ */
'use strict';

let userMarker = null;
let userCircle = null;

function locateUser() {
    if (!navigator.geolocation) return;
    map.locate({ setView: true, maxZoom: 15, enableHighAccuracy: true, timeout: 10000 });
}

map.on('locationfound', (e) => {
    if (userMarker) map.removeLayer(userMarker);
    if (userCircle) map.removeLayer(userCircle);
    const dot = L.divIcon({
        className: 'user-dot',
        iconSize: [22, 22], iconAnchor: [11, 11],
        html: '<div style="width:22px;height:22px;border-radius:50%;background:radial-gradient(circle,#00f0ff,#1e3a8a);box-shadow:0 0 16px #00f0ff;border:2px solid #fff;"></div>',
    });
    userMarker = L.marker(e.latlng, { icon: dot, zIndexOffset: 1000 }).addTo(map);
    userMarker.bindTooltip('📍 Tú estás aquí', { direction: 'top' });
    userCircle = L.circle(e.latlng, { radius: e.accuracy, color: '#00f0ff', weight: 1, fillOpacity: 0.05 }).addTo(map);
});

map.on('locationerror', () => {
    console.warn('[KUDOS Atlas] Geolocalización rechazada o no disponible.');
});
