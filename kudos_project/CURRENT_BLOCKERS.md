# CURRENT_BLOCKERS.md — KUDOS / AXÓN

Última actualización: 2026-05-19 (auto · scheduled-task `actualizar-md`)
Responsable: Eduardo
Criterio: bloqueos **activos** que impiden o frenan la demo pública del
tag `v0.9-axon-core`. Cada bloqueo incluye problema, impacto, solución,
riesgo y prioridad — tal y como exige la regla de proyecto.

Leyenda prioridad: 🟥 P0 (bloquea hoy) · 🟧 P1 (bloquea esta semana) ·
🟨 P2 (bloquea anuncio público) · 🟩 P3 (deuda no urgente).

---

## Cola P0 — bloquean hoy

### BLOCKER-AX0 · `views.py` working tree truncado 🟥 NUEVO

- **Problema:** `kudos_app/views.py` en el working tree tiene 2 375 líneas
  y corta en mitad de la sentencia `if request.POS` dentro de
  `capsule_aport_validate` (L2370–2376). `ast.parse` falla con
  `SyntaxError: expected ':'` (línea 2376). HEAD del tag `v0.9-axon-core`
  (commit `11c5da6`) tiene 2 356 líneas íntegras, **incluyendo
  `capsule_dialog` en L2337**, que ahora ha desaparecido del working tree
  aunque `kudos_app/urls.py:43` sigue referenciando `views.capsule_dialog`.
- **Impacto:** `runserver`, `manage.py check`, `manage.py test`, cualquier
  import de `kudos_app.urls` truenan en local. Bloquea TODO el trabajo
  local (incluido el diagnóstico de HOME 500). Producción no se ve
  afectada todavía porque Render corre desde HEAD `11c5da6`, pero el
  siguiente `git push` con este working tree rompería el deploy.
- **Solución:**
  ```bash
  git diff HEAD -- kudos_app/views.py     # inspeccionar qué se perdió
  git restore kudos_app/views.py           # recuperar versión taggeada
  python -c "import ast; ast.parse(open('kudos_app/views.py').read())"
  python manage.py check
  ```
  Si había trabajo legítimo (edición en `capsule_aport_validate`),
  recuperarlo del buffer del editor o re-aplicar manualmente sobre la
  versión restaurada.
- **Riesgo:** perder el edit en curso sobre `capsule_aport_validate`.
  Mitigación: revisar IDE/editor antes del restore.
- **Prioridad:** P0. Sin esto, nada local ejecuta.

### BLOCKER-AX-HOME · `/` devuelve 500 en producción 🟥

- **Problema:** la URL raíz responde 500 en Render con DEBUG=True. Causa
  no aislada todavía; el resto del sitio responde correctamente.
- **Impacto:** la landing pública es el primer touchpoint del MVP. Sin
  ella no hay demo anunciable.
- **Solución actual (workaround):** commit `11c5da6` movió la home original
  a `/home/` (name `home_full`) y dejó un healthcheck simple en `/`
  mientras se diagnostica. Snapshots de reversión:
  `kudos_app/urls.py.snapshot.debug-home.20260517T140529Z` y
  `kudos_app/views.py.snapshot.debug-home.20260517T140529Z`.
- **Próximos pasos:** revisar logs de Render → traceback de `/home/` →
  aplicar fix puntual a `home`, `home.html`, context processor o
  migración. Árbol de causas detallado en `DEBUG_HOME_500.md §4-§5`.
- **Riesgo:** que la causa sea un context processor que se ejecute en
  toda página → afectaría más allá de `/`. Mitigación: el smoke audit
  AXÓN ya validó que el resto del site responde 200.
- **Prioridad:** P0 hasta resolver y revertir el healthcheck.

---

## Cola P1 — bloquean esta semana

### BLOCKER-AX-MC · MarkerCluster servido por CDN unpkg 🟧

- **Problema:** `map.html` líneas 9-11 cargan
  `unpkg.com/leaflet.markercluster@1.5.3` (CSS×2 + JS).
- **Impacto:** dependencia de red para el sistema #1. Si unpkg cae o
  bloquea, los markers dejan de agruparse y rinden ~2 000 markers DOM en
  vista mundial.
- **Solución:** vendoring local en `static/vendor/leaflet/markercluster/`
  alineado con la misma versión (1.5.3) y reemplazar las 3 líneas por
  `{% static %}`. (D2 sólo cubrió Leaflet core.)
- **Riesgo:** sandbox sin red para fetch; descarga manual desde otra
  estación + commit.
- **Prioridad:** P1.

### BLOCKER-AX-TESTS · Tests Django reales = 0 🟧

- **Problema:** `kudos_app/tests.py` = 10 líneas. El audit AXÓN 29/29 es
  estático (AST/regex), no runtime.
- **Impacto:** cualquier cambio de `views.py`, settings o middleware es
  ciego. Bloquea cualquier refactor post-MVP.
