/* ============================================================
 * KUDOS · Mapa 5D · timeline.js
 * Vistas alternativas: galaxia + línea temporal (preservadas tal cual).
 * Depende de core.js (STATE, escapeHtml).
 * ============================================================ */
'use strict';

function renderGalaxy() {
    document.getElementById('map').style.display = 'none';
    const el = document.getElementById('alt-view');
    el.style.display = 'block';
    el.innerHTML = '<h2 style="font-family:Cormorant Garamond,serif; font-size:2rem; color:#00f0ff; text-shadow:0 0 12px #00f0ff;">🌌 Galaxia de cápsulas</h2><p style="color:#94a3b8;">Cada cápsula es una estrella en órbita. Filtros activos aplicados.</p><div id="galaxy-canvas" style="position:relative; height:70vh; border-radius:18px; overflow:hidden; background:radial-gradient(ellipse at center, #0a0f2c 0%, #050a1f 70%); box-shadow:inset 0 0 80px rgba(0,240,255,0.2);"></div>';
    const canvas = el.querySelector('#galaxy-canvas');
    const cx = canvas.offsetWidth / 2, cy = canvas.offsetHeight / 2;
    STATE.capsules.slice(0, 200).forEach((c, i) => {
        const angle = (i / Math.max(STATE.capsules.length, 1)) * Math.PI * 2;
        const radius = 80 + (i % 6) * 50;
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius;
        const star = document.createElement('a');
        star.href = '/capsules/' + c.uid + '/';
        star.title = c.titulo + ' · ' + (c.year || '');
        star.style.cssText = `position:absolute; left:${x-6}px; top:${y-6}px; width:12px; height:12px; border-radius:50%;
          background:radial-gradient(circle at 30% 30%, #fff, #00f0ff 60%, transparent);
          box-shadow:0 0 14px #00f0ff; animation: pulse ${2 + Math.random()*3}s infinite;`;
        canvas.appendChild(star);
    });
    document.getElementById('hud-count').textContent = STATE.capsules.length;
}

function renderTimeline() {
    document.getElementById('map').style.display = 'none';
    const el = document.getElementById('alt-view');
    el.style.display = 'block';
    let html = '<h2 style="font-family:Cormorant Garamond,serif; font-size:2rem; color:#00f0ff; text-shadow:0 0 12px #00f0ff;">📜 Línea temporal</h2><div style="position:relative; padding-left:24px; border-left:2px solid rgba(0,240,255,.4);">';
    const sorted = STATE.capsules.slice().sort((a, b) => (a.year || 0) - (b.year || 0));
    sorted.forEach(c => {
        html += `<div style="margin:14px 0; padding:12px 16px; background:rgba(8,12,32,.6); border:1px solid rgba(0,240,255,.18); border-radius:12px; backdrop-filter:blur(6px);">
          <small style="color:#00f0ff;">📅 ${c.year || '—'} · ${escapeHtml(c.dimension)}</small>
          <h4 style="margin:4px 0; color:#fff;"><a href="/capsules/${c.uid}/" style="color:#fff;">${escapeHtml(c.titulo)}</a></h4>
          <small style="color:#94a3b8;">por ${escapeHtml(c.autor)} · ${escapeHtml(c.modo)}</small>
        </div>`;
    });
    html += '</div>';
    el.innerHTML = html;
    document.getElementById('hud-count').textContent = sorted.length;
}
