/* ============================================================
 * KUDOS · Mapa 5D · core.js
 * STATE global, escapeHtml, init del mapa Leaflet, refresh debounced.
 * Cargar PRIMERO (los demás módulos dependen de STATE y map).
 * Extraído de templates/map.html (D7 · 2026-05-16).
 * REGLA: 0 cambios funcionales respecto al inline original.
 * ============================================================ */
'use strict';

// ── STATE global ────────────────────────────────────────────
const STATE = {
    year: 2026,
    dimension: '',
    modo: '',
    tile: 'dark',
    view: 'map',
    capsules: [],
};

// ── Utility ─────────────────────────────────────────────────
function escapeHtml(s) {
    return String(s||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]);
}

// ── Mapa Leaflet (AXÓN D6 · opciones móviles) ──────────────
const map = L.map('map', {
    zoomControl: true,
    zoomControlOptions: { position: 'topright' },
    attributionControl: false,
    minZoom: 2,
    // Touch / pan
    tap: true,
    tapTolerance: 15,
    bounceAtZoomLimits: false,
    worldCopyJump: true,
    inertia: true,
    inertiaDeceleration: 3000,
    inertiaMaxSpeed: 1500,
    // Wheel / zoom
    wheelDebounceTime: 60,
    wheelPxPerZoomLevel: 80,
    zoomSnap: 0.5,
    zoomDelta: 0.5,
    // Animaciones (identidad KUDOS)
    fadeAnimation: true,
    zoomAnimation: true,
    markerZoomAnimation: true,
    closePopupOnClick: true,
}).setView([30, 0], 3);

function goTo(lat, lon, zoom) { map.setView([lat, lon], zoom || 4); }

// ── Fetch debounced (AXÓN D4 · bbox viewport querying) ─────
let fetchTimeout = null;
function refresh() {
    clearTimeout(fetchTimeout);
    fetchTimeout = setTimeout(_doRefresh, 250);
}

function _doRefresh() {
    const params = new URLSearchParams();
    const NOW = new Date().getFullYear();
    if (STATE.year < NOW - 5) {
        params.set('year_from', STATE.year - 50);
        params.set('year_to', STATE.year + 5);
    }
    if (STATE.dimension) params.set('dimension', STATE.dimension);
    if (STATE.modo) params.set('modo', STATE.modo);
    try {
        const b = map.getBounds();
        params.set('north', b.getNorth().toFixed(4));
        params.set('south', b.getSouth().toFixed(4));
        params.set('east',  b.getEast().toFixed(4));
        params.set('west',  b.getWest().toFixed(4));
        params.set('zoom',  String(map.getZoom()));
    } catch (e) { /* el mapa puede no estar inicializado en primera carga */ }
    const _z = (map && map.getZoom) ? map.getZoom() : 3;
    const _limit = _z < 4 ? 250 : (_z < 7 ? 500 : (_z < 11 ? 800 : 1200));
    params.set('limit', String(_limit));

    const status = document.getElementById('hud-count');
    if (status) status.textContent = '...';

    fetch('/api/capsules/5d/?' + params.toString())
        .then(r => r.json())
        .then(data => {
            STATE.capsules = data.capsules || [];
            console.log('[KUDOS Map] cápsulas recibidas:', STATE.capsules.length);
            if (!STATE.capsules.length) {
                console.warn('[KUDOS Map] respuesta vacía. Ejecuta: python manage.py import_world --enrich');
            }
            render();
        })
        .catch(err => {
            console.error('[KUDOS Map] error fetch:', err);
            if (status) status.textContent = 'ERROR';
        });
}

// ── Switcher de vista (map / galaxy / timeline) ────────────
function render() {
    document.getElementById('hud-year').textContent =
        STATE.year < 0 ? Math.abs(STATE.year) + ' a.C.' : STATE.year;
    document.getElementById('hud-dim').textContent =
        STATE.dimension ? STATE.dimension.charAt(0).toUpperCase() + STATE.dimension.slice(1) : 'Todas';
    document.getElementById('hud-view').textContent = STATE.view === 'map' ? '2D · 5D' : (STATE.view === 'galaxy' ? '🌌 Galaxia' : '📜 Timeline');

    if (STATE.view === 'map') renderMap();
    else if (STATE.view === 'galaxy') renderGalaxy();
    else renderTimeline();
}

// ── Listener viewport (AXÓN D4 · refetch en pan/zoom) ──────
map.on('moveend zoomend', () => {
    if (STATE.view === 'map') refresh();
});
