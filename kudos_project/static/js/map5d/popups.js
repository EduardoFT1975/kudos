/* ============================================================
 * KUDOS · Mapa 5D · popups.js
 * AXÓN D5 · Lazy hydration de chips de metadata al abrir popup.
 * Cache cliente de respuestas /light/ por sesión.
 * Depende de core.js (escapeHtml).
 * ============================================================ */
'use strict';

const _LIGHT_CACHE = new Map();

function hydrateLight(popup, uid) {
    const root = popup && popup._contentNode ? popup._contentNode : document;
    const meta = root.querySelector ? root.querySelector('.lazy-meta[data-uid="'+uid+'"]') : null;
    if (!meta || meta.dataset.loaded === '1') return;
    const renderChips = (data) => {
        const chips = [];
        if (data.era) chips.push(`<span class="chip" style="background:rgba(212,175,55,.18);color:#d4af37;">🏺 ${escapeHtml(data.era)}</span>`);
        if (data.ai_enriched) chips.push(`<span class="chip" style="background:rgba(0,240,255,.18);color:#00f0ff;">✨ IA</span>`);
        if (data.quality > 0) chips.push(`<span class="chip" style="background:rgba(16,185,129,.18);color:#10b981;">⭐ ${(data.quality*100).toFixed(0)}</span>`);
        if (Math.abs(data.sentiment) > 0.05) {
            const ej = data.sentiment > 0 ? '😊' : '😔';
            chips.push(`<span class="chip" style="background:rgba(255,0,212,.18);color:#ff00d4;">${ej} ${data.sentiment.toFixed(1)}</span>`);
        }
        if (chips.length) {
            meta.innerHTML = chips.join('');
            meta.classList.add('lazy-loaded');
        }
        meta.dataset.loaded = '1';
    };
    if (_LIGHT_CACHE.has(uid)) { renderChips(_LIGHT_CACHE.get(uid)); return; }
    fetch('/api/capsules/' + encodeURIComponent(uid) + '/light/')
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (!data) return; _LIGHT_CACHE.set(uid, data); renderChips(data); })
        .catch(() => { /* sin spinner feo: el popup ya está poblado */ });
}
