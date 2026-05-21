/* ============================================================
 * KUDOS · Mapa 5D · share.js
 * AXÓN D10 · Share friction mínima + centerTimeline.
 * shareCapsule(): Web Share API nativo si existe; fallback a
 * clipboard con toast neón suave. Sin alerts feos.
 * centerTimeline(year): cambia STATE.view a 'timeline' y centra
 * en el año dado (transición fluida sin recargar página).
 * Depende de core.js (STATE, refresh, render) y popups.js (escapeHtml en map.html).
 * ============================================================ */
'use strict';

(function () {
    // ── Toast minimalista (1 instancia reutilizada) ────────────
    let _toastEl = null;
    function _ensureToast() {
        if (_toastEl) return _toastEl;
        _toastEl = document.createElement('div');
        _toastEl.className = 'kudos-toast';
        _toastEl.setAttribute('role', 'status');
        _toastEl.setAttribute('aria-live', 'polite');
        document.body.appendChild(_toastEl);
        return _toastEl;
    }
    function showToast(message, kind) {
        const el = _ensureToast();
        el.textContent = message;
        el.dataset.kind = kind || 'info';
        el.classList.add('show');
        clearTimeout(showToast._t);
        showToast._t = setTimeout(() => el.classList.remove('show'), 2400);
    }
    window.showToast = showToast;

    // ── shareCapsule: Web Share + fallback clipboard ───────────
    window.shareCapsule = async function (uid, title) {
        const url = window.location.origin + '/capsules/' + encodeURIComponent(uid) + '/';
        const shareData = {
            title: (title || 'Cápsula KUDOS') + ' · KUDOS',
            text: title || 'Una cápsula en KUDOS',
            url: url,
        };
        // Preferir Web Share API nativo (móvil iOS/Android + algunos desktop).
        if (navigator.share) {
            try {
                await navigator.share(shareData);
                return; // No mostramos toast: la propia hoja del share es feedback.
            } catch (err) {
                // AbortError = el usuario canceló: no mostrar error.
                if (err && err.name === 'AbortError') return;
                // Si falla por otro motivo, caemos a clipboard.
            }
        }
        // Fallback: copiar URL al portapapeles.
        try {
            await navigator.clipboard.writeText(url);
            showToast('Enlace copiado · pégalo donde quieras', 'success');
        } catch (e) {
            // Fallback del fallback: selección manual.
            const t = document.createElement('input');
            t.value = url;
            document.body.appendChild(t);
            t.select();
            try { document.execCommand('copy'); showToast('Enlace copiado', 'success'); }
            catch (_) { showToast('No se pudo copiar el enlace', 'error'); }
            t.remove();
        }
    };

    // ── centerTimeline: lleva al usuario al año exacto en línea temporal ──
    window.centerTimeline = function (year) {
        if (year == null || isNaN(year)) {
            // Sin año → solo cambia a vista timeline manteniendo el slider.
            STATE.view = 'timeline';
            render();
            showToast('Línea temporal', 'info');
            return;
        }
        STATE.year = parseInt(year, 10);
        STATE.view = 'timeline';
        const tsRange = document.getElementById('ts-range');
        const tsLabel = document.getElementById('ts-label');
        if (tsRange) tsRange.value = STATE.year;
        if (tsLabel) tsLabel.textContent = STATE.year < 0 ? Math.abs(STATE.year)+' a.C.' : STATE.year;
        // Marcar el botón de vista timeline como activo.
        document.querySelectorAll('.view-toggle button').forEach(b => {
            b.classList.toggle('active', b.dataset.view === 'timeline');
        });
        refresh();
        showToast(STATE.year < 0 ? `${Math.abs(STATE.year)} a.C.` : `Año ${STATE.year}`, 'info');
    };
})();
