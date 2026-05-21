# CURRENT_BLOCKERS.md — KUDOS / AXÓN

Última actualización: 2026-05-21 (auto · scheduled-task `daily-status`)
Responsable: Eduardo
Criterio: bloqueos **activos** que impiden o frenan la demo pública del
tag `v0.9-axon-core` (sobre master ya con 16 commits hotfix). Cada bloqueo
incluye problema, impacto, solución, riesgo y prioridad — tal y como exige
la regla de proyecto.

Leyenda prioridad: 🟥 P0 (bloquea hoy) · 🟧 P1 (bloquea esta semana) ·
🟨 P2 (bloquea anuncio público) · 🟩 P3 (deuda no urgente).

---

## Cola P0 — bloquean hoy

### BLOCKER-AX-HOME-VERIFY · Validar HOME 200 en producción 🟥

- **Problema:** el commit `67fe207` (2026-05-21 16:03 UTC+2) cambia
  `STATICFILES_STORAGE` de `CompressedManifestStaticFilesStorage` a
  `CompressedStaticFilesStorage` y hardeniza `home()` con try/except +
  fallback `HttpResponse 200 text/plain`. La causa raíz aislada fue
  `ValueError("Missing staticfiles manifest entry")`: el storage Manifest
  exige que TODO `{% static %}` referenciado exista en `staticfiles/`
  post-`collectstatic`; cualquier asset faltante (vídeo, imagen, fuente)
  disparaba 500. **Sin embargo Render aún no ha confirmado auto-deploy del
  commit y nadie ha hecho `curl -I /` post-merge**.
- **Impacto:** la landing pública es el primer touchpoint del MVP. Sin
  ella no hay demo anunciable. Mientras no se valide en producción no
  podemos cerrar BUG-025.
- **Solución:**
  1. Verificar auto-deploy en Render dashboard → servicio `kudos` → tab
     **Events** (typical 3–5 min post-push).
  2. `curl -I https://kudos-40cq.onrender.com/` → esperar 200, no 500.
  3. Si 500 sigue: leer Render → Logs para el traceback del fallback
     `HttpResponse` (el log captura excepciones DB y template); aplicar
     fix puntual (probablemente migración pendiente o context processor
     con I/O).
  4. Si 200: editar `kudos_app/urls.py` para devolver `name='home'` al
     endpoint real (no a `healthcheck`) y eliminar el alias `home_full`;
     desactivar el endpoint temporal `healthcheck` en `/`. Snapshots de
     reversión: `kudos_app/urls.py.snapshot.debug-home.20260517T140529Z`.
- **Riesgo:** que la causa real fuese un context processor que se ejecute
  en toda página → afectaría más allá de `/`. Mitigación: el smoke audit
  AXÓN ya validó que el resto del site responde 200 sobre HEAD; el commit
  `c42784a` del 2026-05-20 ya había restaurado la home real.
- **Prioridad:** P0 hasta que `curl` confirme 200.

---

## Cola P1 — bloquean esta semana

### BLOCKER-LOCAL · Working tree desincronizado (4 archivos truncados) 🟧

- **Problema:** confirmado por `ast.parse` + `wc -l` 2026-05-21:
  - `kudos_app/views.py` working: 2 382 L · parsea OK pero **incompleto**
    respecto a HEAD (2 448 L · faltan ~66 L finales que cortan
    `capsule_aport_create` mid-función y borran `capsule_aport_validate`
    entera). El binario en Render sirve HEAD, pero localmente Django se
    ejecuta sobre la versión incompleta.
  - `kudos_app/urls.py` working: 210 L · `SyntaxError: '[' was never
    closed` (L11 `urlpatterns = [`). HEAD íntegro a 215 L.
  - `kudos_app/models.py` working: 1 131 L · `SyntaxError: unterminated
    string literal` (L1132 `verbose_name = '`). HEAD íntegro a 1 210 L
    (incluye Phase 0 fields `place`/`parent_capsule`/`root_capsule`/
    `context_layer`/`importance_score`/`verified` y modelo `Place`).
  - `render.yaml` working: 15 L · cortado en pleno comentario. HEAD
    íntegro a 89 L con blueprint dos-servicios completo (`kudos`,
    `kudos-frontend`, `kudos-db`).
  - **Índice git corrupto:** `fatal: unknown index entry format
    0x3a710000` (también visto `0x02000000`, `0x70680000`; el byte
    fluctúa entre invocaciones). `git status` y `git diff <path>` fallan;
    `git log`, `git show HEAD:<path>` y `git diff HEAD --name-only`
    funcionan. `git diff HEAD --name-only` reporta **378 archivos
    divergentes**.
