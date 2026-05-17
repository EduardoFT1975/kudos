/* ============================================================
 * KUDOS · Mapa 5D · clustering.js
 * Marker cluster group (AXÓN D4): clustering suave + chunked loading.
 * Depende de core.js (map). Requiere Leaflet.markercluster cargado antes.
 * ============================================================ */
'use strict';

// maxClusterRadius bajo (45) → clusters suaves, no agresivos.
// disableClusteringAtZoom 14 → a partir de zoom 14 se ven todos los markers individuales.
// spiderfyOnMaxZoom + showCoverageOnHover preservan el descubrimiento.
let markersLayer = L.markerClusterGroup({
    maxClusterRadius: 45,
    disableClusteringAtZoom: 14,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    chunkedLoading: true,
    chunkInterval: 80,
    chunkDelay: 16,
    animate: true,
    animateAddingMarkers: false,
    removeOutsideVisibleBounds: true,
}).addTo(map);
