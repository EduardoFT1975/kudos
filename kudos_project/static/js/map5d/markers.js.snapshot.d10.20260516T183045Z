/* ============================================================
 * KUDOS · Mapa 5D · markers.js
 * renderMap: itera STATE.capsules y crea markers con icon emoji,
 * tooltip miniatura y popup con CTAs + chips lazy.
 * Depende de: core.js (STATE, escapeHtml), clustering.js (markersLayer),
 * popups.js (hydrateLight).
 * ============================================================ */
'use strict';

function renderMap() {
    document.getElementById('map').style.display = 'block';
    document.getElementById('alt-view').style.display = 'none';
    markersLayer.clearLayers();
    let visible = 0;
    STATE.capsules.forEach(c => {
        if (!c.lat || !c.lon) return;
        // Suavizar la "edad" del año visible: cuanto más lejos del año seleccionado, más translúcido
        const yearDiff = Math.abs((c.year || STATE.year) - STATE.year);
        const opacity = Math.max(0.3, 1 - yearDiff / 80);

        // Icono según modo (museo, monumento, paisaje, negocio, etc.)
        const modeEmoji = {
            museo: '🏛', monumento: '🗿', paisaje: '🏞', negocio: '🏪',
            historico: '📜', sabiduria: '🧠', arte: '🎨', espiritual: '✨',
            ciudadano: '🗳', comercial: '🛍', personal: '🌿', eterno: '♾',
        }[c.modo] || '📍';
        const dimColor = {
            fisica: '#00f0ff', emocional: '#ff00d4', cognitiva: '#ffae00',
            social: '#10b981', espiritual: '#d4af37',
        }[c.dimension] || '#00f0ff';
        const icon = L.divIcon({
            className: 'kudos-marker dim-' + (c.dimension || 'fisica'),
            iconSize: [32, 32],
            iconAnchor: [16, 16],
            html: `<div style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;
                font-size:18px;background:radial-gradient(circle,${dimColor} 0%,rgba(0,0,0,.7) 80%);
                border:2px solid ${dimColor};border-radius:50%;box-shadow:0 0 10px ${dimColor};">${modeEmoji}</div>`,
        });
        const m = L.marker([c.lat, c.lon], { icon, opacity }).addTo(markersLayer);
        // HOVER · tooltip rápido con miniatura
        const tooltip = `<div style="text-align:left; max-width:200px;">
            <strong style="color:#00f0ff;">${escapeHtml(c.titulo)}</strong><br>
            <small>${escapeHtml(c.modo)} · ${c.year || '—'}</small>
            ${c.image ? '<img src="'+c.image+'" style="margin-top:4px; width:100%; max-height:80px; object-fit:cover; border-radius:4px;">' : ''}
        </div>`;
        m.bindTooltip(tooltip, { direction: 'top', sticky: false, opacity: .95 });
        // ── AXÓN D10 · POPUP como PORTAL CONTEXTUAL ────────────────
        // Jerarquía visual: título → meta compacta (dot dimension) → imagen
        // hero → byline gris → chips lazy (era/IA/calidad/sentimiento) → 3 CTAs.
        // 3 CTAs jerarquizados (Explorar > Compartir > Timeline) en lugar
        // de los 4 originales (3 apuntaban a rutas DORMANT → 404).
        const safeTitle = escapeHtml(c.titulo);
        const titleJs = JSON.stringify(c.titulo || '');
        const html = `
          <div class="kudos-popup">
            <strong class="kudos-popup-title">${safeTitle}</strong>
            <div class="kudos-popup-meta">
              <span class="dim-dot" style="background:${dimColor};box-shadow:0 0 8px ${dimColor};"></span>
              <span>📅 ${c.year || '—'}</span>
              <span class="sep">·</span>
              <span>${escapeHtml(c.modo)}</span>
            </div>
            ${c.image ? '<img src="' + c.image + '" loading="lazy" class="kudos-popup-thumb">' : ''}
            <div class="kudos-popup-byline">por ${escapeHtml(c.autor)}</div>
            <div class="lazy-meta" data-uid="${c.uid}"></div>
            <div class="cta-row">
              <a class="cta cta-primary" href="/capsules/${c.uid}/">Explorar →</a>
              <button type="button" class="cta cta-share" onclick="shareCapsule('${c.uid}', ${titleJs})">↗ Compartir</button>
              <button type="button" class="cta cta-timeline" onclick="centerTimeline(${c.year || 'null'})">📜 Timeline</button>
            </div>
          </div>`;
        m.bindPopup(html, { maxWidth: 280, autoPanPadding: [20, 60] });
        // AXÓN D5 · hidratar chips de metadata al abrir el popup (lazy, cacheable).
        m.on('popupopen', (ev) => hydrateLight(ev.popup, c.uid));
        visible++;
    });
    document.getElementById('hud-count').textContent = visible;
    document.getElementById('visible-count').textContent = visible;
}