- **Impacto:** `runserver`, `manage.py check`, `manage.py test`, cualquier
  import de `kudos_app.urls` truenan en local. Bloquea TODO el trabajo
  local. Producción **no se ve afectada** (Render corre HEAD íntegro;
  Eduardo ha podido commitear 16 veces hoy esquivando el índice roto vía
  herramienta externa). Por eso baja de P0 (donde estaba el 2026-05-19) a
  P1: ya no bloquea producción, sólo desarrollo local.
- **Solución:**
  ```bash
  git checkout HEAD -- kudos_app/views.py kudos_app/urls.py kudos_app/models.py render.yaml
  python -c "import ast; [ast.parse(open(f).read()) for f in
    ['kudos_app/views.py','kudos_app/urls.py','kudos_app/models.py']]"
  python manage.py check
  # Si el índice git sigue corrupto tras el checkout:
  rm .git/index && git read-tree HEAD
  ```
- **Riesgo:** perder edits locales no commiteados. Mitigación: dado que
  `git status` no funciona, los edits actuales no se pueden inspeccionar
  cómodamente — pero **HEAD contiene 16 commits hechos hoy**, así que
  cualquier trabajo real ya está commiteado. El checkout solo descarta
  la corrupción.
- **Prioridad:** P1.

### BLOCKER-AX-FRONT-DEPLOY · Primer deploy del frontend en Render 🟧

- **Problema:** `render.yaml` v2 (commit `a199e12`) declara el servicio
  `kudos-frontend` (Next.js 15, `rootDir: experience`, `npm install &&
  npm run build`, `npm start -- -p $PORT`, `BETA_HIDE_DORMANT=1`,
  `NEXT_PUBLIC_API_BASE_URL=https://kudos-40cq.onrender.com`). Pero el
  **primer deploy del servicio no se ha ejecutado**.
- **Impacto:** Experience Core (11 443 L, 99 archivos, 18 componentes
  TSX) sigue siendo invisible al usuario hasta que Render levante el
  servicio. CORS del backend espera origen
  `https://kudos-frontend.onrender.com` (pre-poblado) pero si Render
  asigna un hash distinto (porque el nombre ya estaba ocupado), habrá
  que actualizar `CORS_ALLOWED_ORIGINS` post-deploy.
- **Solución:**
  1. En Render dashboard → New → Blueprint → seleccionar el repo →
     auto-detección leerá `render.yaml` y propondrá los 3 servicios.
  2. Confirmar URL real asignada a `kudos-frontend` (puede tener hash).
  3. Si difiere de `https://kudos-frontend.onrender.com`, actualizar
     `CORS_ALLOWED_ORIGINS` en el servicio `kudos` (dashboard, no commit).
  4. `curl -I https://<URL-real>/` → 200.
  5. Verificar que `/health` consume `/api/health/` del backend real
     (commit `428070c` rewireó `experience/lib/axon/endpoints/health.ts`).
- **Riesgo:** `package-lock.json` aún no commiteado (`render.yaml` usa
  `npm install`, no `npm ci`); resoluciones de deps fluctúan entre
  builds. Mitigación: post-deploy generar lockfile local + commit +
  cambiar a `npm ci`.
- **Prioridad:** P1.

### BLOCKER-AX-CE-SMOKE · Re-ejecutar Content Engine smoke post-merge 🟧