- **Solución:** suite smoke mínima — clase `KudosSmokeTests`:
  `/healthcheck`, `/`, `/home/`, `/dashboard/`, `/map/`, `/search/`,
  `/timeline/`, `/capsules/`, `/accounts/login`. Más una prueba de
  gating: 3 rutas DORMANT devuelven 404 y se desbloquean con
  `KUDOS_FEATURE_X=1`.
- **Riesgo:** test "verde" no garantiza UX, pero garantiza que el
  servidor arranca y que el gating respeta el contrato.
- **Prioridad:** P1.

### BLOCKER-AX-LH · Lighthouse Mobile real sin medir 🟧

- **Problema:** no hay métrica de rendimiento real sobre la URL pública.
  El audit interno proyecta TTFM < 1.2 s pero no se ha probado en 4G ni
  en device físico.
- **Impacto:** "Time To Awe" del mandato AXÓN sigue siendo una promesa
  no validada.
- **Solución:** ejecutar Lighthouse Mobile (Chrome DevTools 4G + CPU 4×
  throttle) sobre la URL pública de Render una vez resuelto HOME 500.
  Target ≥ 80 en Performance / A11y / SEO / Best Practices.
- **Riesgo:** backdrop-filter blur en algunos componentes puede bajar
  Performance Mobile. Mitigación: A/B con blur desactivado si el score
  cae < 80.
- **Prioridad:** P1.

---

## Cola P2 — bloquean anuncio público, no la semana

### BLOCKER-AX-PIL · Pillow + requests comentadas en `requirements.txt` 🟨

- **Problema:** Pillow, requests y openai siguen comentadas.
- **Impacto:** Pillow rompe upload de imágenes reales (capsule_image),
  requests rompe Wikipedia/Wikimedia. Hoy el deploy funciona porque las
  rutas que dependen están en DORMANT o no se ejercitan.
- **Solución:** descomentar `Pillow>=10.0.0` y `requests>=2.31.0`. Dejar
  `openai`, `celery`, `redis` comentadas hasta integración real.
- **Riesgo:** Pillow requiere libjpeg/zlib en algunos hosts. Render lo
  soporta por defecto.
- **Prioridad:** P2.

### BLOCKER-AX-SHARE · Preview share sin validar 🟨

- **Problema:** OG/Twitter/JSON-LD están en `capsule_detail.html` pero
  nadie ha verificado el rendering real en WhatsApp / Twitter / Telegram
  / LinkedIn.
- **Impacto:** el sistema #7 podría fallar el día del lanzamiento por un
  detalle (URL absoluta, image size, cache de Facebook OG debugger).
- **Solución:** una vez HOME 500 resuelto, abrir 3 URLs de cápsula en
  Twitter Card Validator, Facebook Sharing Debugger, WhatsApp Web,
  Telegram Web.
- **Prioridad:** P2.

### BLOCKER-AX-DL · Deep-link `?lat=&lon=&year=` no honrado en `/map/` 🟨

- **Problema:** D10 publicó el cierre narrativo "Ver en mapa 5D" con
  `?lat=...&lon=...&year=...`, pero `map_view` ignora esos query params.
- **Impacto:** el CTA llega al mapa pero carga vista mundial; rompe la
  promesa narrativa "del popup al mapa".
- **Solución:** parsear `request.GET` en `map_view`, pasar centro
  + zoom + año a `map.html` como `data-*`, y `core.js` los respeta al
  arrancar.
- **Prioridad:** P2.

### BLOCKER-AX-RL · Sin rate-limit en APIs públicas 🟨

- **Problema:** `api_capsules_5d`, `api_capsule_light`, `ai_lite_ask`
  no tienen throttle.
- **Impacto:** vulnerable a martilleo desde un único IP; podría agotar
  el dyno free de Render.
- **Solución:** `django-ratelimit` o middleware ligero por IP — 60
  req/min para bbox y light, 12 req/min para mind.
- **Prioridad:** P2.

### BLOCKER-AX-ALL · Login social no implementado 🟨

- **Problema:** ningún proveedor OAuth conectado.
- **Impacto:** según project plan, MVP exige Google. Hoy solo hay login
  Django nativo.
- **Solución:** `django-allauth` con Google primero (External · Testing
  consent screen), credenciales en `.env`.
- **Prioridad:** P2 (no entra en cirugía AXÓN; sí en MVP anunciable).

---

## Cola P3 — deuda no urgente

### BLOCKER-AX-LEG · `legacy_views.py` aún en `kudos_app/` 🟩

- **Problema:** 2 160 L, dormant natural, sigue en `kudos_app/`.
- **Solución:** mover a `kudos_app/dormant/legacy_views.py` (D13).
  Pospuesto conscientemente para no introducir cambios pre-tag.
- **Prioridad:** P3.

### BLOCKER-AX-LL · 3 copias legacy de Leaflet en `static/` 🟩

- **Problema:** `leaflet.js`, `leaflet-src.js`, `leaflet-src.esm.js` (+
  `.map`) conviven con la canónica `static/vendor/leaflet/`. ~1.7 MB
  dead-weight en static.
