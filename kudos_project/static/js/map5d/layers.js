/* ============================================================
 * KUDOS · Mapa 5D · layers.js
 * Tile layers + cambio de tile (dark / osm / satellite / terrain).
 * Depende de core.js (map).
 * ============================================================ */
'use strict';

const TILE_LAYERS = {
    dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '© CARTO © OpenStreetMap', maxZoom: 19, subdomains: 'abcd'
    }),
    osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap', maxZoom: 19
    }),
    satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '© Esri', maxZoom: 19
    }),
    terrain: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenTopoMap', maxZoom: 17
    }),
};

let activeTile = TILE_LAYERS.dark.addTo(map);

function setTile(name) {
    map.removeLayer(activeTile);
    activeTile = TILE_LAYERS[name].addTo(map);
    STATE.tile = name;
    // Mantiene el filtro hue-rotate cyan en tiles vectoriales; lo quita en raster realista.
    document.getElementById('map').style.filter =
      (name === 'satellite' || name === 'terrain') ? 'none' : 'hue-rotate(190deg) saturate(.8) brightness(.85)';
}