- **Problema:** la última ejecución válida de `run_master_smoke_map`
  (16 PASS · 2 WARN · 1 FAIL · 15.27 s) es del 2026-05-20T14:04:31Z,
  **ANTES** del merge `dd42db3` (14:53 UTC+2) que llevó `content_engine/`
  a master. Aunque el código es idéntico al que existía como working tree
  ayer, el binario commiteado puede tener pequeñas diferencias por
  formato/encoding.
- **Impacto:** no tenemos baseline auditable del Content Engine sobre el
  binario que efectivamente se desplegará. Si Barcelona vuelve UNGROUNDED
  contra el merge, sabemos que el bug es estable. Si otros casos cambian,
  necesitamos detectarlo antes de anunciar.
- **Solución:**
  ```bash
  python manage.py run_master_smoke_map --output-dir reports/
  # Comparar reports/master_smoke_<TS>.{csv,json} con
  # reports/master_smoke_20260520_140431.{csv,json}
  ```
- **Riesgo:** SPARQL Wikidata puede estar fluctuante el día del run; usar
  el geocache (`CONTENT_ENGINE_GEOCACHE_ENABLED=1`) reduce variabilidad.
- **Prioridad:** P1.

### BLOCKER-AX-MC · MarkerCluster servido por CDN unpkg 🟧

- **Problema:** `kudos_app/templates/map.html` líneas 9-11 cargan
  `unpkg.com/leaflet.markercluster@1.5.3` (CSS×2 + JS). Sin cambios.
- **Impacto:** dependencia de red para el sistema #1. Si unpkg cae o
  bloquea, los markers dejan de agruparse y rinden ~2 000 markers DOM en
  vista mundial.
- **Solución:** vendoring local en `static/vendor/leaflet/markercluster/`
  alineado con la misma versión (1.5.3) y reemplazar las 3 líneas por
  `{% static %}`. (D2 sólo cubrió Leaflet core.)
- **Riesgo:** sandbox sin red para fetch; descarga manual desde otra
  estación + commit.
- **Prioridad:** P1.

### BLOCKER-AX-LH · Lighthouse Mobile real sin medir 🟧

- **Problema:** no hay métrica de rendimiento real sobre la URL pública.
  El audit interno proyecta TTFM < 1.2 s pero no se ha probado en 4G ni
  en device físico.
- **Impacto:** "Time To Awe" del mandato AXÓN sigue siendo una promesa
  no validada.
- **Solución:** ejecutar Lighthouse Mobile (Chrome DevTools 4G + CPU 4×
  throttle) sobre la URL pública de Render una vez confirmado HOME 200.
  Target ≥ 80 en Performance / A11y / SEO / Best Practices. Medir dos
  URLs: backend Django (`kudos-40cq.onrender.com/`) y frontend Next.js
  (`kudos-frontend.onrender.com/aqui`) una vez desplegado.
- **Riesgo:** backdrop-filter blur en algunos componentes puede bajar
  Performance Mobile. Mitigación: A/B con blur desactivado si el score
  cae < 80.
- **Prioridad:** P1.

---

## Cola P2 — bloquean anuncio público, no la semana

### BLOCKER-AX-NAV · Navegación contaminada Django (~30 fugas dormant) 🟨

- **Problema:** sin cambios desde FEATURE_GATE_AUDIT 2026-05-19. Los
  templates Django muestran botones a rutas dormant que devuelven 404 al
  clicarse: `home.html` 13 enlaces, `capsule_detail.html` 7,
  `dashboard.html` 4, `ai_panel.html` 3. Solo afecta backend Django;
  el frontend Next.js tiene middleware beta-gate que redirige a `/aqui`.
- **Impacto:** Time To Awe sigue contaminado en el backend mientras
  Experience no sea la landing pública oficial.
- **Solución:** envolver cada `{% url 'dormant_*' %}` listado en
  `FEATURE_GATE_AUDIT_20260519.md §6` con `{% if_feature %}` (1-2 h sin
  tocar views.py ni urls.py).
- **Riesgo:** romper algún flujo legítimo si el gate cubre un enlace
  PUBLIC que coincidía con el nombre. Mitigación: smoke navegacional
  post-edit.
