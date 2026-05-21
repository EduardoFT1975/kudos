# KUDOS · Deuda técnica conocida

**Versión:** v0.9-axon-core
**Fecha:** 2026-05-16
**Política:** sólo deuda real verificada. Sin fantasías, sin "future dreams".

Clasificación:
- **🔴 LAUNCH BLOCKER** — debe resolverse antes de demo pública.
- **🟡 POST-LAUNCH** — recomendable en las primeras semanas tras lanzar.
- **🟢 FUTURE** — mejoras útiles cuando el producto haya validado tracción.

---

## 🔴 LAUNCH BLOCKERS

**(ninguno bloqueante para demo interna técnica)**

Para demo pública real, el único item realmente bloqueante depende del entorno de despliegue:

1. **Validación Lighthouse Mobile en entorno real.** Sandbox actual no tiene Chrome headless ni red. Antes de demo pública: medir Performance, A11y, SEO y Best Practices con `lighthouse https://kudos.example/map/ --form-factor=mobile --throttling-method=devtools`. Target ≥ 80 en cada categoría. *Si Lighthouse Performance < 70 en móviles reales tras `backdrop-filter: blur(18px)`, evaluar tradeoff identidad vs perf.*

2. **Smoke navegacional físico mobile** (iOS Safari + Android Chrome real). El audit estático D6 cubre 14/14 puntos pero los gestos táctiles reales aún no se probaron en dispositivo.

