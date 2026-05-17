/* ============================================================
 * KUDOS · Mapa 5D · ui.js
 * Event listeners de UI + slider temporal + applyEraStyle + bootstrap.
 * Debe cargarse al FINAL: depende de TODOS los módulos previos.
 * ============================================================ */
'use strict';

// ── Botones de dimensión (filtro 5D · capa de realidad) ────
document.querySelectorAll('.dim-btn[data-dim]').forEach(b => {
    b.addEventListener('click', () => {
        document.querySelectorAll('.dim-btn[data-dim]').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        STATE.dimension = b.dataset.dim;
        refresh();
    });
});

// ── Pills de modo (tipo de cápsula) ────────────────────────
document.querySelectorAll('.modo-pill').forEach(p => {
    p.addEventListener('click', () => {
        document.querySelectorAll('.modo-pill').forEach(x => x.classList.remove('active'));
        p.classList.add('active');
        STATE.modo = p.dataset.modo;
        refresh();
    });
});

// ── Botones de tile (dark / osm / satellite / terrain) ─────
document.querySelectorAll('.dim-btn[data-tile]').forEach(b => {
    b.addEventListener('click', () => {
        document.querySelectorAll('.dim-btn[data-tile]').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        setTile(b.dataset.tile);
    });
});

// ── Toggle de vista (map / galaxy / timeline) ──────────────
document.querySelectorAll('.view-toggle button').forEach(b => {
    b.addEventListener('click', () => {
        document.querySelectorAll('.view-toggle button').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        STATE.view = b.dataset.view;
        render();
    });
});

// ── Slider temporal ────────────────────────────────────────
const tsRange = document.getElementById('ts-range');
const tsLabel = document.getElementById('ts-label');
if (tsRange) {
    tsRange.addEventListener('input', e => {
        STATE.year = parseInt(e.target.value, 10);
        tsLabel.textContent = STATE.year < 0 ? Math.abs(STATE.year)+' a.C.' : STATE.year;
        applyEraStyle();
    });
    tsRange.addEventListener('change', refresh);
}

function setYear(y) {
    STATE.year = y;
    if (tsRange) tsRange.value = y;
    if (tsLabel) tsLabel.textContent = y < 0 ? Math.abs(y)+' a.C.' : y;
    applyEraStyle();
    refresh();
}

// El mapa cambia de estilo según la época histórica seleccionada.
// 2026: asfalto y satélite. 1900: sepia. 1500: pergamino. -1000: parchment antiguo.
function applyEraStyle() {
    const y = STATE.year;
    const mapEl = document.getElementById('map');
    if (!mapEl) return;
    let filter, label, autoTile = null;
    if (y < -500) {
        filter = 'sepia(.9) hue-rotate(15deg) saturate(1.3) brightness(.85) contrast(1.1)';
        label = 'Antigüedad (calzadas, puertos romanos)';
        autoTile = 'terrain';
    } else if (y < 500) {
        filter = 'sepia(.7) hue-rotate(0deg) saturate(1.1) brightness(.9)';
        label = 'Edad Antigua tardía';
        autoTile = 'terrain';
    } else if (y < 1500) {
        filter = 'sepia(.5) saturate(.9) brightness(.92) contrast(1.05)';
        label = 'Edad Media (pergamino)';
        autoTile = 'terrain';
    } else if (y < 1800) {
        filter = 'sepia(.35) saturate(.95) brightness(.95)';
        label = 'Renacimiento / Moderno';
        autoTile = 'osm';
    } else if (y < 1950) {
        filter = 'grayscale(.4) sepia(.15) brightness(.95)';
        label = 'Industrial (mapas en blanco y negro)';
        autoTile = 'osm';
    } else if (y < 2010) {
        filter = 'saturate(.85) brightness(.95)';
        label = 'Siglo XX';
        autoTile = 'osm';
    } else if (y < 2030) {
        filter = 'hue-rotate(190deg) saturate(.85) brightness(.9)';
        label = 'Era actual (asfalto)';
        autoTile = 'dark';
    } else {
        filter = 'hue-rotate(280deg) saturate(1.3) brightness(.85) contrast(1.1)';
        label = 'Futuro proyectado';
        autoTile = 'dark';
    }
    if (mapEl) mapEl.style.filter = filter;
    const eraEl = document.getElementById('era-label');
    if (eraEl) eraEl.textContent = label;
    if (autoTile && autoTile !== STATE.tile) {
        // Cambiar tile automáticamente sin que el usuario tenga que hacer click
        setTile(autoTile);
        document.querySelectorAll('.dim-btn[data-tile]').forEach(b => {
            b.classList.toggle('active', b.dataset.tile === autoTile);
        });
    }
}

// ── Reproducir el viaje temporal ───────────────────────────
let playInterval = null;
function togglePlay() {
    const btn = document.getElementById('play-btn');
    if (playInterval) {
        clearInterval(playInterval);
        playInterval = null;
        btn.textContent = '▶ Reproducir';
        btn.classList.remove('playing');
    } else {
        btn.textContent = '⏸ Pausar';
        btn.classList.add('playing');
        playInterval = setInterval(() => {
            STATE.year = STATE.year >= 2050 ? -3000 : STATE.year + 25;
            tsRange.value = STATE.year;
            tsLabel.textContent = STATE.year < 0 ? Math.abs(STATE.year)+' a.C.' : STATE.year;
            refresh();
        }, 800);
    }
}

// ── Buscador (input + botón locate) ────────────────────────
const searchInput = document.getElementById('search-input');
const locateBtn = document.getElementById('locate-btn');
let searchTimer = null;
if (searchInput) {
    searchInput.addEventListener('input', e => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => searchPlace(e.target.value.trim()), 350);
    });
    searchInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); searchPlace(e.target.value.trim()); }
    });
}
if (locateBtn) locateBtn.addEventListener('click', locateUser);

// ── Bootstrap final ────────────────────────────────────────
// Pedir geolocalización pasados 800 ms para no abrumar al cargar.
setTimeout(locateUser, 800);

// Carga inicial.
applyEraStyle();
refresh();