- **Prioridad:** P2 (con Experience deploy adelante, el peso de hacer
  esto en Django baja).

### BLOCKER-AX-DUP · Duplicado URL `mind/chat/` en `kudos_app/urls.py` 🟨

- **Problema:** FEATURE_GATE_AUDIT 2026-05-19 detectó que `urls.py:188`
  y `:195` declaran ambos
  `path('mind/chat/', views.ai_chat, name='ai_chat')`. Confirmado en HEAD
  post-commits 2026-05-21 (las líneas se desplazaron a 188/195 por la
  adición de endpoints Phase 0). Django usa el primero; ruido en
  `reverse()`.
- **Impacto:** bajo (no rompe nada en runtime). Solo ruido en logs/audits.
- **Solución:** borrar la línea duplicada `:195` y dejar `:188`.
- **Prioridad:** P2 (cleanup).

### BLOCKER-AX-CE-BCN · Barcelona · Plaça Catalunya UNGROUNDED 🟨

- **Problema:** master smoke 2026-05-20T14:04Z reporta `Barcelona ·
  Plaça Catalunya` con `failure_class=UNGROUNDED` (candidatos 10,
  latencia 3 390 ms, ningún grounding gana). El resto de capitales
  europeas (Madrid, Roma, París) pasa con confidence ≥ 0.96.
- **Impacto:** un caso failure no rompe el pipeline (84 % PASS), pero
  Barcelona es una ciudad de showcase obvio; si un usuario prueba ese
  punto en demo y obtiene capsule UNGROUNDED, la promesa narrativa cae.
- **Solución:** investigar `content_engine/ranking.py` y
  `content_engine/landmarks.py` con los 10 candidatos del último smoke
  (`reports/master_smoke_20260520_140431.json`). Probables causas:
  threshold de confidence demasiado alto · Plaça Catalunya tiene
  candidatos genéricos (e.g. "Catalunya" autonomía) que opacan al
  landmark específico.
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

### BLOCKER-AX-RL · Sin rate-limit en APIs Django públicas heredadas 🟨

- **Problema:** `api_capsules_5d`, `api_capsule_light`, `ai_lite_ask`
  no tienen throttle. El endpoint nuevo `place-capsule` sí
  (`django-ratelimit` activo).
- **Impacto:** vulnerable a martilleo desde un único IP; podría agotar
  el dyno free de Render.
- **Solución:** `django-ratelimit` ya está en `requirements.txt`,
  decorar las 3 views — 60 req/min para bbox y light, 12 req/min para
  mind.
- **Prioridad:** P2.

### BLOCKER-AX-ALL · Login social no implementado 🟨

- **Problema:** ningún proveedor OAuth conectado.
- **Impacto:** según project plan, MVP exige Google. Hoy solo hay login
  Django nativo.
- **Solución:** `django-allauth` con Google primero (External · Testing
  consent screen), credenciales en `.env`.
- **Prioridad:** P2 (no entra en cirugía AXÓN; sí en MVP anunciable).

### BLOCKER-AX-SHARE · Preview share sin validar 🟨

- **Problema:** OG/Twitter/JSON-LD están en `capsule_detail.html` pero
  nadie ha verificado el rendering real en WhatsApp / Twitter / Telegram
  / LinkedIn.
- **Impacto:** el sistema #7 podría fallar el día del lanzamiento por un
  detalle (URL absoluta, image size, cache de Facebook OG debugger).
- **Solución:** una vez HOME 200 confirmado, abrir 3 URLs de cápsula en
  Twitter Card Validator, Facebook Sharing Debugger, WhatsApp Web,
  Telegram Web.
- **Prioridad:** P2.

### BLOCKER-AX-PLACES · `/api/places/<slug>/` con datos reales 🟨

- **Problema:** el endpoint existe (`api_place_detail` en
  `kudos_app/views.py` commiteado por `dd42db3`) y el shape JSON está
  documentado. Pero la tabla `Place` arranca vacía (migración 0001 sólo
  crea schema). Hasta que se hidrate con datos reales (mínimo `rome`,
  `kyoto`, `lima`), `/api/places/rome/` devuelve 404.