3. **Preview de share en redes** (WhatsApp · Twitter · Telegram · LinkedIn) — los OG tags están listos pero no validados en consumidores reales. Test con [opengraph.xyz](https://opengraph.xyz) y [Twitter Card Validator](https://cards-dev.twitter.com/validator) tras desplegar.

---

## 🟡 POST-LAUNCH (semanas 1-4)

### Frontend

1. **Markercluster aún en unpkg.com.** Si unpkg cae o se ralentiza, el cluster falla y los markers se sobreponen visualmente. Vendoring offline: descargar `leaflet.markercluster.js` + `MarkerCluster.css` + `MarkerCluster.Default.css` y colocar en `static/vendor/leaflet.markercluster/`. (Sandbox actual no tiene red para hacerlo.)

2. **3 copias legacy de Leaflet en `static/`:** `leaflet-src.js`, `leaflet-src.esm.js`, `leaflet.js` original (450KB+ cada `-src*`). Sólo se usa `static/vendor/leaflet/leaflet.js`. Borrar las 3 huérfanas + sus `.map` files. Ahorro: ~1.7 MB de payload static.

3. **`map_view` ignora `?lat=&lon=&year=`** del cierre narrativo D10. El CTA "Ver en mapa 5D" desde capsule_detail llega al mapa pero carga vista mundial. Resolver en `static/js/map5d/core.js`: leer `URLSearchParams` en init y pasar a `setView`.

4. **`ai_panel` ignora `?capsule=` en backend.** El template lo recibe vía `lite_capsule` (resuelto en D12) pero si en el futuro el `ai_panel.html` quiere mostrar el título de la cápsula en el header, ya hay objeto disponible — sólo añadir uso en template.

5. **`renderTimeline` sin scroll-to-year.** Cuando `centerTimeline(year)` cambia la vista, la timeline muestra todos los años ordenados. Añadir `<a id="year-1789">` y `scrollIntoView()` tras render.

6. **CSRF token via form invisible en `ai_panel.html`.** Truco aceptable pero feo. Refactor: mover token a `<meta name="csrf-token">` global + leer desde `header['X-CSRFToken']`.

7. **Funciones globales en `static/js/map5d/*.js`.** Posible colisión con scripts de terceros que definan `STATE`, `map`, `markersLayer`, `_LIGHT_CACHE`. Mitigación: envolver todo en `window.KUDOS = window.KUDOS || {}` namespace.

### Backend

8. **Sin rate limit en endpoints API públicos** (`api_capsules_5d`, `api_capsule_light`, `ai_lite_ask`). Un atacante puede martillar. Mitigación: `django-ratelimit` con `@ratelimit(key='user_or_ip', rate='60/m')`.

9. **`ai_lite_ask` con heurística local** (sin Claude/OpenAI). Las respuestas son evocadoras pero limitadas a 3 templates server-side. Cuando haya `ANTHROPIC_API_KEY` productiva, sustituir el cuerpo manteniendo el mismo contrato JSON (mode/context → reply/related).

10. **`Cache-Control` sólo en bbox GETs.** `capsule_detail` HTML completo no cachea (decisión consciente: contiene contenido user-specific). Si en futuro se separa la parte "pública" de la "user-specific", añadir cache parcial con `Vary: Cookie`.

11. **`_is_founder` en `ai_panel` decide visibilidad de sección Full** sin tocar la URL `/mind/chat/` que sigue accesible directa. Si se quiere ocultar del todo, añadir `/mind/chat/`, `/mind/chat/send/` a `DORMANT_PATH_PREFIXES`.

12. **`legacy_views.py` (2 160 L)** sigue en `kudos_app/`. Mandato D13 era moverla a `dormant/legacy_views.py`. Pospuesto como decisión consciente: hacerlo después de D14 freeze para no introducir cambios pre-tag.

### Templates

13. **18 imports anidados dentro de funciones en `views.py`** (re-imports de `datetime/timedelta/date` dentro de cuerpos). Ruidoso pero inocuo. Limpieza en pasada de pulido.

14. **Imports rotos pre-existentes en scripts fuera del flujo Django:** `art_culture.py:15`, `control.py:35`, `generate_capsules.py:11`, `social_impact.py:15` importan submódulos inexistentes de `kudos_app.views`. Nunca funcionaron. Decisión: mover a `dormant/scripts/` cuando llegue limpieza Fase 6.

---

## 🟢 FUTURE

### Arquitectura (post-validación tracción real)

15. **Layout `apps/`** (D13 del roadmap original): mover `kudos_app/` a `apps/{core,maps,capsules,users,search,timeline,mind}/`. Mover `legacy_views.py` y los DORMANT a `dormant/` con sub-apps. Migración progresiva. **No tocar hasta MVP validado.**

16. **OG image dinámica** server-side rendered con título + año superpuestos (cairosvg/Pillow). Mejora drástica del share viral. Roadmap original D11.

17. **Sub-dividir `map5d.css`** en `base.css / sidebar.css / hud.css / slider.css / popups.css / responsive.css`. Pulido D7-recurring. No bloquea ni mejora UX directamente; sólo mantenibilidad.

18. **Tests automatizados del flujo del mapa.** Suite Playwright de smoke: carga → marker → popup → cápsula → share → vuelta. El mandato original prohibía añadir scope; cuando se relaje, primer test que se debería escribir.

19. **Service Worker / offline-first** para tile cache y JSON cache. Mind Lite podría funcionar offline con cápsulas pre-cargadas. PWA completa.

20. **Internacionalización (i18n).** Todo el copy está en español. `_era_label`, `Pregunta al lugar.`, etc. → `gettext`. Cuando llegue tráfico no-español.

21. **Vendoring Leaflet con etag/hash** en path para cache-busting real.

22. **`tap: true` deprecated en Leaflet 2.x.** Al hacer upgrade mayor, revisar pointer events.

23. **Variables globales JS sin namespace `window.KUDOS`.** Item 7 del POST-LAUNCH también aplica como FUTURE pulido limpio.

24. **Migrar de `<script>` síncronos a ES modules** con `type="module"` y `import/export`. Beneficio: tree-shaking y carga paralela. Coste: complicar el debug. Decisión: posponer hasta tener bundler claro.

25. **Optimizar `backdrop-filter: blur(18px)`** para GPUs móviles antiguas con `@media (prefers-reduced-transparency)` opt-out. La identidad visual queda preservada en hardware moderno.

---

## Resumen ejecutivo

| Severidad | Items | Acción |
|---|---|---|
| 🔴 Launch blocker | 3 (todos dependen de entorno productivo, no del código) | validar en demo real |
| 🟡 Post-launch | 14 | semanas 1-4 |
| 🟢 Future | 11 | post-validación tracción |

**Total: 28 ítems de deuda real conocida.** Cero bloqueos por código en el repo. La demo técnica interna ya puede correr.
