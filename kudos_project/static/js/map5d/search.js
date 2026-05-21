/* ============================================================
 * KUDOS · Mapa 5D · search.js
 * Buscador geográfico estilo Google Maps (Nominatim OSM, sin clave).
 * Depende de core.js (map).
 * ============================================================ */
'use strict';

async function searchPlace(query) {
    if (!query || query.length < 2) return;
    try {
        const r = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=5&q=' + encodeURIComponent(query),
            { headers: { 'Accept-Language': 'es' } });
        const data = await r.json();
        const list = document.getElementById('search-results');
        list.innerHTML = '';
        data.forEach(d => {
            const li = document.createElement('li');
            li.textContent = d.display_name;
            li.style.cssText = 'padding:6px 10px; cursor:pointer; border-bottom:1px solid rgba(0,240,255,.15);';
            li.addEventListener('click', () => {
                map.setView([d.lat, d.lon], 13);
                list.innerHTML = '';
                document.getElementById('search-input').value = d.display_name.split(',')[0];
            });
            list.appendChild(li);
        });
    } catch (e) { console.error(e); }
}