- **Impacto:** Experience Core tiene `app/places/[slug]/page.tsx` que
  consume este endpoint. Sin datos, la ruta `/places` quedará oculta
  por el middleware beta-gate (única ruta en `HIDDEN_PREFIXES` tras
  P0.9).
- **Solución:** seed management command (sugerido en el código:
  `seed_rome`) que cree al menos 3 Places + linkee algunas cápsulas
  existentes vía `Capsule.place`.
- **Prioridad:** P2.

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
  El cliente `content_engine/clients/anthropic.py` (383 L) ya existe y
  se usa en el pipeline place-capsule, pero `ai_lite_ask` (sistema #6)
  sigue con heurística local.
- **Solución:** cuando haya `ANTHROPIC_API_KEY` productiva, sustituir
  la rama heurística por llamada al cliente Anthropic ya existente.
  Contrato JSON ya está listo.
- **Prioridad:** P3 (no impide MVP; sí mejora experiencia).

### BLOCKER-AX-AUTO · `full_autopilot` no apto para producción 🟩

- **Problema:** bucles 24/7 sin rate-limit ni circuit breaker.
- **Solución:** APScheduler/cron con límite, jitter, logs; deshabilitar
  por defecto en producción.
- **Prioridad:** P3.

### BLOCKER-AX-DOC · `README.md` desactualizado 🟩

- **Problema:** portada no refleja arquitectura AXÓN, los 7 pilares
  PUBLIC, ni el blueprint Render multi-servicio. La última edición es
  del 2025-04.
- **Solución:** refrescar tras verificar HOME 200, primer deploy
  frontend y baseline Content Engine post-merge.
- **Prioridad:** P3.

### BLOCKER-AX-LOCK · `package-lock.json` ausente 🟩

- **Problema:** `render.yaml` usa `npm install` (no `npm ci`) porque no
  hay lockfile commiteado. Trade-off documentado (~30 s extra build vs
  reproducibilidad estricta).
- **Solución:** `cd experience && npm install` para generar lockfile,
  commit, cambiar `render.yaml` a `npm ci`.
- **Prioridad:** P3 (estabilidad de builds; no rompe nada hoy).

---

## Cola desbloqueada desde 2026-05-19 (cerrados / resueltos)

- ✅ **BLOCKER-AX-HOME** — fix en master por `67fe207` (swap manifest
  static storage + harden `home` view con try/except + HttpResponse
  fallback). **Pendiente verificación productiva** (rebautizado a
  BLOCKER-AX-HOME-VERIFY P0 hasta confirmar 200).
- ✅ **BUG-025 · HOME 500 root cause** — `ValueError("Missing
  staticfiles manifest entry")` aislado y mitigado por `67fe207`.
- ✅ **BLOCKER-AX0 · `views.py` truncado en working tree** — el commit
  `dd42db3` aportó las 92 L Phase 0 al HEAD; sin embargo el working tree
  local sigue 66 L corto vs HEAD (parsea, pero falta `capsule_aport_validate`).
  Rebautizado como BLOCKER-LOCAL P1.
- ✅ **AXÓN tag `v0.9-axon-core`** sellado (2026-05-17, commit `42189bc`).
- ✅ **6 funciones duplicadas** en `views.py` eliminadas (eran 12 · 325 L).
- ✅ **`SECRET_KEY` con fallback inseguro**: ahora mandatoria si
  `DJANGO_ENV=production`; en dev arranca con aviso.
- ✅ **`views.py` monolítico de 2 450 L** → 2 448 L (HEAD), F401=0, sin
  duplicados. (Aumentó con Phase 0 endpoints +61 L.)
- ✅ **`map.html` 881 L con CSS+JS inline** → 167 L con 10 módulos JS +
  `map5d.css` (399 L).
- ✅ **Leaflet por CDN core**: local en `static/vendor/leaflet/`. La
  parte de MarkerCluster sigue como BLOCKER-AX-MC.
- ✅ **Utils duplicados `google_maps_utils.py`**: copia raíz movida a
  `.dormant`.
- ✅ **Mind Lite no reducido a 3 prompts**: bajada a what/summary/near
  con auto-fire `?capsule=`.
- ✅ **Share blindado** (D11): OG + Twitter Card + `navigator.share`
  + clipboard fallback + Schema.org JSON-LD.
- ✅ **Capsule subroutes DORMANT** (`versions`, `aport`, `dialog`,
  `enrich`, `ar`, `audio`, `vr`, `clip`) bloqueadas vía
  `DORMANT_PATH_REGEX`.
- ✅ **Deploy artefactos**: Procfile, render.yaml v2 (3 servicios),
  build.sh, runtime.txt, railway.json, `.env.production.example`,
  `kudos_project/sentry_init.py` opt-in.
- ✅ **Backups pre-deploy**: tar 87 MB + DB SQLite 9.5 MB (53 tablas ·
  1 458 cápsulas · 10 users).
- ✅ **Experience Core en master** (`9b3fadf` + 7 hotfix TS) — Next.js
  15 + React 18 + TS 5.6 strict + Tailwind 3.4 + Framer 11 + Radix +
  Lucide + Plausible.
- ✅ **Content Engine V0 en master** (`dd42db3`) — `content_engine/`
  3 039 L Python · 13 módulos · 34 archivos · `INSTALLED_APPS` ·
  `django-ratelimit` activo · master switch geocache.
- ✅ **`requirements.txt` reproducible Render Linux** (`97588fc` + `5e18e1f`)
  — 71 010 B → 2 631 B (13 paquetes runtime).
- ✅ **CORS hardening** (`dd42db3`) — `corsheaders` + `CorsMiddleware`
  pre-`CommonMiddleware` + `CORS_ALLOWED_ORIGINS` con warning de
  misconfig.
- ✅ **`render.yaml` blueprint multi-servicio** (`a199e12`) — 3 servicios
  declarados (`kudos`, `kudos-frontend`, `kudos-db`).
- ✅ **Middleware beta-gate Experience** (`a199e12`) — redirige rutas
  dormant a `/aqui` con 307 cuando `BETA_HIDE_DORMANT=1`.
- ✅ **TypeScript strict mode** clean (5 commits: `e52c81f`, `c063ad6`,
  `aa4df68`, `fe70316`, `1665e6e`).
- ✅ **AXÓN Phase 0 endpoints** (`dd42db3`) — `GET /api/health/` JSON
  estable + `GET /api/places/<slug>/` shape estable + Phase 0 fields en
  `Capsule` + modelo `Place` canónico.
- ✅ **Tests Django smoke** — `kudos_app/tests.py` pasa de 10 L a 79 L
  con 3 TestCase (Health, PlaceDetail, CapsuleFoundationFields).

---

## Decisiones pendientes de input

1. ¿Borrar las 3 copias legacy de Leaflet en `static/` ahora o post-MVP?
2. ¿Vendoring de MarkerCluster sólo (`leaflet.markercluster.js` + CSS) o
   también de las imágenes de iconos del cluster?
3. ¿Activar Sentry con el opt-in `kudos_project/sentry_init.py` ya que
   HOME 500 tiene fix mergeado o esperar al primer deploy verificado?
4. ¿Mover `legacy_views.py` a `dormant/` ahora o post-anuncio?
5. ¿Generar `package-lock.json` + cambiar `render.yaml` a `npm ci` antes
   del primer deploy del frontend o aceptar el trade-off temporal?
6. ¿Hidratar tabla `Place` con un seed manual o esperar a que el pipeline
   Content Engine cree Places a demanda?

> Cola viva tras 2026-05-21: **BLOCKER-AX-HOME-VERIFY → BLOCKER-LOCAL →
> BLOCKER-AX-FRONT-DEPLOY → BLOCKER-AX-CE-SMOKE → BLOCKER-AX-MC →
> BLOCKER-AX-LH** → resto de P2.