- **Solución:** borrar las 3 + sus `.map` tras confirmar que ningún
  template referencia las paths antiguas.
- **Prioridad:** P3.

### BLOCKER-AX-OR1 · `kudos_app_urls.py` huérfano en raíz 🟩

- **Problema:** archivo de 407 B en la raíz, sin enganche a
  `ROOT_URLCONF`.
- **Solución:** borrar (o moverlo a `dormant/`).
- **Prioridad:** P3.

### BLOCKER-AX-OR2 · 4 scripts huérfanos rotos 🟩

- **Problema:** `art_culture.py`, `control.py`, `generate_capsules.py`,
  `social_impact.py` importan submódulos inexistentes de
  `kudos_app.views`. Nunca funcionaron.
- **Solución:** mover a `dormant/scripts/` o borrar.
- **Prioridad:** P3.

### BLOCKER-AX-AI · `ai_lite_ask` con heurística local 🟩

- **Problema:** sin Claude/OpenAI real, sólo 3 templates server-side.
- **Solución:** cuando haya `ANTHROPIC_API_KEY` productiva, sustituir la
  rama heurística por llamada real. Contrato JSON ya está listo.
- **Prioridad:** P3 (no impide MVP; sí mejora experiencia).

### BLOCKER-AX-AUTO · `full_autopilot` no apto para producción 🟩

- **Problema:** bucles 24/7 sin rate-limit ni circuit breaker.
- **Solución:** APScheduler/cron con límite, jitter, logs; deshabilitar
  por defecto en producción.
- **Prioridad:** P3.

### BLOCKER-AX-DOC · `README.md` desactualizado 🟩

- **Problema:** portada no refleja arquitectura AXÓN ni los 7 pilares
  PUBLIC.
- **Solución:** refrescar tras revertir healthcheck y declarar demo
  pública.
- **Prioridad:** P3.

---

## Cola desbloqueada desde 2026-05-15 (cerrados / resueltos)

- ✅ **AXÓN tag `v0.9-axon-core`** sellado (2026-05-16, commit `42189bc`).
- ✅ **6 funciones duplicadas** en `views.py` eliminadas (BLOCKER-AX1
  original). De hecho fueron **12** funciones · 325 L.
- ✅ **`SECRET_KEY` con fallback inseguro** (BLOCKER-AX2): ahora
  mandatoria si `DJANGO_ENV=production`; en dev arranca con aviso.
- ✅ **`views.py` monolítico de 2 450 L** (BLOCKER-AX3): bajó a 2 337 L
  base, F401=0, sin duplicados, 0 imports muertos.
- ✅ **`map.html` 881 L con CSS+JS inline** (BLOCKER-AX4): 167 L con
  10 módulos JS en `static/js/map5d/` + `static/css/map5d.css` (399 L).
- ✅ **Leaflet por CDN core** (BLOCKER-AX5 original): local en
  `static/vendor/leaflet/`. La parte de MarkerCluster se reabre como
  BLOCKER-AX-MC más arriba.
- ✅ **Utils duplicados `google_maps_utils.py`** (BLOCKER-AX9): copia
  raíz movida a `.dormant`.
- ✅ **Mind Lite no reducido a 3 prompts** (parte de D12): UI bajada a
  what/summary/near con auto-fire `?capsule=`.
- ✅ **Share blindado** (D11): OG completos + Twitter Card +
  `navigator.share` + clipboard fallback + Schema.org JSON-LD.
- ✅ **Capsule subroutes DORMANT** (`versions`, `aport`, `dialog`,
  `enrich`, `ar`, `audio`, `vr`, `clip`) bloqueadas vía
  `DORMANT_PATH_REGEX`.
- ✅ **Deploy artefactos**: Procfile, render.yaml, build.sh,
  runtime.txt, railway.json, `.env.production.example`,
  `kudos_project/sentry_init.py` opt-in.
- ✅ **Backups pre-deploy**: tar 87 MB + DB SQLite 9.5 MB (53 tablas ·
  1 458 cápsulas · 10 users).
- ✅ **Experience Core scaffolding** completo en `experience/` (Next.js
  15 + React 19 + Tailwind 3.4 + Framer 11 + Radix + Lucide).

---

## Decisiones pendientes de input

1. ¿Borrar las 3 copias legacy de Leaflet en `static/` ahora o post-MVP?
2. ¿Vendoring de MarkerCluster sólo (`leaflet.markercluster.js` + CSS) o
   también de las imágenes de iconos del cluster?
3. ¿Activar Sentry con el opt-in `kudos_project/sentry_init.py` ya o
   esperar a resolver HOME 500 para no enmascarar el bug?
4. ¿Mover `legacy_views.py` a `dormant/` ahora o post-anuncio?

> Cola viva: **BLOCKER-AX0 → BLOCKER-AX-HOME → BLOCKER-AX-MC →
> BLOCKER-AX-TESTS → BLOCKER-AX-LH** → resto de P2.
